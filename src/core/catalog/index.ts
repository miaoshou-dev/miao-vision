/**
 * Catalog Module
 *
 * Provides a unified component catalog for Generated UI.
 * The Catalog bridges the existing ComponentRegistry with the
 * UITree validation and rendering pipeline.
 *
 * @example
 * ```typescript
 * import { createCatalog } from '@core/catalog'
 *
 * const catalog = createCatalog()
 *
 * // Check if a type exists
 * catalog.has('bar-chart') // true
 *
 * // Get entry for a type
 * const entry = catalog.get('bar-chart')
 *
 * // Validate a UITree
 * const result = catalog.validateTree(tree)
 * if (!result.valid) {
 *   console.error('Validation errors:', result.errors)
 * }
 * ```
 */

// Types
export type {
  Catalog,
  CatalogEntry,
  CreateCatalogOptions,
  AIHints
} from './types'

// UITree types (re-export for convenience)
export type {
  UITree,
  UIElement,
  DynamicValue,
  VisibilityCondition,
  UITreeValidationResult,
  UITreeValidationError,
  UITreeValidationWarning,
  UITreeErrorCode,
  UITreeWarningCode,
  ResolvedUIElement,
  ResolvedUITree
} from '@/types/ui-tree'

export { isDynamicValue } from '@/types/ui-tree'

// Factory functions
export { createCatalog, createMutableCatalog } from './catalog'
export type { MutableCatalog } from './catalog'

// Schema adapter
export {
  configSchemaToZod,
  fieldTypeToZod,
  createPermissiveSchema,
  validateProps,
  formatZodErrors
} from './schema-adapter'

// Tree validator
export { validateTree, quickValidateTree } from './tree-validator'
export type { TypeLookup } from './tree-validator'

// Dynamic value utilities
export {
  getByPath,
  setByPath,
  parsePath,
  resolveDynamicValue,
  resolveAllDynamicValues,
  hasDynamicValues
} from './dynamic-value'

// Visualization catalog
export { getVizCatalog, initializeVizCatalog, resetVizCatalog } from './viz-catalog'
