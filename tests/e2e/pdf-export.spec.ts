import { test, expect } from '@playwright/test'
import { spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'

test('CLI exports report and 16:9 deck PDFs', () => {
  const dir = mkdtempSync(join(tmpdir(), 'miao-pdf-e2e-'))
  const context = join(dir, 'context.json')
  const spec = join(dir, 'report.yaml')
  const report = join(dir, 'report.pdf')
  const deck = join(dir, 'deck.pdf')
  const cli = (args: string[]) => {
    const result = spawnSync(process.execPath, ['scripts/miao-viz.mjs', ...args], {
      encoding: 'utf8',
      env: Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith('PW_')))
    })
    if (result.status !== 0) throw new Error(result.stdout || result.stderr)
    return result.stdout
  }

  cli(['data', 'analyze', 'test_data/report_workflow_sales.csv', '--intent', 'sales performance', '--output', context])
  cli(['spec', 'block', 'instantiate', 'trend-ranking', '--context', context, '--output', spec])
  cli(['render', 'report', '--input', 'test_data/report_workflow_sales.csv', '--spec', spec, '--context', context, '--format', 'pdf', '--output', report])
  cli(['render', 'deck', '--input', 'packages/miao-viz-cli/examples/sales.csv', '--spec', 'packages/miao-viz-cli/examples/sales-deck.yaml', '--format', 'pdf', '--output', deck])

  expect(statSync(report).size).toBeGreaterThan(1_000)
  expect(statSync(deck).size).toBeGreaterThan(1_000)
  expect(readFileSync(report).subarray(0, 4).toString()).toBe('%PDF')
  const deckText = readFileSync(deck).toString('latin1')
  expect(deckText.match(/\/Type\s*\/Page\b/g)).toHaveLength(6)
})
