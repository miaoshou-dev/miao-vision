/**
 * UITree Dynamic Value Resolution
 *
 * Resolves DynamicValue references ({ path: string }) in UIElement props
 * against a merged data context (UITree.data + UIStateStore state).
 *
 * JSON Pointer format (RFC 6901):
 *   /data/sales/total   → context.data.sales.total
 *   /state/filter       → context.state.filter
 *   /inputs/selected    → context.inputs.selected
 *
 * @module core/viz/resolve
 */

import { isDynamicValue, type VisibilityCondition } from '@/types/ui-tree'

// ============================================================================
// JSON Pointer
// ============================================================================

/**
 * Resolve a JSON Pointer path against an object.
 *
 * Supports:
 *  - Absolute paths: "/data/sales/total"
 *  - Array index access: "/items/0/label"
 *  - Escaped chars per RFC 6901: ~1 → /, ~0 → ~
 *
 * Returns `undefined` if any segment is missing.
 */
export function resolveJsonPointer(obj: unknown, pointer: string): unknown {
  if (!pointer || pointer === '/') return obj

  const segments = pointer
    .replace(/^\//, '')
    .split('/')
    .map((s) => s.replace(/~1/g, '/').replace(/~0/g, '~'))

  let current: unknown = obj
  for (const segment of segments) {
    if (current === null || current === undefined) return undefined
    if (typeof current !== 'object') return undefined

    if (Array.isArray(current)) {
      const idx = parseInt(segment, 10)
      if (isNaN(idx)) return undefined
      current = current[idx]
    } else {
      current = (current as Record<string, unknown>)[segment]
    }
  }

  return current
}

// ============================================================================
// Dynamic value resolution
// ============================================================================

/**
 * Resolve a single value: if it is a DynamicValue, resolve it from context;
 * otherwise return it unchanged.
 */
export function resolveSingleValue(
  value: unknown,
  context: Record<string, unknown>
): unknown {
  if (isDynamicValue(value)) {
    return resolveJsonPointer(context, value.path)
  }
  return value
}

/**
 * Recursively resolve all DynamicValue instances in a props object.
 *
 * - Plain values pass through unchanged.
 * - DynamicValue objects (`{ path: string }`) are replaced with their
 *   resolved value from the context.
 * - Nested objects and arrays are traversed.
 *
 * @param props - The raw props from a UIElement
 * @param context - Merged data context (UITree.data merged with state)
 * @returns New props object with dynamic values resolved
 */
export function resolveDynamicValues(
  props: Record<string, unknown>,
  context: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(props)) {
    resolved[key] = resolveValue(value, context)
  }
  return resolved
}

function resolveValue(value: unknown, context: Record<string, unknown>): unknown {
  if (isDynamicValue(value)) {
    return resolveJsonPointer(context, value.path)
  }

  if (Array.isArray(value)) {
    return value.map((item) => resolveValue(item, context))
  }

  if (value !== null && typeof value === 'object') {
    const resolved: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      resolved[k] = resolveValue(v, context)
    }
    return resolved
  }

  return value
}

// ============================================================================
// Visibility resolution
// ============================================================================

/**
 * Resolve a visibility condition to a boolean.
 *
 * - Static boolean: returned as-is.
 * - DynamicValue: resolved from context, coerced to boolean.
 * - undefined: defaults to true (visible).
 */
export function resolveVisible(
  condition: VisibilityCondition | undefined,
  context: Record<string, unknown>
): boolean {
  if (condition === undefined) return true
  if (typeof condition === 'boolean') return condition
  // DynamicValue
  const resolved = resolveJsonPointer(context, condition.path)
  return Boolean(resolved)
}
