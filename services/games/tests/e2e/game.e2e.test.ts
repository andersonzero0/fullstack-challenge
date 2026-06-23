import { describe, test, expect, beforeAll } from 'bun:test'

const BASE = 'http://localhost:8000/games'
const KC = 'http://localhost:8080'

let servicesAvailable = false

// Detect if services are up — skip all tests gracefully when running offline
try {
  const probe = await fetch(`${BASE}/health`, { signal: AbortSignal.timeout(2000) }).catch(() => null)
  servicesAvailable = probe?.ok === true
} catch { /* offline */ }

function skipWhenOffline(fn: () => void) {
  if (!servicesAvailable) return
  fn()
}

async function getToken(): Promise<string> {
  const res = await fetch(`${KC}/realms/crash-game/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'password',
      client_id: 'crash-game-client',
      username: 'player',
      password: 'player123',
    }).toString(),
  })
  if (!res.ok) throw new Error(`Keycloak auth failed: ${res.status}`)
  const data = await res.json()
  return data.access_token
}

/**
 * Polls GET /rounds/current until the phase matches.
 * Note: valid phases from the API are 'BETTING', 'RUNNING', and 'IDLE'
 * (IDLE is returned when no active round exists, e.g. between rounds).
 */
async function waitForPhase(phase: string, timeoutMs = 15000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await fetch(`${BASE}/rounds/current`)
    if (res.ok) {
      const data = await res.json()
      if (data.phase === phase) return
    }
    await new Promise(r => setTimeout(r, 500))
  }
  throw new Error(`Timed out waiting for phase: ${phase}`)
}

let token: string

beforeAll(async () => {
  if (!servicesAvailable) return
  token = await getToken()
})

skipWhenOffline(() => {

describe('GET /health', () => {
  test('returns 200 ok', async () => {
    const res = await fetch(`${BASE}/health`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.status).toBe('ok')
  })
})

describe('GET /rounds/current', () => {
  test('returns current round with a valid phase field', async () => {
    const res = await fetch(`${BASE}/rounds/current`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(['BETTING', 'RUNNING', 'IDLE']).toContain(body.phase)
  })

  test('returns bets array and roundId when phase is BETTING', async () => {
    await waitForPhase('BETTING')
    const res = await fetch(`${BASE}/rounds/current`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.phase).toBe('BETTING')
    expect(body.roundId).toBeTruthy()
    expect(Array.isArray(body.bets)).toBe(true)
    expect(body.serverSeedHash).toBeTruthy()
  })
})

describe('POST /bet — auth', () => {
  test('returns 401 without JWT', async () => {
    const res = await fetch(`${BASE}/bet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 1000 }),
    })
    expect(res.status).toBe(401)
  })
})

describe('POST /bet — happy path', () => {
  test('places bet during BETTING phase → 202', async () => {
    await waitForPhase('BETTING')
    const res = await fetch(`${BASE}/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: 1000 }),
    })
    // 202 on success, 409 if already bet this round
    expect([202, 409]).toContain(res.status)
    if (res.status === 202) {
      const body = await res.json()
      expect(body.betId).toBeTruthy()
    }
  })

  test('duplicate bet in same round → 409', async () => {
    await waitForPhase('BETTING')
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    }
    const betBody = JSON.stringify({ amount: 1000 })

    // Ensure at least one bet exists (ignore result)
    await fetch(`${BASE}/bet`, { method: 'POST', headers, body: betBody })

    // Second bet must be a conflict
    const res = await fetch(`${BASE}/bet`, { method: 'POST', headers, body: betBody })
    expect(res.status).toBe(409)
    const body = await res.json()
    expect(body.message).toBe('DUPLICATE_BET')
  })

  test('bet during RUNNING phase → 422', async () => {
    await waitForPhase('RUNNING')
    const res = await fetch(`${BASE}/bet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ amount: 1000 }),
    })
    expect(res.status).toBe(422)
    const body = await res.json()
    expect(body.message).toBe('ROUND_NOT_IN_BETTING_PHASE')
  })
})

describe('GET /bets/me', () => {
  test('returns 401 without JWT', async () => {
    const res = await fetch(`${BASE}/bets/me`)
    expect(res.status).toBe(401)
  })

  test('returns paginated bet history for authenticated user', async () => {
    const res = await fetch(`${BASE}/bets/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(typeof body.page).toBe('number')
    expect(typeof body.limit).toBe('number')
  })
})

describe('GET /rounds/history', () => {
  test('returns paginated array of crashed rounds', async () => {
    const res = await fetch(`${BASE}/rounds/history`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.total).toBe('number')
    expect(typeof body.page).toBe('number')
    expect(typeof body.limit).toBe('number')
  })

  test('each history entry has expected fields', async () => {
    const res = await fetch(`${BASE}/rounds/history`)
    const body = await res.json()
    if (body.data.length === 0) return // skip if no history yet
    const round = body.data[0]
    expect(round.id).toBeTruthy()
    expect(typeof round.crashPoint).toBe('number')
    expect(round.serverSeedHash).toBeTruthy()
  })
})

describe('GET /rounds/:id/verify', () => {
  test('returns 404 for unknown round id', async () => {
    const res = await fetch(`${BASE}/rounds/00000000-0000-0000-0000-000000000000/verify`)
    expect(res.status).toBe(404)
  })

  test('returns serverSeed, serverSeedHash and verified=true for a crashed round', async () => {
    // Wait for a round to end so history is non-empty
    await waitForPhase('IDLE', 30000)

    const histRes = await fetch(`${BASE}/rounds/history`)
    const hist = await histRes.json()
    const rounds = hist.data ?? []
    if (rounds.length === 0) return // no crashed rounds yet, skip

    const roundId = rounds[0].id
    const res = await fetch(`${BASE}/rounds/${roundId}/verify`)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.serverSeed).toBeTruthy()
    expect(body.serverSeedHash).toBeTruthy()
    // The API computes SHA256(serverSeed) and compares to serverSeedHash
    expect(body.verified).toBe(true)
  })
})

}) // end skipWhenOffline
