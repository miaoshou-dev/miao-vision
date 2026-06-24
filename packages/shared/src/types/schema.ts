/**
 * Schema Types for Enhanced Schema Browser
 *
 * Provides comprehensive type definitions for table and column metadata
 * including statistics, constraints, and relationships.
 */

/**
 * Column statistics for numeric columns
 */
export interface NumericColumnStats {
  min: number
  max: number
  avg: number
  sum: number
  stdDev?: number
}

/**
 * Column statistics for string columns
 */
export interface StringColumnStats {
  minLength: number
  maxLength: number
  avgLength: number
  /** Sample of most common values */
  topValues?: Array<{ value: string; count: number }>
}

/**
 * Column statistics for date/time columns
 */
export interface DateColumnStats {
  min: string
  max: string
  /** Date range in days */
  rangeDays: number
}

/**
 * Common statistics for all column types
 */
export interface BaseColumnStats {
  /** Total row count in the table */
  totalRows: number
  /** Count of null values */
  nullCount: number
  /** Percentage of null values (0-100) */
  nullPercent: number
  /** Count of distinct/unique values */
  distinctCount: number
  /** Whether all values are unique */
  isUnique: boolean
}

/**
 * Combined column statistics
 */
export interface ColumnStats extends BaseColumnStats {
  /** Statistics specific to numeric columns */
  numeric?: NumericColumnStats
  /** Statistics specific to string columns */
  string?: StringColumnStats
  /** Statistics specific to date columns */
  date?: DateColumnStats
}

/**
 * Foreign key relationship information
 */
export interface ForeignKeyInfo {
  /** Column name in this table */
  column: string
  /** Referenced table name */
  refTable: string
  /** Referenced column name */
  refColumn: string
}

/**
 * Column schema with enhanced metadata
 */
export interface ColumnSchema {
  /** Column name */
  name: string
  /** SQL data type (e.g., INTEGER, VARCHAR(255)) */
  type: string
  /** Normalized type category */
  typeCategory: 'numeric' | 'string' | 'date' | 'boolean' | 'binary' | 'other'
  /** Whether column allows NULL values */
  nullable: boolean
  /** Whether column is part of primary key */
  isPrimaryKey: boolean
  /** Whether column is a foreign key */
  isForeignKey: boolean
  /** Foreign key reference if applicable */
  foreignKeyRef?: ForeignKeyInfo
  /** Default value if defined */
  defaultValue?: string
  /** Column statistics (loaded on demand) */
  stats?: ColumnStats
}

/**
 * Table schema with enhanced metadata
 */
export interface TableSchema {
  /** Table name */
  name: string
  /** Schema/database name */
  schema?: string
  /** Estimated or exact row count */
  rowCount: number
  /** Table columns */
  columns: ColumnSchema[]
  /** Primary key column names */
  primaryKey: string[]
  /** Foreign key relationships */
  foreignKeys: ForeignKeyInfo[]
  /** Estimated table size in bytes */
  sizeBytes?: number
  /** Last modified timestamp */
  lastModified?: string
  /** Table comment/description */
  comment?: string
}

/**
 * Database schema summary
 */
export interface DatabaseSummary {
  /** Total number of tables */
  tableCount: number
  /** Total number of rows across all tables */
  totalRows: number
  /** List of table names */
  tableNames: string[]
  /** Last schema refresh timestamp */
  lastRefreshed: string
}

/**
 * Schema analysis options
 */
export interface SchemaAnalysisOptions {
  /** Whether to compute column statistics */
  includeStats?: boolean
  /** Maximum rows to sample for statistics */
  sampleSize?: number
  /** Whether to detect foreign keys (heuristic) */
  detectForeignKeys?: boolean
  /** Whether to include top values for string columns */
  includeTopValues?: boolean
  /** Number of top values to include */
  topValuesCount?: number
}

/**
 * Default schema analysis options
 */
export const DEFAULT_SCHEMA_OPTIONS: SchemaAnalysisOptions = {
  includeStats: true,
  sampleSize: 10000,
  detectForeignKeys: true,
  includeTopValues: true,
  topValuesCount: 5
}

/**
 * Type category mapping for common SQL types
 */
export function getTypeCategory(sqlType: string): ColumnSchema['typeCategory'] {
  const type = sqlType.toLowerCase()

  // Numeric types
  if (
    type.includes('int') ||
    type.includes('float') ||
    type.includes('double') ||
    type.includes('decimal') ||
    type.includes('numeric') ||
    type.includes('real') ||
    type.includes('bigint') ||
    type.includes('smallint') ||
    type.includes('tinyint')
  ) {
    return 'numeric'
  }

  // Date/time types
  if (
    type.includes('date') ||
    type.includes('time') ||
    type.includes('timestamp') ||
    type.includes('interval')
  ) {
    return 'date'
  }

  // Boolean types
  if (type.includes('bool') || type.includes('boolean')) {
    return 'boolean'
  }

  // Binary types
  if (type.includes('blob') || type.includes('binary') || type.includes('bytea')) {
    return 'binary'
  }

  // String types (default for varchar, text, char, etc.)
  if (
    type.includes('varchar') ||
    type.includes('text') ||
    type.includes('char') ||
    type.includes('string') ||
    type.includes('uuid')
  ) {
    return 'string'
  }

  return 'other'
}

/**
 * Format type icon for display
 */
export function getTypeIcon(typeCategory: ColumnSchema['typeCategory']): string {
  switch (typeCategory) {
    case 'numeric':
      return '#'
    case 'string':
      return 'T'
    case 'date':
      return 'D'
    case 'boolean':
      return 'B'
    case 'binary':
      return '~'
    default:
      return '?'
  }
}

/**
 * Format row count for display
 */
export function formatRowCount(count: number): string {
  if (count >= 1_000_000_000) {
    return `${(count / 1_000_000_000).toFixed(1)}B`
  }
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(1)}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(1)}K`
  }
  return count.toString()
}

/**
 * Format bytes for display
 */
export function formatBytes(bytes: number): string {
  if (bytes >= 1_073_741_824) {
    return `${(bytes / 1_073_741_824).toFixed(1)} GB`
  }
  if (bytes >= 1_048_576) {
    return `${(bytes / 1_048_576).toFixed(1)} MB`
  }
  if (bytes >= 1_024) {
    return `${(bytes / 1_024).toFixed(1)} KB`
  }
  return `${bytes} B`
}
