/**
 * UITree Validator
 *
 * Validates UITree structures against a Catalog.
 * Checks for structural integrity, type existence, and prop validity.
 */

import type { z } from 'zod'
import type {
  UITree,
  UIElement,
  UITreeValidationResult,
  UITreeValidationError,
  UITreeValidationWarning,
  UITreeErrorCode,
  UITreeWarningCode
} from '@/types/ui-tree'
import { isDynamicValue } from '@/types/ui-tree'
import { formatZodErrors } from './schema-adapter'

/**
 * Interface for type lookup during validation
 * This allows the validator to work with any catalog implementation
 */
export interface TypeLookup {
  has(type: string): boolean
  getSchema(type: string): z.ZodType<unknown> | undefined
}

/**
 * Create a validation error
 */
function createError(
  code: UITreeErrorCode,
  message: string,
  path: string,
  elementKey?: string
): UITreeValidationError {
  return { code, message, path, elementKey }
}

/**
 * Create a validation warning
 */
function createWarning(
  code: UITreeWarningCode,
  message: string,
  path: string,
  elementKey?: string
): UITreeValidationWarning {
  return { code, message, path, elementKey }
}

/**
 * Validate UITree structure and contents
 *
 * @param tree - UITree to validate
 * @param typeLookup - Catalog or type lookup interface
 * @returns Validation result
 */
export function validateTree(
  tree: UITree,
  typeLookup: TypeLookup
): UITreeValidationResult {
  const errors: UITreeValidationError[] = []
  const warnings: UITreeValidationWarning[] = []

  // 1. Validate version
  if (tree.version !== '1.0') {
    errors.push(createError(
      'INVALID_VERSION',
      `Invalid UITree version: "${tree.version}". Expected "1.0"`,
      '/version'
    ))
  }

  // 2. Validate root exists
  if (!tree.root) {
    errors.push(createError(
      'MISSING_ROOT',
      'UITree is missing a root element',
      '/root'
    ))
    return { valid: false, errors, warnings }
  }

  // 3. Check root element exists in elements
  if (!tree.elements[tree.root]) {
    errors.push(createError(
      'ROOT_NOT_FOUND',
      `Root element "${tree.root}" not found in elements`,
      '/root'
    ))
    return { valid: false, errors, warnings }
  }

  // 4. Track visited elements for unused detection
  const visited = new Set<string>()
  const visiting = new Set<string>()

  // 5. Validate elements recursively from root
  validateElement(
    tree.root,
    tree.elements,
    typeLookup,
    errors,
    warnings,
    visited,
    visiting
  )

  // 6. Check for unused elements
  for (const key of Object.keys(tree.elements)) {
    if (!visited.has(key)) {
      warnings.push(createWarning(
        'UNUSED_ELEMENT',
        `Element "${key}" is not reachable from root`,
        `/elements/${key}`,
        key
      ))
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate a single element and its children recursively
 */
function validateElement(
  key: string,
  elements: Record<string, UIElement>,
  typeLookup: TypeLookup,
  errors: UITreeValidationError[],
  warnings: UITreeValidationWarning[],
  visited: Set<string>,
  visiting: Set<string>
): void {
  // Check for circular reference
  if (visiting.has(key)) {
    errors.push(createError(
      'CIRCULAR_REFERENCE',
      `Circular reference detected at element "${key}"`,
      `/elements/${key}`,
      key
    ))
    return
  }

  // Skip if already validated
  if (visited.has(key)) {
    return
  }

  const element = elements[key]
  if (!element) {
    return // Element not found error already reported
  }

  visiting.add(key)

  // Validate type exists in catalog
  if (!typeLookup.has(element.type)) {
    errors.push(createError(
      'UNKNOWN_TYPE',
      `Unknown component type: "${element.type}"`,
      `/elements/${key}/type`,
      key
    ))
  } else {
    // Validate props against schema
    const schema = typeLookup.getSchema(element.type)
    if (schema) {
      // Filter out dynamic values before validation
      // Dynamic values are validated at runtime when data is available
      const staticProps = filterStaticProps(element.props)
      const result = schema.safeParse(staticProps)

      if (!result.success) {
        const errorMessages = formatZodErrors(result.error)
        for (const message of errorMessages) {
          errors.push(createError(
            'INVALID_PROPS',
            `Invalid props for "${element.type}": ${message}`,
            `/elements/${key}/props`,
            key
          ))
        }
      }
    }
  }

  // Validate children references
  if (element.children && element.children.length > 0) {
    for (const childKey of element.children) {
      if (!elements[childKey]) {
        errors.push(createError(
          'CHILD_NOT_FOUND',
          `Child element "${childKey}" not found`,
          `/elements/${key}/children`,
          key
        ))
      } else {
        // Recursively validate children
        validateElement(
          childKey,
          elements,
          typeLookup,
          errors,
          warnings,
          visited,
          visiting
        )
      }
    }
  }

  visiting.delete(key)
  visited.add(key)
}

/**
 * Filter out dynamic values from props for static validation
 * Dynamic values need runtime data to validate
 */
function filterStaticProps(
  props: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(props)) {
    if (isDynamicValue(value)) {
      // Skip dynamic values - they'll be validated at runtime
      continue
    }

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // Recursively filter nested objects
      result[key] = filterStaticProps(value as Record<string, unknown>)
    } else if (Array.isArray(value)) {
      // Filter arrays
      result[key] = value.filter(item => !isDynamicValue(item))
    } else {
      result[key] = value
    }
  }

  return result
}

/**
 * Quick validation check - just checks types exist
 * Faster than full validation when you just need basic checks
 */
export function quickValidateTree(tree: UITree, typeLookup: TypeLookup): boolean {
  if (tree.version !== '1.0') return false
  if (!tree.root || !tree.elements[tree.root]) return false

  for (const element of Object.values(tree.elements)) {
    if (!typeLookup.has(element.type)) return false
  }

  return true
}
