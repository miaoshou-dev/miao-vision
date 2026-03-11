/**
 * Tests for UITree dynamic value resolution
 */

import { describe, it, expect } from 'vitest'
import { resolveJsonPointer, resolveDynamicValues, resolveVisible } from './resolve'

// ============================================================================
// resolveJsonPointer
// ============================================================================

describe('resolveJsonPointer', () => {
  const ctx = {
    data: { sales: { total: 12500, q1: 3000 }, region: 'APAC' },
    state: { filter: 'Q1', page: 2 },
    items: ['a', 'b', 'c'],
  }

  it('resolves a top-level key', () => {
    expect(resolveJsonPointer(ctx, '/state')).toEqual({ filter: 'Q1', page: 2 })
  })

  it('resolves a nested path', () => {
    expect(resolveJsonPointer(ctx, '/data/sales/total')).toBe(12500)
  })

  it('resolves an array index', () => {
    expect(resolveJsonPointer(ctx, '/items/1')).toBe('b')
  })

  it('returns undefined for missing path', () => {
    expect(resolveJsonPointer(ctx, '/data/missing/key')).toBeUndefined()
  })

  it('handles RFC 6901 escape sequences', () => {
    const obj = { 'a/b': { 'c~d': 42 } }
    expect(resolveJsonPointer(obj, '/a~1b/c~0d')).toBe(42)
  })

  it('returns root object for empty pointer', () => {
    expect(resolveJsonPointer(ctx, '/')).toBe(ctx)
  })
})

// ============================================================================
// resolveDynamicValues
// ============================================================================

describe('resolveDynamicValues', () => {
  const context = {
    data: { revenue: 5000 },
    state: { filter: 'Q2' },
  }

  it('passes through static props unchanged', () => {
    const props = { title: 'Hello', count: 3, flag: true }
    expect(resolveDynamicValues(props, context)).toEqual(props)
  })

  it('resolves a DynamicValue at top level', () => {
    const props = { value: { path: '/data/revenue' } }
    expect(resolveDynamicValues(props, context)).toEqual({ value: 5000 })
  })

  it('resolves a DynamicValue nested in an object', () => {
    const props = { heading: { title: { path: '/state/filter' } } }
    expect(resolveDynamicValues(props, context)).toEqual({ heading: { title: 'Q2' } })
  })

  it('resolves DynamicValues inside arrays', () => {
    const props = { items: [{ label: { path: '/state/filter' } }] }
    expect(resolveDynamicValues(props, context)).toEqual({ items: [{ label: 'Q2' }] })
  })

  it('returns undefined for unresolved path', () => {
    const props = { value: { path: '/data/missing' } }
    expect(resolveDynamicValues(props, context)).toEqual({ value: undefined })
  })
})

// ============================================================================
// resolveVisible
// ============================================================================

describe('resolveVisible', () => {
  const context = { state: { show: true, hide: false } }

  it('returns true when undefined', () => {
    expect(resolveVisible(undefined, context)).toBe(true)
  })

  it('passes through static true', () => {
    expect(resolveVisible(true, context)).toBe(true)
  })

  it('passes through static false', () => {
    expect(resolveVisible(false, context)).toBe(false)
  })

  it('resolves a truthy DynamicValue', () => {
    expect(resolveVisible({ path: '/state/show' }, context)).toBe(true)
  })

  it('resolves a falsy DynamicValue', () => {
    expect(resolveVisible({ path: '/state/hide' }, context)).toBe(false)
  })

  it('returns false for undefined resolved value', () => {
    expect(resolveVisible({ path: '/state/missing' }, context)).toBe(false)
  })
})
