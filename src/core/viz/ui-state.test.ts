/**
 * Tests for UIStateStore
 */

import { describe, it, expect } from 'vitest'
import { UIStateStore } from './ui-state'

describe('UIStateStore', () => {
  // --------------------------------------------------------------------------
  // Construction and read
  // --------------------------------------------------------------------------

  it('initialises with empty state by default', () => {
    const store = new UIStateStore()
    expect(store.getAll()).toEqual({})
  })

  it('initialises with provided state', () => {
    const store = new UIStateStore({ filter: 'Q1', page: 1 })
    expect(store.getAll()).toEqual({ filter: 'Q1', page: 1 })
  })

  it('get returns a top-level value', () => {
    const store = new UIStateStore({ filter: 'Q2' })
    expect(store.get('/filter')).toBe('Q2')
  })

  it('get resolves nested paths', () => {
    const store = new UIStateStore({ pagination: { page: 3 } })
    expect(store.get('/pagination/page')).toBe(3)
  })

  it('get returns undefined for missing path', () => {
    const store = new UIStateStore()
    expect(store.get('/missing')).toBeUndefined()
  })

  // --------------------------------------------------------------------------
  // set
  // --------------------------------------------------------------------------

  it('set updates a top-level key', () => {
    const store = new UIStateStore({ filter: 'Q1' })
    store.set('/filter', 'Q3')
    expect(store.get('/filter')).toBe('Q3')
  })

  it('set creates a new top-level key', () => {
    const store = new UIStateStore()
    store.set('/newKey', 42)
    expect(store.get('/newKey')).toBe(42)
  })

  it('set creates nested objects', () => {
    const store = new UIStateStore()
    store.set('/a/b/c', 'deep')
    expect(store.get('/a/b/c')).toBe('deep')
  })

  it('set does not mutate other top-level keys', () => {
    const store = new UIStateStore({ x: 1, y: 2 })
    store.set('/x', 99)
    expect(store.get('/y')).toBe(2)
  })

  // --------------------------------------------------------------------------
  // push
  // --------------------------------------------------------------------------

  it('push creates an array if not present', () => {
    const store = new UIStateStore()
    store.push('/items', 'a')
    expect(store.get('/items')).toEqual(['a'])
  })

  it('push appends to an existing array', () => {
    const store = new UIStateStore({ items: ['a'] })
    store.push('/items', 'b')
    expect(store.get('/items')).toEqual(['a', 'b'])
  })

  // --------------------------------------------------------------------------
  // remove
  // --------------------------------------------------------------------------

  it('remove deletes a top-level key', () => {
    const store = new UIStateStore({ filter: 'Q1', page: 1 })
    store.remove('/filter')
    expect(store.get('/filter')).toBeUndefined()
    expect(store.get('/page')).toBe(1)
  })

  // --------------------------------------------------------------------------
  // reset
  // --------------------------------------------------------------------------

  it('reset clears all state', () => {
    const store = new UIStateStore({ a: 1, b: 2 })
    store.reset()
    expect(store.getAll()).toEqual({})
  })

  it('reset sets to provided value', () => {
    const store = new UIStateStore({ a: 1 })
    store.reset({ x: 99 })
    expect(store.getAll()).toEqual({ x: 99 })
  })

  // --------------------------------------------------------------------------
  // buildContext
  // --------------------------------------------------------------------------

  it('buildContext merges treeData with state under "state" key', () => {
    const store = new UIStateStore({ filter: 'Q1' })
    const treeData = { sales: { total: 1000 } }
    const ctx = store.buildContext(treeData)
    expect(ctx).toEqual({
      sales: { total: 1000 },
      state: { filter: 'Q1' },
    })
  })

  it('buildContext works with no treeData', () => {
    const store = new UIStateStore({ x: 1 })
    expect(store.buildContext()).toEqual({ state: { x: 1 } })
  })
})
