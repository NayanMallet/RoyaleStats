import { expect, type Page } from '@playwright/test'

/** Fails if the page can be scrolled horizontally (persona Gérard, 800x600). */
export async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement
    return root.scrollWidth - root.clientWidth
  })
  expect(overflow, 'the page must not scroll horizontally').toBeLessThanOrEqual(0)
}
