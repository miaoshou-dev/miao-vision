/**
 * Tests for declarative Actions (T4)
 */

import { describe, it, expect, vi } from 'vitest'
import { executeAction, fireEvent, isKnownAction, getActionNames } from './actions'
import { UIStateStore } from './ui-state'

// ============================================================================
// Fixtures
// ============================================================================

function makeStore(init: Record<string, unknown> = {}) {
  return new UIStateStore(init)
}

// ============================================================================
// executeAction
// ============================================================================

describe('executeAction', () => {
  describe('setState', () => {
    it('sets a top-level state value', () => {
      const store = makeStore()
      executeAction({ action: 'setState', params: { statePath: '/filter', value: 'Q2' } }, store)
      expect(store.get('/filter')).toBe('Q2')
    })

    it('sets a nested state value', () => {
      const store = makeStore()
      executeAction({ action: 'setState', params: { statePath: '/pagination/page', value: 3 } }, store)
      expect(store.get('/pagination/page')).toBe(3)
    })

    it('overwrites an existing value', () => {
      const store = makeStore({ filter: 'Q1' })
      executeAction({ action: 'setState', params: { statePath: '/filter', value: 'Q4' } }, store)
      expect(store.get('/filter')).toBe('Q4')
    })

    it('warns and does nothing when statePath is missing', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const store = makeStore()
      executeAction({ action: 'setState', params: { value: 'Q2' } }, store)
      expect(warn).toHaveBeenCalled()
      expect(store.getAll()).toEqual({})
      warn.mockRestore()
    })
  })

  describe('pushState', () => {
    it('creates an array and pushes a value', () => {
      const store = makeStore()
      executeAction({ action: 'pushState', params: { statePath: '/tags', value: 'tech' } }, store)
      expect(store.get('/tags')).toEqual(['tech'])
    })

    it('appends to an existing array', () => {
      const store = makeStore({ tags: ['tech'] })
      executeAction({ action: 'pushState', params: { statePath: '/tags', value: 'ai' } }, store)
      expect(store.get('/tags')).toEqual(['tech', 'ai'])
    })
  })

  describe('removeState', () => {
    it('removes a top-level key', () => {
      const store = makeStore({ filter: 'Q1', page: 1 })
      executeAction({ action: 'removeState', params: { statePath: '/filter' } }, store)
      expect(store.get('/filter')).toBeUndefined()
      expect(store.get('/page')).toBe(1)
    })
  })

  describe('resetState', () => {
    it('clears state when no value provided', () => {
      const store = makeStore({ a: 1, b: 2 })
      executeAction({ action: 'resetState', params: {} }, store)
      expect(store.getAll()).toEqual({})
    })

    it('sets state to provided value', () => {
      const store = makeStore({ a: 1 })
      executeAction({ action: 'resetState', params: { value: { x: 99 } } }, store)
      expect(store.getAll()).toEqual({ x: 99 })
    })
  })

  describe('toggleState', () => {
    it('toggles false → true', () => {
      const store = makeStore({ show: false })
      executeAction({ action: 'toggleState', params: { statePath: '/show' } }, store)
      expect(store.get('/show')).toBe(true)
    })

    it('toggles true → false', () => {
      const store = makeStore({ show: true })
      executeAction({ action: 'toggleState', params: { statePath: '/show' } }, store)
      expect(store.get('/show')).toBe(false)
    })

    it('toggles undefined → true', () => {
      const store = makeStore()
      executeAction({ action: 'toggleState', params: { statePath: '/show' } }, store)
      expect(store.get('/show')).toBe(true)
    })
  })

  describe('unknown action', () => {
    it('logs a warning and does not throw', () => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const store = makeStore()
      expect(() => executeAction({ action: 'unknownOp' }, store)).not.toThrow()
      expect(warn).toHaveBeenCalledWith(expect.stringContaining('unknownOp'))
      warn.mockRestore()
    })
  })
})

// ============================================================================
// fireEvent
// ============================================================================

describe('fireEvent', () => {
  it('executes the handler for the given event', () => {
    const store = makeStore()
    fireEvent(
      { press: { action: 'setState', params: { statePath: '/clicked', value: true } } },
      'press',
      store
    )
    expect(store.get('/clicked')).toBe(true)
  })

  it('does nothing when on map is undefined', () => {
    const store = makeStore()
    expect(() => fireEvent(undefined, 'press', store)).not.toThrow()
  })

  it('does nothing when the event is not registered', () => {
    const store = makeStore()
    fireEvent({ press: { action: 'setState', params: { statePath: '/x', value: 1 } } }, 'hover', store)
    expect(store.getAll()).toEqual({})
  })
})

// ============================================================================
// Registry helpers
// ============================================================================

describe('isKnownAction', () => {
  it('returns true for built-in actions', () => {
    expect(isKnownAction('setState')).toBe(true)
    expect(isKnownAction('pushState')).toBe(true)
    expect(isKnownAction('toggleState')).toBe(true)
  })

  it('returns false for unknown actions', () => {
    expect(isKnownAction('teleport')).toBe(false)
  })
})

describe('getActionNames', () => {
  it('returns all built-in action names', () => {
    const names = getActionNames()
    expect(names).toContain('setState')
    expect(names).toContain('pushState')
    expect(names).toContain('removeState')
    expect(names).toContain('resetState')
    expect(names).toContain('toggleState')
  })
})
