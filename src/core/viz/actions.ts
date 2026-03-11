/**
 * Declarative Actions
 *
 * Executes ActionHandler descriptors from UIElement.on against a UIStateStore.
 *
 * Supported actions:
 *   setState   — set a value at a state path
 *   pushState  — push a value onto a state array
 *   removeState — remove a top-level state key
 *   resetState  — reset state (optionally to a new value)
 *   toggleState — toggle a boolean state value
 *
 * @module core/viz/actions
 */

import type { ActionHandler } from '@/types/ui-tree'
import type { UIStateStore } from './ui-state'

// ============================================================================
// Action executors
// ============================================================================

type ActionExecutor = (params: Record<string, unknown>, store: UIStateStore) => void

const ACTION_EXECUTORS: Record<string, ActionExecutor> = {
  /**
   * setState: set store[statePath] = value
   *
   * @param params.statePath - JSON Pointer path in the state
   * @param params.value     - Value to set
   */
  setState(params, store) {
    const { statePath, value } = params
    if (typeof statePath !== 'string') {
      console.warn('[UITree] setState: missing statePath param')
      return
    }
    store.set(statePath, value)
  },

  /**
   * pushState: push value onto an array at store[statePath]
   *
   * @param params.statePath - JSON Pointer path to the array
   * @param params.value     - Value to push
   */
  pushState(params, store) {
    const { statePath, value } = params
    if (typeof statePath !== 'string') {
      console.warn('[UITree] pushState: missing statePath param')
      return
    }
    store.push(statePath, value)
  },

  /**
   * removeState: remove a top-level state key
   *
   * @param params.statePath - JSON Pointer path to remove (single segment)
   */
  removeState(params, store) {
    const { statePath } = params
    if (typeof statePath !== 'string') {
      console.warn('[UITree] removeState: missing statePath param')
      return
    }
    store.remove(statePath)
  },

  /**
   * resetState: reset entire state (optionally to a new value)
   *
   * @param params.value - Optional new state object (defaults to {})
   */
  resetState(params, store) {
    const newState =
      typeof params.value === 'object' && params.value !== null
        ? (params.value as Record<string, unknown>)
        : {}
    store.reset(newState)
  },

  /**
   * toggleState: toggle a boolean value at store[statePath]
   *
   * @param params.statePath - JSON Pointer path to the boolean
   */
  toggleState(params, store) {
    const { statePath } = params
    if (typeof statePath !== 'string') {
      console.warn('[UITree] toggleState: missing statePath param')
      return
    }
    const current = store.get(statePath)
    store.set(statePath, !current)
  },
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Execute a single ActionHandler against a UIStateStore.
 *
 * Unknown action names are logged as warnings and silently ignored,
 * so missing actions do not crash the UI.
 *
 * @example
 * executeAction(
 *   { action: 'setState', params: { statePath: '/filter', value: 'Q2' } },
 *   store
 * )
 */
export function executeAction(handler: ActionHandler, store: UIStateStore): void {
  const executor = ACTION_EXECUTORS[handler.action]
  if (!executor) {
    console.warn(`[UITree] Unknown action: "${handler.action}"`)
    return
  }
  executor(handler.params ?? {}, store)
}

/**
 * Execute all actions bound to a named event on a UIElement.
 *
 * @param on     - The element's `on` map (e.g., `{ press: { action: 'setState', ... } }`)
 * @param event  - Event name to fire (e.g., 'press', 'change', 'select')
 * @param store  - UIStateStore to mutate
 *
 * @example
 * fireEvent(element.on, 'press', store)
 */
export function fireEvent(
  on: Record<string, ActionHandler> | undefined,
  event: string,
  store: UIStateStore
): void {
  if (!on) return
  const handler = on[event]
  if (!handler) return
  executeAction(handler, store)
}

/**
 * Check if an action name is registered.
 */
export function isKnownAction(action: string): boolean {
  return action in ACTION_EXECUTORS
}

/**
 * Get all registered action names.
 */
export function getActionNames(): string[] {
  return Object.keys(ACTION_EXECUTORS)
}
