/**
 * Tests for UISpec Converter (InfographicOutput → UITree)
 */

import { describe, it, expect } from 'vitest'
import { toUITree, buildLayoutElement, buildSectionElement } from './ui-spec-converter'
import type { InfographicOutput, InfographicSection } from './types'

// ============================================================================
// Fixtures
// ============================================================================

function makeSection(id: string, templateId = 'list-row-badge-card'): InfographicSection {
  return {
    id,
    templateId,
    heading: { title: `Section ${id}`, subtitle: 'sub' },
    insight: { text: 'Some insight', highlight: 'insight' },
    items: [
      { label: 'Revenue', value: '$12M', trend: 'up' },
      { label: 'Users', value: '158K' },
    ],
    footnote: { text: 'Source: internal', source: 'Finance' },
    layout: { width: 800, height: 200, position: 'full' },
  }
}

function makeOutput(sections: InfographicSection[]): InfographicOutput {
  return {
    title: 'Q4 Report',
    theme: 'dark-vibrant',
    palette: 'vibrant',
    layout: { direction: 'top_to_bottom', maxWidth: 900, gap: 24 },
    sections,
    sourceSummary: 'Article about Q4 results',
    metadata: {
      generatedAt: '2024-01-01T00:00:00Z',
      articleLength: 500,
      sectionCount: sections.length,
      language: 'en',
    },
  }
}

// ============================================================================
// buildLayoutElement
// ============================================================================

describe('buildLayoutElement', () => {
  it('builds a root infographic-layout element', () => {
    const output = makeOutput([])
    const el = buildLayoutElement(output)

    expect(el.key).toBe('infographic-layout')
    expect(el.type).toBe('infographic-layout')
    expect(el.props.title).toBe('Q4 Report')
    expect(el.props.theme).toBe('dark-vibrant')
    expect(el.props.maxWidth).toBe(900)
    expect(el.children).toEqual([])
  })
})

// ============================================================================
// buildSectionElement
// ============================================================================

describe('buildSectionElement', () => {
  it('uses the section id as the element key', () => {
    const section = makeSection('sec-1')
    const el = buildSectionElement(section, 'dark-vibrant', 'vibrant', 900)
    expect(el.key).toBe('sec-1')
    expect(el.type).toBe('infographic-section')
  })

  it('maps agent templateId to infographic-section template', () => {
    const el = buildSectionElement(makeSection('s', 'list-row-badge-card'), 'dark-vibrant', 'vibrant', 900)
    expect((el.props.data as Record<string, unknown>).template).toBe('kpi-row-badge')
  })

  it('maps flow templateId to flow-timeline', () => {
    const el = buildSectionElement(makeSection('s', 'flow-linear-numbered'), 'dark-vibrant', 'vibrant', 900)
    expect((el.props.data as Record<string, unknown>).template).toBe('flow-timeline')
  })

  it('maps distribution templateId to pie-distribution', () => {
    const el = buildSectionElement(makeSection('s', 'list-sector-pie'), 'dark-vibrant', 'vibrant', 900)
    expect((el.props.data as Record<string, unknown>).template).toBe('pie-distribution')
  })

  it('falls back to kpi-row-badge for unknown templateId', () => {
    const el = buildSectionElement(makeSection('s', 'unknown-template'), 'dark-vibrant', 'vibrant', 900)
    expect((el.props.data as Record<string, unknown>).template).toBe('kpi-row-badge')
  })

  it('preserves heading, insight, and footnote', () => {
    const section = makeSection('sec-1')
    const el = buildSectionElement(section, 'dark-vibrant', 'vibrant', 900)
    const data = el.props.data as Record<string, unknown>

    expect((data.heading as Record<string, unknown>).title).toBe('Section sec-1')
    expect((data.insight as Record<string, unknown>).text).toBe('Some insight')
    expect((data.footnote as Record<string, unknown>).source).toBe('Finance')
  })

  it('maps items correctly', () => {
    const section = makeSection('s')
    const el = buildSectionElement(section, 'dark-vibrant', 'vibrant', 900)
    const data = el.props.data as Record<string, unknown>
    const items = data.items as Array<Record<string, unknown>>

    expect(items).toHaveLength(2)
    expect(items[0].label).toBe('Revenue')
    expect(items[0].value).toBe('$12M')
    expect(items[0].trend).toBe('up')
    expect(items[1].label).toBe('Users')
  })

  it('uses section layout width when provided', () => {
    const section = makeSection('s')
    const el = buildSectionElement(section, 'dark-vibrant', 'vibrant', 900)
    expect((el.props.data as Record<string, unknown>).width).toBe(800)
  })

  it('falls back to defaultWidth when section has no layout', () => {
    const section: InfographicSection = { ...makeSection('s'), layout: undefined }
    const el = buildSectionElement(section, 'dark-vibrant', 'vibrant', 900)
    expect((el.props.data as Record<string, unknown>).width).toBe(900)
  })
})

// ============================================================================
// toUITree
// ============================================================================

describe('toUITree', () => {
  it('produces version 1.0 UITree', () => {
    const tree = toUITree(makeOutput([]))
    expect(tree.version).toBe('1.0')
  })

  it('sets root to infographic-layout', () => {
    const tree = toUITree(makeOutput([]))
    expect(tree.root).toBe('infographic-layout')
  })

  it('includes root element in elements map', () => {
    const tree = toUITree(makeOutput([]))
    expect(tree.elements['infographic-layout']).toBeDefined()
  })

  it('includes all sections in elements map', () => {
    const output = makeOutput([makeSection('s1'), makeSection('s2')])
    const tree = toUITree(output)

    expect(tree.elements['s1']).toBeDefined()
    expect(tree.elements['s2']).toBeDefined()
  })

  it('root element children matches section order', () => {
    const output = makeOutput([makeSection('s1'), makeSection('s2'), makeSection('s3')])
    const tree = toUITree(output)

    expect(tree.elements['infographic-layout'].children).toEqual(['s1', 's2', 's3'])
  })

  it('total elements = sections + 1 (root)', () => {
    const output = makeOutput([makeSection('s1'), makeSection('s2')])
    const tree = toUITree(output)
    expect(Object.keys(tree.elements)).toHaveLength(3)
  })
})
