/**
 * Schema Adapter - Unit Tests
 *
 * Tests for ConfigSchema to Zod schema conversion
 */

import { describe, it, expect } from 'vitest'
import { z } from 'zod'
import {
  fieldTypeToZod,
  configSchemaToZod,
  createPermissiveSchema,
  validateProps,
  formatZodErrors
} from './schema-adapter'
import type { FieldSchema, ConfigSchema } from '@core/registry/config-parser'

// ============================================================================
// fieldTypeToZod
// ============================================================================

describe('fieldTypeToZod', () => {
  describe('string type', () => {
    it('creates string schema for required string field', () => {
      const field: FieldSchema = { name: 'title', type: 'string', required: true }
      const schema = fieldTypeToZod(field)

      expect(schema.safeParse('hello').success).toBe(true)
      expect(schema.safeParse(123).success).toBe(false)
    })

    it('creates optional string schema for non-required field', () => {
      const field: FieldSchema = { name: 'title', type: 'string', required: false }
      const schema = fieldTypeToZod(field)

      expect(schema.safeParse('hello').success).toBe(true)
      expect(schema.safeParse(undefined).success).toBe(true)
    })

    it('applies default value for optional string field', () => {
      const field: FieldSchema = { name: 'title', type: 'string', required: false, default: 'default' }
      const schema = fieldTypeToZod(field)

      const result = schema.parse(undefined)
      expect(result).toBe('default')
    })

    it('creates enum schema for string field with options', () => {
      const field: FieldSchema = { name: 'color', type: 'string', enum: ['red', 'green', 'blue'] }
      const schema = fieldTypeToZod(field)

      expect(schema.safeParse('red').success).toBe(true)
      expect(schema.safeParse('yellow').success).toBe(false)
    })
  })

  describe('number type', () => {
    it('creates number schema for required number field', () => {
      const field: FieldSchema = { name: 'count', type: 'number', required: true }
      const schema = fieldTypeToZod(field)

      expect(schema.safeParse(42).success).toBe(true)
      expect(schema.safeParse(3.14).success).toBe(true)
      expect(schema.safeParse('42').success).toBe(false)
    })

    it('creates optional number schema with default', () => {
      const field: FieldSchema = { name: 'count', type: 'number', required: false, default: 0 }
      const schema = fieldTypeToZod(field)

      expect(schema.parse(undefined)).toBe(0)
    })
  })

  describe('boolean type', () => {
    it('creates boolean schema for required boolean field', () => {
      const field: FieldSchema = { name: 'enabled', type: 'boolean', required: true }
      const schema = fieldTypeToZod(field)

      expect(schema.safeParse(true).success).toBe(true)
      expect(schema.safeParse(false).success).toBe(true)
      expect(schema.safeParse('true').success).toBe(false)
    })

    it('creates optional boolean schema with default', () => {
      const field: FieldSchema = { name: 'enabled', type: 'boolean', required: false, default: false }
      const schema = fieldTypeToZod(field)

      expect(schema.parse(undefined)).toBe(false)
    })
  })

  describe('array type', () => {
    it('creates array schema for array field', () => {
      const field: FieldSchema = { name: 'tags', type: 'array', required: true }
      const schema = fieldTypeToZod(field)

      expect(schema.safeParse(['a', 'b', 'c']).success).toBe(true)
      expect(schema.safeParse([1, 2, 3]).success).toBe(true)
      expect(schema.safeParse('not an array').success).toBe(false)
    })
  })

  describe('enum type', () => {
    it('creates enum schema for enum field', () => {
      const field: FieldSchema = { name: 'size', type: 'enum', enum: ['small', 'medium', 'large'] }
      const schema = fieldTypeToZod(field)

      expect(schema.safeParse('small').success).toBe(true)
      expect(schema.safeParse('xlarge').success).toBe(false)
    })

    it('falls back to string for enum without values', () => {
      const field: FieldSchema = { name: 'size', type: 'enum' }
      const schema = fieldTypeToZod(field)

      expect(schema.safeParse('anything').success).toBe(true)
    })
  })
})

// ============================================================================
// configSchemaToZod
// ============================================================================

describe('configSchemaToZod', () => {
  it('converts simple config schema to Zod schema', () => {
    const configSchema: ConfigSchema = {
      fields: [
        { name: 'data', type: 'string', required: true },
        { name: 'title', type: 'string', required: false },
        { name: 'height', type: 'number', required: false, default: 300 }
      ]
    }

    const zodSchema = configSchemaToZod(configSchema)

    // Valid input
    const validResult = zodSchema.safeParse({ data: 'sales', title: 'Sales Chart', height: 400 })
    expect(validResult.success).toBe(true)

    // Missing optional fields should use defaults
    const minimalResult = zodSchema.safeParse({ data: 'sales' })
    expect(minimalResult.success).toBe(true)
    if (minimalResult.success) {
      expect(minimalResult.data.height).toBe(300)
    }

    // Missing required field should fail
    const invalidResult = zodSchema.safeParse({ title: 'No data' })
    expect(invalidResult.success).toBe(false)
  })

  it('handles config schema with sections', () => {
    const configSchema: ConfigSchema = {
      fields: [
        { name: 'name', type: 'string', required: true }
      ],
      sections: [
        {
          name: 'columns',
          itemFields: [
            { name: 'field', type: 'string', required: true },
            { name: 'label', type: 'string', required: false }
          ]
        }
      ]
    }

    const zodSchema = configSchemaToZod(configSchema)

    const result = zodSchema.safeParse({
      name: 'test',
      columns: [
        { field: 'id', label: 'ID' },
        { field: 'name' }
      ]
    })

    expect(result.success).toBe(true)
  })

  it('converts bar chart schema correctly', () => {
    const barChartSchema: ConfigSchema = {
      fields: [
        { name: 'data', type: 'string', required: true },
        { name: 'x', type: 'string', required: true },
        { name: 'y', type: 'string', required: true },
        { name: 'group', type: 'string', required: false },
        { name: 'title', type: 'string', required: false },
        { name: 'height', type: 'number', required: false, default: 300 },
        { name: 'color', type: 'string', required: false, default: '#3B82F6' },
        { name: 'horizontal', type: 'boolean', required: false, default: false },
        { name: 'showLabels', type: 'boolean', required: false, default: true }
      ]
    }

    const zodSchema = configSchemaToZod(barChartSchema)

    const validConfig = {
      data: 'sales_data',
      x: 'category',
      y: 'amount',
      title: 'Sales by Category'
    }

    const result = zodSchema.safeParse(validConfig)
    expect(result.success).toBe(true)

    if (result.success) {
      expect(result.data.height).toBe(300)
      expect(result.data.color).toBe('#3B82F6')
      expect(result.data.horizontal).toBe(false)
      expect(result.data.showLabels).toBe(true)
    }
  })
})

// ============================================================================
// createPermissiveSchema
// ============================================================================

describe('createPermissiveSchema', () => {
  it('accepts any object', () => {
    const schema = createPermissiveSchema()

    expect(schema.safeParse({}).success).toBe(true)
    expect(schema.safeParse({ foo: 'bar' }).success).toBe(true)
    expect(schema.safeParse({ nested: { deep: true } }).success).toBe(true)
  })

  it('preserves all properties', () => {
    const schema = createPermissiveSchema()

    const input = { a: 1, b: 'string', c: [1, 2, 3] }
    const result = schema.parse(input)

    expect(result).toEqual(input)
  })
})

// ============================================================================
// validateProps
// ============================================================================

describe('validateProps', () => {
  const testSchema = z.object({
    name: z.string(),
    age: z.number().optional()
  })

  it('returns success for valid props', () => {
    const result = validateProps({ name: 'John', age: 30 }, testSchema)

    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data).toEqual({ name: 'John', age: 30 })
    }
  })

  it('returns errors for invalid props', () => {
    const result = validateProps({ name: 123 }, testSchema)

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.errors).toBeDefined()
    }
  })

  it('validates missing required fields', () => {
    const result = validateProps({}, testSchema)

    expect(result.success).toBe(false)
  })
})

// ============================================================================
// formatZodErrors
// ============================================================================

describe('formatZodErrors', () => {
  it('formats single error', () => {
    const schema = z.object({ name: z.string() })
    const result = schema.safeParse({ name: 123 })

    if (!result.success) {
      const messages = formatZodErrors(result.error)
      expect(messages.length).toBe(1)
      expect(messages[0]).toContain('name')
    }
  })

  it('formats multiple errors', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
      email: z.string().email()
    })

    const result = schema.safeParse({ name: 123, age: 'invalid', email: 'not-email' })

    if (!result.success) {
      const messages = formatZodErrors(result.error)
      expect(messages.length).toBe(3)
    }
  })

  it('formats nested path errors', () => {
    const schema = z.object({
      user: z.object({
        profile: z.object({
          name: z.string()
        })
      })
    })

    const result = schema.safeParse({ user: { profile: { name: 123 } } })

    if (!result.success) {
      const messages = formatZodErrors(result.error)
      expect(messages[0]).toContain('user.profile.name')
    }
  })

  it('handles root level error without path prefix', () => {
    const schema = z.string()
    const result = schema.safeParse(123)

    if (!result.success) {
      const messages = formatZodErrors(result.error)
      expect(messages.length).toBe(1)
      // Root level errors don't have a path prefix (e.g., "field: message")
      // The message should not start with a path like "somePath: "
      expect(messages[0]).not.toMatch(/^\w+:/)
    }
  })
})
