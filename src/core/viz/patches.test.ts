/**
 * Tests for UITree patch system
 */

import { describe, it, expect } from 'vitest'
import {
  emptyUITree,
  applyPatch,
  applyPatches,
  patchToJsonl,
  parsePatchLine,
} from './patches'
import type { UITree } from '@/types/ui-tree'

// ============================================================================
// Fixtures
// ============================================================================

function sampleElement(key: string, type = 'infographic-section') {
  return {
    key,
    type,
    props: { data: { template: 'kpi-row-badge', items: [] } },
  }
}

// ============================================================================
// applyPatch
// ============================================================================

describe('applyPatch', () => {
  describe('init', () => {
    it('returns an empty UITree', () => {
      const tree = { version: '1.0' as const, root: 'old', elements: { x: sampleElement('x') } }
      const result = applyPatch(tree, { op: 'init' })
      expect(result.root).toBe('')
      expect(result.elements).toEqual({})
    })
  })

  describe('setRoot', () => {
    it('updates the root key', () => {
      const tree = emptyUITree()
      const result = applyPatch(tree, { op: 'setRoot', key: 'layout' })
      expect(result.root).toBe('layout')
    })

    it('does not mutate the original tree', () => {
      const tree = emptyUITree()
      applyPatch(tree, { op: 'setRoot', key: 'layout' })
      expect(tree.root).toBe('')
    })
  })

  describe('addElement', () => {
    it('adds an element to the elements map', () => {
      const tree = emptyUITree()
      const el = sampleElement('s1')
      const result = applyPatch(tree, { op: 'addElement', element: el })
      expect(result.elements['s1']).toEqual(el)
    })

    it('does not affect other elements', () => {
      const tree: UITree = {
        version: '1.0',
        root: '',
        elements: { s1: sampleElement('s1') },
      }
      const result = applyPatch(tree, { op: 'addElement', element: sampleElement('s2') })
      expect(result.elements['s1']).toBeDefined()
      expect(result.elements['s2']).toBeDefined()
    })
  })

  describe('appendChild', () => {
    it('appends a child key to a parent element', () => {
      const parent = { ...sampleElement('root', 'infographic-layout'), children: [] }
      const tree: UITree = { version: '1.0', root: 'root', elements: { root: parent } }
      const result = applyPatch(tree, { op: 'appendChild', parentKey: 'root', childKey: 's1' })
      expect(result.elements['root'].children).toContain('s1')
    })

    it('does not add duplicate children', () => {
      const parent = { ...sampleElement('root', 'infographic-layout'), children: ['s1'] }
      const tree: UITree = { version: '1.0', root: 'root', elements: { root: parent } }
      const result = applyPatch(tree, { op: 'appendChild', parentKey: 'root', childKey: 's1' })
      expect(result.elements['root'].children?.length).toBe(1)
    })

    it('returns unchanged tree if parent not found', () => {
      const tree = emptyUITree()
      const result = applyPatch(tree, { op: 'appendChild', parentKey: 'missing', childKey: 's1' })
      expect(result).toEqual(tree)
    })
  })

  describe('updateProps', () => {
    it('merges props into an existing element', () => {
      const el = { key: 's1', type: 'infographic-section', props: { a: 1, b: 2 } }
      const tree: UITree = { version: '1.0', root: '', elements: { s1: el } }
      const result = applyPatch(tree, { op: 'updateProps', key: 's1', props: { b: 99, c: 3 } })
      expect(result.elements['s1'].props).toEqual({ a: 1, b: 99, c: 3 })
    })

    it('returns unchanged tree if element not found', () => {
      const tree = emptyUITree()
      const result = applyPatch(tree, { op: 'updateProps', key: 'missing', props: { x: 1 } })
      expect(result).toEqual(tree)
    })
  })

  describe('setData', () => {
    it('sets tree.data', () => {
      const tree = emptyUITree()
      const result = applyPatch(tree, { op: 'setData', data: { sales: 1000 } })
      expect(result.data).toEqual({ sales: 1000 })
    })

    it('merges with existing data', () => {
      const tree: UITree = { version: '1.0', root: '', elements: {}, data: { a: 1 } }
      const result = applyPatch(tree, { op: 'setData', data: { b: 2 } })
      expect(result.data).toEqual({ a: 1, b: 2 })
    })
  })

  describe('complete', () => {
    it('returns tree unchanged', () => {
      const tree = emptyUITree()
      const result = applyPatch(tree, { op: 'complete' })
      expect(result).toEqual(tree)
    })
  })
})

// ============================================================================
// applyPatches
// ============================================================================

describe('applyPatches', () => {
  it('applies patches in order', () => {
    const tree = emptyUITree()
    const layout = { ...sampleElement('root', 'infographic-layout'), children: [] }
    const section = sampleElement('s1')

    const result = applyPatches(tree, [
      { op: 'init' },
      { op: 'addElement', element: layout },
      { op: 'setRoot', key: 'root' },
      { op: 'addElement', element: section },
      { op: 'appendChild', parentKey: 'root', childKey: 's1' },
    ])

    expect(result.root).toBe('root')
    expect(result.elements['root'].children).toContain('s1')
    expect(result.elements['s1']).toBeDefined()
  })
})

// ============================================================================
// JSONL serialization
// ============================================================================

describe('patchToJsonl', () => {
  it('serializes a patch to JSON line', () => {
    const line = patchToJsonl({ op: 'setRoot', key: 'layout' })
    expect(line).toBe('{"op":"setRoot","key":"layout"}\n')
  })
})

describe('parsePatchLine', () => {
  it('parses a valid JSONL line', () => {
    const patch = parsePatchLine('{"op":"setRoot","key":"layout"}')
    expect(patch).toEqual({ op: 'setRoot', key: 'layout' })
  })

  it('returns null for empty lines', () => {
    expect(parsePatchLine('')).toBeNull()
    expect(parsePatchLine('   ')).toBeNull()
  })

  it('returns null for invalid JSON', () => {
    expect(parsePatchLine('{bad json}')).toBeNull()
  })

  it('round-trips through patchToJsonl', () => {
    const original = { op: 'addElement' as const, element: sampleElement('s1') }
    const parsed = parsePatchLine(patchToJsonl(original))
    expect(parsed).toEqual(original)
  })
})
