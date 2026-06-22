import type { AgentColumnType, ColumnProfile, DataProfile, LoadedDataset } from './types'

export function profileDataset(dataset: LoadedDataset): DataProfile {
  return {
    file: dataset.file,
    rows: dataset.rows.length,
    sheet: dataset.sheet,
    columns: dataset.columns.map(column => profileColumn(column, dataset.rows))
  }
}

function profileColumn(name: string, rows: Record<string, unknown>[]): ColumnProfile {
  const values = rows.map(row => row[name])
  const nonNullValues = values.filter(value => value !== null && value !== undefined && value !== '')
  const type = inferColumnType(nonNullValues)
  const distinctValues = new Set(nonNullValues.map(value => normalizeDistinctValue(value)))
  const samples = Array.from(distinctValues).slice(0, 5)
  const nullRate = rows.length === 0 ? 0 : (values.length - nonNullValues.length) / rows.length

  const profile: ColumnProfile = {
    name,
    type,
    nullRate: round(nullRate),
    samples,
    distinctCount: distinctValues.size
  }

  if (type === 'number') {
    const numericValues = nonNullValues.map(Number).filter(value => !Number.isNaN(value))
    if (numericValues.length > 0) {
      profile.min = Math.min(...numericValues)
      profile.max = Math.max(...numericValues)
    }
  }

  return profile
}

function inferColumnType(values: unknown[]): AgentColumnType {
  if (values.length === 0) return 'unknown'

  const scores: Record<AgentColumnType, number> = {
    string: 0,
    number: 0,
    boolean: 0,
    date: 0,
    unknown: 0
  }

  for (const value of values.slice(0, 100)) {
    scores[inferValueType(value)] += 1
  }

  const entries = Object.entries(scores) as Array<[AgentColumnType, number]>
  entries.sort((a, b) => b[1] - a[1])
  return entries[0][1] === 0 ? 'unknown' : entries[0][0]
}

function inferValueType(value: unknown): AgentColumnType {
  if (typeof value === 'number' && Number.isFinite(value)) return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (value instanceof Date && !Number.isNaN(value.getTime())) return 'date'

  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (trimmed === '') return 'unknown'
    if (!Number.isNaN(Number(trimmed))) return 'number'
    if (trimmed.toLowerCase() === 'true' || trimmed.toLowerCase() === 'false') return 'boolean'
    if (looksLikeDate(trimmed)) return 'date'
    return 'string'
  }

  return 'unknown'
}

function looksLikeDate(value: string): boolean {
  if (!/^\d{4}[-/]\d{1,2}([-/]\d{1,2})?/.test(value)) return false
  const date = new Date(value)
  return !Number.isNaN(date.getTime())
}

function normalizeDistinctValue(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString()
  return value
}

function round(value: number): number {
  return Math.round(value * 10000) / 10000
}
