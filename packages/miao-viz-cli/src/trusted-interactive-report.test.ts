import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { toCompactAnalyzeContext, fromCompactAnalyzeContext } from './context-compact'
import { planInteractions } from './interaction-planner'
import { collectReportFieldDependencies } from './report-field-dependencies'
import { classifyReportFields } from './report-sensitivity'
import { INTERACTIVE_HTML_HARD_BUDGET_BYTES, packageTrustedArtifact } from './trusted-artifact'
import { renderStaticHtml } from './html-export'
import type { AnalyzeContext, AnalyzeField } from './context-schema'
import type { AgentReportSpec, DataProfile, LoadedDataset } from './types'

const rows = [
  { region: 'East', month: '2026-01-01', sales: 10, customer_email: 'a@example.com', secret_token: 'x' },
  { region: 'West', month: '2026-02-01', sales: 20, customer_email: 'b@example.com', secret_token: 'y' }
]

const profile: DataProfile = {
  file: 'sales.csv', rows: 2, columns: [
    column('region', 'string', 'dimension', 2), column('month', 'date', 'time', 2), column('sales', 'number', 'measure', 2),
    column('customer_email', 'string', 'text', 2), column('secret_token', 'string', 'text', 2)
  ]
}

const trustedSpec: AgentReportSpec = {
  locale: 'zh-CN',
  interactions: {
    globalFilters: [{ field: 'region', type: 'select' }],
    dataPolicy: { mode: 'detail-safe', detailFields: ['region', 'sales'], excludeFields: ['customer_email', 'secret_token'] },
    currentView: { summaries: [{ id: 'sales', label: '当前销售额', recipe: { schemaVersion: 1, measures: [{ operation: 'sum', field: 'sales', alias: 'value' }] }, format: 'currency' }] }
  },
  charts: [{ id: 'sales-by-region', type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'sales', aggregate: 'sum' } } }]
}

describe('trusted interactive report', () => {
  it('collects dependency closure and detects excluded conflicts', () => {
    const result = collectReportFieldDependencies({ ...trustedSpec, interactions: { ...trustedSpec.interactions!, dataPolicy: { mode: 'minimal', excludeFields: ['sales'] } } })
    expect(result.required).toEqual(['region', 'sales'])
    expect(result.excludedConflicts).toEqual(['sales'])
  })

  it('classifies contact and credential fields without claiming complete detection', () => {
    const findings = classifyReportFields(profile)
    expect(findings.find(item => item.field === 'customer_email')?.level).toBe('review')
    expect(findings.find(item => item.field === 'secret_token')?.level).toBe('restricted')
  })

  it('projects trusted rows and keeps excluded values out of runtime JSON', () => {
    const result = packageTrustedArtifact(trustedSpec, profile, rows, { evidenceVerified: true })
    expect(result.rows).toEqual([{ region: 'East', sales: 10 }, { region: 'West', sales: 20 }])
    expect(JSON.stringify(result.rows)).not.toContain('example.com')
    expect(result.shareSafe).toBe(true)
  })

  it('keeps legacy full-row embedding but never marks it share-safe', () => {
    const legacy = packageTrustedArtifact({ charts: trustedSpec.charts }, profile, rows)
    expect(legacy.rows[0]).toHaveProperty('customer_email')
    expect(legacy.shareSafe).toBe(false)
    expect(legacy.shareSafety.checks[0].issues[0].code).toBe('LEGACY_FULL_ROW_EMBEDDING')
  })

  it('aggregates a hard artifact budget failure into restricted share safety', () => {
    const result = packageTrustedArtifact(trustedSpec, profile, rows, { evidenceVerified: true, artifactBytes: INTERACTIVE_HTML_HARD_BUDGET_BYTES + 1 })
    expect(result.shareSafe).toBe(false)
    expect(result.shareSafety.status).toBe('restricted')
    expect(result.shareSafety.checks.find(check => check.id === 'artifact_budget')?.issues[0].severity).toBe('error')
  })

  it('round-trips interaction recommendations through compact-v1', () => {
    const context = analyzeDataset(dataset(), { intent: 'Filter by region and inspect order details' })
    const restored = fromCompactAnalyzeContext(toCompactAnalyzeContext(context))
    expect(restored.catalog.interactions).toEqual(context.catalog.interactions)
    expect(Buffer.byteLength(JSON.stringify(toCompactAnalyzeContext(context).catalog.interactions), 'utf8')).toBeLessThanOrEqual(2048)
  })

  it('renders localized summaries and exposure details without print actions', () => {
    const trust = packageTrustedArtifact(trustedSpec, profile, rows, { evidenceVerified: true })
    const html = renderStaticHtml(trustedSpec, profile, trust.rows, undefined, { enabled: true, exposureManifest: trust.manifest, shareSafetyChecks: trust.shareSafety.checks })
    expect(html).toContain('<html lang="zh-CN">')
    expect(html).toContain('嵌入数据详情')
    expect(html).not.toContain('打印当前视图')
    expect(html).not.toContain('打印完整发布报告')
    expect(html).not.toContain('data-print=')
    expect(html).toContain('miao-current-view-grid')
  })

  it('evaluates a 30-case deterministic golden corpus with no restricted recommendation', () => {
    const corpus = Array.from({ length: 30 }, (_, index) => ({
      intent: index % 3 === 0 ? 'Inspect order details by region' : 'Filter report by region',
      fields: plannerFields(index % 5 === 0)
    }))
    const outcomes = corpus.map(item => planInteractions({ intent: intent(item.intent), fields: item.fields }))
    expect(outcomes).toHaveLength(30)
    expect(outcomes.filter(items => items.length > 0)).toHaveLength(30)
    expect(outcomes.flat().flatMap(item => [...item.filters.map(filter => filter.field), ...(item.detailFields ?? [])])).not.toContain('secret_token')
  })
})

function column(name: string, type: 'string' | 'number' | 'date', role: 'dimension' | 'time' | 'measure' | 'text', distinctCount: number) {
  return { name, type, role, total: 2, nonNullCount: 2, nullCount: 0, nullRate: 0, fillRate: 1, uniqueRate: distinctCount / 2, samples: [], distinctCount }
}

function dataset(): LoadedDataset {
  return { file: 'sales.csv', columns: Object.keys(rows[0]), rows }
}

function intent(raw: string): AnalyzeContext['intent'] {
  return { raw, coverage: 'full', assumptions: [] }
}

function plannerFields(includeRestricted: boolean): AnalyzeField[] {
  return [
    { name: 'region', role: 'dimension', type: 'string', distinctCount: 4 },
    { name: 'sales', role: 'measure', type: 'number' },
    { name: 'product', role: 'dimension', type: 'string', distinctCount: 8 },
    ...(includeRestricted ? [{ name: 'secret_token', role: 'text' as const, type: 'string' as const, distinctCount: 30 }] : [])
  ]
}
