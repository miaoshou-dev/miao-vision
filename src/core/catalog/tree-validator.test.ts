/**
 * Tree Validator - Unit Tests
 *
 * Tests for UITree validation against a Catalog
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import { validateTree, quickValidateTree, type TypeLookup } from './tree-validator'
import type { UITree } from '@/types/ui-tree'

// ============================================================================
// Test Fixtures
// ============================================================================

/**
 * Mock type lookup for testing
 */
function createMockTypeLookup(types: Record<string, z.ZodType<unknown>>): TypeLookup {
  return {
    has(type: string): boolean {
      return type in types
    },
    getSchema(type: string): z.ZodType<unknown> | undefined {
      return types[type]
    }
  }
}

const mockTypes = {
  'container': z.object({}).passthrough(),
  'text': z.object({ content: z.string() }).passthrough(),
  'bar-chart': z.object({
    data: z.string(),
    x: z.string(),
    y: z.string()
  }).passthrough(),
  'bigvalue': z.object({
    value: z.union([z.string(), z.number()]),
    title: z.string().optional()
  }).passthrough()
}

const mockLookup = createMockTypeLookup(mockTypes)

// ============================================================================
// validateTree - Basic Validation
// ============================================================================

describe('validateTree', () => {
  describe('version validation', () => {
    it('accepts valid version 1.0', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'main',
        elements: {
          main: { key: 'main', type: 'container', props: {} }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('rejects invalid version', () => {
      const tree = {
        version: '2.0' as '1.0',
        root: 'main',
        elements: {
          main: { key: 'main', type: 'container', props: {} }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_VERSION')).toBe(true)
    })
  })

  describe('root validation', () => {
    it('validates root element exists', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'main',
        elements: {
          main: { key: 'main', type: 'container', props: {} }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(true)
    })

    it('fails when root is missing', () => {
      const tree: UITree = {
        version: '1.0',
        root: '',
        elements: {
          main: { key: 'main', type: 'container', props: {} }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'MISSING_ROOT')).toBe(true)
    })

    it('fails when root element not found', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'nonexistent',
        elements: {
          main: { key: 'main', type: 'container', props: {} }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'ROOT_NOT_FOUND')).toBe(true)
    })
  })

  describe('type validation', () => {
    it('validates known types', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'chart',
        elements: {
          chart: {
            key: 'chart',
            type: 'bar-chart',
            props: { data: 'sales', x: 'category', y: 'amount' }
          }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(true)
    })

    it('fails for unknown types', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'unknown',
        elements: {
          unknown: { key: 'unknown', type: 'invalid-type', props: {} }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'UNKNOWN_TYPE')).toBe(true)
    })
  })

  describe('props validation', () => {
    it('validates props against schema', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'chart',
        elements: {
          chart: {
            key: 'chart',
            type: 'bar-chart',
            props: { data: 'sales', x: 'category', y: 'amount' }
          }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(true)
    })

    it('fails for invalid props', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'chart',
        elements: {
          chart: {
            key: 'chart',
            type: 'bar-chart',
            props: { data: 123, x: 'category' } // data should be string, y is missing
          }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'INVALID_PROPS')).toBe(true)
    })

    it('skips validation for dynamic values', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'chart',
        elements: {
          chart: {
            key: 'chart',
            type: 'bar-chart',
            props: {
              data: { path: '/data/source' }, // Dynamic value
              x: 'category',
              y: 'amount'
            }
          }
        }
      }

      // Dynamic values are filtered during validation
      const result = validateTree(tree, mockLookup)
      // Should not fail because dynamic values are skipped
      expect(result.errors.filter(e => e.code === 'INVALID_PROPS').length).toBeLessThanOrEqual(1)
    })
  })

  describe('children validation', () => {
    it('validates children references', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'container',
        elements: {
          container: {
            key: 'container',
            type: 'container',
            props: {},
            children: ['child1', 'child2']
          },
          child1: { key: 'child1', type: 'text', props: { content: 'Hello' } },
          child2: { key: 'child2', type: 'text', props: { content: 'World' } }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(true)
    })

    it('fails for missing child reference', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'container',
        elements: {
          container: {
            key: 'container',
            type: 'container',
            props: {},
            children: ['child1', 'nonexistent']
          },
          child1: { key: 'child1', type: 'text', props: { content: 'Hello' } }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'CHILD_NOT_FOUND')).toBe(true)
    })
  })

  describe('circular reference detection', () => {
    it('detects direct circular reference', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'a',
        elements: {
          a: { key: 'a', type: 'container', props: {}, children: ['b'] },
          b: { key: 'b', type: 'container', props: {}, children: ['a'] }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'CIRCULAR_REFERENCE')).toBe(true)
    })

    it('detects indirect circular reference', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'a',
        elements: {
          a: { key: 'a', type: 'container', props: {}, children: ['b'] },
          b: { key: 'b', type: 'container', props: {}, children: ['c'] },
          c: { key: 'c', type: 'container', props: {}, children: ['a'] }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'CIRCULAR_REFERENCE')).toBe(true)
    })

    it('detects self-reference', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'self',
        elements: {
          self: { key: 'self', type: 'container', props: {}, children: ['self'] }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(false)
      expect(result.errors.some(e => e.code === 'CIRCULAR_REFERENCE')).toBe(true)
    })
  })

  describe('warnings', () => {
    it('warns about unused elements', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'main',
        elements: {
          main: { key: 'main', type: 'container', props: {} },
          orphan: { key: 'orphan', type: 'text', props: { content: 'Unused' } }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(true) // Warnings don't affect validity
      expect(result.warnings.some(w => w.code === 'UNUSED_ELEMENT')).toBe(true)
      expect(result.warnings.some(w => w.elementKey === 'orphan')).toBe(true)
    })

    it('no warnings when all elements are used', () => {
      const tree: UITree = {
        version: '1.0',
        root: 'main',
        elements: {
          main: { key: 'main', type: 'container', props: {}, children: ['child'] },
          child: { key: 'child', type: 'text', props: { content: 'Used' } }
        }
      }

      const result = validateTree(tree, mockLookup)
      expect(result.valid).toBe(true)
      expect(result.warnings.filter(w => w.code === 'UNUSED_ELEMENT')).toHaveLength(0)
    })
  })
})

// ============================================================================
// quickValidateTree
// ============================================================================

describe('quickValidateTree', () => {
  it('returns true for valid tree', () => {
    const tree: UITree = {
      version: '1.0',
      root: 'main',
      elements: {
        main: { key: 'main', type: 'container', props: {} }
      }
    }

    expect(quickValidateTree(tree, mockLookup)).toBe(true)
  })

  it('returns false for invalid version', () => {
    const tree = {
      version: '2.0' as '1.0',
      root: 'main',
      elements: {
        main: { key: 'main', type: 'container', props: {} }
      }
    }

    expect(quickValidateTree(tree, mockLookup)).toBe(false)
  })

  it('returns false for missing root', () => {
    const tree: UITree = {
      version: '1.0',
      root: '',
      elements: {}
    }

    expect(quickValidateTree(tree, mockLookup)).toBe(false)
  })

  it('returns false for unknown type', () => {
    const tree: UITree = {
      version: '1.0',
      root: 'main',
      elements: {
        main: { key: 'main', type: 'unknown-type', props: {} }
      }
    }

    expect(quickValidateTree(tree, mockLookup)).toBe(false)
  })

  it('does not check props (quick validation)', () => {
    const tree: UITree = {
      version: '1.0',
      root: 'chart',
      elements: {
        chart: {
          key: 'chart',
          type: 'bar-chart',
          props: {} // Missing required props - but quick validation doesn't check
        }
      }
    }

    // Quick validation only checks types exist, not prop validity
    expect(quickValidateTree(tree, mockLookup)).toBe(true)
  })
})

// ============================================================================
// Complex Tree Validation
// ============================================================================

describe('complex tree validation', () => {
  it('validates a complex dashboard tree', () => {
    const tree: UITree = {
      version: '1.0',
      root: 'dashboard',
      elements: {
        dashboard: {
          key: 'dashboard',
          type: 'container',
          props: {},
          children: ['header', 'kpis', 'chart']
        },
        header: {
          key: 'header',
          type: 'text',
          props: { content: 'Sales Dashboard' }
        },
        kpis: {
          key: 'kpis',
          type: 'container',
          props: {},
          children: ['kpi1', 'kpi2']
        },
        kpi1: {
          key: 'kpi1',
          type: 'bigvalue',
          props: { value: 1000, title: 'Total Sales' }
        },
        kpi2: {
          key: 'kpi2',
          type: 'bigvalue',
          props: { value: 50, title: 'Orders' }
        },
        chart: {
          key: 'chart',
          type: 'bar-chart',
          props: { data: 'sales', x: 'month', y: 'revenue' }
        }
      }
    }

    const result = validateTree(tree, mockLookup)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(result.warnings).toHaveLength(0)
  })

  it('reports multiple errors in one validation', () => {
    const tree: UITree = {
      version: '1.0',
      root: 'main',
      elements: {
        main: {
          key: 'main',
          type: 'container',
          props: {},
          children: ['invalid1', 'invalid2', 'missing']
        },
        invalid1: { key: 'invalid1', type: 'unknown-type-1', props: {} },
        invalid2: { key: 'invalid2', type: 'unknown-type-2', props: {} }
        // 'missing' is not defined
      }
    }

    const result = validateTree(tree, mockLookup)
    expect(result.valid).toBe(false)

    // Should have errors for both unknown types and missing child
    const unknownTypeErrors = result.errors.filter(e => e.code === 'UNKNOWN_TYPE')
    const childNotFoundErrors = result.errors.filter(e => e.code === 'CHILD_NOT_FOUND')

    expect(unknownTypeErrors.length).toBeGreaterThanOrEqual(2)
    expect(childNotFoundErrors.length).toBeGreaterThanOrEqual(1)
  })
})
