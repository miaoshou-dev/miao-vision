import { z } from 'zod'
import { agentError, isAgentError } from './errors'
import { queryDataset, type QueryOptions, type QueryResult } from './data-query'
import type { AgentError } from './types'

export const QUERY_RECIPE_VERSION = 1 as const
export const queryRecipeSchema = z.object({
  schemaVersion: z.literal(QUERY_RECIPE_VERSION),
  groupBy: z.array(z.string().min(1)).optional(),
  measures: z.array(z.object({
    operation: z.enum(['sum', 'count', 'avg', 'min', 'max']),
    field: z.string().min(1),
    alias: z.string().min(1)
  })).optional(),
  filters: z.array(z.object({
    field: z.string().min(1),
    operator: z.enum(['eq', 'gte', 'lte', 'gt', 'lt']),
    value: z.union([z.string(), z.number(), z.boolean()])
  })).max(1).optional(),
  orderBy: z.array(z.object({
    field: z.string().min(1),
    direction: z.enum(['asc', 'desc'])
  })).max(1).optional(),
  share: z.object({
    field: z.string().min(1),
    alias: z.string().min(1).default('share')
  }).optional(),
  limit: z.number().int().positive().optional()
})

export type QueryRecipe = z.infer<typeof queryRecipeSchema>

export function parseQueryRecipe(value: unknown): QueryRecipe | AgentError {
  const parsed = queryRecipeSchema.safeParse(value)
  if (parsed.success) return parsed.data
  return agentError('EVIDENCE_RECIPE_INVALID', 'Evidence query recipe is invalid.', {
    issues: parsed.error.issues
  })
}

export function queryOptionsToRecipe(options: QueryOptions): QueryRecipe | AgentError {
  const measures = options.measure?.split(',').map(part => {
    const match = part.trim().match(/^(\w+)\(([^)]+)\)(?:\s+as\s+(\w+))?$/i)
    if (!match) return null
    const operation = match[1].toLowerCase()
    const field = match[2].trim()
    return { operation, field, alias: match[3] ?? `${operation}_${field.replace('*', 'all')}` }
  })
  if (measures?.some(item => item === null)) {
    return agentError('EVIDENCE_RECIPE_INVALID', 'Cannot convert query measure to a recipe.', { measure: options.measure })
  }
  const filter = options.filter ? parseFilter(options.filter) : undefined
  if (options.filter && !filter) {
    return agentError('EVIDENCE_RECIPE_INVALID', 'Cannot convert query filter to a recipe.', { filter: options.filter })
  }
  const order = options.orderby?.trim().match(/^(\w+)(?:\s+(asc|desc))?$/i)
  const candidate = {
    schemaVersion: QUERY_RECIPE_VERSION,
    ...(options.groupby ? { groupBy: options.groupby.split(',').map(value => value.trim()).filter(Boolean) } : {}),
    ...(measures?.length ? { measures } : {}),
    ...(filter ? { filters: [filter] } : {}),
    ...(order ? { orderBy: [{ field: order[1], direction: (order[2]?.toLowerCase() ?? 'asc') }] } : {}),
    ...(options.limit ? { limit: options.limit } : {})
  }
  return parseQueryRecipe(candidate)
}

export function executeQueryRecipe(
  rows: Record<string, unknown>[],
  value: unknown
): QueryResult | AgentError {
  const recipe = parseQueryRecipe(value)
  if (isAgentError(recipe)) return recipe
  const missing = queryRecipeFields(recipe).filter(field => field !== '*' && !rows.some(row => field in row))
  if (missing.length) {
    return agentError('EVIDENCE_PLAN_EXECUTION_FAILED', 'Evidence recipe references unavailable fields.', {
      fields: missing
    })
  }
  const result = queryDataset(rows, {
    groupby: recipe.groupBy?.join(','),
    measure: recipe.measures?.map(item => `${item.operation}(${item.field}) as ${item.alias}`).join(', '),
    filter: recipe.filters?.map(item =>
      `${item.field}${({ eq: '=', gte: '>=', lte: '<=', gt: '>', lt: '<' } as const)[item.operator]}${String(item.value)}`
    ).join(''),
    orderby: recipe.orderBy?.map(item => `${item.field} ${item.direction}`).join(''),
    limit: recipe.limit
  })
  if (isAgentError(result) || !recipe.share) return result
  const total = result.rows.reduce((sum, row) => sum + Number(row[recipe.share!.field] ?? 0), 0)
  return {
    ...result,
    rows: result.rows.map(row => ({
      ...row,
      [recipe.share!.alias]: total > 0 ? Math.round(Number(row[recipe.share!.field] ?? 0) / total * 10000) / 10000 : 0
    }))
  }
}

export function queryRecipeFields(recipe: QueryRecipe): string[] {
  return Array.from(new Set([
    ...(recipe.groupBy ?? []),
    ...(recipe.measures ?? []).map(item => item.field),
    ...(recipe.filters ?? []).map(item => item.field)
  ]))
}

function parseFilter(filter: string): NonNullable<QueryRecipe['filters']>[number] | null {
  const match = filter.match(/^(\w+)\s*(>=|<=|>|<|=)\s*(.+)$/)
  if (!match) return null
  const operator = ({ '=': 'eq', '>=': 'gte', '<=': 'lte', '>': 'gt', '<': 'lt' } as const)[match[2] as '=' | '>=' | '<=' | '>' | '<']
  const raw = match[3].trim()
  const value = raw === 'true' ? true : raw === 'false' ? false : Number.isFinite(Number(raw)) ? Number(raw) : raw
  return { field: match[1], operator, value }
}
