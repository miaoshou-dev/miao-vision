/**
 * Infographic template type contracts.
 *
 * Lives in types/ so both core/ and plugins/ can depend on it
 * without creating a core → plugins layer violation.
 */

/**
 * High-level category that classifies what an infographic section visualises.
 * Used by AI planners in core/ and by template implementations in plugins/.
 */
export type TemplateCategory =
  | 'kpi'
  | 'ranking'
  | 'flow'
  | 'hierarchy'
  | 'comparison'
  | 'distribution'
  | 'relation'
  | 'statistical'

/**
 * Structure-Item combination definition.
 * Defined here so core/ planners can reference it without importing from plugins/.
 */
export interface TemplateDefinition {
  /** Unique template identifier */
  id: string
  /** Display name */
  name: string
  /** Template category */
  category: TemplateCategory
  /** Structure component name */
  structure: string
  /** Item component name */
  item: string
  /** Optimal data row count range */
  optimalRows: [number, number]
  /** Required data fields */
  requiredFields: string[]
  /** Optional data fields */
  optionalFields?: string[]
  /** Description for AI selection */
  description: string
}

/**
 * Repository interface for template lookup.
 * Implemented in plugins/, injected into core/ planners via constructor.
 */
export interface TemplateRepository {
  getAllTemplates(): TemplateDefinition[]
  getTemplateById(id: string): TemplateDefinition | undefined
}
