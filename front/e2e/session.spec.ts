import { expect, test } from '@playwright/test'

// RST-39: a request sent with an expired token answers 401 → the session is purged and the user
// logs in again, then comes back to the page they were on.

test.describe('Session expirée', () => {
  test('purge la session, redirige vers la connexion puis ramène sur la page d’origine', async ({
    page,
  }) => {
    // A real account, so that the login after the redirect works against the stack.
    const email = `e2e-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@example.com`
    const password = 'secret-e2e-123'
    const register = await page.request.post('/api/users/register', {
      data: { name: 'E2E Session', email, password },
    })
    expect(register.ok()).toBeTruthy()
    const user = await register.json()

    // An expired token in storage: every private call answers 401.
    await page.addInitScript((storedUser) => {
      if (sessionStorage.getItem('e2e-session-seeded')) return
      sessionStorage.setItem('e2e-session-seeded', '1')
      localStorage.setItem('auth_token', 'expired.e2e.token')
      localStorage.setItem('auth_user', JSON.stringify(storedUser))
    }, user)
    await page.route('**/api/link/*', (route) =>
      route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'AuthenticationError',
          message: 'Votre session a expiré, reconnectez-vous.',
          statusCode: 401,
          requestId: 'e2e-expired-session',
        }),
      }),
    )

    await page.goto('/profile')

    await expect(page).toHaveURL(/\/login\?redirect=(\/|%2F)profile$/)
    await expect(page.getByText('Votre session a expiré, reconnectez-vous.')).toBeVisible()
    expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull()

    await page.unroute('**/api/link/*')
    await page.locator('#email').fill(email)
    await page.locator('#password').fill(password)
    await page.getByRole('button', { name: /Se connecter/ }).click()

    await expect(page).toHaveURL(/\/profile$/)
  })

  test('un token expiré est retiré dès l’ouverture, sans appel à l’API', async ({ page }) => {
    // Unsigned JWT whose exp is one minute ago: the front reads exp, only the server verifies.
    const payload = Buffer.from(
      JSON.stringify({ userId: 1, exp: Math.floor(Date.now() / 1000) - 60 }),
    ).toString('base64url')
    await page.addInitScript((token) => {
      if (sessionStorage.getItem('e2e-expired-seeded')) return
      sessionStorage.setItem('e2e-expired-seeded', '1')
      localStorage.setItem('auth_token', token)
      localStorage.setItem('auth_user', JSON.stringify({ id: 1, name: 'E2E', email: 'e@x.fr' }))
      localStorage.setItem('linked_player_tag', '#2PP8VJ9Q')
    }, `e30.${payload}.signature`)
    const privateCalls: string[] = []
    page.on('request', (request) => {
      if (/\/api\/(users\/me|link)/.test(request.url())) privateCalls.push(request.url())
    })

    await page.goto('/profile')

    await expect(page).toHaveURL(/\/login\?redirect=(\/|%2F)profile$/)
    await expect(page.getByText('Votre session a expiré, reconnectez-vous.')).toBeVisible()
    expect(
      await page.evaluate(() => [
        localStorage.getItem('auth_token'),
        localStorage.getItem('linked_player_tag'),
      ]),
    ).toEqual([null, null])
    expect(privateCalls).toEqual([])
  })
})
