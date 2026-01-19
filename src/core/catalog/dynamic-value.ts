/**
 * Dynamic Value Resolution
 *
 * Utilities for resolving dynamic value references in UITree props.
 * Uses JSON Pointer (RFC 6901) style paths for data access.
 *
 * @example
 * const data = { sales: { total: 1000 }, inputs: { category: "A" } }
 * getByPath(data, "/sales/total") // => 1000
 * getByPath(data, "/inputs/category") // => "A"
 */

import { isDynamicValue, type DynamicValue } from '@/types/ui-tree'

/**
 * Parse a JSON Pointer path into segments
 *
 * @param path - JSON Pointer path (e.g., "/sales/total")
 * @returns Array of path segments
 */
export function parsePath(path: string): string[] {
  // Remove leading slash and split
  if (!path.startsWith('/')) {
    throw new Error(`Invalid JSON Pointer path: "${path}". Must start with "/"`)
  }

  if (path === '/') {
    return []
  }

  return path
    .slice(1) // Remove leading slash
    .split('/')
    .map(segment => {
      // Decode JSON Pointer escape sequences (RFC 6901)
      return segment.replace(/~1/g, '/').replace(/~0/g, '~')
    })
}

/**
 * Get a value from an object using a JSON Pointer path
 *
 * @param obj - Object to traverse
 * @param path - JSON Pointer path (e.g., "/sales/total")
 * @returns Value at path or undefined if not found
 */
export function getByPath(obj: unknown, path: string): unknown {
  if (obj === null || obj === undefined) {
    return undefined
  }

  const segments = parsePath(path)
  let current: unknown = obj

  for (const segment of segments) {
    if (current === null || current === undefined) {
      return undefined
    }

    if (typeof current === 'object') {
      // Handle arrays with numeric indices
      if (Array.isArray(current)) {
        const index = parseInt(segment, 10)
        if (isNaN(index)) {
          return undefined
        }
        current = current[index]
      } else {
        current = (current as Record<string, unknown>)[segment]
      }
    } else {
      return undefined
    }
  }

  return current
}

/**
 * Set a value in an object using a JSON Pointer path
 * Creates intermediate objects/arrays as needed
 *
 * @param obj - Object to modify
 * @param path - JSON Pointer path
 * @param value - Value to set
 */
export function setByPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown
): void {
  const segments = parsePath(path)

  if (segments.length === 0) {
    throw new Error('Cannot set root object')
  }

  let current: Record<string, unknown> = obj

  for (let i = 0; i < segments.length - 1; i++) {
    const segment = segments[i]
    const nextSegment = segments[i + 1]

    if (!(segment in current) || current[segment] === null || current[segment] === undefined) {
      // Create intermediate object or array based on next segment
      const isNextNumeric = /^\d+$/.test(nextSegment)
      current[segment] = isNextNumeric ? [] : {}
    }

    current = current[segment] as Record<string, unknown>
  }

  const lastSegment = segments[segments.length - 1]
  current[lastSegment] = value
}

/**
 * Resolve a potentially dynamic value
 *
 * @param value - Static value or DynamicValue reference
 * @param data - Data context for resolving dynamic values
 * @returns Resolved value
 */
export function resolveDynamicValue<T>(
  value: T | DynamicValue,
  data: Record<string, unknown>
): T | undefined {
  if (isDynamicValue(value)) {
    return getByPath(data, value.path) as T | undefined
  }
  return value
}

/**
 * Resolve all dynamic values in a props object
 *
 * @param props - Props object with potential dynamic values
 * @param data - Data context for resolving
 * @returns New props object with all dynamic values resolved
 */
export function resolveAllDynamicValues(
  props: Record<string, unknown>,
  data: Record<string, unknown>
): Record<string, unknown> {
  const resolved: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    if (isDynamicValue(value)) {
      resolved[key] = getByPath(data, value.path)
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively resolve nested objects
      resolved[key] = resolveAllDynamicValues(
        value as Record<string, unknown>,
        data
      )
    } else if (Array.isArray(value)) {
      // Handle arrays - resolve any dynamic values within
      resolved[key] = value.map(item => {
        if (isDynamicValue(item)) {
          return getByPath(data, item.path)
        } else if (typeof item === 'object' && item !== null) {
          return resolveAllDynamicValues(
            item as Record<string, unknown>,
            data
          )
        }
        return item
      })
    } else {
      resolved[key] = value
    }
  }

  return resolved
}

/**
 * Check if any props contain dynamic values
 */
export function hasDynamicValues(props: Record<string, unknown>): boolean {
  for (const value of Object.values(props)) {
    if (isDynamicValue(value)) {
      return true
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        if (value.some(item => isDynamicValue(item) ||
          (typeof item === 'object' && item !== null && hasDynamicValues(item as Record<string, unknown>)))) {
          return true
        }
      } else if (hasDynamicValues(value as Record<string, unknown>)) {
        return true
      }
    }
  }
  return false
}
