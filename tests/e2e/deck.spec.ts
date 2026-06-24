import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

function renderExampleDeck(): string {
  const dir = mkdtempSync(join(tmpdir(), 'miao-viz-deck-e2e-'))
  const output = join(dir, 'deck.html')
  execFileSync(process.execPath, [
    'scripts/miao-viz.mjs',
    'deck',
    '--input', 'packages/miao-viz-cli/examples/sales.csv',
    '--spec', 'packages/miao-viz-cli/examples/sales-deck.yaml',
    '--theme', 'editorial',
    '--output', output
  ], { encoding: 'utf8' })
  return output
}

test('browser deck presentation smoke', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))

  await page.goto(pathToFileURL(renderExampleDeck()).href)
  await expect(page.locator('.slide').first()).toBeVisible()
  await expect(page.locator('.slide.active')).toContainText('Sales Review')
  await expect(page.locator('#slide-counter')).toHaveText('1 / 6')

  const firstSlideBox = await page.locator('.slide.active').boundingBox()
  expect(firstSlideBox?.width).toBeGreaterThan(1000)
  expect(firstSlideBox?.height).toBeGreaterThan(600)

  await page.keyboard.press('ArrowRight')
  await expect(page.locator('#slide-counter')).toHaveText('2 / 6')
  await expect(page.locator('.slide.active')).toContainText('Quarter at a Glance')

  await page.keyboard.press('ArrowLeft')
  await expect(page.locator('#slide-counter')).toHaveText('1 / 6')

  await page.keyboard.press('f')
  await page.waitForTimeout(100)
  expect(errors).toEqual([])

  const cssText = await page.locator('style').first().textContent()
  expect(cssText).toContain('@media print')
  expect(cssText).toContain('.slide-nav { display: none !important; }')
})
