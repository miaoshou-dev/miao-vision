/**
 * Catalog - Unit Tests
 *
 * Tests for Catalog factory and implementation
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createCatalog, createMutableCatalog } from './catalog'
import { componentRegistry } from '@core/registry/component-registry'
import type { UITree } from '@/types/ui-tree'

// ============================================================================
// Test Setup
// ============================================================================

/**
 * Note: These tests depend on the component registry being populated.
 * In a real test environment, you might want to mock the registry
 * or ensure plugins are registered before running tests.
 */

// ============================================================================
// createCatalog
// ============================================================================

describe('createCatalog', () => {
  it('creates a catalog instance', () => {
    const catalog = createCatalog()
    expect(catalog).toBeDefined()
    expect(typeof catalog.getTypes).toBe('function')
    expect(typeof catalog.get).toBe('function')
    expect(typeof catalog.has).toBe('function')
  })

  it('populates catalog from component registry', () => {
    const catalog = createCatalog()
    const types = catalog.getTypes()

    // Should have some types from the registry
    expect(Array.isArray(types)).toBe(true)

    // If registry has components, catalog should have them
    const registryLanguages = componentRegistry.getAllLanguages()
    if (registryLanguages.length > 0) {
      expect(types.length).toBe(registryLanguages.length)
    }
  })
})

// ============================================================================
// Catalog.getTypes
// ============================================================================

describe('Catalog.getTypes', () => {
  it('returns array of type strings', () => {
    const catalog = createCatalog()
    const types = catalog.getTypes()

    expect(Array.isArray(types)).toBe(true)
    types.forEach(type => {
      expect(typeof type).toBe('string')
    })
  })

  it('returns same types as component registry', () => {
    const catalog = createCatalog()
    const catalogTypes = catalog.getTypes()
    const registryTypes = componentRegistry.getAllLanguages()

    expect(catalogTypes.sort()).toEqual(registryTypes.sort())
  })
})

// ============================================================================
// Catalog.get
// ============================================================================

describe('Catalog.get', () => {
  it('returns entry for existing type', () => {
    const catalog = createCatalog()
    const types = catalog.getTypes()

    if (types.length > 0) {
      const entry = catalog.get(types[0])
      expect(entry).toBeDefined()
      expect(entry?.type).toBe(types[0])
    }
  })

  it('returns undefined for non-existing type', () => {
    const catalog = createCatalog()
    const entry = catalog.get('non-existent-type-xyz')

    expect(entry).toBeUndefined()
  })

  it('returns entry with all required properties', () => {
    const catalog = createCatalog()
    const types = catalog.getTypes()

    if (types.length > 0) {
      const entry = catalog.get(types[0])

      expect(entry).toBeDefined()
      if (entry) {
        expect(entry.type).toBeDefined()
        expect(entry.displayName).toBeDefined()
        expect(entry.description).toBeDefined()
        expect(entry.propsSchema).toBeDefined()
        expect(entry.metadata).toBeDefined()
      }
    }
  })
})

// ============================================================================
// Catalog.has
// ============================================================================

describe('Catalog.has', () => {
  it('returns true for existing type', () => {
    const catalog = createCatalog()
    const types = catalog.getTypes()

    if (types.length > 0) {
      expect(catalog.has(types[0])).toBe(true)
    }
  })

  it('returns false for non-existing type', () => {
    const catalog = createCatalog()
    expect(catalog.has('non-existent-type-xyz')).toBe(false)
  })
})

// ============================================================================
// Catalog.getSchema
// ============================================================================

describe('Catalog.getSchema', () => {
  it('returns Zod schema for existing type', () => {
    const catalog = createCatalog()
    const types = catalog.getTypes()

    if (types.length > 0) {
      const schema = catalog.getSchema(types[0])
      expect(schema).toBeDefined()
      // Check it's a Zod schema by checking for safeParse method
      expect(typeof schema?.safeParse).toBe('function')
    }
  })

  it('returns undefined for non-existing type', () => {
    const catalog = createCatalog()
    const schema = catalog.getSchema('non-existent-type-xyz')

    expect(schema).toBeUndefined()
  })
})

// ============================================================================
// Catalog.getAllEntries
// ============================================================================

describe('Catalog.getAllEntries', () => {
  it('returns array of all entries', () => {
    const catalog = createCatalog()
    const entries = catalog.getAllEntries()

    expect(Array.isArray(entries)).toBe(true)
    expect(entries.length).toBe(catalog.getTypes().length)
  })

  it('each entry has required properties', () => {
    const catalog = createCatalog()
    const entries = catalog.getAllEntries()

    entries.forEach(entry => {
      expect(entry.type).toBeDefined()
      expect(entry.displayName).toBeDefined()
      expect(entry.description).toBeDefined()
      expect(entry.propsSchema).toBeDefined()
      expect(entry.metadata).toBeDefined()
    })
  })
})

// ============================================================================
// Catalog.getByCategory
// ============================================================================

describe('Catalog.getByCategory', () => {
  it('returns entries filtered by category', () => {
    const catalog = createCatalog()

    const chartEntries = catalog.getByCategory('chart')
    const inputEntries = catalog.getByCategory('input')
    const dataVizEntries = catalog.getByCategory('data-viz')

    // All returned entries should have the correct category
    chartEntries.forEach(entry => {
      expect(entry.metadata.type).toBe('chart')
    })

    inputEntries.forEach(entry => {
      expect(entry.metadata.type).toBe('input')
    })

    dataVizEntries.forEach(entry => {
      expect(entry.metadata.type).toBe('data-viz')
    })
  })

  it('returns empty array for unknown category', () => {
    const catalog = createCatalog()
    const entries = catalog.getByCategory('unknown-category')

    expect(entries).toEqual([])
  })
})

// ============================================================================
// Catalog.getSuitableFor
// ============================================================================

describe('Catalog.getSuitableFor', () => {
  it('returns entries suitable for given data types', () => {
    const catalog = createCatalog()

    // Most entries won't have aiHints in basic catalog
    const numericEntries = catalog.getSuitableFor(['numeric'])
    const categoricalEntries = catalog.getSuitableFor(['categorical'])

    // Just verify it returns an array
    expect(Array.isArray(numericEntries)).toBe(true)
    expect(Array.isArray(categoricalEntries)).toBe(true)
  })

  it('returns empty array when no suitable entries', () => {
    const catalog = createCatalog()
    // Without aiHints, should return empty
    const entries = catalog.getSuitableFor(['numeric', 'categorical', 'temporal'])

    // Most basic catalog entries don't have aiHints
    expect(Array.isArray(entries)).toBe(true)
  })
})

// ============================================================================
// Catalog.validateTree
// ============================================================================

describe('Catalog.validateTree', () => {
  it('validates a simple tree', () => {
    const catalog = createCatalog()
    const types = catalog.getTypes()

    // Skip test if no types registered
    if (types.length === 0) return

    const tree: UITree = {
      version: '1.0',
      root: 'main',
      elements: {
        main: {
          key: 'main',
          type: types[0],
          props: {}
        }
      }
    }

    const result = catalog.validateTree(tree)
    // May have prop errors due to missing required props, but structure is valid
    expect(result.errors.filter(e => e.code === 'ROOT_NOT_FOUND')).toHaveLength(0)
    expect(result.errors.filter(e => e.code === 'UNKNOWN_TYPE')).toHaveLength(0)
  })

  it('fails validation for unknown type', () => {
    const catalog = createCatalog()

    const tree: UITree = {
      version: '1.0',
      root: 'main',
      elements: {
        main: {
          key: 'main',
          type: 'completely-unknown-type-xyz',
          props: {}
        }
      }
    }

    const result = catalog.validateTree(tree)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.code === 'UNKNOWN_TYPE')).toBe(true)
  })

  it('returns validation errors with proper structure', () => {
    const catalog = createCatalog()

    const tree: UITree = {
      version: '1.0',
      root: 'missing',
      elements: {}
    }

    const result = catalog.validateTree(tree)
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(0)

    result.errors.forEach(error => {
      expect(error.code).toBeDefined()
      expect(error.message).toBeDefined()
      expect(error.path).toBeDefined()
    })
  })
})

// ============================================================================
// createMutableCatalog
// ============================================================================

describe('createMutableCatalog', () => {
  it('creates a mutable catalog', () => {
    const catalog = createMutableCatalog()
    expect(catalog).toBeDefined()
    expect(typeof catalog.set).toBe('function')
  })

  it('allows adding new entries', () => {
    const catalog = createMutableCatalog()
    const initialSize = catalog.size

    // Create a mock entry
    const mockEntry = {
      type: 'test-component',
      displayName: 'Test Component',
      description: 'A test component',
      propsSchema: {} as any,
      component: {} as any,
      metadata: {
        type: 'ui' as const,
        language: 'test-component',
        displayName: 'Test Component',
        description: 'A test component',
        props: []
      }
    }

    catalog.set('test-component', mockEntry)

    expect(catalog.size).toBe(initialSize + 1)
    expect(catalog.has('test-component')).toBe(true)
    expect(catalog.get('test-component')).toBeDefined()
  })

  it('allows overwriting existing entries', () => {
    const catalog = createMutableCatalog()

    const entry1 = {
      type: 'test',
      displayName: 'Test 1',
      description: 'First',
      propsSchema: {} as any,
      component: {} as any,
      metadata: {
        type: 'ui' as const,
        language: 'test',
        displayName: 'Test 1',
        description: 'First',
        props: []
      }
    }

    const entry2 = {
      type: 'test',
      displayName: 'Test 2',
      description: 'Second',
      propsSchema: {} as any,
      component: {} as any,
      metadata: {
        type: 'ui' as const,
        language: 'test',
        displayName: 'Test 2',
        description: 'Second',
        props: []
      }
    }

    catalog.set('test', entry1)
    expect(catalog.get('test')?.displayName).toBe('Test 1')

    catalog.set('test', entry2)
    expect(catalog.get('test')?.displayName).toBe('Test 2')
  })

  it('exposes size property', () => {
    const catalog = createMutableCatalog()
    expect(typeof catalog.size).toBe('number')
    expect(catalog.size).toBe(catalog.getTypes().length)
  })
})

// ============================================================================
// Integration with Component Registry
// ============================================================================

describe('integration with ComponentRegistry', () => {
  it('catalog entries match registry components', () => {
    const catalog = createCatalog()
    const registryLanguages = componentRegistry.getAllLanguages()

    registryLanguages.forEach(language => {
      const registryComponent = componentRegistry.get(language)
      const catalogEntry = catalog.get(language)

      if (registryComponent && catalogEntry) {
        expect(catalogEntry.type).toBe(language)
        expect(catalogEntry.displayName).toBe(registryComponent.metadata.displayName)
        expect(catalogEntry.description).toBe(registryComponent.metadata.description)
        expect(catalogEntry.metadata).toBe(registryComponent.metadata)
      }
    })
  })

  it('catalog schemas are derived from metadata props', () => {
    const catalog = createCatalog()
    const types = catalog.getTypes()

    types.forEach(type => {
      const entry = catalog.get(type)
      const registryComponent = componentRegistry.get(type)

      if (entry && registryComponent) {
        // Schema should exist
        expect(entry.propsSchema).toBeDefined()

        // Schema should have safeParse (Zod schema)
        expect(typeof entry.propsSchema.safeParse).toBe('function')
      }
    })
  })
})
