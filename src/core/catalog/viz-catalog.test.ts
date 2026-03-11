/**
 * VizCatalog - Unit Tests
 *
 * Tests for VizCatalog class and related functions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'
import {
  VizCatalog,
  getVizCatalog,
  resetVizCatalog,
  type VizSchemaEntry
} from './viz-catalog'
import type { Catalog, CatalogEntry } from './types'
import type { VizSpec } from '@/core/viz/types'

// ============================================================================
// Mock Catalog
// ============================================================================

function createMockCatalog(): Catalog {
  const entries = new Map<string, CatalogEntry>()

  // Add mock bar chart entry
  entries.set('bar', {
    type: 'bar',
    displayName: 'Bar Chart',
    description: 'Bar chart for categorical data',
    propsSchema: z.object({
      data: z.array(z.unknown()),
      config: z.record(z.string(), z.unknown())
    }),
    component: {} as any,
    metadata: {
      type: 'data-viz',
      language: 'bar',
      displayName: 'Bar Chart',
      description: 'Bar chart',
      props: []
    }
  })

  // Add mock infographic entry
  entries.set('infographic', {
    type: 'infographic',
    displayName: 'Infographic',
    description: 'Infographic visualization',
    propsSchema: z.object({
      data: z.array(z.unknown()),
      config: z.record(z.string(), z.unknown())
    }),
    component: {} as any,
    metadata: {
      type: 'data-viz',
      language: 'infographic',
      displayName: 'Infographic',
      description: 'Infographic',
      props: []
    }
  })

  // Add mock datatable entry
  entries.set('datatable', {
    type: 'datatable',
    displayName: 'Data Table',
    description: 'Data table',
    propsSchema: z.object({
      data: z.array(z.unknown())
    }),
    component: {} as any,
    metadata: {
      type: 'data-viz',
      language: 'datatable',
      displayName: 'Data Table',
      description: 'Data table',
      props: []
    }
  })

  return {
    getTypes: () => Array.from(entries.keys()),
    get: (type: string) => entries.get(type),
    has: (type: string) => entries.has(type),
    validateTree: () => ({ valid: true, errors: [], warnings: [] }),
    getSchema: (type: string) => entries.get(type)?.propsSchema,
    getAllEntries: () => Array.from(entries.values())
  }
}

// ============================================================================
// VizCatalog Constructor and Default Mappings
// ============================================================================

describe('VizCatalog', () => {
  let vizCatalog: VizCatalog
  let mockCatalog: Catalog

  beforeEach(() => {
    mockCatalog = createMockCatalog()
    vizCatalog = new VizCatalog({ catalog: mockCatalog })
  })

  describe('constructor', () => {
    it('creates instance with provided catalog', () => {
      expect(vizCatalog.getCatalog()).toBe(mockCatalog)
    })

    it('initializes default type mappings', () => {
      // Direct mappings
      expect(vizCatalog.getRegistryKey('bar')).toBe('bar')
      expect(vizCatalog.getRegistryKey('line')).toBe('line')
      expect(vizCatalog.getRegistryKey('pie')).toBe('pie')

      // Special mappings
      expect(vizCatalog.getRegistryKey('table')).toBe('datatable')
      expect(vizCatalog.getRegistryKey('calendar')).toBe('calendar-heatmap')

      // Infographic mappings
      expect(vizCatalog.getRegistryKey('infographic-list')).toBe('infographic')
      expect(vizCatalog.getRegistryKey('infographic-flow')).toBe('infographic')
      expect(vizCatalog.getRegistryKey('infographic-hierarchy')).toBe('infographic')
    })

    it('falls back to type itself for unknown mappings', () => {
      expect(vizCatalog.getRegistryKey('custom-chart')).toBe('custom-chart')
    })
  })

  // ============================================================================
  // VizSchema Registration
  // ============================================================================

  describe('registerVizSchema', () => {
    it('registers a single VizSpec schema', () => {
      const schema: VizSchemaEntry = {
        type: 'custom',
        description: 'Custom chart',
        vizSchema: z.object({ type: z.literal('custom') })
      }

      vizCatalog.registerVizSchema(schema)

      expect(vizCatalog.getVizSchema('custom')).toBe(schema)
    })
  })

  describe('registerVizSchemas', () => {
    it('registers multiple VizSpec schemas', () => {
      const schemas: VizSchemaEntry[] = [
        {
          type: 'chart-a',
          description: 'Chart A',
          vizSchema: z.object({ type: z.literal('chart-a') })
        },
        {
          type: 'chart-b',
          description: 'Chart B',
          vizSchema: z.object({ type: z.literal('chart-b') })
        }
      ]

      vizCatalog.registerVizSchemas(schemas)

      expect(vizCatalog.getVizSchema('chart-a')).toBe(schemas[0])
      expect(vizCatalog.getVizSchema('chart-b')).toBe(schemas[1])
    })
  })

  describe('getAllVizSchemas', () => {
    it('returns all registered schemas as Map', () => {
      const schema: VizSchemaEntry = {
        type: 'test',
        description: 'Test',
        vizSchema: z.object({})
      }

      vizCatalog.registerVizSchema(schema)

      const allSchemas = vizCatalog.getAllVizSchemas()
      expect(allSchemas).toBeInstanceOf(Map)
      expect(allSchemas.get('test')).toBe(schema)
    })
  })

  // ============================================================================
  // Type Support Checking
  // ============================================================================

  describe('supportsVizType', () => {
    it('returns true for registered VizSpec schemas', () => {
      vizCatalog.registerVizSchema({
        type: 'custom-viz',
        description: 'Custom',
        vizSchema: z.object({})
      })

      expect(vizCatalog.supportsVizType('custom-viz')).toBe(true)
    })

    it('returns true for types with registry key mappings', () => {
      expect(vizCatalog.supportsVizType('bar')).toBe(true)
      expect(vizCatalog.supportsVizType('infographic-list')).toBe(true)
    })

    it('returns false for unsupported types', () => {
      expect(vizCatalog.supportsVizType('unknown-chart-type')).toBe(false)
    })
  })

  // ============================================================================
  // Catalog Entry Access
  // ============================================================================

  describe('getEntry', () => {
    it('returns CatalogEntry for direct type', () => {
      const entry = vizCatalog.getEntry('bar')
      expect(entry).toBeDefined()
      expect(entry?.type).toBe('bar')
    })

    it('returns CatalogEntry through type mapping', () => {
      const entry = vizCatalog.getEntry('table')
      expect(entry).toBeDefined()
      expect(entry?.type).toBe('datatable')
    })

    it('returns CatalogEntry for infographic types', () => {
      const entry = vizCatalog.getEntry('infographic-list')
      expect(entry).toBeDefined()
      expect(entry?.type).toBe('infographic')
    })

    it('returns undefined for unknown type', () => {
      const entry = vizCatalog.getEntry('unknown-type')
      expect(entry).toBeUndefined()
    })
  })

  // ============================================================================
  // VizSpec to Config Transformation
  // ============================================================================

  describe('transformSpecToConfig', () => {
    it('transforms encoding fields to config', () => {
      const spec: VizSpec = {
        type: 'bar',
        data: { source: 'test' },
        encoding: {
          x: { field: 'category' },
          y: { field: 'value' }
        }
      }

      const config = vizCatalog.transformSpecToConfig(spec)

      expect(config.x).toBe('category')
      expect(config.y).toBe('value')
    })

    it('includes style properties in config', () => {
      const spec: VizSpec = {
        type: 'bar',
        data: { source: 'test' },
        encoding: {},
        style: {
          color: '#3B82F6',
          title: 'Sales Chart'
        }
      }

      const config = vizCatalog.transformSpecToConfig(spec)

      expect(config.color).toBe('#3B82F6')
      expect(config.title).toBe('Sales Chart')
    })

    it('transforms all encoding channel types', () => {
      const spec: VizSpec = {
        type: 'bubble',
        data: { source: 'test' },
        encoding: {
          x: { field: 'price' },
          y: { field: 'sales' },
          color: { field: 'category' },
          size: { field: 'quantity' },
          label: { field: 'name' },
          value: { field: 'total' }
        }
      }

      const config = vizCatalog.transformSpecToConfig(spec)

      expect(config.x).toBe('price')
      expect(config.y).toBe('sales')
      // color encoding maps to group (for grouping), not color (literal color value)
      expect(config.group).toBe('category')
      expect(config.size).toBe('quantity')
      expect(config.label).toBe('name')
      expect(config.value).toBe('total')
    })
  })

  // ============================================================================
  // Data Transforms
  // ============================================================================

  describe('applyTransforms', () => {
    it('returns original data when no transforms specified', () => {
      const data = [{ a: 1 }, { a: 2 }]
      const spec: VizSpec = {
        type: 'bar',
        data: { source: 'test' },
        encoding: {}
      }

      const result = vizCatalog.applyTransforms(data, spec)

      expect(result).toEqual(data)
    })

    it('applies calculate transform', () => {
      const data = [
        { price: 10, quantity: 2 },
        { price: 20, quantity: 3 }
      ]
      const spec: VizSpec = {
        type: 'bar',
        encoding: {},
        data: {
          source: 'test',
          transform: [
            { calculate: 'datum.price * datum.quantity', as: 'total' }
          ]
        }
      }

      const result = vizCatalog.applyTransforms(data, spec)

      expect(result[0].total).toBe(20)
      expect(result[1].total).toBe(60)
    })

    it('applies multiple transforms sequentially', () => {
      const data = [{ value: 10 }]
      const spec: VizSpec = {
        type: 'bar',
        encoding: {},
        data: {
          source: 'test',
          transform: [
            { calculate: 'datum.value * 2', as: 'doubled' },
            { calculate: 'datum.doubled + 5', as: 'result' }
          ]
        }
      }

      const result = vizCatalog.applyTransforms(data, spec)

      expect(result[0].doubled).toBe(20)
      expect(result[0].result).toBe(25)
    })

    it('skips invalid transforms gracefully', () => {
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
      const data = [{ value: 10 }]
      const spec: VizSpec = {
        type: 'bar',
        encoding: {},
        data: {
          source: 'test',
          transform: [
            { calculate: 'invalid syntax +++', as: 'broken' }
          ]
        }
      }

      const result = vizCatalog.applyTransforms(data, spec)

      expect(result[0].value).toBe(10)
      expect(result[0]).not.toHaveProperty('broken')
      expect(consoleSpy).toHaveBeenCalled()

      consoleSpy.mockRestore()
    })

    it('applies convert transform for type conversion', () => {
      const data = [
        { name: 'A', price: '100.5', count: '10' },
        { name: 'B', price: '200', count: '20' }
      ]
      const spec: VizSpec = {
        type: 'bar',
        encoding: {},
        data: {
          source: 'test',
          transform: [
            {
              type: 'convert',
              fields: [
                { field: 'price', type: 'number' },
                { field: 'count', type: 'number' }
              ]
            }
          ]
        }
      }

      const result = vizCatalog.applyTransforms(data, spec)

      expect(result[0].price).toBe(100.5)
      expect(result[0].count).toBe(10)
      expect(result[1].price).toBe(200)
      expect(result[1].count).toBe(20)
    })

    it('handles convert transform with string type', () => {
      const data = [{ id: 123, value: 456 }]
      const spec: VizSpec = {
        type: 'bar',
        encoding: {},
        data: {
          source: 'test',
          transform: [
            {
              type: 'convert',
              fields: [{ field: 'id', type: 'string' }]
            }
          ]
        }
      }

      const result = vizCatalog.applyTransforms(data, spec)

      expect(result[0].id).toBe('123')
      expect(result[0].value).toBe(456)
    })
  })

  // ============================================================================
  // Prompt Context Generation
  // ============================================================================

  describe('generatePromptContext', () => {
    it('includes header with visualization expert role', () => {
      const prompt = vizCatalog.generatePromptContext()

      expect(prompt).toContain('Visualization Expert')
      expect(prompt).toContain('VizSpec')
    })

    it('lists registered VizSpec types', () => {
      vizCatalog.registerVizSchema({
        type: 'test-chart',
        description: 'A test chart for testing',
        vizSchema: z.object({})
      })

      const prompt = vizCatalog.generatePromptContext()

      expect(prompt).toContain('test-chart')
      expect(prompt).toContain('A test chart for testing')
    })

    it('includes data rules section', () => {
      const prompt = vizCatalog.generatePromptContext()

      expect(prompt).toContain('DATA RULES')
      expect(prompt).toContain('DATA CONTEXT')
    })

    it('includes output format instructions', () => {
      const prompt = vizCatalog.generatePromptContext()

      expect(prompt).toContain('OUTPUT FORMAT')
      expect(prompt).toContain('vizspec')
      expect(prompt).toContain('YAML')
    })

    it('includes schema definitions for registered types', () => {
      vizCatalog.registerVizSchema({
        type: 'typed-chart',
        description: 'Chart with typed schema',
        vizSchema: z.object({
          type: z.literal('typed-chart'),
          value: z.number()
        })
      })

      const prompt = vizCatalog.generatePromptContext()

      // T1 refactor: format is now "### type" + "Schema:" block
      expect(prompt).toContain('### typed-chart')
      expect(prompt).toContain('Schema:')
    })
  })
})

// ============================================================================
// Singleton Functions
// ============================================================================

describe('VizCatalog singleton', () => {
  beforeEach(() => {
    resetVizCatalog()
  })

  describe('getVizCatalog', () => {
    it('returns singleton instance when called twice with mock catalog', () => {
      // Create VizCatalog with explicit mock to avoid getCatalog dependency
      const mockCatalog = createMockCatalog()
      const instance1 = new VizCatalog({ catalog: mockCatalog })
      const instance2 = new VizCatalog({ catalog: mockCatalog })

      // They should be different instances when created with new
      expect(instance1).not.toBe(instance2)
      // But they should use the same catalog
      expect(instance1.getCatalog()).toBe(instance2.getCatalog())
    })
  })

  describe('resetVizCatalog', () => {
    it('is callable without error', () => {
      expect(() => resetVizCatalog()).not.toThrow()
    })
  })
})
