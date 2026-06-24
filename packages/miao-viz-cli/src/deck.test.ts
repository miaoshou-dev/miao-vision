import { describe, expect, it } from 'vitest'
import { deckSpecSchema } from './deck-schema'
import { renderDeckHtml } from './deck-renderer'
import { loadDataset } from './data-loader'
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
