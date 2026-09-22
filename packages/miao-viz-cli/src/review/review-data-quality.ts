import type { DataProfile } from '../types'

export interface ReviewDataQualitySummary {
  rows: number
  columnCount: number
  completeness: number
  nullRate: number
  highNullColumns: string[]
  flags: string[]
  outlierColumns: string[]
}

export function summarizeDataQuality(profile: DataProfile | undefined): ReviewDataQualitySummary | undefined {
  if (!profile) return undefined
  const quality = profile.quality
  const flags = profile.columns.flatMap(column => (column.qualityFlags ?? [])
    .map(flag => `${column.name}: ${flag}`)).slice(0, 8)
  const outlierColumns = profile.columns
    .filter(column => (column.outlierCount ?? 0) > 0)
    .map(column => `${column.name} (${column.outlierCount})`)
    .slice(0, 8)
  return {
    rows: profile.rows,
    columnCount: profile.columns.length,
    completeness: quality?.completeness ?? 1,
    nullRate: quality?.nullRate ?? 0,
    highNullColumns: (quality?.highNullColumns ?? []).slice(0, 8),
    flags,
    outlierColumns
  }
}
