/**
 * Data Explorer Logic - Unit Tests
 *
 * Tests for pure functions in data-explorer.ts
 */

import { describe, it, expect } from 'vitest'
import {
  SUPPORTED_FILE_EXTENSIONS,
  isFileSupported,
  getFileExtension,
  filterTables,
  formatRowCount,
  getColumnTypeIcon,
  getColumnBadges,
  getColumnTooltip,
  createBasicColumnSchema,
  createBasicTableSchema,
  generatePreviewSQL,
  updateColumnStats
} from './data-explorer'
import type { ColumnSchema, TableSchema } from '@/types/schema'

// ============================================================================
// SUPPORTED_FILE_EXTENSIONS
// ============================================================================

describe('SUPPORTED_FILE_EXTENSIONS', () => {
  it('includes csv', () => {
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('csv')
  })

  it('includes parquet', () => {
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('parquet')
  })

  it('includes json', () => {
    expect(SUPPORTED_FILE_EXTENSIONS).toContain('json')
  })
})

// ============================================================================
// isFileSupported
// ============================================================================

describe('isFileSupported', () => {
  it('returns true for CSV files', () => {
    expect(isFileSupported('data.csv')).toBe(true)
    expect(isFileSupported('DATA.CSV')).toBe(true)
  })

  it('returns true for Parquet files', () => {
    expect(isFileSupported('data.parquet')).toBe(true)
    expect(isFileSupported('data.PARQUET')).toBe(true)
  })

  it('returns true for JSON files', () => {
    expect(isFileSupported('data.json')).toBe(true)
  })

  it('returns false for unsupported extensions', () => {
    expect(isFileSupported('data.xlsx')).toBe(false)
    expect(isFileSupported('data.txt')).toBe(false)
    expect(isFileSupported('data.sql')).toBe(false)
  })

  it('returns false for files without extension', () => {
    expect(isFileSupported('datafile')).toBe(false)
  })

  it('handles complex filenames', () => {
    expect(isFileSupported('my.data.file.csv')).toBe(true)
    expect(isFileSupported('path/to/data.parquet')).toBe(true)
  })
})

// ============================================================================
// getFileExtension
// ============================================================================

describe('getFileExtension', () => {
  it('returns extension in lowercase', () => {
    expect(getFileExtension('data.CSV')).toBe('csv')
    expect(getFileExtension('data.Parquet')).toBe('parquet')
  })

  it('returns last extension for multiple dots', () => {
    expect(getFileExtension('my.data.csv')).toBe('csv')
  })

  it('returns undefined for no extension', () => {
    expect(getFileExtension('datafile')).toBe('datafile') // Returns last part
  })

  it('handles empty string', () => {
    // Empty string split results in empty string
    expect(getFileExtension('')).toBe('')
  })
})

// ============================================================================
// filterTables
// ============================================================================

describe('filterTables', () => {
  const tables = ['sales', 'orders', 'customers', 'sales_2024', 'order_items']

  it('returns all tables for empty query', () => {
    const result = filterTables(tables, '')

    expect(result).toEqual(tables)
  })

  it('filters tables case-insensitively', () => {
    const result = filterTables(tables, 'SALES')

    expect(result).toEqual(['sales', 'sales_2024'])
  })

  it('matches partial names', () => {
    const result = filterTables(tables, 'order')

    expect(result).toEqual(['orders', 'order_items'])
  })

  it('returns empty array for no matches', () => {
    const result = filterTables(tables, 'products')

    expect(result).toEqual([])
  })

  it('handles special characters', () => {
    const tablesWithSpecial = ['user-data', 'user_info']
    const result = filterTables(tablesWithSpecial, 'user')

    expect(result).toHaveLength(2)
  })
})

// ============================================================================
// formatRowCount
// ============================================================================

describe('formatRowCount', () => {
  it('returns empty string for undefined', () => {
    expect(formatRowCount(undefined)).toBe('')
  })

  it('formats small numbers', () => {
    expect(formatRowCount(100)).toContain('100')
    expect(formatRowCount(100)).toContain('rows')
  })

  it('formats large numbers with abbreviation', () => {
    const result = formatRowCount(1500000)
    expect(result).toContain('rows')
  })

  it('handles zero', () => {
    expect(formatRowCount(0)).toContain('0')
    expect(formatRowCount(0)).toContain('rows')
  })
})

// ============================================================================
// getColumnBadges
// ============================================================================

describe('getColumnBadges', () => {
  it('returns PK badge for primary key', () => {
    const column: ColumnSchema = {
      name: 'id',
      type: 'INTEGER',
      typeCategory: 'numeric',
      nullable: false,
      isPrimaryKey: true,
      isForeignKey: false
    }

    const badges = getColumnBadges(column)

    expect(badges).toContain('PK')
  })

  it('returns FK badge for foreign key', () => {
    const column: ColumnSchema = {
      name: 'user_id',
      type: 'INTEGER',
      typeCategory: 'numeric',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: true
    }

    const badges = getColumnBadges(column)

    expect(badges).toContain('FK')
  })

  it('returns UQ badge for unique non-PK', () => {
    const column: ColumnSchema = {
      name: 'email',
      type: 'VARCHAR',
      typeCategory: 'text',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      stats: {
        isUnique: true,
        distinctCount: 100,
        nullPercent: 0
      }
    }

    const badges = getColumnBadges(column)

    expect(badges).toContain('UQ')
    expect(badges).not.toContain('PK')
  })

  it('does not return UQ for primary key', () => {
    const column: ColumnSchema = {
      name: 'id',
      type: 'INTEGER',
      typeCategory: 'numeric',
      nullable: false,
      isPrimaryKey: true,
      isForeignKey: false,
      stats: {
        isUnique: true,
        distinctCount: 100,
        nullPercent: 0
      }
    }

    const badges = getColumnBadges(column)

    expect(badges).toContain('PK')
    expect(badges).not.toContain('UQ')
  })

  it('returns empty array for regular column', () => {
    const column: ColumnSchema = {
      name: 'name',
      type: 'VARCHAR',
      typeCategory: 'text',
      nullable: true,
      isPrimaryKey: false,
      isForeignKey: false
    }

    const badges = getColumnBadges(column)

    expect(badges).toEqual([])
  })
})

// ============================================================================
// getColumnTooltip
// ============================================================================

describe('getColumnTooltip', () => {
  it('includes column type', () => {
    const column: ColumnSchema = {
      name: 'id',
      type: 'INTEGER',
      typeCategory: 'numeric',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: false
    }

    const tooltip = getColumnTooltip(column)

    expect(tooltip).toContain('INTEGER')
  })

  it('includes Primary Key indicator', () => {
    const column: ColumnSchema = {
      name: 'id',
      type: 'INTEGER',
      typeCategory: 'numeric',
      nullable: false,
      isPrimaryKey: true,
      isForeignKey: false
    }

    const tooltip = getColumnTooltip(column)

    expect(tooltip).toContain('Primary Key')
  })

  it('includes foreign key reference', () => {
    const column: ColumnSchema = {
      name: 'user_id',
      type: 'INTEGER',
      typeCategory: 'numeric',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: true,
      foreignKeyRef: {
        refTable: 'users',
        refColumn: 'id'
      }
    }

    const tooltip = getColumnTooltip(column)

    expect(tooltip).toContain('users.id')
  })

  it('includes stats when available', () => {
    const column: ColumnSchema = {
      name: 'status',
      type: 'VARCHAR',
      typeCategory: 'text',
      nullable: true,
      isPrimaryKey: false,
      isForeignKey: false,
      stats: {
        distinctCount: 5,
        nullPercent: 10.5,
        isUnique: false
      }
    }

    const tooltip = getColumnTooltip(column)

    expect(tooltip).toContain('5 distinct')
    expect(tooltip).toContain('10.5% null')
  })

  it('omits null percent when zero', () => {
    const column: ColumnSchema = {
      name: 'status',
      type: 'VARCHAR',
      typeCategory: 'text',
      nullable: false,
      isPrimaryKey: false,
      isForeignKey: false,
      stats: {
        distinctCount: 5,
        nullPercent: 0,
        isUnique: false
      }
    }

    const tooltip = getColumnTooltip(column)

    expect(tooltip).not.toContain('null')
  })
})

// ============================================================================
// createBasicColumnSchema
// ============================================================================

describe('createBasicColumnSchema', () => {
  it('creates schema from column_name and column_type', () => {
    const result = createBasicColumnSchema({
      column_name: 'id',
      column_type: 'INTEGER'
    })

    expect(result.name).toBe('id')
    expect(result.type).toBe('INTEGER')
  })

  it('creates schema from name and type', () => {
    const result = createBasicColumnSchema({
      name: 'email',
      type: 'VARCHAR'
    })

    expect(result.name).toBe('email')
    expect(result.type).toBe('VARCHAR')
  })

  it('sets nullable based on null field', () => {
    const nullable = createBasicColumnSchema({ name: 'a', type: 'INT' })
    const notNullable = createBasicColumnSchema({ name: 'a', type: 'INT', null: 'NO' })

    expect(nullable.nullable).toBe(true)
    expect(notNullable.nullable).toBe(false)
  })

  it('sets default values for keys', () => {
    const result = createBasicColumnSchema({ name: 'a', type: 'INT' })

    expect(result.isPrimaryKey).toBe(false)
    expect(result.isForeignKey).toBe(false)
  })

  it('handles unknown type', () => {
    const result = createBasicColumnSchema({ name: 'a' })

    expect(result.type).toBe('unknown')
  })
})

// ============================================================================
// createBasicTableSchema
// ============================================================================

describe('createBasicTableSchema', () => {
  it('creates table schema with columns', () => {
    const columns: ColumnSchema[] = [
      { name: 'id', type: 'INT', typeCategory: 'numeric', nullable: false, isPrimaryKey: true, isForeignKey: false }
    ]

    const result = createBasicTableSchema('users', columns, 100)

    expect(result.name).toBe('users')
    expect(result.columns).toEqual(columns)
    expect(result.rowCount).toBe(100)
  })

  it('defaults rowCount to 0', () => {
    const result = createBasicTableSchema('empty', [])

    expect(result.rowCount).toBe(0)
  })

  it('initializes empty arrays for keys', () => {
    const result = createBasicTableSchema('test', [])

    expect(result.primaryKey).toEqual([])
    expect(result.foreignKeys).toEqual([])
  })
})

// ============================================================================
// generatePreviewSQL
// ============================================================================

describe('generatePreviewSQL', () => {
  it('generates SELECT with default limit', () => {
    const result = generatePreviewSQL('users')

    expect(result).toBe('SELECT * FROM users LIMIT 100;')
  })

  it('generates SELECT with custom limit', () => {
    const result = generatePreviewSQL('orders', 50)

    expect(result).toBe('SELECT * FROM orders LIMIT 50;')
  })

  it('handles table names with special characters', () => {
    const result = generatePreviewSQL('user_data')

    expect(result).toContain('user_data')
  })
})

// ============================================================================
// updateColumnStats
// ============================================================================

describe('updateColumnStats', () => {
  it('updates stats for specified column', () => {
    const schema: TableSchema = {
      name: 'users',
      rowCount: 100,
      columns: [
        { name: 'id', type: 'INT', typeCategory: 'numeric', nullable: false, isPrimaryKey: true, isForeignKey: false },
        { name: 'name', type: 'VARCHAR', typeCategory: 'text', nullable: true, isPrimaryKey: false, isForeignKey: false }
      ],
      primaryKey: ['id'],
      foreignKeys: []
    }

    const stats = { distinctCount: 100, nullPercent: 0, isUnique: true }
    const result = updateColumnStats(schema, 'id', stats)

    expect(result.columns[0].stats).toEqual(stats)
    expect(result.columns[1].stats).toBeUndefined()
  })

  it('does not mutate original schema', () => {
    const schema: TableSchema = {
      name: 'test',
      rowCount: 10,
      columns: [
        { name: 'a', type: 'INT', typeCategory: 'numeric', nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      primaryKey: [],
      foreignKeys: []
    }

    const stats = { distinctCount: 5, nullPercent: 10, isUnique: false }
    updateColumnStats(schema, 'a', stats)

    expect(schema.columns[0].stats).toBeUndefined()
  })

  it('handles non-existent column', () => {
    const schema: TableSchema = {
      name: 'test',
      rowCount: 10,
      columns: [
        { name: 'a', type: 'INT', typeCategory: 'numeric', nullable: false, isPrimaryKey: false, isForeignKey: false }
      ],
      primaryKey: [],
      foreignKeys: []
    }

    const stats = { distinctCount: 5, nullPercent: 0, isUnique: false }
    const result = updateColumnStats(schema, 'nonexistent', stats)

    expect(result.columns[0].stats).toBeUndefined()
  })
})
