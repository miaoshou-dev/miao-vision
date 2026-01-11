/**
 * Array Utilities Tests
 */

import { describe, it, expect } from 'vitest'
import {
  sortBy,
  sortByMultiple,
  compareValues,
  filterBy,
  filterByAll,
  filterByAny,
  matchesCondition,
  searchText,
  groupBy,
  groupAndAggregate,
  sum,
  average,
  min,
  max,
  countDistinct,
  unique,
  paginate,
  chunk,
  pick,
  omit
} from './index'

// Test data
interface Person {
  name: string
  age: number
  city: string
}

const people: Person[] = [
  { name: 'Alice', age: 30, city: 'NYC' },
  { name: 'Bob', age: 25, city: 'LA' },
  { name: 'Charlie', age: 35, city: 'NYC' },
  { name: 'Diana', age: 28, city: 'Chicago' }
]

// ============================================================================
// Sorting Tests
// ============================================================================

describe('sortBy', () => {
  it('sorts by string key ascending', () => {
    const result = sortBy(people, 'name', 'asc')
    expect(result.map(p => p.name)).toEqual(['Alice', 'Bob', 'Charlie', 'Diana'])
  })

  it('sorts by string key descending', () => {
    const result = sortBy(people, 'name', 'desc')
    expect(result.map(p => p.name)).toEqual(['Diana', 'Charlie', 'Bob', 'Alice'])
  })

  it('sorts by number key ascending', () => {
    const result = sortBy(people, 'age', 'asc')
    expect(result.map(p => p.age)).toEqual([25, 28, 30, 35])
  })

  it('sorts by function key', () => {
    const result = sortBy(people, p => p.name.length, 'asc')
    expect(result.map(p => p.name)).toEqual(['Bob', 'Alice', 'Diana', 'Charlie'])
  })

  it('does not mutate original array', () => {
    const original = [...people]
    sortBy(people, 'age', 'asc')
    expect(people).toEqual(original)
  })
})

describe('sortByMultiple', () => {
  it('sorts by multiple keys', () => {
    const data = [
      { city: 'NYC', age: 30 },
      { city: 'LA', age: 25 },
      { city: 'NYC', age: 25 },
      { city: 'LA', age: 30 }
    ]
    const result = sortByMultiple(data, [
      { key: 'city', direction: 'asc' },
      { key: 'age', direction: 'asc' }
    ])
    expect(result).toEqual([
      { city: 'LA', age: 25 },
      { city: 'LA', age: 30 },
      { city: 'NYC', age: 25 },
      { city: 'NYC', age: 30 }
    ])
  })
})

describe('compareValues', () => {
  it('compares numbers', () => {
    expect(compareValues(1, 2, 'asc')).toBeLessThan(0)
    expect(compareValues(2, 1, 'asc')).toBeGreaterThan(0)
    expect(compareValues(1, 1, 'asc')).toBe(0)
  })

  it('compares strings', () => {
    expect(compareValues('a', 'b', 'asc')).toBeLessThan(0)
    expect(compareValues('b', 'a', 'desc')).toBeLessThan(0)
  })

  it('handles nulls with nullsLast', () => {
    expect(compareValues(null, 1, 'asc', true)).toBeGreaterThan(0)
    expect(compareValues(1, null, 'asc', true)).toBeLessThan(0)
  })
})

// ============================================================================
// Filtering Tests
// ============================================================================

describe('filterBy', () => {
  it('filters by equals', () => {
    const result = filterBy(people, 'city', 'equals', 'NYC')
    expect(result).toHaveLength(2)
    expect(result.every(p => p.city === 'NYC')).toBe(true)
  })

  it('filters by contains', () => {
    const result = filterBy(people, 'name', 'contains', 'li')
    expect(result.map(p => p.name)).toEqual(['Alice', 'Charlie'])
  })

  it('filters by gt', () => {
    const result = filterBy(people, 'age', 'gt', 28)
    expect(result.map(p => p.name)).toEqual(['Alice', 'Charlie'])
  })

  it('filters by between', () => {
    const result = filterBy(people, 'age', 'between', 26, 31)
    expect(result.map(p => p.name)).toEqual(['Alice', 'Diana'])
  })

  it('filters by in', () => {
    const result = filterBy(people, 'city', 'in', ['NYC', 'LA'])
    expect(result).toHaveLength(3)
  })
})

describe('filterByAll', () => {
  it('filters with AND logic', () => {
    const result = filterByAll(people, [
      { key: 'city', operator: 'equals', value: 'NYC' },
      { key: 'age', operator: 'gte', value: 30 }
    ])
    expect(result.map(p => p.name)).toEqual(['Alice', 'Charlie'])
  })
})

describe('filterByAny', () => {
  it('filters with OR logic', () => {
    const result = filterByAny(people, [
      { key: 'city', operator: 'equals', value: 'Chicago' },
      { key: 'age', operator: 'lt', value: 26 }
    ])
    expect(result.map(p => p.name)).toEqual(['Bob', 'Diana'])
  })
})

describe('matchesCondition', () => {
  it('matches equals', () => {
    expect(matchesCondition('test', 'equals', 'test')).toBe(true)
    expect(matchesCondition('test', 'equals', 'other')).toBe(false)
  })

  it('matches isNull', () => {
    expect(matchesCondition(null, 'isNull')).toBe(true)
    expect(matchesCondition(undefined, 'isNull')).toBe(true)
    expect(matchesCondition('', 'isNull')).toBe(false)
  })

  it('matches startsWith', () => {
    expect(matchesCondition('hello', 'startsWith', 'hel')).toBe(true)
    expect(matchesCondition('hello', 'startsWith', 'llo')).toBe(false)
  })
})

describe('searchText', () => {
  it('searches all fields by default', () => {
    const result = searchText(people, 'NYC')
    expect(result).toHaveLength(2)
  })

  it('searches specific fields', () => {
    const result = searchText(people, 'a', ['name'])
    expect(result.map(p => p.name)).toEqual(['Alice', 'Charlie', 'Diana'])
  })

  it('handles multiple search terms', () => {
    const result = searchText(people, 'NYC 30')
    expect(result.map(p => p.name)).toEqual(['Alice'])
  })

  it('returns all for empty query', () => {
    const result = searchText(people, '')
    expect(result).toEqual(people)
  })
})

// ============================================================================
// Grouping Tests
// ============================================================================

describe('groupBy', () => {
  it('groups by key', () => {
    const result = groupBy(people, 'city')
    expect(result).toHaveLength(3)

    const nycGroup = result.find(g => g.key === 'NYC')
    expect(nycGroup?.count).toBe(2)
    expect(nycGroup?.items.map(p => p.name).sort()).toEqual(['Alice', 'Charlie'])
  })

  it('groups by function', () => {
    const result = groupBy(people, p => p.age >= 30 ? 'senior' : 'junior')
    expect(result).toHaveLength(2)

    const senior = result.find(g => g.key === 'senior')
    expect(senior?.count).toBe(2)
  })
})

describe('groupAndAggregate', () => {
  it('groups and aggregates', () => {
    const result = groupAndAggregate(
      people,
      'city',
      items => items.reduce((sum, p) => sum + p.age, 0) / items.length
    )

    const nyc = result.find(r => r.key === 'NYC')
    expect(nyc?.value).toBe(32.5) // (30 + 35) / 2
  })
})

// ============================================================================
// Aggregation Tests
// ============================================================================

describe('sum', () => {
  it('sums by key', () => {
    expect(sum(people, 'age')).toBe(118) // 30 + 25 + 35 + 28
  })

  it('sums by function', () => {
    expect(sum(people, p => p.age * 2)).toBe(236)
  })
})

describe('average', () => {
  it('calculates average', () => {
    expect(average(people, 'age')).toBe(29.5)
  })

  it('returns 0 for empty array', () => {
    expect(average([], 'age' as never)).toBe(0)
  })
})

describe('min/max', () => {
  it('finds min', () => {
    expect(min(people, 'age')).toBe(25)
  })

  it('finds max', () => {
    expect(max(people, 'age')).toBe(35)
  })
})

describe('countDistinct', () => {
  it('counts distinct values', () => {
    expect(countDistinct(people, 'city')).toBe(3)
  })
})

// ============================================================================
// Utility Tests
// ============================================================================

describe('unique', () => {
  it('returns unique primitives', () => {
    expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3])
  })

  it('returns unique by key', () => {
    const result = unique(people, 'city')
    expect(result).toHaveLength(3)
  })
})

describe('paginate', () => {
  it('returns correct page', () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
    expect(paginate(data, 1, 3)).toEqual([1, 2, 3])
    expect(paginate(data, 2, 3)).toEqual([4, 5, 6])
    expect(paginate(data, 4, 3)).toEqual([10])
  })
})

describe('chunk', () => {
  it('chunks array', () => {
    const data = [1, 2, 3, 4, 5]
    expect(chunk(data, 2)).toEqual([[1, 2], [3, 4], [5]])
  })
})

describe('pick', () => {
  it('picks specified keys', () => {
    const result = pick(people, ['name', 'age'])
    expect(result[0]).toEqual({ name: 'Alice', age: 30 })
    expect(result[0]).not.toHaveProperty('city')
  })
})

describe('omit', () => {
  it('omits specified keys', () => {
    const result = omit(people, ['city'])
    expect(result[0]).toEqual({ name: 'Alice', age: 30 })
    expect(result[0]).not.toHaveProperty('city')
  })
})
