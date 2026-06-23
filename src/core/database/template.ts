/**
 * SQL Template Variable Substitution
 *
 * This module re-exports pure functions from @/lib/pure/template-utils
 * and adds logging wrappers for debugging.
 *
 * Used by report SQL execution to interpolate lightweight input variables.
 */

import type { IInputState } from '@/types/interfaces'
import {
  interpolateSQL as pureInterpolateSQL,
  extractVariables,
  validateContext,
  hasInputVariables,
  type TemplateContext
} from '@core/shared/pure'

/**
 * Template context for SQL interpolation
 * Re-exported for backward compatibility
 */
export interface SQLTemplateContext {
  inputs: IInputState
  metadata: Record<string, any>
}

/**
 * Replace template variables in SQL (with logging)
 *
 * Wraps the pure function with debug logging.
 * For pure version without logging, use @/lib/pure directly.
 */
export function interpolateSQL(sql: string, context: SQLTemplateContext): string {
  const result = pureInterpolateSQL(sql, context as TemplateContext)

  // Log if interpolation occurred (side effect for debugging)
  if (result.output !== sql) {
    console.log('SQL Interpolation:')
    console.log('  Original (first 100):', sql.substring(0, 100) + (sql.length > 100 ? '...' : ''))
    console.log('  Interpolated (first 100):', result.output.substring(0, 100) + (result.output.length > 100 ? '...' : ''))

    if (result.missingVariables.length > 0) {
      console.warn('  Missing variables:', result.missingVariables)
    }

    // Log full interpolated SQL for debugging
    console.log('  Full interpolated SQL:', result.output)
  }

  return result.output
}

/**
 * Check if SQL contains template variables
 * Re-exported from pure layer
 */
export function hasTemplateVariables(sql: string): boolean {
  return hasInputVariables(sql) || /\$\{metadata\.\w+\}/.test(sql)
}

/**
 * Extract all template variable names from SQL
 * Wraps pure function for backward compatibility
 */
export function extractTemplateVariables(sql: string): {
  inputs: string[]
  metadata: string[]
} {
  const vars = extractVariables(sql)
  return {
    inputs: vars.inputs,
    metadata: vars.metadata
  }
}

/**
 * Validate that all template variables have values
 * Wraps pure function for backward compatibility
 */
export function validateTemplateContext(
  sql: string,
  context: SQLTemplateContext
): { valid: boolean; missing: string[] } {
  return validateContext(sql, context as TemplateContext)
}
