import { test, expect } from '@playwright/test'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'

function renderP0Report(): { html: string; pdf: string } {
  const dir = mkdtempSync(join(tmpdir(), 'miao-viz-p0-e2e-'))
  const csv = join(dir, 'data.csv'); const spec = join(dir, 'report.yaml'); const html = join(dir, 'report.html')
  writeFileSync(csv, 'region,period,actual,target,delta,rate,sample,estimated\nEast,2025,80,100,-20,0.2,5,true\nWest,2026,110,100,10,0.4,20,false\nNorth,2027,95,100,-5,0.3,8,true\n')
  writeFileSync(spec, `specVersion: 1
title: P0 Visual Diversity
layout: { preset: analytical, maxColumns: 12 }
charts:
  - type: bullet
    title: Target attainment
    encoding:
      value: { field: actual }
      target: { field: target }
  - type: dot
    variant: dumbbell
    title: Actual versus target
    encoding:
      x: { field: region }
      start: { field: actual }
      end: { field: target }
  - type: bar
    title: Regional actuals
    encoding:
      x: { field: region }
      y: { field: actual }
    references:
      - { type: line, axis: y, value: 100, label: Target }
    annotations:
      - type: point
        selector: { op: max, field: actual }
        text: Highest actual
    facet:
      column: { field: period }
      maxPanels: 3
      scales: shared
  - type: pareto
    title: Cumulative contribution
    encoding:
      x: { field: region }
      y: { field: actual }
    placement: { span: 6, emphasis: supporting }
  - type: combo-bar-line
    title: Volume and rate
    encoding:
      x: { field: period }
      y: { field: actual, unit: count }
      lineY: { field: rate, unit: percentage }
    quality: { sampleSizeField: sample, estimatedField: estimated, lowSampleThreshold: 10 }
    placement: { span: 6, emphasis: primary }
`)
  execFileSync(process.execPath, ['scripts/miao-viz.mjs', 'render', 'report', '--input', csv, '--spec', spec, '--output', html, '--no-interactive'], { encoding: 'utf8' })
  return { html, pdf: join(dir, 'report.pdf') }
}

test('P0–P1 report renders in browser and prints to PDF', async ({ page }) => {
  const artifact = renderP0Report()
  const errors: string[] = []
  page.on('pageerror', error => errors.push(error.message))
  await page.goto(pathToFileURL(artifact.html).href)
  await expect(page.locator('h1')).toContainText('P0 Visual Diversity')
  await expect(page.locator('svg')).toHaveCount(5)
  await expect(page.locator('.report-grid')).toHaveClass(/layout-analytical/)
  await expect(page.locator('.miao-facet-svg')).toHaveAttribute('data-facet-scales', 'shared')
  await expect(page.locator('body')).toContainText('Target')
  await expect(page.locator('body')).toContainText('Highest actual')
  await expect(page.locator('body')).toContainText('low-sample')
  await page.emulateMedia({ media: 'print' })
  await page.pdf({ path: artifact.pdf, format: 'A4', printBackground: true })
  expect(statSync(artifact.pdf).size).toBeGreaterThan(1_000)
  expect(errors).toEqual([])
})
