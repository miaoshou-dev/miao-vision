import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

function renderTrustedReport(withSummaries = true): { html: string; result: Record<string, unknown> } {
  const dir = mkdtempSync(join(tmpdir(), 'miao-trusted-e2e-'))
  const csv = join(dir, 'sales.csv')
  const spec = join(dir, 'report.yaml')
  const html = join(dir, 'report.html')
  writeFileSync(csv, 'region,sales,customer_email\nEast,10,a@example.com\nWest,20,b@example.com\nEast,15,c@example.com\n')
  writeFileSync(spec, `specVersion: 1
locale: en
title: Trusted Sales
interactions:
  globalFilters:
    - { field: region, type: select }
  dataPolicy:
    mode: detail-safe
    detailFields: [region, sales]
    excludeFields: [customer_email]
  currentView:
    summaries:
      - id: current_sales
        label: Current sales
        format: integer
        recipe:
          schemaVersion: 1
          measures:
            - { operation: sum, field: sales, alias: value }
charts:
  - id: sales_by_region
    type: bar
    encoding:
      x: { field: region }
      y: { field: sales, aggregate: sum }
`)
  if (!withSummaries) {
    const yaml = readFileSync(spec, 'utf8')
    writeFileSync(spec, yaml.replace(/  currentView:[\s\S]*?(?=charts:)/, ''))
  }
  const output = execFileSync(process.execPath, ['scripts/miao-viz.mjs', 'render', 'report', '--input', csv, '--spec', spec, '--output', html], { encoding: 'utf8' })
  return { html, result: JSON.parse(output) }
}

test('trusted report minimizes data and preserves current-view state', async ({ page }) => {
  const artifact = renderTrustedReport()
  const html = readFileSync(artifact.html, 'utf8')
  expect(html).not.toContain('a@example.com')
  expect((artifact.result.value as { shareSafe: boolean }).shareSafe).toBe(true)

  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(pathToFileURL(artifact.html).href)
  await expect(page.locator('.miao-exposure')).toHaveAttribute('data-share-status', 'safe')
  expect(errors).toEqual([])
  await expect(page.locator('.miao-current-summary strong')).toHaveText('45')

  await page.locator('.miao-filter select').selectOption('East')
  await expect(page.locator('.miao-current-summary strong')).toHaveText('25')
  await expect(page.locator('#miao-view-state')).toContainText('2 / 3 rows')
  await expect(page.locator('[data-print], .miao-print-actions')).toHaveCount(0)

  const sharedUrl = page.url()
  await page.goto(sharedUrl)
  await expect(page.locator('.miao-current-summary strong')).toHaveText('25')
  await page.locator('#miao-view-reset').click()
  await expect(page.locator('.miao-current-summary strong')).toHaveText('45')
  await expect(page).not.toHaveURL(/#miao=/)
  expect(errors).toEqual([])
})

test('trusted report without summaries has no empty current-view panel or print actions', async ({ page }) => {
  const artifact = renderTrustedReport(false)
  await page.goto(pathToFileURL(artifact.html).href)
  await expect(page.locator('.miao-exposure')).toBeVisible()
  await expect(page.locator('.miao-trust-scopes')).toHaveCount(0)
  await expect(page.locator('[data-print], .miao-print-actions')).toHaveCount(0)
  await page.locator('.miao-filter select').selectOption('East')
  await expect(page.locator('#miao-view-state')).toContainText('2 / 3 rows')
})
