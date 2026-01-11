/**
 * AI Report Data Sources Logic
 *
 * Functions for gathering data sources for AI report generation.
 */

import { databaseStore } from '@app/stores/database.svelte'
import { reportStore } from '@app/stores/report.svelte'
import type { DataSourceInfo } from '@core/ai'

/**
 * Infer column type from a value
 */
export function inferColumnType(value: unknown): string {
  if (value === null || value === undefined) return 'unknown'
  if (typeof value === 'number' || typeof value === 'bigint') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
    return 'string'
  }
  return 'unknown'
}

/**
 * Convert BigInt values to numbers for JSON serialization
 */
export function convertBigIntToNumber(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return Number(obj)
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigIntToNumber(value)
    }
    return result
  }
  return obj
}

/**
 * Gather data sources from executed SQL blocks in current report
 */
export function getSourcesFromSQLBlocks(): DataSourceInfo[] {
  const sources: DataSourceInfo[] = []
  const report = reportStore.state.currentReport

  if (report?.blocks) {
    for (let i = 0; i < report.blocks.length; i++) {
      const block = report.blocks[i]
      const sqlResult = block.sqlResult
      if (block.type === 'sql' && sqlResult) {
        const rows = sqlResult.data || []
        const columns = sqlResult.columns || (rows.length > 0 ? Object.keys(rows[0]) : [])
        const name = block.metadata?.name || `query_${i + 1}`
        if (Array.isArray(rows) && rows.length > 0) {
          sources.push({
            name,
            columns: columns.map((col: string) => ({
              name: col,
              type: inferColumnType(rows[0]?.[col])
            })),
            rowCount: rows.length,
            sample: rows.slice(0, 5)
          })
        }
      }
    }
  }

  return sources
}

/**
 * Gather data sources from DuckDB tables
 */
export async function getSourcesFromDuckDB(existingSources: DataSourceInfo[]): Promise<DataSourceInfo[]> {
  const sources: DataSourceInfo[] = []

  try {
    const db = databaseStore.getDuckDB()
    if (db) {
      const tablesResult = await db.query(
        'SELECT table_name FROM information_schema.tables WHERE table_schema = \'main\''
      )
      const tables = tablesResult.toArray().map((row: { table_name: string }) => row.table_name)

      for (const tableName of tables) {
        // Skip if already in sources
        if (existingSources.some(s => s.name === tableName)) continue

        const columnsResult = await db.query(`DESCRIBE "${tableName}"`)
        const columns = columnsResult.toArray().map((row: { column_name: string; column_type: string }) => ({
          name: row.column_name,
          type: row.column_type
        }))

        const countResult = await db.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`)
        const rawCount = countResult.toArray()[0]?.cnt
        const rowCount = typeof rawCount === 'bigint' ? Number(rawCount) : Number(rawCount || 0)

        const sampleResult = await db.query(`SELECT * FROM "${tableName}" LIMIT 5`)
        const sample = convertBigIntToNumber(sampleResult.toArray()) as Record<string, unknown>[]

        sources.push({ name: tableName, columns, rowCount, sample })
      }
    }
  } catch (error) {
    console.warn('Failed to get DuckDB tables:', error)
  }

  return sources
}

/**
 * Gather all available data sources for AI report generation
 */
export async function gatherDataSources(): Promise<DataSourceInfo[]> {
  const sqlSources = getSourcesFromSQLBlocks()
  const dbSources = await getSourcesFromDuckDB(sqlSources)
  return [...sqlSources, ...dbSources]
}
