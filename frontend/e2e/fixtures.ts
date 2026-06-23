declare global {
  interface Window {
    __authStore?: {
      getState: () => { setTokens: (a: string, r: string) => void }
    }
  }
}

import { test as base, expect } from '@playwright/test'

const KC = 'http://localhost:8080'
const API = 'http://localhost:8000'

export interface AuthFixtures {
  token: string
  refreshToken: string
  authenticatedPage: import('@playwright/test').Page
}

async function fetchTokens(): Promise<{ access_token: string; refresh_token: string } | null> {
  try {
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
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

async function ensureWallet(token: string): Promise<void> {
  await fetch(`${API}/wallets`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  })
}

export const test = base.extend<AuthFixtures>({
  token: async ({}, use) => {
    const tokens = await fetchTokens()
    if (!tokens) {
      console.warn('Keycloak unavailable — skipping auth fixture')
      await use('')
      return
    }
    await ensureWallet(tokens.access_token)
    await use(tokens.access_token)
  },

  refreshToken: async ({}, use) => {
    const tokens = await fetchTokens()
    await use(tokens?.refresh_token ?? '')
  },

  authenticatedPage: async ({ page, token, refreshToken }, use) => {
    if (!token) {
      await use(page)
      return
    }

    await page.goto('/game')
    // Wait for React hydration + store initialization
    await page.waitForFunction(() => typeof window.__authStore !== 'undefined', { timeout: 5000 }).catch(() => {})

    await page.evaluate(
      ({ accessToken, rt }) => {
        window.__authStore?.getState().setTokens(accessToken, rt)
      },
      { accessToken: token, rt: refreshToken },
    )

    await use(page)
  },
})

export { expect }
