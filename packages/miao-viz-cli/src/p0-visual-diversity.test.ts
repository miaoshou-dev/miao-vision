import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { analyzeDataset } from './analyzer'
import { collectArtifactSizeWarnings, STATIC_HTML_SOFT_BUDGET_BYTES } from './artifact-budget'
import { CHART_CATALOG } from './chart-catalog'
import { resolveChartEvidence } from './chart-evidence'
import { profileDataset } from './data-profiler'
import { collectVisualDiversityIssues } from './report-diversity-audit'
import { renderChartSvg } from './svg-renderer'
import { validateReportSpec } from './spec-validator'
import { scoreVisualDecisions, type GoldenDecisionCase } from './visual-benchmark'
import type { AgentChartSpec, AgentReportSpec, LoadedDataset } from './types'

const rows = [
  { category: '华东', period: '2025', value: -20, actual: 80, target: 100, low: 70, high: 110 },
  { category: '华南', period: '2026', value: 35, actual: 105, target: 100, low: 90, high: 120 },
  { category: '华北', period: '2027', value: 10, actual: 95, target: 100, low: 85, high: 115 }
]
const dataset: LoadedDataset = { file: 'p0.csv', rows, columns: Object.keys(rows[0]) }
const profile = profileDataset(dataset)

describe('P0 visual diversity contracts', () => {
  it('rejects future spec versions without silently degrading', () => {
    const result = validateReportSpec({ specVersion: 2, charts: [{ type: 'table', encoding: {} }] }, profile)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.code).toBe('UNSUPPORTED_SPEC_VERSION')
  })

  it.each([
    [{ type: 'dot', variant: 'standard', encoding: { x: { field: 'category' }, y: { field: 'actual' } } }, '<circle'],
    [{ type: 'dot', variant: 'lollipop', encoding: { x: { field: 'category' }, y: { field: 'actual' } } }, '<line'],
    [{ type: 'dot', variant: 'dumbbell', encoding: { x: { field: 'category' }, start: { field: 'actual' }, end: { field: 'target' } } }, '→'],
    [{ type: 'bar', variant: 'diverging', encoding: { x: { field: 'category' }, y: { field: 'value' } } }, '#dc2626'],
    [{ type: 'bullet', encoding: { value: { field: 'actual' }, target: { field: 'target' } } }, '<rect'],
    [{ type: 'range', encoding: { x: { field: 'period' }, lower: { field: 'low' }, upper: { field: 'high' } } }, '<path']
  ] as Array<[AgentChartSpec, string]>)('renders %s', (chart, marker) => {
    expect(renderChartSvg(chart, rows)).toContain(marker)
    expect(renderChartSvg(chart, rows)).not.toContain('not implemented yet')
  })

  it('renders references, deterministic annotations, and facet panels into SVG', () => {
    const chart: AgentChartSpec = {
      type: 'bar', encoding: { x: { field: 'category' }, y: { field: 'actual' } },
      references: [{ type: 'line', axis: 'y', value: 100, label: '目标' }],
      annotations: [{ type: 'point', selector: { op: 'max-change', mode: 'between-fields', startField: 'actual', endField: 'target' }, text: '最大差距' }],
      facet: { column: { field: 'period' }, maxPanels: 3, scales: 'shared' }
    }
    const svg = renderChartSvg(chart, rows)
    expect(svg).toContain('目标')
    expect(svg).toContain('最大差距')
    expect(svg).toContain('2025')
    expect(svg.match(/<svg/g)?.length).toBe(1)
  })

  it('requires evidence for data-derived references and validates variants', () => {
    const referenceResult = validateReportSpec({ charts: [{ type: 'bar', encoding: { x: { field: 'category' }, y: { field: 'actual' } }, references: [{ type: 'line', axis: 'y', field: 'target', aggregate: 'avg' }] }] }, profile)
    expect(referenceResult.ok).toBe(false)
    if (!referenceResult.ok) expect(referenceResult.code).toBe('INVALID_REFERENCE_SOURCE')
    const variantResult = validateReportSpec({ charts: [{ type: 'dot', variant: 'pie-like', encoding: { x: { field: 'category' }, y: { field: 'actual' } } }] }, profile)
    expect(variantResult.ok).toBe(false)
    if (!variantResult.ok) expect(variantResult.code).toBe('UNSUPPORTED_CHART_VARIANT')
  })

  it('resolves numeric evidence directives used by chart references', () => {
    const context = analyzeDataset(dataset, { intent: 'summarize actual' })
    const spec: AgentReportSpec = { charts: [{ type: 'bar', encoding: { x: { field: 'category' }, y: { field: 'actual' } }, references: [{ type: 'line', axis: 'y', value: '$evidence:total.values.total_actual', label: 'Total' }] }] }
    const resolved = resolveChartEvidence(spec, context)
    expect(resolved.charts[0].references?.[0].value).toBe(280)
    expect(validateReportSpec(spec, profile, ['html'], context).ok).toBe(true)
  })

  it('emits report-level diversity issues without changing the spec', () => {
    const spec: AgentReportSpec = { charts: Array.from({ length: 5 }, (_, index) => ({ id: `k${index}`, type: 'bigvalue', encoding: { value: { field: 'actual' } } })) }
    const codes = collectVisualDiversityIssues(spec).map(issue => issue.code)
    expect(codes).toContain('LOW_VISUAL_VARIETY')
    expect(codes).toContain('REPEATED_CHART_TYPE')
    expect(codes).toContain('EXCESSIVE_KPI_SHARE')
  })

  it('gives extended charts executable rules and emits explainable recommendations', () => {
    expect(CHART_CATALOG.filter(item => ['progress', 'sparkline', 'delta'].includes(item.id)).every(item => item.rules.length > 0)).toBe(true)
    const context = analyzeDataset(dataset, { intent: 'compare actual versus target and show change' })
    expect(context.intent.visualTasks?.some(task => task.family === 'change')).toBe(true)
    expect(context.catalog.recommendations?.some(item => item.chartType === 'dot' && item.variant === 'dumbbell')).toBe(true)
  })

  it('contains 60 human-labelled decisions and scores deterministically', () => {
    const fixture = JSON.parse(readFileSync('packages/miao-viz-cli/fixtures/golden-visual-decisions.json', 'utf8')) as { families: Array<Omit<GoldenDecisionCase, 'prompt'> & { prompts: string[] }> }
    const cases = fixture.families.flatMap(family => family.prompts.map(prompt => ({ ...family, prompt })))
    expect(cases).toHaveLength(60)
    const selected = cases.map(testCase => testCase.preferred[0])
    const result = scoreVisualDecisions(cases, selected)
    expect(result.weightedSelectionRate).toBe(1)
    expect(result.blockedSelectionRate).toBe(0)
    expect(result.nonBasicAdoptionRate).toBeGreaterThanOrEqual(0.4)
  })

  it('warns when a non-interactive self-contained artifact exceeds its soft budget', () => {
    expect(collectArtifactSizeWarnings('x'.repeat(STATIC_HTML_SOFT_BUDGET_BYTES + 1), false)[0]).toContain('LARGE_ARTIFACT_SIZE')
    expect(collectArtifactSizeWarnings('x'.repeat(STATIC_HTML_SOFT_BUDGET_BYTES + 1), true)).toEqual([])
  })
})
