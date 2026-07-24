import { describe, expect, it } from 'vitest'
import { executeQueryRecipe, queryOptionsToRecipe, queryRecipeFields } from './query-recipe'

const rows = [
  { region: 'East', sales: 10, active: true },
  { region: 'West', sales: 20, active: false },
  { region: 'East', sales: 30, active: true }
]

describe('query recipe', () => {
  it('round-trips query options and produces deterministic grouped results', () => {
    const recipe = queryOptionsToRecipe({
      groupby: 'region', measure: 'sum(sales) as total, count(*) as rows',
      orderby: 'total desc', limit: 2
    })
    expect(recipe).toMatchObject({ schemaVersion: 1, groupBy: ['region'] })
    const first = executeQueryRecipe(rows, recipe)
    const second = executeQueryRecipe(rows, recipe)
    expect(first).toEqual(second)
    expect(first).toMatchObject({ rows: [
      { region: 'East', total: 40, rows: 2 },
      { region: 'West', total: 20, rows: 1 }
    ] })
  })

  it.each(['sum', 'count', 'avg', 'min', 'max'])('supports %s', operation => {
    const result = executeQueryRecipe(rows, {
      schemaVersion: 1,
      measures: [{ operation, field: operation === 'count' ? '*' : 'sales', alias: 'value' }]
    })
    expect(result).toHaveProperty('rows.0.value')
  })

  it('supports filters, share derivation, and dependency extraction', () => {
    const recipe = {
      schemaVersion: 1 as const,
      groupBy: ['region'],
      measures: [{ operation: 'sum' as const, field: 'sales', alias: 'total' }],
      filters: [{ field: 'active', operator: 'eq' as const, value: true }],
      orderBy: [{ field: 'total', direction: 'desc' as const }],
      share: { field: 'total', alias: 'share' }
    }
    expect(queryRecipeFields(recipe)).toEqual(['region', 'sales', 'active'])
    expect(executeQueryRecipe(rows, recipe)).toMatchObject({
      rows: [{ region: 'East', total: 40, share: 1 }]
    })
  })

  it('returns structured errors for invalid recipes and unavailable fields', () => {
    expect(executeQueryRecipe(rows, { schemaVersion: 1, measures: [{ operation: 'median', field: 'sales', alias: 'x' }] }))
      .toMatchObject({ ok: false, code: 'EVIDENCE_RECIPE_INVALID' })
    expect(executeQueryRecipe(rows, { schemaVersion: 1, groupBy: ['missing'] }))
      .toMatchObject({ ok: false, code: 'EVIDENCE_PLAN_EXECUTION_FAILED' })
  })
})
