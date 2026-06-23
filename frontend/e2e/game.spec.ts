import { test, expect } from '@playwright/test'

const inPlaywright = !!process.env.PLAYWRIGHT_WORKER_ID

if (inPlaywright) {

// Helper: simulate authenticated session by setting localStorage/cookies
// In real E2E this would use Keycloak password flow via API
async function loginWithKeycloak(page: import('@playwright/test').Page): Promise<void> {
  const res = await page.request.fetch('http://localhost:8080/realms/crash-game/protocol/openid-connect/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    data: new URLSearchParams({
      grant_type: 'password',
      client_id: 'crash-game-client',
      username: 'player',
      password: 'player123',
    }).toString(),
  })

  if (!res.ok()) {
    test.skip(true, 'Keycloak not available — skip game E2E')
    return
  }

  const tokens = await res.json()
  // Inject token into Zustand store via localStorage and page context
  await page.goto('/')
  await page.evaluate((accessToken: string) => {
    // Directly set Zustand store state via window (devtools approach)
    // Since tokens are in memory store, simulate by directly navigating to /game
    // and checking the redirect behavior
    ;(window as Window & { __testAccessToken?: string }).__testAccessToken = accessToken
  }, tokens.access_token)
}

test.describe('Game page', () => {
  test('shows Crash heading on login page', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByText('Crash')).toBeVisible()
  })

  test('/game redirects to /login when not authenticated', async ({ page }) => {
    await page.goto('/game')
    await expect(page).toHaveURL(/login/)
  })
})

} // end inPlaywright
