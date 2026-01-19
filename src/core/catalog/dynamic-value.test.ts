/**
 * Dynamic Value - Unit Tests
 *
 * Tests for JSON Pointer path resolution and dynamic value handling
 */

import { describe, it, expect } from 'vitest'
import {
  parsePath,
  getByPath,
  setByPath,
  resolveDynamicValue,
  resolveAllDynamicValues,
  hasDynamicValues
} from './dynamic-value'
import { isDynamicValue } from '@/types/ui-tree'

// ============================================================================
// isDynamicValue
// ============================================================================

describe('isDynamicValue', () => {
  it('returns true for valid dynamic value', () => {
    expect(isDynamicValue({ path: '/data/total' })).toBe(true)
    expect(isDynamicValue({ path: '/' })).toBe(true)
  })

  it('returns false for non-dynamic values', () => {
    expect(isDynamicValue('string')).toBe(false)
    expect(isDynamicValue(123)).toBe(false)
    expect(isDynamicValue(null)).toBe(false)
    expect(isDynamicValue(undefined)).toBe(false)
    expect(isDynamicValue({})).toBe(false)
    expect(isDynamicValue({ notPath: 'value' })).toBe(false)
    expect(isDynamicValue({ path: '/data', extra: 'prop' })).toBe(false)
  })

  it('returns false for arrays', () => {
    expect(isDynamicValue([{ path: '/data' }])).toBe(false)
  })
})

// ============================================================================
// parsePath
// ============================================================================

describe('parsePath', () => {
  it('parses simple path', () => {
    expect(parsePath('/foo')).toEqual(['foo'])
    expect(parsePath('/foo/bar')).toEqual(['foo', 'bar'])
    expect(parsePath('/foo/bar/baz')).toEqual(['foo', 'bar', 'baz'])
  })

  it('parses root path', () => {
    expect(parsePath('/')).toEqual([])
  })

  it('handles numeric segments for arrays', () => {
    expect(parsePath('/items/0')).toEqual(['items', '0'])
    expect(parsePath('/data/0/name')).toEqual(['data', '0', 'name'])
  })

  it('decodes escaped characters', () => {
    // ~1 is escaped / in JSON Pointer
    expect(parsePath('/foo~1bar')).toEqual(['foo/bar'])
    // ~0 is escaped ~ in JSON Pointer
    expect(parsePath('/foo~0bar')).toEqual(['foo~bar'])
    // Both escapes
    expect(parsePath('/~0~1')).toEqual(['~/'])
  })

  it('throws for invalid path without leading slash', () => {
    expect(() => parsePath('foo')).toThrow()
    expect(() => parsePath('')).toThrow()
  })
})

// ============================================================================
// getByPath
// ============================================================================

describe('getByPath', () => {
  const testData = {
    user: {
      name: 'John',
      age: 30,
      address: {
        city: 'NYC',
        zip: '10001'
      }
    },
    items: ['apple', 'banana', 'cherry'],
    nested: {
      array: [
        { id: 1, name: 'First' },
        { id: 2, name: 'Second' }
      ]
    },
    nullValue: null,
    zero: 0,
    empty: ''
  }

  it('gets top-level property', () => {
    expect(getByPath(testData, '/user')).toEqual(testData.user)
    expect(getByPath(testData, '/items')).toEqual(testData.items)
  })

  it('gets nested property', () => {
    expect(getByPath(testData, '/user/name')).toBe('John')
    expect(getByPath(testData, '/user/age')).toBe(30)
    expect(getByPath(testData, '/user/address/city')).toBe('NYC')
  })

  it('gets array element', () => {
    expect(getByPath(testData, '/items/0')).toBe('apple')
    expect(getByPath(testData, '/items/1')).toBe('banana')
    expect(getByPath(testData, '/items/2')).toBe('cherry')
  })

  it('gets nested array element property', () => {
    expect(getByPath(testData, '/nested/array/0/name')).toBe('First')
    expect(getByPath(testData, '/nested/array/1/id')).toBe(2)
  })

  it('returns undefined for non-existent path', () => {
    expect(getByPath(testData, '/nonexistent')).toBeUndefined()
    expect(getByPath(testData, '/user/invalid')).toBeUndefined()
    expect(getByPath(testData, '/items/999')).toBeUndefined()
  })

  it('returns undefined for null/undefined object', () => {
    expect(getByPath(null, '/foo')).toBeUndefined()
    expect(getByPath(undefined, '/foo')).toBeUndefined()
  })

  it('returns null value correctly', () => {
    expect(getByPath(testData, '/nullValue')).toBeNull()
  })

  it('returns falsy values correctly', () => {
    expect(getByPath(testData, '/zero')).toBe(0)
    expect(getByPath(testData, '/empty')).toBe('')
  })

  it('returns entire object for root path', () => {
    expect(getByPath(testData, '/')).toEqual(testData)
  })
})

// ============================================================================
// setByPath
// ============================================================================

describe('setByPath', () => {
  it('sets top-level property', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, '/name', 'John')
    expect(obj.name).toBe('John')
  })

  it('sets nested property', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, '/user/name', 'John')
    expect((obj.user as Record<string, unknown>).name).toBe('John')
  })

  it('sets deeply nested property', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, '/a/b/c/d', 'value')
    expect(getByPath(obj, '/a/b/c/d')).toBe('value')
  })

  it('creates intermediate objects', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, '/config/settings/theme', 'dark')

    expect(obj.config).toBeDefined()
    expect((obj.config as Record<string, unknown>).settings).toBeDefined()
    expect(getByPath(obj, '/config/settings/theme')).toBe('dark')
  })

  it('creates arrays for numeric segments', () => {
    const obj: Record<string, unknown> = {}
    setByPath(obj, '/items/0', 'first')

    expect(Array.isArray(obj.items)).toBe(true)
    expect((obj.items as unknown[])[0]).toBe('first')
  })

  it('overwrites existing values', () => {
    const obj: Record<string, unknown> = { name: 'old' }
    setByPath(obj, '/name', 'new')
    expect(obj.name).toBe('new')
  })

  it('throws for root path', () => {
    const obj: Record<string, unknown> = {}
    expect(() => setByPath(obj, '/', 'value')).toThrow()
  })
})

// ============================================================================
// resolveDynamicValue
// ============================================================================

describe('resolveDynamicValue', () => {
  const data = {
    sales: { total: 1000, count: 50 },
    inputs: { category: 'Electronics' }
  }

  it('resolves dynamic value from data', () => {
    const result = resolveDynamicValue({ path: '/sales/total' }, data)
    expect(result).toBe(1000)
  })

  it('returns static value unchanged', () => {
    expect(resolveDynamicValue('static', data)).toBe('static')
    expect(resolveDynamicValue(42, data)).toBe(42)
    expect(resolveDynamicValue(null, data)).toBeNull()
  })

  it('returns undefined for non-existent path', () => {
    const result = resolveDynamicValue({ path: '/nonexistent' }, data)
    expect(result).toBeUndefined()
  })

  it('handles nested dynamic values', () => {
    const result = resolveDynamicValue({ path: '/inputs/category' }, data)
    expect(result).toBe('Electronics')
  })
})

// ============================================================================
// resolveAllDynamicValues
// ============================================================================

describe('resolveAllDynamicValues', () => {
  const data = {
    title: 'Sales Report',
    values: { min: 0, max: 100 },
    items: ['a', 'b', 'c']
  }

  it('resolves all dynamic values in props', () => {
    const props = {
      title: { path: '/title' },
      min: { path: '/values/min' },
      max: { path: '/values/max' }
    }

    const resolved = resolveAllDynamicValues(props, data)

    expect(resolved.title).toBe('Sales Report')
    expect(resolved.min).toBe(0)
    expect(resolved.max).toBe(100)
  })

  it('preserves static values', () => {
    const props = {
      static: 'value',
      number: 42,
      dynamic: { path: '/title' }
    }

    const resolved = resolveAllDynamicValues(props, data)

    expect(resolved.static).toBe('value')
    expect(resolved.number).toBe(42)
    expect(resolved.dynamic).toBe('Sales Report')
  })

  it('resolves nested objects recursively', () => {
    const props = {
      config: {
        title: { path: '/title' },
        range: {
          min: { path: '/values/min' },
          max: { path: '/values/max' }
        }
      }
    }

    const resolved = resolveAllDynamicValues(props, data)
    const config = resolved.config as Record<string, unknown>
    const range = config.range as Record<string, unknown>

    expect(config.title).toBe('Sales Report')
    expect(range.min).toBe(0)
    expect(range.max).toBe(100)
  })

  it('resolves dynamic values in arrays', () => {
    const props = {
      values: [
        { path: '/values/min' },
        'static',
        { path: '/values/max' }
      ]
    }

    const resolved = resolveAllDynamicValues(props, data)

    expect(resolved.values).toEqual([0, 'static', 100])
  })

  it('handles empty props', () => {
    const resolved = resolveAllDynamicValues({}, data)
    expect(resolved).toEqual({})
  })
})

// ============================================================================
// hasDynamicValues
// ============================================================================

describe('hasDynamicValues', () => {
  it('returns true for props with dynamic values', () => {
    expect(hasDynamicValues({ title: { path: '/title' } })).toBe(true)
    expect(hasDynamicValues({ nested: { deep: { path: '/value' } } })).toBe(true)
  })

  it('returns false for static props', () => {
    expect(hasDynamicValues({ title: 'static' })).toBe(false)
    expect(hasDynamicValues({ number: 42, bool: true })).toBe(false)
    expect(hasDynamicValues({})).toBe(false)
  })

  it('detects dynamic values in arrays', () => {
    expect(hasDynamicValues({ items: [{ path: '/value' }] })).toBe(true)
    expect(hasDynamicValues({ items: ['static', { path: '/value' }] })).toBe(true)
  })

  it('returns false for arrays without dynamic values', () => {
    expect(hasDynamicValues({ items: ['a', 'b', 'c'] })).toBe(false)
    expect(hasDynamicValues({ items: [1, 2, 3] })).toBe(false)
  })

  it('detects deeply nested dynamic values', () => {
    const props = {
      level1: {
        level2: {
          level3: {
            value: { path: '/deep' }
          }
        }
      }
    }
    expect(hasDynamicValues(props)).toBe(true)
  })

  it('handles objects in arrays', () => {
    const props = {
      items: [
        { name: 'static' },
        { name: { path: '/dynamic' } }
      ]
    }
    expect(hasDynamicValues(props)).toBe(true)
  })
})
