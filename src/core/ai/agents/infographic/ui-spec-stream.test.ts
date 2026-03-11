/**
 * Tests for UISpec Streaming Generator
 */

import { describe, it, expect } from 'vitest'
import { streamUITreePatches, collectPatches } from './ui-spec-stream'
import { applyPatches, emptyUITree } from '@core/viz/patches'
import type { InfographicOutput, InfographicSection } from './types'

// ============================================================================
// Fixtures
// ============================================================================

function makeSection(id: string): InfographicSection {
  return {
    id,
    templateId: 'list-row-badge-card',
    heading: { title: `Section ${id}` },
    items: [{ label: 'Metric', value: '42' }],
  }
}

function makeOutput(sectionCount = 3): InfographicOutput {
  return {
    title: 'Test Infographic',
    theme: 'dark-vibrant',
    palette: 'vibrant',
    layout: { direction: 'top_to_bottom', maxWidth: 900, gap: 24 },
    sections: Array.from({ length: sectionCount }, (_, i) => makeSection(`s${i + 1}`)),
    sourceSummary: 'Test article',
    metadata: {
      generatedAt: '2024-01-01T00:00:00Z',
      articleLength: 200,
      sectionCount,
      language: 'en',
    },
  }
}

// ============================================================================
// collectPatches
// ============================================================================

describe('collectPatches', () => {
  it('emits init as first patch', async () => {
    const patches = await collectPatches(makeOutput(1))
    expect(patches[0].op).toBe('init')
  })

  it('emits complete as last patch', async () => {
    const patches = await collectPatches(makeOutput(1))
    expect(patches[patches.length - 1].op).toBe('complete')
  })

  it('emits addElement + appendChild for each section', async () => {
    const output = makeOutput(3)
    const patches = await collectPatches(output)

    const addOps = patches.filter((p) => p.op === 'addElement')
    const appendOps = patches.filter((p) => p.op === 'appendChild')

    // 1 layout + 3 sections = 4 addElement ops
    expect(addOps).toHaveLength(4)
    // 3 sections appended to root
    expect(appendOps).toHaveLength(3)
  })

  it('includes setRoot patch', async () => {
    const patches = await collectPatches(makeOutput(1))
    const setRoot = patches.find((p) => p.op === 'setRoot')
    expect(setRoot).toBeDefined()
    if (setRoot?.op === 'setRoot') {
      expect(setRoot.key).toBe('infographic-layout')
    }
  })

  it('includes setData patch with metadata', async () => {
    const patches = await collectPatches(makeOutput(1))
    const setData = patches.find((p) => p.op === 'setData')
    expect(setData).toBeDefined()
    if (setData?.op === 'setData') {
      expect(setData.data.metadata).toBeDefined()
    }
  })
})

// ============================================================================
// Patch stream → UITree round-trip
// ============================================================================

describe('streamUITreePatches → applyPatches round-trip', () => {
  it('produces a valid UITree with all sections', async () => {
    const output = makeOutput(3)
    const patches = await collectPatches(output)
    const tree = applyPatches(emptyUITree(), patches)

    expect(tree.root).toBe('infographic-layout')
    expect(tree.elements['infographic-layout']).toBeDefined()
    expect(tree.elements['s1']).toBeDefined()
    expect(tree.elements['s2']).toBeDefined()
    expect(tree.elements['s3']).toBeDefined()
  })

  it('root children are in section order', async () => {
    const output = makeOutput(3)
    const patches = await collectPatches(output)
    const tree = applyPatches(emptyUITree(), patches)

    expect(tree.elements['infographic-layout'].children).toEqual(['s1', 's2', 's3'])
  })

  it('streaming partial patches show sections progressively', async () => {
    const output = makeOutput(3)
    let tree = emptyUITree()
    let sectionsSeen = 0

    for await (const patch of streamUITreePatches(output)) {
      tree = applyPatches(tree, [patch])
      if (patch.op === 'appendChild') {
        sectionsSeen += 1
        // Each section should be fully available when its child is appended
        const childKey = (patch as { op: 'appendChild'; parentKey: string; childKey: string }).childKey
        expect(tree.elements[childKey]).toBeDefined()
      }
    }

    expect(sectionsSeen).toBe(3)
  })
})
