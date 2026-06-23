import { test, expect } from '@playwright/test'

// bun discovers *.spec.ts but can't run Playwright tests — guard prevents test.describe() crash
const inPlaywright = !!process.env.PLAYWRIGHT_WORKER_ID

if (inPlaywright) {

test.describe('Login flow', () => {
  test('redirects to /login when unauthenticated', async ({ page }) => {
    await page.goto('/game')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page has Entrar button', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeVisible()
  })

  test('clicking Entrar redirects to Keycloak', async ({ page }) => {
    await page.goto('/login')
    await Promise.all([
      page.waitForNavigation({ url: /keycloak|localhost:8080/ }).catch(() => null),
      page.getByRole('button', { name: 'Entrar' }).click(),
    ])
    const url = page.url()
    expect(url).toMatch(/keycloak|8080|crash-game/)
  })
})

} // end inPlaywright
