import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll } from './helpers'

test.describe('Thème', () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'light' })
    await page.route('**/api/**', (route) => route.fulfill({ json: { items: [] } }))
  })

  test('suit le système jusqu’à un choix manuel', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByRole('button', { name: 'Activer le thème sombre' })).toBeVisible()
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.getByRole('button', { name: 'Activer le thème clair' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await page.emulateMedia({ colorScheme: 'light' })
    await page.emulateMedia({ colorScheme: 'dark' })
    await expect(page.locator('html')).not.toHaveClass(/dark/)

    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await expect(page.getByRole('button', { name: 'Activer le thème sombre' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  test('conserve le choix après navigation et rechargement', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('button', { name: 'Activer le thème sombre' }).click()
    await expect(page.locator('html')).toHaveClass(/dark/)

    await page.getByRole('link', { name: 'Connexion' }).click()
    await expect(page.getByRole('heading', { name: 'Bon retour !' })).toBeVisible()
    await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toHaveCSS(
      'color',
      'rgb(255, 255, 255)',
    )
    await expect(page.getByRole('button', { name: 'Activer le thème clair' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await page.reload()
    await expect(page.locator('html')).toHaveClass(/dark/)
    await expectNoHorizontalScroll(page)

    await page.getByRole('button', { name: 'Activer le thème clair' }).click()
    await page.reload()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
  })

  test('applique le thème système sombre au premier accès', async ({ page }) => {
    await page.emulateMedia({ colorScheme: 'dark' })
    await page.goto('/register')

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.locator('html')).toHaveCSS('color-scheme', 'dark')
    await expect(page.getByRole('button', { name: 'Activer le thème clair' })).toBeVisible()
    await expectNoHorizontalScroll(page)
  })

  test('synchronise le choix entre les onglets', async ({ page, context }) => {
    await page.goto('/')
    const otherPage = await context.newPage()
    await otherPage.emulateMedia({ colorScheme: 'light' })
    await otherPage.goto('/login')

    await page.getByRole('button', { name: 'Activer le thème sombre' }).click()
    await expect(otherPage.locator('html')).toHaveClass(/dark/)

    await otherPage.getByRole('button', { name: 'Activer le thème clair' }).click()
    await expect(page.locator('html')).not.toHaveClass(/dark/)
    await otherPage.close()
  })

  test('reste utilisable sur mobile et au clavier', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
    const toggle = page.getByRole('button', { name: 'Activer le thème sombre' })
    await toggle.focus()
    await page.keyboard.press('Enter')

    await expect(page.locator('html')).toHaveClass(/dark/)
    await expect(page.getByRole('button', { name: 'Activer le thème clair' })).toBeFocused()
    await expectNoHorizontalScroll(page)
  })
})
