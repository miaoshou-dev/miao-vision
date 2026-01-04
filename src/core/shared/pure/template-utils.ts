/**
 * Template Variable Utilities - Pure Functions
 *
 * All functions in this module are pure:
 * - No side effects (no console.log, no mutations)
 * - Same input always produces same output
 * - Easy to test in isolation
 *
 * @module pure/template-utils
 */

// ============================================================================
// Types & Contracts
// ============================================================================

/**
 * Template context for SQL interpolation
 *
 * @contract
 * - inputs: Record of input name -> value (string, number, boolean, Date, array)
 * - metadata: Record of metadata property -> value
 */
export interface TemplateContext {
  inputs: Record<string, unknown>
  metadata: Record<string, unknown>
}

/**
 * Result of template variable extraction
 */
export interface ExtractedVariables {
  /** Input variable names (e.g., ['region', 'year']) */
  inputs: string[]
  /** Metadata variable names (e.g., ['title', 'author']) */
  metadata: string[]
  /** Block reference names (e.g., ['sales_data', 'customers']) */
  blocks: string[]
}

/**
 * Result of template validation
 */
export interface ValidationResult {
  valid: boolean
  missing: string[]
}

/**
 * Result of interpolation with detailed info
 */
export interface InterpolationResult {
  /** Interpolated string */
  output: string
  /** Variables that were replaced */
  replacedVariables: string[]
  /** Variables that were missing (replaced with NULL) */
  missingVariables: string[]
}

// ============================================================================
// Regex Patterns (Centralized)
// ============================================================================

/**
 * Centralized regex patterns for template variables
 *
 * @contract
 * - TEMPLATE_VAR: Matches ${identifier} where identifier is alphanumeric + underscore
 * - INPUT_VAR: Matches ${inputs.name}
 * - METADATA_VAR: Matches ${metadata.name}
 * - QUALIFIED_VAR: Matches ${namespace.property}
 * - INDEXED_VAR: Matches ${namespace.property[index]}
 */
export const PATTERNS = {
  /** Matches ${identifier} - simple variable reference */
  TEMPLATE_VAR: /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}/g,

  /** Matches ${inputs.name} - input variable */
  INPUT_VAR: /\$\{inputs\.(\w+)\}/g,

  /** Matches ${metadata.name} - metadata variable */
  METADATA_VAR: /\$\{metadata\.(\w+)\}/g,

  /** Matches ${namespace.property} - qualified variable */
  QUALIFIED_VAR: /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\}/g,

  /** Matches ${namespace.property[index]} - indexed variable */
  INDEXED_VAR: /\$\{([a-zA-Z_][a-zA-Z0-9_]*)\.([a-zA-Z_][a-zA-Z0-9_]*)\[(\d+)\]\}/g
} as const

// ============================================================================
// Pure Functions
// ============================================================================

/**
 * Check if a string contains any template variables
 *
 * @pure No side effects
 * @example
 * hasTemplateVariables('SELECT * FROM ${table}') // true
 * hasTemplateVariables('SELECT * FROM users')     // false
 */
export function hasTemplateVariables(str: string): boolean {
  return /\$\{[^}]+\}/.test(str)
}

/**
 * Check if a string contains input template variables
 *
 * @pure No side effects
 */
export function hasInputVariables(str: string): boolean {
  return /\$\{inputs\.\w+\}/.test(str)
}

/**
 * Extract all template variable names from a string
 *
 * @pure No side effects
 * @example
 * extractVariables('SELECT * FROM ${table} WHERE region = ${inputs.region}')
 * // { inputs: ['region'], metadata: [], blocks: ['table'] }
 */
export function extractVariables(str: string): ExtractedVariables {
  const inputs: string[] = []
  const metadata: string[] = []
  const blocks: string[] = []

  // Extract input variables: ${inputs.name}
  const inputRegex = new RegExp(PATTERNS.INPUT_VAR.source, 'g')
  let match
  while ((match = inputRegex.exec(str)) !== null) {
    if (!inputs.includes(match[1])) {
      inputs.push(match[1])
    }
  }

  // Extract metadata variables: ${metadata.name}
  const metadataRegex = new RegExp(PATTERNS.METADATA_VAR.source, 'g')
  while ((match = metadataRegex.exec(str)) !== null) {
    if (!metadata.includes(match[1])) {
      metadata.push(match[1])
    }
  }

  // Extract block references: ${block_name} (not inputs.* or metadata.*)
  const templateRegex = new RegExp(PATTERNS.TEMPLATE_VAR.source, 'g')
  while ((match = templateRegex.exec(str)) !== null) {
    const varName = match[1]
    // Skip if it's part of a qualified reference (inputs.x, metadata.x)
    if (!varName.includes('.') &&
        !inputs.includes(varName) &&
        !metadata.includes(varName) &&
        !blocks.includes(varName)) {
      blocks.push(varName)
    }
  }

  return { inputs, metadata, blocks }
}

/**
 * Validate that all template variables have values in context
 *
 * @pure No side effects
 */
export function validateContext(
  str: string,
  context: TemplateContext
): ValidationResult {
  const variables = extractVariables(str)
  const missing: string[] = []

  // Check input variables
  for (const varName of variables.inputs) {
    const value = context.inputs[varName]
    if (value === null || value === undefined) {
      missing.push(`inputs.${varName}`)
    }
  }

  // Check metadata variables
  for (const varName of variables.metadata) {
    const value = context.metadata[varName]
    if (value === null || value === undefined) {
      missing.push(`metadata.${varName}`)
    }
  }

  return {
    valid: missing.length === 0,
    missing
  }
}

/**
 * Escape a value for safe SQL insertion
 *
 * @pure No side effects
 * @internal Used by interpolate functions
 */
export function escapeForSQL(value: unknown): string {
  if (value === null || value === undefined) {
    return 'NULL'
  }

  if (typeof value === 'string') {
    // Escape single quotes
    return `'${value.replace(/'/g, "''")}'`
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }

  if (value instanceof Date) {
    return `'${value.toISOString()}'`
  }

  if (Array.isArray(value)) {
    const escaped = value.map(v =>
      typeof v === 'string' ? `'${v.replace(/'/g, "''")}'` : String(v)
    )
    return `(${escaped.join(', ')})`
  }

  // Unknown type - return NULL
  return 'NULL'
}

/**
 * Interpolate template variables in SQL
 *
 * @pure No side effects (no logging)
 * @returns InterpolationResult with details about what was replaced
 *
 * @example
 * interpolateSQL(
 *   "SELECT * FROM sales WHERE region = ${inputs.region}",
 *   { inputs: { region: 'West' }, metadata: {} }
 * )
 * // { output: "SELECT * FROM sales WHERE region = 'West'", ... }
 */
export function interpolateSQL(
  sql: string,
  context: TemplateContext
): InterpolationResult {
  const replacedVariables: string[] = []
  const missingVariables: string[] = []
  let output = sql

  // Replace ${inputs.variable}
  output = output.replace(
    new RegExp(PATTERNS.INPUT_VAR.source, 'g'),
    (_match, varName) => {
      const value = context.inputs[varName]

      if (value === null || value === undefined) {
        missingVariables.push(`inputs.${varName}`)
        return 'NULL'
      }

      replacedVariables.push(`inputs.${varName}`)
      return escapeForSQL(value)
    }
  )

  // Replace ${metadata.property}
  output = output.replace(
    new RegExp(PATTERNS.METADATA_VAR.source, 'g'),
    (_match, propName) => {
      const value = context.metadata[propName]

      if (value === null || value === undefined) {
        missingVariables.push(`metadata.${propName}`)
        return 'NULL'
      }

      replacedVariables.push(`metadata.${propName}`)
      return escapeForSQL(value)
    }
  )

  return {
    output,
    replacedVariables,
    missingVariables
  }
}

/**
 * Replace block references with actual table names
 *
 * @pure No side effects
 *
 * @example
 * resolveBlockReferences(
 *   "SELECT * FROM ${sales_data}",
 *   new Map([['sales_data', 'chart_data_block_0']])
 * )
 * // { output: "SELECT * FROM chart_data_block_0", ... }
 */
export function resolveBlockReferences(
  sql: string,
  tableMapping: ReadonlyMap<string, string>
): InterpolationResult {
  const replacedVariables: string[] = []
  const missingVariables: string[] = []

  // Step 1: Replace ${block_name} template syntax
  let output = sql.replace(
    new RegExp(PATTERNS.TEMPLATE_VAR.source, 'g'),
    (match, blockRef) => {
      // Skip qualified references (inputs.x, metadata.x)
      if (blockRef.includes('.')) {
        return match
      }

      const tableName = tableMapping.get(blockRef)
      if (tableName) {
        replacedVariables.push(blockRef)
        return tableName
      }

      missingVariables.push(blockRef)
      return match // Keep original if not found
    }
  )

  // Step 2: Replace implicit FROM/JOIN table_name references
  // Only replace if the table name is a known block (in tableMapping)
  const tableRefPattern = /(\bFROM|\bJOIN)\s+(["']?)([a-zA-Z_][a-zA-Z0-9_]*)\2(?!\s*\.)/gi
  output = output.replace(tableRefPattern, (match, keyword, _quote, tableName) => {
    const fullTableName = tableMapping.get(tableName)
    if (fullTableName) {
      if (!replacedVariables.includes(tableName)) {
        replacedVariables.push(tableName)
      }
      return `${keyword} ${fullTableName}`
    }
    return match // Keep original if not a known block
  })

  return {
    output,
    replacedVariables,
    missingVariables
  }
}

/**
 * Full SQL interpolation: resolve block refs + template variables
 *
 * @pure No side effects
 */
export function interpolateFullSQL(
  sql: string,
  tableMapping: ReadonlyMap<string, string>,
  context: TemplateContext
): InterpolationResult {
  // First resolve block references
  const blockResult = resolveBlockReferences(sql, tableMapping)

  // Then interpolate template variables
  const templateResult = interpolateSQL(blockResult.output, context)

  return {
    output: templateResult.output,
    replacedVariables: [...blockResult.replacedVariables, ...templateResult.replacedVariables],
    missingVariables: [...blockResult.missingVariables, ...templateResult.missingVariables]
  }
}
