import { expect, test } from '@playwright/test'
import { expectNoHorizontalScroll } from './helpers'

test.describe('Accueil', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('affiche le titre et le champ de recherche', async ({ page }) => {
    await expect(page).toHaveTitle(/RoyaleStats/)
    await expect(page.getByPlaceholder('#TAG Joueur')).toBeVisible()
  })

  test('ne défile pas horizontalement', async ({ page }) => {
    await expectNoHorizontalScroll(page)
  })
})

test.describe('Authentification', () => {
  test('redirige vers la connexion quand on ouvre le profil sans être connecté', async ({
    page,
  }) => {
    await page.goto('/profile')

    await expect(page).toHaveURL(/\/login$/)
  })
})
