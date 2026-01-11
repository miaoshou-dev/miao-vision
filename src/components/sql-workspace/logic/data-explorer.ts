/**
 * Data Explorer Logic
 *
 * Pure functions for table exploration and file upload.
 */

import type { ColumnSchema, TableSchema } from '@/types/schema'
import { getTypeCategory, getTypeIcon, formatRowCount as formatRowCountUtil } from '@/types/schema'

/**
 * Supported file extensions for upload
 */
export const SUPPORTED_FILE_EXTENSIONS = ['csv', 'parquet', 'json']

/**
 * Check if file extension is supported
 */
export function isFileSupported(filename: string): boolean {
  const extension = filename.split('.').pop()?.toLowerCase()
  return SUPPORTED_FILE_EXTENSIONS.includes(extension || '')
}

/**
 * Get file extension from filename
 */
export function getFileExtension(filename: string): string | undefined {
  return filename.split('.').pop()?.toLowerCase()
}

/**
 * Filter tables by search query
 */
export function filterTables(tables: string[], searchQuery: string): string[] {
  if (!searchQuery) return tables
  const query = searchQuery.toLowerCase()
  return tables.filter(t => t.toLowerCase().includes(query))
}

/**
 * Format row count for display
 */
export function formatRowCount(count: number | undefined): string {
  if (count === undefined) return ''
  return formatRowCountUtil(count) + ' rows'
}

/**
 * Get column type icon
 */
export function getColumnTypeIcon(column: ColumnSchema): string {
  return getTypeIcon(column.typeCategory)
}

/**
 * Get column badges (PK, FK, UQ)
 */
export function getColumnBadges(column: ColumnSchema): string[] {
  const badges: string[] = []
  if (column.isPrimaryKey) badges.push('PK')
  if (column.isForeignKey) badges.push('FK')
  if (column.stats?.isUnique && !column.isPrimaryKey) badges.push('UQ')
  return badges
}

/**
 * Get column tooltip text
 */
export function getColumnTooltip(column: ColumnSchema): string {
  const parts = [column.type]
  if (column.isPrimaryKey) parts.push('Primary Key')
  if (column.isForeignKey && column.foreignKeyRef) {
    parts.push(`→ ${column.foreignKeyRef.refTable}.${column.foreignKeyRef.refColumn}`)
  }
  if (column.stats) {
    parts.push(`${column.stats.distinctCount} distinct`)
    if (column.stats.nullPercent > 0) {
      parts.push(`${column.stats.nullPercent.toFixed(1)}% null`)
    }
  }
  return parts.join(' | ')
}

/**
 * Create basic column schema from raw data
 */
export function createBasicColumnSchema(row: {
  column_name?: string
  name?: string
  column_type?: string
  type?: string
  null?: string
}): ColumnSchema {
  const type = row.column_type || row.type || 'unknown'
  return {
    name: row.column_name || row.name || '',
    type,
    typeCategory: getTypeCategory(type),
    nullable: row.null !== 'NO',
    isPrimaryKey: false,
    isForeignKey: false
  }
}

/**
 * Create basic table schema
 */
export function createBasicTableSchema(
  tableName: string,
  columns: ColumnSchema[],
  rowCount: number = 0
): TableSchema {
  return {
    name: tableName,
    rowCount,
    columns,
    primaryKey: [],
    foreignKeys: []
  }
}

/**
 * Generate preview SQL for table
 */
export function generatePreviewSQL(tableName: string, limit: number = 100): string {
  return `SELECT * FROM ${tableName} LIMIT ${limit};`
}

/**
 * Update column stats in schema
 */
export function updateColumnStats(
  schema: TableSchema,
  columnName: string,
  stats: ColumnSchema['stats']
): TableSchema {
  const updatedColumns = schema.columns.map(c =>
    c.name === columnName ? { ...c, stats } : c
  )
  return { ...schema, columns: updatedColumns }
}
