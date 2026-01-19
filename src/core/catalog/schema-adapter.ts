/**
 * Schema Adapter
 *
 * Converts existing ConfigSchema definitions to Zod schemas.
 * This enables runtime validation of UITree element props using
 * the existing component schema definitions.
 */

import { z } from 'zod'
import type { ConfigSchema, FieldSchema } from '@core/registry/config-parser'

/**
 * Convert a FieldType to corresponding Zod type
 */
export function fieldTypeToZod(field: FieldSchema): z.ZodTypeAny {
  let schema: z.ZodTypeAny

  switch (field.type) {
    case 'string':
      // Check if field has enum values (string with restricted options)
      if (field.enum && field.enum.length > 0) {
        schema = z.enum(field.enum as [string, ...string[]])
      } else {
        schema = z.string()
      }
      break

    case 'number':
      schema = z.number()
      break

    case 'boolean':
      schema = z.boolean()
      break

    case 'array':
      // Arrays can contain any type of items
      schema = z.array(z.unknown())
      break

    case 'enum':
      if (field.enum && field.enum.length > 0) {
        // Create enum schema from the allowed values
        schema = z.enum(field.enum as [string, ...string[]])
      } else {
        // Fallback to string if no enum values defined
        schema = z.string()
      }
      break

    default:
      // Default to string for unknown types
      schema = z.string()
  }

  // Apply optional/required and default value
  if (!field.required) {
    if (field.default !== undefined) {
      schema = schema.optional().default(field.default)
    } else {
      schema = schema.optional()
    }
  }

  return schema
}

/**
 * Convert a ConfigSchema to a Zod object schema
 *
 * @param configSchema - The ConfigSchema to convert
 * @returns Zod object schema for validation
 */
export function configSchemaToZod(configSchema: ConfigSchema): z.ZodObject<Record<string, z.ZodTypeAny>> {
  const shape: Record<string, z.ZodTypeAny> = {}

  // Convert each field to Zod type
  for (const field of configSchema.fields) {
    shape[field.name] = fieldTypeToZod(field)
  }

  // Handle sections (nested structures like columns:, options:)
  if (configSchema.sections) {
    for (const section of configSchema.sections) {
      // Create schema for section items
      const itemShape: Record<string, z.ZodTypeAny> = {}
      for (const itemField of section.itemFields) {
        itemShape[itemField.name] = fieldTypeToZod(itemField)
      }

      // Sections are arrays of objects
      shape[section.name] = z.array(z.object(itemShape)).optional()
    }
  }

  return z.object(shape)
}

/**
 * Create a permissive Zod schema that accepts any props
 * Used for components without a defined ConfigSchema
 */
export function createPermissiveSchema(): z.ZodType<Record<string, unknown>> {
  return z.record(z.string(), z.unknown())
}

/**
 * Validate props against a Zod schema
 *
 * @param props - Props to validate
 * @param schema - Zod schema to validate against
 * @returns Validation result with parsed data or errors
 */
export function validateProps<T>(
  props: unknown,
  schema: z.ZodType<T>
): { success: true; data: T } | { success: false; errors: z.ZodError } {
  const result = schema.safeParse(props)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, errors: result.error }
  }
}

/**
 * Format Zod validation errors into human-readable messages
 */
export function formatZodErrors(errors: z.ZodError): string[] {
  return errors.issues.map((issue: z.ZodIssue) => {
    const path = issue.path.join('.')
    return path ? `${path}: ${issue.message}` : issue.message
  })
}
