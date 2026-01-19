/**
 * UITree Type Definitions
 *
 * Core types for the declarative UI specification system.
 * UITree defines a tree structure of UI elements that can be validated
 * against a Catalog and rendered by providers.
 *
 * This is part of the Catalog + UITree pattern for Generated UI.
 */

/**
 * Dynamic value reference using JSON Pointer path
 * Used for data binding in UITree elements
 *
 * @example
 * { path: "/data/sales/total" }
 * { path: "/inputs/selectedCategory" }
 */
export interface DynamicValue {
  /** JSON Pointer path to the value in the data context */
  path: string
}

/**
 * Type guard to check if a value is a DynamicValue
 */
export function isDynamicValue(value: unknown): value is DynamicValue {
  return (
    typeof value === 'object' &&
    value !== null &&
    'path' in value &&
    typeof (value as DynamicValue).path === 'string' &&
    Object.keys(value).length === 1
  )
}

/**
 * Visibility condition - can be static boolean or dynamic reference
 */
export type VisibilityCondition = boolean | DynamicValue

/**
 * Single UI element in the tree
 */
export interface UIElement {
  /** Unique key for this element within the tree */
  key: string

  /**
   * Element type - maps to componentRegistry language
   * e.g., 'bar-chart', 'line-chart', 'bigvalue', 'datatable'
   */
  type: string

  /**
   * Props passed to the component
   * Values can be static or dynamic references
   */
  props: Record<string, unknown>

  /**
   * Child element keys (for container components)
   * References other elements in the tree by their key
   */
  children?: string[]

  /**
   * Visibility control
   * - true/false: static visibility
   * - DynamicValue: resolved at runtime from data context
   */
  visible?: VisibilityCondition
}

/**
 * Complete UI Tree specification
 */
export interface UITree {
  /** Schema version for forward compatibility */
  version: '1.0'

  /** Key of the root element */
  root: string

  /** All elements indexed by key */
  elements: Record<string, UIElement>

  /**
   * Data context for dynamic value resolution
   * Can contain query results, input values, computed values
   */
  data?: Record<string, unknown>
}

/**
 * Validation error for UITree
 */
export interface UITreeValidationError {
  /** Error code for programmatic handling */
  code: UITreeErrorCode

  /** Human-readable error message */
  message: string

  /** Path to the problematic element/property */
  path: string

  /** Element key if applicable */
  elementKey?: string
}

/**
 * Validation warning for UITree
 */
export interface UITreeValidationWarning {
  /** Warning code */
  code: UITreeWarningCode

  /** Human-readable warning message */
  message: string

  /** Path to the element/property */
  path: string

  /** Element key if applicable */
  elementKey?: string
}

/**
 * Complete validation result
 */
export interface UITreeValidationResult {
  /** Overall validity */
  valid: boolean

  /** Validation errors (if any) */
  errors: UITreeValidationError[]

  /** Validation warnings (non-blocking) */
  warnings: UITreeValidationWarning[]
}

/**
 * Error codes for UITree validation
 */
export type UITreeErrorCode =
  | 'MISSING_ROOT'
  | 'ROOT_NOT_FOUND'
  | 'UNKNOWN_TYPE'
  | 'INVALID_PROPS'
  | 'MISSING_REQUIRED_PROP'
  | 'INVALID_PROP_TYPE'
  | 'CHILD_NOT_FOUND'
  | 'CIRCULAR_REFERENCE'
  | 'INVALID_VERSION'

/**
 * Warning codes for UITree validation
 */
export type UITreeWarningCode =
  | 'UNUSED_ELEMENT'
  | 'DEPRECATED_TYPE'
  | 'UNKNOWN_PROP'

/**
 * Helper type for element with resolved props (no dynamic values)
 */
export interface ResolvedUIElement extends Omit<UIElement, 'props' | 'visible'> {
  props: Record<string, unknown>
  visible: boolean
}

/**
 * Helper type for tree with resolved elements
 */
export interface ResolvedUITree extends Omit<UITree, 'elements'> {
  elements: Record<string, ResolvedUIElement>
}
