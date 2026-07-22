import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { profileDataset } from './data-profiler'
import { renderStaticHtml } from './html-export'
import { TEMPLATE_REGISTRY } from './report-template-registry'
import { renderChartSvg } from './svg-renderer'
import { validateReportSpec } from './spec-validator'
import { stableCategoryColor } from './semantic-color'
import type { AgentReportSpec, LoadedDataset } from './types'

const rows = [
  { month: '2025-01', region: 'East', revenue: 100, rate: 0.2, sample: 5, estimated: true },
  { month: '2025-02', region: 'West', revenue: 80, rate: 0.3, sample: 20, estimated: false },
  { month: '2025-03', region: 'North', revenue: 40, rate: 0.5, sample: 8, estimated: true }
]
const dataset: LoadedDataset = { file: 'p1.csv', rows, columns: Object.keys(rows[0]) }
const profile = profileDataset(dataset)

describe('P1 visual diversity', () => {
  it('renders pareto and constrained combo charts', () => {
    const pareto = renderChartSvg({ type: 'pareto', encoding: { x: { field: 'region' }, y: { field: 'revenue' } } }, rows)
    const combo = renderChartSvg({ type: 'combo-bar-line', encoding: { x: { field: 'month' }, y: { field: 'revenue' }, lineY: { field: 'rate' } } }, rows)
    expect(pareto).toContain('100%')
    expect(combo).toContain('bars')
    expect(combo).toContain('line')
  })

  it('rejects negative pareto values and invalid diverging color domains', () => {
    const negativeDataset: LoadedDataset = { file: 'negative.csv', rows: [{ category: 'A', value: -1 }], columns: ['category', 'value'] }
    const negative = validateReportSpec({ charts: [{ type: 'pareto', encoding: { x: { field: 'category' }, y: { field: 'value' } } }] }, profileDataset(negativeDataset))
    expect(negative.ok).toBe(false)
    if (!negative.ok) expect(negative.code).toBe('PARETO_NEGATIVE_VALUE')
    const color = validateReportSpec({ charts: [{ type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'revenue' } }, colorScale: { type: 'diverging', domain: [-1, 1] } }] }, profile)
    expect(color.ok).toBe(false)
  })

  it('requires explicit, different units for combo charts', () => {
    const genericProfile = profileDataset({ file: 'generic.csv', rows: [{ x: 'A', a: 1, b: 2 }], columns: ['x', 'a', 'b'] })
    const missing = validateReportSpec({ charts: [{ type: 'combo-bar-line', encoding: { x: { field: 'x' }, y: { field: 'a' }, lineY: { field: 'b' } } }] }, genericProfile)
    expect(missing.ok).toBe(false)
    if (!missing.ok) expect(missing.code).toBe('COMBO_UNIT_REQUIRED')
    const same = validateReportSpec({ charts: [{ type: 'combo-bar-line', encoding: { x: { field: 'month' }, y: { field: 'revenue', unit: 'currency' }, lineY: { field: 'rate', unit: 'currency' } } }] }, profile)
    expect(same.ok).toBe(false)
    if (!same.ok) expect(same.code).toBe('COMBO_SAME_UNIT')
    const valid = validateReportSpec({ charts: [{ type: 'combo-bar-line', encoding: { x: { field: 'month' }, y: { field: 'revenue', unit: 'currency' }, lineY: { field: 'rate', unit: 'percentage' } } }] }, profile)
    expect(valid.ok).toBe(true)
  })

  it('registers and instantiates all six P1 report templates', () => {
    const ids = ['executive-scorecard', 'distribution-diagnostics', 'conversion-journey', 'variance-bridge', 'cohort-comparison', 'relationship-analysis']
    const context = analyzeDataset(dataset, { intent: 'compare trend relationship distribution conversion target change' })
    for (const id of ids) {
      const template = TEMPLATE_REGISTRY.find(item => item.id === id)
      expect(template).toBeTruthy()
      const spec = template!.instantiate(context)
      expect(spec.charts.length).toBeGreaterThanOrEqual(3)
      expect(validateReportSpec(spec, profile).ok).toBe(true)
      expect(template!.layoutPreset).toBeTruthy()
    }
  })

  it('renders responsive grid placement and printable quality badges', () => {
    const spec: AgentReportSpec = {
      title: 'P1', layout: { preset: 'analytical', maxColumns: 12 }, charts: [{
        type: 'bar', title: 'Quality-aware ranking', encoding: { x: { field: 'region' }, y: { field: 'revenue' } },
        placement: { span: 8, emphasis: 'primary' }, quality: { sampleSizeField: 'sample', estimatedField: 'estimated', lowSampleThreshold: 10 }
      }]
    }
    const html = renderStaticHtml(spec, profile, rows)
    expect(html).toContain('report-grid layout-analytical')
    expect(html).toContain('--mv-span:8')
    expect(html).toContain('low-sample')
    expect(html).toContain('@media print')
  })

  it('keeps category colors stable and exposes color semantics', () => {
    const palette = ['#0072B2', '#E69F00', '#009E73']
    expect(stableCategoryColor('East', palette)).toBe(stableCategoryColor('East', [...palette]))
    const svg = renderChartSvg({ type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'revenue' } }, colorScale: { type: 'qualitative' } }, rows)
    expect(svg).toContain(stableCategoryColor('East', ['#0072B2', '#E69F00', '#009E73', '#CC79A7', '#56B4E9', '#D55E00']))
  })
})
