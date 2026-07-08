import { describe, it, expect } from 'vitest'
import { insightTotal, insightTrend, insightTopN, insightPeriodChange } from './block-insight-generator'
import type { MetricCandidate, AnalyzeField, AnalyzeEvidence } from './context-schema'
import type { BlockMatchContext } from './report-block-registry'
import { BLOCK_REGISTRY } from './report-block-registry'

describe('insightTotal', () => {
  it('generates total insight with $evidence reference', () => {
    const result = insightTotal('sales')
    expect(result.text).toContain('$evidence:total.values.total_sales')
    expect(result.evidence).toEqual(['total'])
  })
})

describe('insightTopN', () => {
  it('generates top N insight', () => {
    const result = insightTopN('region', 'sales', 10)
    expect(result.text).toContain('$evidence:by_dimension.rows[0].region')
    expect(result.text).toContain('$evidence:by_dimension.rows[0].total_sales')
    expect(result.text).toContain('Top 10')
    expect(result.evidence).toEqual(['by_dimension'])
  })
})

describe('insightTrend', () => {
  it('generates trend insight with from/to references', () => {
    const result = insightTrend('month', 'sales')
    expect(result).not.toBeNull()
    if (result) {
      expect(result.text).toContain('$evidence:by_time.rows[0].total_sales')
      expect(result.text).toContain('$evidence:by_time.rows[last].total_sales')
      expect(result.evidence).toEqual(['by_time'])
    }
  })

  it('includes period change when candidate is provided', () => {
    const candidate: MetricCandidate = {
      id: 'period_change_sales',
      type: 'period_change',
      label: 'sales period-over-period change',
      formula: '(latest - prev) / prev',
      value: 0.153,
      confidence: 'high'
    }
    const result = insightTrend('month', 'sales', candidate)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.text).toContain('increased')
      expect(result.text).toContain('15.3')
    }
  })

  it('handles negative period change', () => {
    const candidate: MetricCandidate = {
      id: 'period_change_sales',
      type: 'period_change',
      label: 'sales period-over-period change',
      formula: '(latest - prev) / prev',
      value: -0.05,
      confidence: 'high'
    }
    const result = insightTrend('month', 'sales', candidate)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.text).toContain('decreased')
      expect(result.text).toContain('5.0')
    }
  })

  it('handles zero period change', () => {
    const candidate: MetricCandidate = {
      id: 'period_change_sales',
      type: 'period_change',
      label: 'sales period-over-period change',
      formula: '(latest - prev) / prev',
      value: 0,
      confidence: 'high'
    }
    const result = insightTrend('month', 'sales', candidate)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.text).toContain('unchanged')
    }
  })
})

describe('insightPeriodChange', () => {
  it('returns null when value is undefined', () => {
    const candidate: MetricCandidate = {
      id: 'period_change_sales',
      type: 'period_change',
      label: 'sales period-over-period change',
      formula: '(latest - prev) / prev',
      confidence: 'high'
    }
    expect(insightPeriodChange(candidate)).toBeNull()
  })

  it('generates insight for positive change', () => {
    const candidate: MetricCandidate = {
      id: 'period_change_sales',
      type: 'period_change',
      label: 'sales period-over-period change',
      formula: '(latest - prev) / prev',
      value: 0.25,
      confidence: 'high'
    }
    const result = insightPeriodChange(candidate)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.text).toContain('increased')
      expect(result.text).toContain('25.0')
      expect(result.evidence).toEqual(['by_time'])
    }
  })

  it('generates insight for negative change with one decimal', () => {
    const candidate: MetricCandidate = {
      id: 'period_change_sales',
      type: 'period_change',
      label: 'sales period-over-period change',
      formula: '(latest - prev) / prev',
      value: -0.1,
      confidence: 'high'
    }
    const result = insightPeriodChange(candidate)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.text).toContain('decreased')
      expect(result.text).toContain('10')
    }
  })
})

function makeMockEvidence(): AnalyzeEvidence[] {
  return [
    { id: 'total', query: 'total aggregates', values: { total_sales: 100000, row_count: 500 } },
    {
      id: 'by_dimension', query: 'sales by region',
      rows: [
        { region: 'East', total_sales: 40000, share: 0.4 },
        { region: 'West', total_sales: 30000, share: 0.3 }
      ]
    },
    {
      id: 'by_time', query: 'sales by month',
      rows: [
        { month: '2024-01', total_sales: 30000 },
        { month: '2024-02', total_sales: 35000 },
        { month: '2024-03', total_sales: 40000 }
      ]
    }
  ]
}

function makeMockBlockCtx(overrides?: Partial<BlockMatchContext>): BlockMatchContext {
  const fields: AnalyzeField[] = [
    { name: 'sales', role: 'measure', type: 'number' },
    { name: 'region', role: 'dimension', type: 'string', distinctCount: 5 },
    { name: 'month', role: 'time', type: 'date', timePeriods: 3 }
  ]
  return {
    fields,
    evidence: makeMockEvidence(),
    catalog: { charts: ['bigvalue', 'bar', 'line', 'pie', 'table'], blockedCharts: [] },
    sampleWarnings: [],
    metricCandidates: [
      {
      id: 'period_change_sales',
      type: 'period_change',
      label: 'sales period-over-period change',
      formula: '(latest - prev) / prev',
      value: 0.153,
        confidence: 'high'
      }
    ],
    ...overrides
  }
}

describe('block compile() produces insights', () => {
  it('kpi-summary generates insight', () => {
    const block = BLOCK_REGISTRY.find(b => b.id === 'kpi-summary')
    expect(block).toBeDefined()
    if (!block) return
    const ctx = makeMockBlockCtx()
    const vars = block.defaultVariables(ctx)
    const result = block.compile(vars, ctx)
    expect(result.insights).toBeDefined()
    expect(result.insights!.length).toBeGreaterThanOrEqual(1)
  })

  it('snapshot-ranking generates insights', () => {
    const block = BLOCK_REGISTRY.find(b => b.id === 'snapshot-ranking')
    expect(block).toBeDefined()
    if (!block) return
    const ctx = makeMockBlockCtx()
    const vars = block.defaultVariables(ctx)
    const result = block.compile(vars, ctx)
    expect(result.insights).toBeDefined()
    expect(result.insights!.length).toBeGreaterThanOrEqual(2)
    const totalInsight = result.insights![0]
    expect(totalInsight.text).toContain('$evidence:total.values.total_sales')
  })

  it('trend-overview generates insights', () => {
    const block = BLOCK_REGISTRY.find(b => b.id === 'trend-overview')
    expect(block).toBeDefined()
    if (!block) return
    const ctx = makeMockBlockCtx()
    const vars = block.defaultVariables(ctx)
    const result = block.compile(vars, ctx)
    expect(result.insights).toBeDefined()
    expect(result.insights!.length).toBeGreaterThanOrEqual(2)
    const trendText = result.insights!.map(i => i.text).join(' ')
    expect(trendText).toContain('increased')
  })

  it('comparison-breakdown generates insights', () => {
    const block = BLOCK_REGISTRY.find(b => b.id === 'comparison-breakdown')
    expect(block).toBeDefined()
    if (!block) return
    const ctx = makeMockBlockCtx()
    const vars = block.defaultVariables(ctx)
    const result = block.compile(vars, ctx)
    expect(result.insights).toBeDefined()
    expect(result.insights!.length).toBeGreaterThanOrEqual(2)
  })

  it('trend-ranking generates insights', () => {
    const block = BLOCK_REGISTRY.find(b => b.id === 'trend-ranking')
    expect(block).toBeDefined()
    if (!block) return
    const ctx = makeMockBlockCtx()
    const vars = block.defaultVariables(ctx)
    const result = block.compile(vars, ctx)
    expect(result.insights).toBeDefined()
    expect(result.insights!.length).toBeGreaterThanOrEqual(3)
  })

  it('full-detail-report generates insights', () => {
    const block = BLOCK_REGISTRY.find(b => b.id === 'full-detail-report')
    expect(block).toBeDefined()
    if (!block) return
    const ctx = makeMockBlockCtx()
    const vars = block.defaultVariables(ctx)
    const result = block.compile(vars, ctx)
    expect(result.insights).toBeDefined()
    expect(result.insights!.length).toBeGreaterThanOrEqual(3)
  })
})
