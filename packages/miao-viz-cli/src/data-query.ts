import { agentError, isAgentError } from './errors'
import type { AgentError } from './types'

const SUPPORTED_OPS = ['sum', 'count', 'avg', 'min', 'max'] as const
type AggOp = (typeof SUPPORTED_OPS)[number]

interface ParsedMeasure {
  fn: AggOp
  field: string
  alias: string
}

export interface QueryOptions {
  groupby?: string  // comma-separated column names
  measure?: string  // "fn(col) as alias, ..." — only sum/count/avg/min/max
  filter?: string   // "col=val" — simple equality only
  orderby?: string  // "col desc" or "col asc"
  limit?: number
}

export interface QueryResult {
  rows: Record<string, unknown>[]
  sql: string
  rowCount: number
}

export function queryDataset(
  rows: Record<string, unknown>[],
  options: QueryOptions
): QueryResult | AgentError {
  const groupByCols = options.groupby
    ? options.groupby.split(',').map(c => c.trim()).filter(Boolean)
    : []

  const measuresResult = options.measure ? parseMeasures(options.measure) : ([] as ParsedMeasure[])
  if (isAgentError(measuresResult)) return measuresResult
  const measures = measuresResult as ParsedMeasure[]

  // Filter
  let current: Record<string, unknown>[]
  if (options.filter) {
    const filterResult = applyFilter(rows, options.filter)
    if (!filterResult.ok) return filterResult.error
    current = filterResult.rows
  } else {
    current = [...rows]
  }

  // Group + aggregate
  if (groupByCols.length > 0 || measures.length > 0) {
    current = aggregateQuery(current, groupByCols, measures)
  }

  // Order
  if (options.orderby) {
    const ordered = applyOrderBy(current, options.orderby)
    if (isAgentError(ordered)) return ordered
    current = ordered
  }

  // Limit
  if (options.limit != null && options.limit > 0) {
    current = current.slice(0, options.limit)
  }

  return {
    rows: current,
    sql: buildSql(groupByCols, measures, options.filter, options.orderby, options.limit),
    rowCount: current.length,
  }
}

function parseMeasures(measure: string): ParsedMeasure[] | AgentError {
  const parts = measure.split(',').map(s => s.trim()).filter(Boolean)
  const results: ParsedMeasure[] = []

  for (const part of parts) {
    // Match: fn(field) as alias   OR   fn(field)
    const match = part.match(/^(\w+)\(([^)]+)\)(?:\s+as\s+(\w+))?$/i)
    if (!match) {
      return agentError(
        'QUERY_INVALID_MEASURE',
        `Cannot parse measure: "${part}". Use "fn(col) as alias". Supported functions: ${SUPPORTED_OPS.join(', ')}.`
      )
    }
    const [, fnRaw, rawField, aliasRaw] = match
    const fn = fnRaw.toLowerCase() as AggOp
    if (!SUPPORTED_OPS.includes(fn)) {
      return agentError(
        'QUERY_UNSUPPORTED_FUNCTION',
        `Unsupported aggregate function: "${fn}". Supported: ${SUPPORTED_OPS.join(', ')}.`
      )
    }
    const field = rawField.trim()
    const alias = aliasRaw ?? `${fn}_${field.replace('*', 'all')}`
    results.push({ fn, field, alias })
  }

  return results
}

function applyFilter(
  rows: Record<string, unknown>[],
  filter: string
): { ok: true; rows: Record<string, unknown>[] } | { ok: false; error: AgentError } {
  // Only "col=val" simple equality is supported
  const match = filter.match(/^(\w+)\s*=\s*(.+)$/)
  if (!match) {
    return {
      ok: false,
      error: agentError(
        'QUERY_INVALID_FILTER',
        `Cannot parse filter: "${filter}". Use "column=value" (simple equality only).`
      ),
    }
  }
  const [, col, rawVal] = match
  const val = rawVal.trim()
  const numVal = Number(val)
  const filtered = rows.filter(row => {
    const cell = row[col]
    if (Number.isFinite(numVal) && Number.isFinite(Number(cell))) {
      return Number(cell) === numVal
    }
    return String(cell ?? '') === val
  })
  return { ok: true, rows: filtered }
}

function aggregateQuery(
  rows: Record<string, unknown>[],
  groupByCols: string[],
  measures: ParsedMeasure[]
): Record<string, unknown>[] {
  if (groupByCols.length === 0) {
    const out: Record<string, unknown> = {}
    for (const m of measures) {
      out[m.alias] = computeAggregate(rows, m)
    }
    return [out]
  }

  const groups = new Map<string, Record<string, unknown>[]>()
  for (const row of rows) {
    const key = JSON.stringify(groupByCols.map(c => row[c]))
    const existing = groups.get(key) ?? []
    existing.push(row)
    groups.set(key, existing)
  }

  return Array.from(groups.values()).map(groupRows => {
    const first = groupRows[0]
    const out: Record<string, unknown> = {}
    for (const col of groupByCols) {
      out[col] = first[col]
    }
    for (const m of measures) {
      out[m.alias] = computeAggregate(groupRows, m)
    }
    return out
  })
}

function computeAggregate(rows: Record<string, unknown>[], measure: ParsedMeasure): number {
  if (measure.fn === 'count') return rows.length
  const values = rows.map(r => Number(r[measure.field])).filter(v => Number.isFinite(v))
  if (values.length === 0) return 0
  if (measure.fn === 'avg') return values.reduce((s, v) => s + v, 0) / values.length
  if (measure.fn === 'min') return Math.min(...values)
  if (measure.fn === 'max') return Math.max(...values)
  return values.reduce((s, v) => s + v, 0) // sum
}

function applyOrderBy(
  rows: Record<string, unknown>[],
  orderby: string
): Record<string, unknown>[] | AgentError {
  const parts = orderby.trim().split(/\s+/)
  const col = parts[0]
  const dir = (parts[1] ?? 'desc').toLowerCase()
  if (dir !== 'asc' && dir !== 'desc') {
    return agentError('QUERY_INVALID_ORDERBY', `Invalid sort direction: "${dir}". Use "asc" or "desc".`)
  }
  const sign = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const aNum = Number(a[col])
    const bNum = Number(b[col])
    if (Number.isFinite(aNum) && Number.isFinite(bNum)) return (aNum - bNum) * sign
    return String(a[col] ?? '').localeCompare(String(b[col] ?? '')) * sign
  })
}

function buildSql(
  groupByCols: string[],
  measures: ParsedMeasure[],
  filter?: string,
  orderby?: string,
  limit?: number
): string {
  const selectParts = [
    ...groupByCols,
    ...measures.map(m => `${m.fn.toUpperCase()}(${m.field}) AS ${m.alias}`),
  ]
  let sql = `SELECT ${selectParts.length > 0 ? selectParts.join(', ') : '*'} FROM data`
  if (filter) {
    const [col, val] = filter.split('=', 2)
    sql += ` WHERE ${col.trim()} = ${val.trim()}`
  }
  if (groupByCols.length > 0) sql += ` GROUP BY ${groupByCols.join(', ')}`
  if (orderby) sql += ` ORDER BY ${orderby}`
  if (limit != null) sql += ` LIMIT ${limit}`
  return sql
}
