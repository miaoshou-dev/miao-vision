import { describe, expect, it } from 'vitest'
import { analyzeDataset } from './analyzer'
import { renderStaticHtml } from './html-export'
import { profileDataset } from './data-profiler'
import { validateReportSpec } from './spec-validator'
import { buildTemplateCatalog } from './report-template-registry'
import { getReportPngExportOptions } from './cli-render'
import type { AgentReportSpec, LoadedDataset } from './types'

const rows = [
  { country: 'US', buffett_indicator: 241.7 }, { country: 'China', buffett_indicator: 83.6 },
  { country: 'Germany', buffett_indicator: 52.8 }, { country: 'India', buffett_indicator: 216.7 },
  { country: 'Japan', buffett_indicator: 193.8 }, { country: 'UK', buffett_indicator: 95.2 },
  { country: 'France', buffett_indicator: 117.1 }, { country: 'Italy', buffett_indicator: 38.5 },
  { country: 'Canada', buffett_indicator: 208.3 }, { country: 'Brazil', buffett_indicator: 46.6 }
]

function dataset(inputRows = rows): LoadedDataset {
  return { file: 'poster-ranking.csv', columns: ['country', 'buffett_indicator'], rows: inputRows }
}

function spec(overrides: Partial<AgentReportSpec> = {}): AgentReportSpec {
  return {
    layout: { preset: 'poster' },
    poster: {
      chartId: 'ranking-chart',
      hero: { eyebrow: 'The Buffett Indicator', title: 'Which Stock Markets Are the Most Expensive?', subtitle: 'A broad measure of market valuation' },
      footer: { source: 'imf.org', date: 'Aug 2026' },
      chart: { sort: 'desc', maxItems: 10, yDomain: [0, 250], valueFormat: '0.0%' },
      callouts: [{ type: 'formula', title: 'Buffett Indicator', body: 'Total Market Cap / GDP × 100%' }]
    },
    charts: [{ id: 'ranking-chart', type: 'bar', title: 'Market valuation ranking', encoding: { x: { field: 'country' }, y: { field: 'buffett_indicator' } } }],
    ...overrides
  }
}

describe('data poster', () => {
  it('validates a portrait ranking poster and renders a fixed poster canvas', () => {
    const profile = profileDataset(dataset())
    const result = validateReportSpec(spec(), profile)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const html = renderStaticHtml(result.value, profile, rows)
    expect(html).toContain('data-layout="poster"')
    expect(html).toContain('1080px')
    expect(html).toContain('Which Stock Markets Are the Most Expensive?')
    expect(html).toContain('US')
    expect(html).toContain('241.7%')
    expect(html).toContain('Total Market Cap / GDP')
  })

  it('crops poster PNG exports to the poster element instead of the default report viewport', () => {
    const options = getReportPngExportOptions(spec(), { flags: {}, positional: [] })
    expect(options).toMatchObject({ width: 1080, height: 1350, selector: '.mv-poster' })
    expect(getReportPngExportOptions({ charts: spec().charts }, { flags: {}, positional: [] }).selector).toBeUndefined()
  })

  it('rejects missing poster config, missing chart, landscape canvas, unsupported theme, and chart variants', () => {
    const profile = profileDataset(dataset())
    expect(validateReportSpec({ layout: { preset: 'poster' }, charts: spec().charts }, profile)).toMatchObject({ ok: false, code: 'POSTER_CONFIG_MISSING' })
    expect(validateReportSpec(spec({ poster: { ...spec().poster!, chartId: 'missing' } }), profile)).toMatchObject({ ok: false, code: 'POSTER_CHART_NOT_FOUND' })
    expect(validateReportSpec(spec({ poster: { ...spec().poster!, canvas: { width: 1350, height: 1080 } } }), profile)).toMatchObject({ ok: false, code: 'INVALID_SPEC' })
    expect(validateReportSpec(spec({ poster: { ...spec().poster!, theme: 'unknown-theme' } }), profile)).toMatchObject({ ok: false, code: 'POSTER_THEME_UNKNOWN' })
    expect(validateReportSpec(spec({ poster: { ...spec().poster!, composition: 'flow-story' } }), profile)).toMatchObject({ ok: false, code: 'POSTER_CHART_INVALID' })
    expect(validateReportSpec(spec({ charts: [{ ...spec().charts[0], variant: 'horizontal' }] }), profile)).toMatchObject({ ok: false, code: 'POSTER_CHART_INVALID' })
    expect(validateReportSpec(spec({ poster: { ...spec().poster!, template: 'data-poster-flow', composition: 'ranked-story' } }), profile)).toMatchObject({ ok: false, code: 'POSTER_TEMPLATE_COMPOSITION_MISMATCH', path: 'poster.composition' })
  })

  it('sorts ascending and limits the number of rendered ranking bars', () => {
    const profile = profileDataset(dataset())
    const ascending = spec({ poster: { ...spec().poster!, chart: { sort: 'asc', maxItems: 3, valueFormat: '0.0%' } } })
    const result = validateReportSpec(ascending, profile)
    expect(result.ok).toBe(true)
    if (!result.ok) return
    const html = renderStaticHtml(result.value, profile, rows)
    expect(html.indexOf('38.5%')).toBeLessThan(html.indexOf('46.6%'))
    expect(html).not.toContain('241.7%')
  })

  it('renders normalized composition slots and rejects invalid slot contracts', () => {
    const profile = profileDataset(dataset())
    const custom = spec({ poster: { ...spec().poster!, themeOverride: { density: 'compact' }, slots: [
      { id: 'hero-slot', role: 'hero', block: 'hero' },
      { id: 'insight-slot', role: 'insight', block: 'callout' },
      { id: 'ranking-slot', role: 'ranking', block: 'chart' },
      { id: 'footer-slot', role: 'footer', block: 'footer' }
    ] } })
    const result = validateReportSpec(custom, profile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const html = renderStaticHtml(result.value, profile, rows)
      expect(html).toContain('data-poster-composition="ranked-story"')
      expect(html).toContain('poster-density-compact')
    }
    expect(validateReportSpec(spec({ poster: { ...spec().poster!, slots: [
      { id: 'duplicate', role: 'hero', block: 'hero' }, { id: 'duplicate', role: 'insight', block: 'callout' }
    ] } }), profile)).toMatchObject({ ok: false, code: 'POSTER_SLOT_DUPLICATE' })
  })

  it('renders comparison-story with two ranking charts', () => {
    const profile = profileDataset(dataset())
    const comparison = spec({
      poster: { ...spec().poster!, composition: 'comparison-story', secondaryChartId: 'ranking-chart-2' },
      charts: [spec().charts[0], { id: 'ranking-chart-2', type: 'bar', title: 'GDP ranking', encoding: { x: { field: 'country' }, y: { field: 'buffett_indicator' } } }]
    })
    const result = validateReportSpec(comparison, profile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const html = renderStaticHtml(result.value, profile, rows)
      expect(html).toContain('poster-comparison')
      expect(html.match(/GDP ranking/g)?.length).toBeGreaterThan(0)
    }
  })

  it('applies a named palette override without changing poster data', () => {
    const profile = profileDataset(dataset())
    const themed = spec({ poster: { ...spec().poster!, theme: 'newsroom-bold', themeOverride: { palette: 'cool' } } })
    const result = validateReportSpec(themed, profile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const html = renderStaticHtml(result.value, profile, rows)
      expect(html).toContain('#54b7d9')
      expect(html).toContain('241.7%')
    }
  })

  it('applies mood overrides through controlled theme tokens', () => {
    const profile = profileDataset(dataset())
    const themed = spec({ poster: { ...spec().poster!, themeOverride: { mood: 'serious' } } })
    const result = validateReportSpec(themed, profile)
    expect(result.ok).toBe(true)
    if (result.ok) expect(renderStaticHtml(result.value, profile, rows)).toContain('#d64545')
  })

  it('renders flow-story with a funnel chart while preserving the shared poster slots', () => {
    const flowRows = [{ stage: 'Leads', count: 100 }, { stage: 'Qualified', count: 64 }, { stage: 'Won', count: 21 }]
    const flowSpec = spec({
      poster: { ...spec().poster!, composition: 'flow-story' },
      charts: [{ id: 'ranking-chart', type: 'funnel', title: 'Conversion flow', encoding: { x: { field: 'stage' }, y: { field: 'count' } } }]
    })
    const profile = profileDataset({ file: 'flow.csv', columns: ['stage', 'count'], rows: flowRows })
    const result = validateReportSpec(flowSpec, profile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const html = renderStaticHtml(result.value, profile, flowRows)
      expect(html).toContain('data-poster-composition="flow-story"')
      expect(html).toContain('Conversion flow')
      expect(html).toContain('Leads')
    }
  })

  it('validates and renders a 100% share poster with deterministic segment metadata', () => {
    const shareRows = [
      { country: 'World', type: 'Poultry', share: 27 }, { country: 'World', type: 'Pork', share: 24 }, { country: 'World', type: 'Fish', share: 31 },
      { country: 'Brazil', type: 'Poultry', share: 42 }, { country: 'Brazil', type: 'Pork', share: 15 }, { country: 'Brazil', type: 'Fish', share: 43 },
      { country: 'Japan', type: 'Poultry', share: 26 }, { country: 'Japan', type: 'Pork', share: 22 }, { country: 'Japan', type: 'Fish', share: 52 }
    ]
    const shareSpec = spec({
      poster: { ...spec().poster!, template: 'data-poster-share', composition: 'share-story', share: { normalize: '100%', categoryField: 'country', seriesField: 'type', valueField: 'share' } },
      charts: [{ id: 'ranking-chart', type: 'bar', variant: 'horizontal', encoding: { x: { field: 'country' }, y: { field: 'share' }, color: { field: 'type' } }, style: { barMode: 'stacked' } }]
    })
    const profile = profileDataset({ file: 'share.csv', columns: ['country', 'type', 'share'], rows: shareRows })
    const result = validateReportSpec(shareSpec, profile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const html = renderStaticHtml(result.value, profile, shareRows)
      expect(html).toContain('data-normalized-share="0.329268"')
      expect(html).toContain('data-raw-total="82"')
      expect(html).toContain('data-poster-composition="share-story"')
    }
  })

  it('rejects share posters without explicit normalization or stacked color encoding', () => {
    const profile = profileDataset({ file: 'share.csv', columns: ['country', 'type', 'share'], rows: [{ country: 'A', type: 'X', share: 1 }, { country: 'B', type: 'X', share: 2 }, { country: 'C', type: 'Y', share: 3 }] })
    const invalid = spec({ poster: { ...spec().poster!, template: 'data-poster-share', composition: 'share-story' } })
    expect(validateReportSpec(invalid, profile)).toMatchObject({ ok: false, code: 'POSTER_SHARE_CHART_INVALID' })
  })

  it('renders a content timeline poster from explicit local role bindings', () => {
    const timelineRows = [
      { order: 1, timeLabel: '1900', title: 'Origin', description: 'First milestone' },
      { order: 2, timeLabel: '2000', title: 'Modern', description: 'Second milestone' },
      { order: 3, timeLabel: '2025', title: 'Today', description: 'Current state' }
    ]
    const timelineSpec = spec({
      poster: { ...spec().poster!, template: 'content-poster-timeline', composition: 'timeline-story', timeline: { roles: { order: 'order', timeLabel: 'timeLabel', title: 'title', description: 'description' } } },
      charts: [{ id: 'ranking-chart', type: 'infographic-flow', encoding: { x: { field: 'order' }, y: { field: 'order' } } }]
    })
    const profile = profileDataset({ file: 'timeline.csv', columns: ['order', 'timeLabel', 'title', 'description'], rows: timelineRows })
    const result = validateReportSpec(timelineSpec, profile)
    expect(result.ok).toBe(true)
    if (result.ok) {
      const html = renderStaticHtml(result.value, profile, timelineRows)
      expect(html).toContain('data-poster-composition="timeline-story"')
      expect(html).toContain('data-timeline-order="2"')
      expect(html).toContain('Modern')
    }
  })

  it('validates and renders a trend poster through the line renderer', () => {
    const trendRows = [{ month: '2025-01', value: 10 }, { month: '2025-02', value: 18 }, { month: '2025-03', value: 14 }]
    const trendSpec = spec({ poster: { ...spec().poster!, template: 'data-poster-trend', composition: 'trend-story' }, charts: [{ id: 'ranking-chart', type: 'line', encoding: { x: { field: 'month' }, y: { field: 'value' } } }] })
    const profile = profileDataset({ file: 'trend.csv', columns: ['month', 'value'], rows: trendRows })
    const result = validateReportSpec(trendSpec, profile)
    expect(result.ok).toBe(true)
    if (result.ok) expect(renderStaticHtml(result.value, profile, trendRows)).toContain('data-poster-composition="trend-story"')
  })

  it('recommends data-poster-ranking only for readable category counts', () => {
    const context = analyzeDataset(dataset())
    const catalog = buildTemplateCatalog({ fields: context.fields, evidence: context.evidence, sampleWarnings: context.sampleWarnings } as any)
    expect(catalog.templates.find(item => item.id === 'data-poster-ranking')?.layoutPreset).toBe('poster')
    const tooMany = dataset(Array.from({ length: 13 }, (_, index) => ({ country: `C${index}`, buffett_indicator: index })))
    const blocked = buildTemplateCatalog({ fields: analyzeDataset(tooMany).fields, evidence: [], sampleWarnings: [] } as any)
    expect(blocked.blockedTemplates.find(item => item.id === 'data-poster-ranking')?.reason).toContain('> 12')
  })
})
