import { describe, expect, it } from 'vitest'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { deckSpecSchema } from './deck-schema'
import { parseDeckSpec, validateDeckFields } from './deck-validator'
import { renderDeckHtml } from './deck-renderer'
import { loadDataset } from './data-loader'
import { profileDataset } from './data-profiler'
import type { DeckSpec } from './deck-types'

const SAMPLE_ROWS = [
  { region: 'East', sales: 300, orders: 10 },
  { region: 'West', sales: 200, orders: 8 },
  { region: 'North', sales: 150, orders: 6 }
]

const MINIMAL_DECK: DeckSpec = {
  title: 'Test Deck',
  slides: [
    { layout: 'cover', title: 'Hello', claim: 'World' },
    { layout: 'ending', title: 'Done' }
  ]
}

describe('deckSpecSchema', () => {
  it('accepts a valid deck spec', () => {
    const result = deckSpecSchema.safeParse(MINIMAL_DECK)
    expect(result.success).toBe(true)
  })

  it('rejects a deck with no slides', () => {
    const result = deckSpecSchema.safeParse({ title: 'x', slides: [] })
    expect(result.success).toBe(false)
  })

  it('rejects an unknown layout', () => {
    const result = deckSpecSchema.safeParse({
      slides: [{ layout: 'unknown-layout' }]
    })
    expect(result.success).toBe(false)
  })

  it('accepts all 8 layout types', () => {
    const layouts = ['cover', 'title-only', 'text-points', 'text-chart', 'metrics-chart', 'chart-full', 'table-full', 'ending']
    for (const layout of layouts) {
      const result = deckSpecSchema.safeParse({ slides: [{ layout }] })
      expect(result.success, `layout '${layout}' should be valid`).toBe(true)
    }
  })

  it('accepts optional theme field', () => {
    const result = deckSpecSchema.safeParse({ ...MINIMAL_DECK, theme: 'dark' })
    expect(result.success).toBe(true)
  })

  it('rejects chart layouts without charts', () => {
    const result = parseDeckSpec({ slides: [{ layout: 'chart-full', title: 'Missing chart' }] })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('INVALID_DECK_SPEC')
    expect(result.message).toContain('slides[0].charts')
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'slides[0].charts', hint: expect.stringContaining('Add a chart') })
    ]))
  })

  it('rejects metrics-chart without metrics', () => {
    const result = parseDeckSpec({
      slides: [{
        layout: 'metrics-chart',
        charts: [{ type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'sales' } } }]
      }]
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('slides[0].metrics')
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ path: 'slides[0].metrics', hint: expect.stringContaining('metrics') })
    ]))
  })

  it('rejects table-full with a non-table chart', () => {
    const result = parseDeckSpec({
      slides: [{
        layout: 'table-full',
        charts: [{ type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'sales' } } }]
      }]
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('slides[0].charts[0].type')
    expect(result.errors).toEqual(expect.arrayContaining([
      expect.objectContaining({ hint: expect.stringContaining('table') })
    ]))
  })

  it('rejects more than 4 metrics', () => {
    const result = parseDeckSpec({
      slides: [{
        layout: 'metrics-chart',
        metrics: [
          { label: 'A', value: 1 },
          { label: 'B', value: 1 },
          { label: 'C', value: 1 },
          { label: 'D', value: 1 },
          { label: 'E', value: 1 }
        ],
        charts: [{ type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'sales' } } }]
      }]
    })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.message).toContain('at most 4 metrics')
  })
})

describe('validateDeckFields', () => {
  const profile = profileDataset({
    file: 'sample.csv',
    columns: ['region', 'sales', 'orders', 'order_date'],
    rows: SAMPLE_ROWS.map((row, i) => ({ ...row, order_date: `2025-0${i + 1}-01` }))
  })

  it('rejects chart encoding fields not present in the data', () => {
    const spec: DeckSpec = {
      slides: [{
        layout: 'chart-full',
        charts: [{ type: 'bar', encoding: { x: { field: 'missing_region' }, y: { field: 'sales' } } }]
      }]
    }
    const result = validateDeckFields(spec, profile)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.code).toBe('DECK_FIELD_NOT_FOUND')
    expect(result.path).toBe('slides[0].charts[0].encoding.x.field')
    expect(result.hint).toContain('earlier transform')
  })

  it('rejects metric transform fields not present in the data', () => {
    const spec: DeckSpec = {
      slides: [{
        layout: 'metrics-chart',
        metrics: [{
          label: 'Bad metric',
          data: { transform: [{ type: 'aggregate', measures: [{ field: 'missing_sales', op: 'sum', as: 'v' }] }] }
        }],
        charts: [{ type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'sales' } } }]
      }]
    }
    const result = validateDeckFields(spec, profile)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.path).toBe('slides[0].metrics[0].data.transform[0].measures.v')
    expect(result.message).toContain('missing_sales')
  })

  it('allows derive-month fields used by later aggregate and encoding steps', () => {
    const spec: DeckSpec = {
      slides: [{
        layout: 'chart-full',
        charts: [{
          type: 'line',
          data: {
            transform: [
              { type: 'derive-month', field: 'order_date', as: 'month' },
              { type: 'aggregate', groupBy: ['month'], measures: [{ field: 'sales', op: 'sum', as: 'total' }] },
              { type: 'sort', field: 'month', order: 'asc' }
            ]
          },
          encoding: { x: { field: 'month' }, y: { field: 'total' } }
        }]
      }]
    }
    expect(validateDeckFields(spec, profile).ok).toBe(true)
  })
})

describe('renderDeckHtml', () => {
  it('outputs correct number of .slide elements', () => {
    const html = renderDeckHtml(MINIMAL_DECK, SAMPLE_ROWS)
    // match <div class="slide"> or <div class="slide slide-..."> but not slide-canvas / slide-viewport
    const matches = html.match(/<div class="slide[^-]/g) ?? []
    expect(matches.length).toBe(2)
  })

  it('first slide is active', () => {
    const html = renderDeckHtml(MINIMAL_DECK, SAMPLE_ROWS)
    expect(html).not.toContain('class="slide active"')
    // active class is set by JS at runtime, not in static HTML
    expect(html).toContain('goTo(0)')
  })

  it('contains slide-nav', () => {
    const html = renderDeckHtml(MINIMAL_DECK, SAMPLE_ROWS)
    expect(html).toContain('class="slide-nav"')
    expect(html).toContain('btn-prev')
    expect(html).toContain('btn-next')
    expect(html).toContain('btn-print')
  })

  it('contains present-mode CSS', () => {
    const html = renderDeckHtml(MINIMAL_DECK, SAMPLE_ROWS)
    expect(html).toContain('present-mode')
    expect(html).toContain('slide-canvas')
  })

  it('contains print-mode CSS', () => {
    const html = renderDeckHtml(MINIMAL_DECK, SAMPLE_ROWS)
    expect(html).toContain('@media print')
    expect(html).toContain('A4 landscape')
  })

  it('contains keyboard navigation JS', () => {
    const html = renderDeckHtml(MINIMAL_DECK, SAMPLE_ROWS)
    expect(html).toContain('ArrowRight')
    expect(html).toContain('ArrowLeft')
    expect(html).toContain('requestFullscreen')
  })

  it('embeds spec JSON', () => {
    const html = renderDeckHtml(MINIMAL_DECK, SAMPLE_ROWS)
    expect(html).toContain('miao-viz-deck')
    expect(html).toContain('Test Deck')
  })

  it('renders metrics-chart layout without throwing', () => {
    const spec: DeckSpec = {
      slides: [{
        layout: 'metrics-chart',
        eyebrow: '01 · METRICS',
        title: 'Numbers',
        metrics: [
          {
            label: 'Total Sales',
            data: { transform: [{ type: 'aggregate', measures: [{ field: 'sales', op: 'sum', as: 'v' }] }] }
          }
        ],
        charts: [{
          type: 'bar',
          encoding: { x: { field: 'region' }, y: { field: 'sales' } }
        }]
      }]
    }
    expect(() => renderDeckHtml(spec, SAMPLE_ROWS)).not.toThrow()
  })

  it('renders with sales.csv data', () => {
    const dataset = loadDataset('packages/miao-viz-cli/examples/sales.csv')
    expect(dataset.ok).toBe(true)
    if (!dataset.ok) return
    const spec: DeckSpec = {
      title: 'Sales',
      slides: [
        { layout: 'cover', title: 'Sales Report' },
        { layout: 'chart-full', title: 'By Region', charts: [{ type: 'bar', encoding: { x: { field: 'region' }, y: { field: 'sales' } } }] },
        { layout: 'ending', title: 'Done' }
      ]
    }
    const html = renderDeckHtml(spec, dataset.value.rows)
    expect(html).toContain('Sales Report')
    const slideCount = (html.match(/<div class="slide[^-]/g) ?? []).length
    expect(slideCount).toBe(3)
  })
})

describe('deck example smoke tests', () => {
  const examples = [
    { input: 'packages/miao-viz-cli/examples/sales.csv', spec: 'packages/miao-viz-cli/examples/sales-deck.yaml', slides: 6 },
    { input: 'packages/miao-viz-cli/examples/product-metrics.csv', spec: 'packages/miao-viz-cli/examples/product-metrics-deck.yaml', slides: 5 },
    { input: 'packages/miao-viz-cli/examples/finance-review.csv', spec: 'packages/miao-viz-cli/examples/finance-review-deck.yaml', slides: 5 },
    { input: 'packages/miao-viz-cli/examples/ops-update.csv', spec: 'packages/miao-viz-cli/examples/ops-update-deck.yaml', slides: 5 }
  ]

  for (const example of examples) {
    it(`renders ${example.spec}`, () => {
      const dir = mkdtempSync(join(tmpdir(), 'miao-viz-deck-test-'))
      const output = join(dir, 'deck.html')
      const stdout = execFileSync(process.execPath, [
        'scripts/miao-viz.mjs',
        'deck',
        '--input', example.input,
        '--spec', example.spec,
        '--theme', 'editorial',
        '--output', output
      ], { encoding: 'utf8' })
      const result = JSON.parse(stdout)
      expect(result.ok).toBe(true)
      expect(result.value.slides).toBe(example.slides)
      expect(existsSync(output)).toBe(true)
      expect(readFileSync(output, 'utf8')).toContain('class="slide-nav"')
    })
  }
})
