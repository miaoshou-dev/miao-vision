import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

function runCli(args: string[]) {
  return execFileSync(process.execPath, ['scripts/miao-viz.mjs', ...args], {
    cwd: process.cwd(),
    stdio: 'pipe',
    encoding: 'utf8'
  })
}

test('poster runs the local-data pipeline and exports browser artifacts', async ({ page }) => {
  const dir = mkdtempSync(join(tmpdir(), 'miao-poster-e2e-'))
  const context = join(dir, 'context.json')
  const profile = join(dir, 'profile.json')
  const spec = join(dir, 'poster.yaml')
  const html = join(dir, 'poster.html')
  const png = join(dir, 'poster.png')
  const pdf = join(dir, 'poster.pdf')
  const input = join(process.cwd(), 'test_data/poster-ranking.csv')

  runCli(['data', 'analyze', input, '--intent', 'rank countries by Buffett indicator', '--output', context])
  writeFileSync(profile, runCli(['data', 'profile', input]))
  runCli(['spec', 'template', 'instantiate', 'data-poster-ranking', '--context', context, '--output', spec])
  runCli(['spec', 'validate', '--spec', spec, '--profile', profile, '--context', context, '--verify', '--strict'])
  runCli(['render', 'report', '--input', input, '--spec', spec, '--context', context, '--format', 'html', '--output', html])

  await page.goto(pathToFileURL(html).href)
  await expect(page.locator('h1')).toContainText('Category Ranking')
  await expect(page.locator('svg')).toHaveCount(1)
  await expect(page.locator('body')).toContainText('Source: local dataset')
  await page.screenshot({ path: png, fullPage: true })
  await page.pdf({ path: pdf, format: 'A4', printBackground: true })

  expect(statSync(png).size).toBeGreaterThan(1_000)
  expect(statSync(pdf).size).toBeGreaterThan(1_000)
})
