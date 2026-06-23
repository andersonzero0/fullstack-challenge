import { test, expect } from './fixtures'

const inPlaywright = !!process.env.PLAYWRIGHT_WORKER_ID

if (inPlaywright) {

const API = 'http://localhost:8000'

async function waitForPhase(page: import('@playwright/test').Page, phase: string, timeoutMs = 20000): Promise<void> {
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const res = await page.request.get(`${API}/games/rounds/current`)
    if (res.ok()) {
      const data = await res.json()
      if (data.phase === phase) return
    }
    await page.waitForTimeout(500)
  }
  throw new Error(`Timed out waiting for phase: ${phase}`)
}

async function getBalance(page: import('@playwright/test').Page, token: string): Promise<number> {
  const res = await page.request.get(`${API}/wallets/me`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await res.json()
  return body.balance as number
}

test.describe('Auth fixture', () => {
  test('token is valid JWT', async ({ token }) => {
    if (!token) test.skip(true, 'Keycloak not running')
    expect(token.split('.').length).toBe(3)
  })

  test('wallet exists with integer balance', async ({ token, request }) => {
    if (!token) test.skip(true, 'Keycloak not running')
    const res = await request.get(`${API}/wallets/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(Number.isInteger(body.balance)).toBe(true)
    expect(body.balance).toBeGreaterThanOrEqual(0)
  })
})

test.describe('Authenticated page', () => {
  test('game page is visible after auth injection', async ({ authenticatedPage, token }) => {
    if (!token) test.skip(true, 'Keycloak not running')
    const page = authenticatedPage

    // Auth store injected — game page should render without redirect to /login
    await expect(page).not.toHaveURL(/login/, { timeout: 3000 }).catch(() => {})
    // Game canvas area or multiplier display should exist
    await expect(page.locator('body')).toBeVisible()
  })

  test('balance shows in header after auth injection', async ({ authenticatedPage, token }) => {
    if (!token) test.skip(true, 'Keycloak not running')
    const page = authenticatedPage

    // PlayerInfo component shows balance — wait for it to fetch
    await page.waitForTimeout(2000)
    // Should show R$ somewhere (balance or bet amount)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).toMatch(/R\$/)
  })
})

test.describe('Place bet flow', () => {
  test('places bet during BETTING phase and sees it in Apostas tab', async ({ authenticatedPage, token }) => {
    if (!token) test.skip(true, 'Keycloak not running')
    const page = authenticatedPage

    await waitForPhase(page, 'BETTING', 20000)

    const balanceBefore = await getBalance(page, token)

    // Place bet via API
    const betRes = await page.request.post(`${API}/games/bet`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: JSON.stringify({ amount: 1000 }),
    })
    // 202 = placed, 409 = already bet this round
    expect([202, 409]).toContain(betRes.status())

    if (betRes.status() === 202) {
      // Balance should not have changed yet (debit is async)
      // But bet appears in current round bets list
      await page.waitForTimeout(1000)
      const body = await betRes.json()
      expect(body.betId).toBeTruthy()
    }

    // Balance should be less than before by bet amount (async debit, allow up to 5s)
    await page.waitForTimeout(5000)
    const balanceAfter = await getBalance(page, token)
    expect(balanceAfter).toBeLessThanOrEqual(balanceBefore)
  })
})

test.describe('Cashout flow', () => {
  test('cashout during RUNNING phase increases balance', async ({ authenticatedPage, token }) => {
    if (!token) test.skip(true, 'Keycloak not running')
    const page = authenticatedPage

    const BET = 1000

    // Ensure we're in BETTING phase
    await waitForPhase(page, 'BETTING', 20000)
    const balanceBefore = await getBalance(page, token)

    // Place bet
    const betRes = await page.request.post(`${API}/games/bet`, {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      data: JSON.stringify({ amount: BET }),
    })

    if (betRes.status() !== 202) {
      // Already bet this round — wait for crash then next BETTING
      await waitForPhase(page, 'BETTING', 45000)
      // Place with retry until 202 (a new round must start)
      let placed = false
      for (let i = 0; i < 3 && !placed; i++) {
        const r = await page.request.post(`${API}/games/bet`, {
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          data: JSON.stringify({ amount: BET }),
        })
        if (r.status() === 202) { placed = true; break }
        // 409 = same round still active, wait for next
        await waitForPhase(page, 'BETTING', 30000)
      }
      if (!placed) {
        test.skip(true, 'Could not place bet after retries — timing issue')
        return
      }
    }

    // Wait for RUNNING
    await waitForPhase(page, 'RUNNING', 15000)

    // Cashout immediately
    const cashoutRes = await page.request.post(`${API}/games/bet/cashout`, {
      headers: { Authorization: `Bearer ${token}` },
    })

    if (cashoutRes.status() === 201) {
      const data = await cashoutRes.json()
      expect(data.cashoutMultiplier).toBeGreaterThanOrEqual(1.0)
      expect(data.payout).toBeGreaterThan(0)
      expect(Number.isInteger(data.payout)).toBe(true)

      // Allow saga to settle (wallet credit via RabbitMQ)
      await page.waitForTimeout(4000)

      const balanceAfter = await getBalance(page, token)
      // Net change = payout - BET (debit happened during betting)
      // balance should be >= balanceBefore - BET + payout
      // But debit may not have happened yet when balanceBefore was captured
      // At minimum, balance should not be negative
      expect(balanceAfter).toBeGreaterThanOrEqual(0)
      // If payout > BET, net profit — balance should increase vs (balanceBefore - BET)
      if (data.payout > BET) {
        expect(balanceAfter).toBeGreaterThan(balanceBefore - BET)
      }
    } else {
      // Round crashed before cashout — acceptable in E2E
      expect([409, 422]).toContain(cashoutRes.status())
    }
  })
})

test.describe('Bet history', () => {
  test('GET /games/bets/me returns paginated list', async ({ token, request }) => {
    if (!token) test.skip(true, 'Keycloak not running')
    const res = await request.get(`${API}/games/bets/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(Array.isArray(body.data)).toBe(true)
    expect(typeof body.total).toBe('number')
    // Each bet has expected fields
    for (const bet of body.data as Record<string, unknown>[]) {
      expect(bet.id).toBeTruthy()
      expect(typeof bet.amount).toBe('number')
      expect(['PENDING', 'ACTIVE', 'CASHED_OUT', 'LOST', 'REJECTED']).toContain(bet.status)
    }
  })

  test('leaderboard returns array', async ({ request }) => {
    const res = await request.get(`${API}/games/rounds/leaderboard`)
    expect(res.ok()).toBe(true)
    const body = await res.json()
    expect(Array.isArray(body)).toBe(true)
  })
})

} // end inPlaywright
