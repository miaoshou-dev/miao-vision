import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { CHART_THRESHOLDS } from './chart-catalog-thresholds'
import { collectValidationWarnings, collectVerifyIssues, strictVerifyError, validateEvidencePaths, validateReportSpec } from './spec-validator'
import { generatePatchHints } from './patch-hints'
import { getBlockById } from './report-block-registry'
import { profileDataset } from './data-profiler'
import { parseAnalyzeContext, toCompactAnalyzeContext } from './context-schema'
import type { AgentReportSpec, LoadedDataset } from './types'
import type { AnalyzeContext } from './context-schema'

function dataset(rows = 40): LoadedDataset {
  return {
    file: 'fixture.csv',
    columns: ['order_date', 'region', 'product', 'sku', 'sales', 'orders'],
    rows: Array.from({ length: rows }, (_, index) => ({
      order_date: `2026-${String((index % 5) + 1).padStart(2, '0')}-01`,
      region: ['North', 'South', 'East', 'West', 'Central'][index % 5],
      product: `Product ${String((index % 15) + 1).padStart(2, '0')}`,
      sku: `SKU${String(index + 1).padStart(3, '0')}`,
      sales: 100 + index,
      orders: 1 + (index % 8)
    }))
  }
}

function highCardinalityRegionDataset(rows = 62): LoadedDataset {
  return {
    file: 'high-region.csv',
    columns: ['region', 'sales', 'orders'],
    rows: Array.from({ length: rows }, (_, index) => ({
      region: `Region ${String((index % 31) + 1).padStart(2, '0')}`,
      sales: 100 + index,
      orders: 1 + (index % 8)
    }))
  }
}

function contextWithEvidence(evidenceCount: number): AnalyzeContext {
  const ctx = analyzeDataset(dataset())
  return { ...ctx, evidence: ctx.evidence.slice(0, evidenceCount) }
}

describe('report validation reliability fixes', () => {
  it('adds evidence coverage to high-density block scores', () => {
    for (const id of ['trend-ranking', 'full-detail-report']) {
      const block = getBlockById(id)
      expect(block).toBeDefined()
      const withoutEvidence = block?.canUse(contextWithEvidence(0))
      const withEvidence = block?.canUse(contextWithEvidence(3))
      expect(withoutEvidence?.ok).toBe(true)
      expect(withEvidence?.ok).toBe(true)
      if (!withoutEvidence?.ok || !withEvidence?.ok) return
      expect(withEvidence.score - withoutEvidence.score).toBeCloseTo(0.1, 5)
    }
  })

  it('validates transform allowlists and malformed transforms', () => {
    const profile = profileDataset(dataset())
    const pieWithMonth: AgentReportSpec = {
      charts: [{
        type: 'pie',
        data: { transform: [{ type: 'derive-month', field: 'order_date', as: 'month' }] },
        encoding: { label: { field: 'region' }, value: { field: 'sales' } }
      }]
    }
    const unsupported = validateReportSpec(pieWithMonth, profile)
    expect(unsupported.ok).toBe(false)
    if (!unsupported.ok) {
      expect(unsupported.code).toBe('UNSUPPORTED_TRANSFORM')
      expect(unsupported.detail).toMatchObject({ transformType: 'derive-month', chartType: 'pie' })
      expect(generatePatchHints(unsupported, pieWithMonth)).toEqual([{ op: 'remove', path: '/charts/0/data/transform/0' }])
    }

    const malformed: AgentReportSpec = {
      charts: [{
        type: 'bar',
        data: { transform: [{ type: 'limit', value: 0 }] },
        encoding: { x: { field: 'region' }, y: { field: 'sales' } }
      }]
    }
    const invalid = validateReportSpec(malformed, profile)
    expect(invalid.ok).toBe(false)
    if (!invalid.ok) expect(invalid.code).toBe('INVALID_TRANSFORM')
  })

  it('keeps derive-month-on-string as a warning instead of a hard error', () => {
    const profile = profileDataset(dataset())
    const spec: AgentReportSpec = {
      charts: [{
        type: 'bar',
        data: { transform: [{ type: 'derive-month', field: 'region', as: 'region_month' }] },
        encoding: { x: { field: 'region_month' }, y: { field: 'sales' } }
      }]
    }
    expect(validateReportSpec(spec, profile).ok).toBe(true)
    expect(collectValidationWarnings(spec, profile).some(w => w.includes('derive-month applied'))).toBe(true)
  })

  it('uses shared chart thresholds in analyze catalog and catalog warnings', () => {
    const ctx = analyzeDataset(highCardinalityRegionDataset())
    const blocked = ctx.catalog.blockedCharts.find(c => c.type === 'bar')
    expect(blocked?.reason).toContain(`> ${CHART_THRESHOLDS.bar.hardMaxCategories}`)

    const warningCtx = analyzeDataset(dataset())
    const spec: AgentReportSpec = {
      charts: [{ type: 'bar', encoding: { x: { field: 'product' }, y: { field: 'sales' } } }]
    }
    const warnings = collectValidationWarnings(spec, profileDataset(dataset()), warningCtx)
    expect(warnings.some(w => w.includes(`>${CHART_THRESHOLDS.bar.warningMaxCategories}`))).toBe(true)
  })

  it('collects evidence path issues across displayed text fields', () => {
    const ctx = analyzeDataset(dataset())
    const spec: AgentReportSpec = {
      title: '$evidence:missing.values.total',
      description: '$evidence:total.values.nope',
      insights: [{ text: 'Total $evidence:total.values.total_sales', evidence: ['missing'], caveat: '$evidence:by_time.rows[99].x' }],
      charts: [{ type: 'bigvalue', title: '$evidence:by_dimension.rows[99].region', encoding: { value: { field: 'sales', format: '$evidence:total.values.nope' } } }]
    }
    const result = validateEvidencePaths(spec, ctx)
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(Array.isArray(result.issues)).toBe(true)
      expect((result.issues as unknown[]).length).toBeGreaterThan(4)
      expect(JSON.stringify(result.issues)).toContain('description')
      expect(JSON.stringify(result.issues)).toContain('caveat')
    }
  })

  it('marks invalid correctAssumption fields as low-confidence partial assumptions', () => {
    const valid = analyzeDataset(dataset(), { correctAssumption: 'primary_measure=orders' })
    expect(valid.intent.assumptions.find(a => a.key === 'primary_measure')?.value).toBe('orders')
    expect(valid.intent.assumptions.find(a => a.key === 'primary_measure')?.confidence).toBeGreaterThan(0)

    const invalid = analyzeDataset(dataset(), { correctAssumption: 'primary_measure=missing_sales' })
    const correction = invalid.intent.assumptions.find(a => a.value === 'missing_sales')
    expect(invalid.intent.coverage).toBe('partial')
    expect(correction?.confidence).toBe(0)
    expect(correction?.reason).toContain('unknown or incompatible field')
  })

  it('returns structured verify issues and patch hints without parsing message text', () => {
    const ctx = analyzeDataset(dataset())
    const spec: AgentReportSpec = {
      charts: [{ type: 'bigvalue', encoding: { value: { field: 'sales' } } }],
      insights: [{ type: 'trend', text: 'sales summary', evidence: [] }]
    }
    const issues = collectVerifyIssues(spec, ctx)
    const missing = issues.find(i => i.code === 'INSIGHT_REQUIRED_EVIDENCE_MISSING_STRICT')
    expect(missing?.insightType).toBe('trend')
    expect(missing?.requiredEvidence).toEqual(['by_time'])

    const strict = strictVerifyError([{ ...missing!, message: 'changed wording that contains no parseable evidence list' }])
    expect(strict.ok).toBe(false)
    if (!strict.ok) {
      expect(generatePatchHints(strict, spec)).toEqual([{ op: 'add', path: '/insights/0/evidence/-', value: 'by_time' }])
    }
  })

  it('does not emit placeholder patches for unknown replacement fields', () => {
    const profile = profileDataset(dataset())
    const missingEncoding: AgentReportSpec = { charts: [{ type: 'bar', encoding: { x: { field: 'region' } } }] }
    const missingResult = validateReportSpec(missingEncoding, profile)
    expect(missingResult.ok).toBe(false)
    if (!missingResult.ok) expect(generatePatchHints(missingResult, missingEncoding)).toBeUndefined()

    const duplicate: AgentReportSpec = {
      charts: [
        { id: 'dup', type: 'bigvalue', encoding: { value: { field: 'sales' } } },
        { id: 'dup', type: 'bigvalue', encoding: { value: { field: 'orders' } } },
        { id: 'dup_2', type: 'bigvalue', encoding: { value: { field: 'orders' } } }
      ]
    }
    const duplicateResult = validateReportSpec(duplicate, profile)
    expect(duplicateResult.ok).toBe(false)
    if (!duplicateResult.ok) expect(generatePatchHints(duplicateResult, duplicate)).toEqual([{ op: 'replace', path: '/charts/1/id', value: 'dup_3' }])
  })

  it('warns for executable scatter, histogram, and table catalog rules', () => {
    const small = analyzeDataset(dataset(10))
    const profile = profileDataset(dataset(10))
    const oneMeasureWideContext = {
      ...small,
      fields: [
        ...small.fields.filter(f => f.name !== 'orders'),
        ...Array.from({ length: 5 }, (_, i) => ({ name: `extra_${i}`, role: 'dimension' as const, type: 'string' as const }))
      ]
    }
    const warnings = collectValidationWarnings({
      charts: [
        { id: 'scatter', type: 'scatter', encoding: { x: { field: 'sales' }, y: { field: 'sales' } } },
        { id: 'hist', type: 'histogram', encoding: { x: { field: 'sales' } } },
        { id: 'wide', type: 'table' }
      ]
    }, profile, oneMeasureWideContext)
    expect(warnings.some(w => w.includes('SCATTER_NEEDS_TWO_MEASURES'))).toBe(true)
    expect(warnings.some(w => w.includes('HISTOGRAM_SMALL_SAMPLE'))).toBe(true)
    expect(warnings.some(w => w.includes('TABLE_TOO_MANY_COLUMNS'))).toBe(true)
  })

  it('keeps compact context behavior fields lossless enough for validate and block scoring', () => {
    const ctx = analyzeDataset(dataset())
    const compact = toCompactAnalyzeContext(ctx)
    const parsed = parseAnalyzeContext(compact)
    expect(parsed).not.toBeNull()
    expect(parsed?.promptRules).toContain('Every insight must cite at least one evidence id from the evidence array.')
    expect(parsed?.evidence.find(e => e.id === 'total')?.query).toBe(ctx.evidence.find(e => e.id === 'total')?.query)
    expect(parsed?.metricCandidates?.[0]?.label).toBe(ctx.metricCandidates?.[0]?.label)
    expect(parsed?.catalog.recommendedPlan).toEqual(ctx.catalog.recommendedPlan)
    expect(parsed?.catalog.blocks?.[0].requiredEvidence).toEqual(ctx.catalog.blocks?.[0].requiredEvidence)
    expect(parsed?.catalog.templates?.[0]?.requiredEvidence).toEqual(ctx.catalog.templates?.[0]?.requiredEvidence)
  })
})
