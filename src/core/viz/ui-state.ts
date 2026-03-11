/**
 * UIStateStore
 *
 * Mutable state container for Generated UI (UITree).
 * Holds runtime state that can be updated via declarative actions
 * (e.g., on.press → setState).
 *
 * State is stored as a plain object. Paths use JSON Pointer notation.
 * The store is framework-agnostic — wrap it in Svelte $state() at the
 * component boundary to get reactivity.
 *
 * @module core/viz/ui-state
 */

import { resolveJsonPointer } from './resolve'

// ============================================================================
// Types
// ============================================================================

/** Snapshot of the entire state (for context building and debugging) */
export type StateSnapshot = Record<string, unknown>

// ============================================================================
// UIStateStore
// ============================================================================

/**
 * Mutable state store for UITree runtime state.
 *
 * Stores values at JSON Pointer paths. Designed to be used alongside
 * UITree.data (read-only) to form the full data context for
 * `resolveDynamicValues()`.
 *
 * @example
 * ```typescript
 * const store = new UIStateStore({ filter: 'Q1', page: 1 })
 * store.set('/filter', 'Q2')
 * store.get('/filter') // → 'Q2'
 *
 * // Build merged context for resolution:
 * const context = store.buildContext(tree.data)
 * ```
 */
export class UIStateStore {
  private _state: Record<string, unknown>

  constructor(initialState: Record<string, unknown> = {}) {
    this._state = { ...initialState }
  }

  // --------------------------------------------------------------------------
  // Read
  // --------------------------------------------------------------------------

  /**
   * Get a value at a JSON Pointer path within the state.
   *
   * @example
   * store.get('/filter')          // top-level key
   * store.get('/user/name')       // nested key
   */
  get(path: string): unknown {
    return resolveJsonPointer(this._state, path)
  }

  /** Return a shallow copy of the entire state object. */
  getAll(): StateSnapshot {
    return { ...this._state }
  }

  // --------------------------------------------------------------------------
  // Write
  // --------------------------------------------------------------------------

  /**
   * Set a value at a JSON Pointer path.
   *
   * Supports:
   * - `/key` — set a top-level key
   * - `/nested/key` — create intermediate objects as needed
   *
   * @example
   * store.set('/filter', 'Q2')
   * store.set('/pagination/page', 2)
   */
  set(path: string, value: unknown): void {
    const segments = path
      .replace(/^\//, '')
      .split('/')
      .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))

    if (segments.length === 0 || (segments.length === 1 && segments[0] === '')) {
      // Root replacement — merge if object, replace otherwise
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        this._state = { ...this._state, ...(value as Record<string, unknown>) }
      }
      return
    }

    if (segments.length === 1) {
      this._state = { ...this._state, [segments[0]]: value }
      return
    }

    // Deep set — build nested objects along the path
    this._state = setDeep(this._state, segments, value) as Record<string, unknown>
  }

  /**
   * Push a value onto an array at the given path.
   * Creates the array if it does not exist.
   */
  push(path: string, value: unknown): void {
    const existing = this.get(path)
    const arr = Array.isArray(existing) ? [...existing, value] : [value]
    this.set(path, arr)
  }

  /**
   * Remove the key at a top-level path segment.
   * Only supports single-segment paths (`/key`).
   */
  remove(path: string): void {
    const key = path.replace(/^\//, '')
    if (!key.includes('/')) {
      const { [key]: _, ...rest } = this._state
      this._state = rest
    }
  }

  /**
   * Reset state to a new value (defaults to empty).
   */
  reset(newState: Record<string, unknown> = {}): void {
    this._state = { ...newState }
  }

  // --------------------------------------------------------------------------
  // Context building
  // --------------------------------------------------------------------------

  /**
   * Build the full data context for `resolveDynamicValues()`.
   *
   * Merges UITree.data (read-only, under its own keys) with
   * UIStateStore state (under `state`).
   *
   * @param treeData - The `data` field from a UITree (optional)
   * @returns Merged context: `{ ...treeData, state: this._state }`
   *
   * @example
   * // UITree.data = { sales: { total: 12500 } }
   * // Store state = { filter: 'Q1' }
   * context = store.buildContext(tree.data)
   * // context = { sales: { total: 12500 }, state: { filter: 'Q1' } }
   *
   * // DynamicValue { path: '/sales/total' }    → 12500
   * // DynamicValue { path: '/state/filter' }   → 'Q1'
   */
  buildContext(treeData: Record<string, unknown> = {}): Record<string, unknown> {
    return {
      ...treeData,
      state: this._state,
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

/**
 * Immutably set a value deep in an object tree, creating intermediate
 * objects as needed.
 */
function setDeep(obj: unknown, segments: string[], value: unknown): unknown {
  if (segments.length === 0) return value

  const [head, ...tail] = segments
  const current =
    obj !== null && typeof obj === 'object' && !Array.isArray(obj)
      ? (obj as Record<string, unknown>)
      : {}

  return {
    ...current,
    [head]: setDeep(current[head], tail, value),
  }
}
