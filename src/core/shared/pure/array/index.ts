/**
 * Array Utilities
 *
 * Pure functions for array manipulation: sorting, filtering, grouping.
 * All functions are immutable - they return new arrays without modifying the input.
 *
 * @module core/shared/pure/array
 */

// ============================================================================
// Sorting
// ============================================================================

export type SortDirection = 'asc' | 'desc'

export interface SortConfig<T> {
  key: keyof T | ((item: T) => unknown)
  direction: SortDirection
  nullsLast?: boolean
}

/**
 * Sort array by a single key
 */
export function sortBy<T>(
  data: T[],
  key: keyof T | ((item: T) => unknown),
  direction: SortDirection = 'asc'
): T[] {
  return [...data].sort((a, b) => {
    const aVal = typeof key === 'function' ? key(a) : a[key]
    const bVal = typeof key === 'function' ? key(b) : b[key]
    return compareValues(aVal, bVal, direction)
  })
}

/**
 * Sort array by multiple keys
 */
export function sortByMultiple<T>(data: T[], configs: SortConfig<T>[]): T[] {
  return [...data].sort((a, b) => {
    for (const config of configs) {
      const aVal = typeof config.key === 'function' ? config.key(a) : a[config.key]
      const bVal = typeof config.key === 'function' ? config.key(b) : b[config.key]
      const result = compareValues(aVal, bVal, config.direction, config.nullsLast)
      if (result !== 0) return result
    }
    return 0
  })
}

/**
 * Compare two values for sorting
 */
export function compareValues(
  a: unknown,
  b: unknown,
  direction: SortDirection = 'asc',
  nullsLast: boolean = true
): number {
  // Handle nulls
  if (a === null || a === undefined) {
    if (b === null || b === undefined) return 0
    return nullsLast ? 1 : -1
  }
  if (b === null || b === undefined) {
    return nullsLast ? -1 : 1
  }

  // Compare based on type
  let cmp: number
  if (typeof a === 'number' && typeof b === 'number') {
    cmp = a - b
  } else if (a instanceof Date && b instanceof Date) {
    cmp = a.getTime() - b.getTime()
  } else {
    cmp = String(a).localeCompare(String(b))
  }

  return direction === 'asc' ? cmp : -cmp
}

// ============================================================================
// Filtering
// ============================================================================

export type FilterOperator =
  | 'equals'
  | 'notEquals'
  | 'contains'
  | 'notContains'
  | 'startsWith'
  | 'endsWith'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'between'
  | 'in'
  | 'notIn'
  | 'isNull'
  | 'isNotNull'

export interface FilterCondition<T> {
  key: keyof T | ((item: T) => unknown)
  operator: FilterOperator
  value?: unknown
  value2?: unknown // For 'between' operator
}

/**
 * Filter array by a single condition
 */
export function filterBy<T>(
  data: T[],
  key: keyof T | ((item: T) => unknown),
  operator: FilterOperator,
  value?: unknown,
  value2?: unknown
): T[] {
  return data.filter(item => {
    const itemValue = typeof key === 'function' ? key(item) : item[key]
    return matchesCondition(itemValue, operator, value, value2)
  })
}

/**
 * Filter array by multiple conditions (AND logic)
 */
export function filterByAll<T>(data: T[], conditions: FilterCondition<T>[]): T[] {
  return data.filter(item =>
    conditions.every(cond => {
      const itemValue = typeof cond.key === 'function' ? cond.key(item) : item[cond.key]
      return matchesCondition(itemValue, cond.operator, cond.value, cond.value2)
    })
  )
}

/**
 * Filter array by multiple conditions (OR logic)
 */
export function filterByAny<T>(data: T[], conditions: FilterCondition<T>[]): T[] {
  return data.filter(item =>
    conditions.some(cond => {
      const itemValue = typeof cond.key === 'function' ? cond.key(item) : item[cond.key]
      return matchesCondition(itemValue, cond.operator, cond.value, cond.value2)
    })
  )
}

/**
 * Check if a value matches a filter condition
 */
export function matchesCondition(
  itemValue: unknown,
  operator: FilterOperator,
  value?: unknown,
  value2?: unknown
): boolean {
  const strValue = String(itemValue ?? '').toLowerCase()
  const strFilter = String(value ?? '').toLowerCase()

  switch (operator) {
    case 'equals':
      return itemValue === value
    case 'notEquals':
      return itemValue !== value
    case 'contains':
      return strValue.includes(strFilter)
    case 'notContains':
      return !strValue.includes(strFilter)
    case 'startsWith':
      return strValue.startsWith(strFilter)
    case 'endsWith':
      return strValue.endsWith(strFilter)
    case 'gt':
      return Number(itemValue) > Number(value)
    case 'gte':
      return Number(itemValue) >= Number(value)
    case 'lt':
      return Number(itemValue) < Number(value)
    case 'lte':
      return Number(itemValue) <= Number(value)
    case 'between':
      return Number(itemValue) >= Number(value) && Number(itemValue) <= Number(value2)
    case 'in':
      return Array.isArray(value) && value.includes(itemValue)
    case 'notIn':
      return Array.isArray(value) && !value.includes(itemValue)
    case 'isNull':
      return itemValue === null || itemValue === undefined
    case 'isNotNull':
      return itemValue !== null && itemValue !== undefined
    default:
      return true
  }
}

/**
 * Search array by text (searches all string fields)
 */
export function searchText<T extends Record<string, unknown>>(
  data: T[],
  query: string,
  keys?: (keyof T)[]
): T[] {
  if (!query.trim()) return data

  const searchTerms = query.toLowerCase().split(/\s+/)
  const searchKeys = keys || (Object.keys(data[0] || {}) as (keyof T)[])

  return data.filter(item =>
    searchTerms.every(term =>
      searchKeys.some(key => {
        const value = item[key]
        return String(value ?? '').toLowerCase().includes(term)
      })
    )
  )
}

// ============================================================================
// Grouping
// ============================================================================

export interface GroupedData<T> {
  key: string
  items: T[]
  count: number
}

/**
 * Group array by a key
 */
export function groupBy<T>(
  data: T[],
  key: keyof T | ((item: T) => string)
): GroupedData<T>[] {
  const groups = new Map<string, T[]>()

  for (const item of data) {
    const groupKey = String(typeof key === 'function' ? key(item) : item[key])
    const existing = groups.get(groupKey) || []
    groups.set(groupKey, [...existing, item])
  }

  return Array.from(groups.entries()).map(([key, items]) => ({
    key,
    items,
    count: items.length
  }))
}

/**
 * Group and aggregate array
 */
export function groupAndAggregate<T, R>(
  data: T[],
  groupKey: keyof T | ((item: T) => string),
  aggregator: (items: T[]) => R
): Array<{ key: string; value: R }> {
  const groups = groupBy(data, groupKey)
  return groups.map(group => ({
    key: group.key,
    value: aggregator(group.items)
  }))
}

// ============================================================================
// Aggregation
// ============================================================================

/**
 * Calculate sum of numeric values
 */
export function sum<T>(data: T[], key: keyof T | ((item: T) => number)): number {
  return data.reduce((acc, item) => {
    const value = typeof key === 'function' ? key(item) : item[key]
    return acc + (Number(value) || 0)
  }, 0)
}

/**
 * Calculate average of numeric values
 */
export function average<T>(data: T[], key: keyof T | ((item: T) => number)): number {
  if (data.length === 0) return 0
  return sum(data, key) / data.length
}

/**
 * Find minimum value
 */
export function min<T>(data: T[], key: keyof T | ((item: T) => number)): number {
  if (data.length === 0) return 0
  return Math.min(...data.map(item => {
    const value = typeof key === 'function' ? key(item) : item[key]
    return Number(value) || 0
  }))
}

/**
 * Find maximum value
 */
export function max<T>(data: T[], key: keyof T | ((item: T) => number)): number {
  if (data.length === 0) return 0
  return Math.max(...data.map(item => {
    const value = typeof key === 'function' ? key(item) : item[key]
    return Number(value) || 0
  }))
}

/**
 * Count distinct values
 */
export function countDistinct<T>(data: T[], key: keyof T | ((item: T) => unknown)): number {
  const values = new Set(data.map(item =>
    typeof key === 'function' ? key(item) : item[key]
  ))
  return values.size
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Get unique values from array
 */
export function unique<T>(data: T[], key?: keyof T | ((item: T) => unknown)): T[] {
  if (!key) {
    return [...new Set(data)]
  }

  const seen = new Set<unknown>()
  return data.filter(item => {
    const value = typeof key === 'function' ? key(item) : item[key]
    if (seen.has(value)) return false
    seen.add(value)
    return true
  })
}

/**
 * Paginate array
 */
export function paginate<T>(data: T[], page: number, pageSize: number): T[] {
  const start = (page - 1) * pageSize
  return data.slice(start, start + pageSize)
}

/**
 * Chunk array into smaller arrays
 */
export function chunk<T>(data: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < data.length; i += size) {
    chunks.push(data.slice(i, i + size))
  }
  return chunks
}

/**
 * Flatten nested arrays
 */
export function flatten<T>(data: T[][]): T[] {
  return data.flat()
}

/**
 * Pick specific keys from objects
 */
export function pick<T extends Record<string, unknown>, K extends keyof T>(
  data: T[],
  keys: K[]
): Pick<T, K>[] {
  return data.map(item => {
    const result = {} as Pick<T, K>
    for (const key of keys) {
      result[key] = item[key]
    }
    return result
  })
}

/**
 * Omit specific keys from objects
 */
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  data: T[],
  keys: K[]
): Omit<T, K>[] {
  const keySet = new Set(keys as string[])
  return data.map(item => {
    const result = {} as Omit<T, K>
    for (const key of Object.keys(item)) {
      if (!keySet.has(key)) {
        (result as Record<string, unknown>)[key] = item[key]
      }
    }
    return result
  })
}
