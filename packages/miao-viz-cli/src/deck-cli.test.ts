import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import type { AnalyzeContext } from './context-schema'

function writeJson(dir: string, name: string, value: unknown): string {
  const path = join(dir, name)
  writeFileSync(path, JSON.stringify(value), 'utf8')
  return path
}

function runCli(args: string[]): { status: number | null; output: any } {
  const result = spawnSync(process.execPath, ['scripts/miao-viz.mjs', ...args], { encoding: 'utf8' })
  return { status: result.status, output: JSON.parse(result.stdout) }
}

function context(): AnalyzeContext {
  return {
    intent: { raw: 'executive brief', coverage: 'full', assumptions: [] },
    fields: [{ name: 'sales', role: 'measure', type: 'number' }],
    evidence: [{ id: 'total', query: 'total sales', values: { sales: 650 } }],
    catalog: { charts: ['bigvalue'], blockedCharts: [], recommendedPlan: [] },
    sampleWarnings: [],
    promptRules: []
  }
}

describe('deck CLI knowledge validation', () => {
  it('validates a grounded deck', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const spec = writeJson(dir, 'deck.json', {
      slides: [{
        layout: 'title-only',
        claim: 'Total sales were 650.',
        claimType: 'descriptive',
        evidence: ['total'],
        derivedFrom: ['$evidence:total.values.sales'],
        check: 'value_match'
      }]
    })
    const ctx = writeJson(dir, 'context.json', context())
    const result = runCli(['deck', 'validate', '--spec', spec, '--context', ctx, '--verify', '--strict'])
    expect(result.status).toBe(0)
    expect(result.output.ok).toBe(true)
  })

  it('returns warnings in non-strict mode and fails in strict mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const spec = writeJson(dir, 'deck.json', {
      slides: [{ layout: 'title-only', claim: 'Sales increased 20%.' }]
    })
    const ctx = writeJson(dir, 'context.json', context())

    const normal = runCli(['deck', 'validate', '--spec', spec, '--context', ctx])
    expect(normal.status).toBe(0)
    expect(normal.output.value.issues.some((item: { code: string }) => item.code === 'DECK_NUMERIC_CLAIM_UNGROUNDED')).toBe(true)

    const strict = runCli(['deck', 'validate', '--spec', spec, '--context', ctx, '--strict'])
    expect(strict.status).toBe(1)
    expect(strict.output.code).toBe('DECK_NUMERIC_CLAIM_UNGROUNDED')
  })

  it('keeps legacy render and reports skipped checks', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const output = join(dir, 'deck.html')
    const result = runCli([
      'render', 'deck',
      '--input', 'packages/miao-viz-cli/examples/sales.csv',
      '--spec', 'packages/miao-viz-cli/examples/sales-deck.yaml',
      '--output', output
    ])
    expect(result.status).toBe(0)
    expect(result.output.value.skippedChecks).toContain('claim grounding')
    expect(readFileSync(output, 'utf8')).toContain('class="slide-nav"')
  })

  it('requires context for strict rendering', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const result = runCli([
      'render', 'deck',
      '--input', 'packages/miao-viz-cli/examples/sales.csv',
      '--spec', 'packages/miao-viz-cli/examples/sales-deck.yaml',
      '--strict',
      '--output', join(dir, 'deck.html')
    ])
    expect(result.status).toBe(1)
    expect(result.output.code).toBe('DECK_CONTEXT_REQUIRED')
  })

  it('renders successfully with context verification in strict mode', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-deck-cli-'))
    const output = join(dir, 'deck.html')
    const spec = writeJson(dir, 'deck.json', {
      slides: [{
        layout: 'title-only',
        claim: 'Total sales were 650.',
        claimType: 'descriptive',
        evidence: ['total'],
        derivedFrom: ['$evidence:total.values.sales'],
        check: 'value_match'
      }]
    })
    const ctx = writeJson(dir, 'context.json', context())
    const result = runCli([
      'render', 'deck',
      '--input', 'packages/miao-viz-cli/examples/sales.csv',
      '--spec', spec,
      '--context', ctx,
      '--verify',
      '--strict',
      '--output', output
    ])
    expect(result.status).toBe(0)
    expect(result.output.value.issues).toEqual([])
    expect(result.output.value.skippedChecks).toBeUndefined()
  })
})
