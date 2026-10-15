import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { agentError, ok } from './errors'
import type { AgentResult, LoadedDataset } from './types'

interface LoadOptions {
  sheet?: string
  limit?: number
  fieldMap?: Record<string, string>
  projectDates?: boolean
}

export function loadDataset(filePath: string, options: LoadOptions = {}): AgentResult<LoadedDataset> {
  const absolutePath = resolve(filePath)
  if (!existsSync(absolutePath)) {
    return agentError('FILE_NOT_FOUND', `File not found: ${filePath}`, { file: filePath })
  }

  const ext = extname(absolutePath).toLowerCase()

  try {
    if (ext === '.csv' || ext === '.tsv') {
      const delimiter = ext === '.tsv' ? '\t' : ','
      const text = readFileSync(absolutePath, 'utf8')
      return ok(createDataset(absolutePath, applyFieldMap(parseDelimited(text, delimiter), options.fieldMap), options.limit))
    }

    if (ext === '.json') {
      const parsed = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown
      if (!Array.isArray(parsed)) {
        return agentError('INVALID_JSON_SHAPE', 'JSON input must be an array of objects.', { file: filePath })
      }
      return ok(createDataset(absolutePath, applyFieldMap(normalizeRows(parsed), options.fieldMap), options.limit))
    }

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(absolutePath, { cellNF: options.projectDates === true })
      const sheetName = options.sheet ?? workbook.SheetNames[0]
      if (!sheetName || !workbook.Sheets[sheetName]) {
        return agentError('SHEET_NOT_FOUND', `Sheet not found: ${options.sheet ?? '(first sheet)'}`, {
          file: filePath,
          availableSheets: workbook.SheetNames
        })
      }
      if (options.projectDates) {
        for (const [address, cell] of Object.entries(workbook.Sheets[sheetName])) {
          if (address.startsWith('!') || cell.t !== 'n' || !cell.z || !XLSX.SSF.is_date(cell.z)) continue
          const parsed = XLSX.SSF.parse_date_code(cell.v, { date1904: workbook.Workbook?.WBProps?.date1904 })
          if (parsed) { cell.t = 's'; cell.v = `${String(parsed.y).padStart(4, '0')}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`; delete cell.w }
        }
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
        defval: null
      })
      return ok({ ...createDataset(absolutePath, applyFieldMap(rows, options.fieldMap), options.limit), sheet: sheetName })
    }

    return agentError('UNSUPPORTED_FILE_TYPE', `Unsupported file type: ${ext || '(none)'}`, {
      file: filePath,
      supportedTypes: ['.csv', '.tsv', '.xlsx', '.xls', '.json']
    })
  } catch (error) {
    return agentError('DATA_LOAD_FAILED', error instanceof Error ? error.message : 'Failed to load dataset.', {
      file: filePath
    })
  }
}

export function loadDatasets(filePaths: string[], options: LoadOptions = {}): AgentResult<LoadedDataset> {
  if (!filePaths.length) return agentError('MISSING_INPUT', 'At least one input file is required.')
  const loaded: LoadedDataset[] = []
  for (const file of filePaths) {
    const result = loadDataset(file, { ...options, limit: undefined })
    if (!result.ok) return agentError('MULTI_FILE_LOAD_FAILED', `Could not load '${file}'.`, { file, cause: result })
    loaded.push(result.value)
  }
  const expected = loaded[0].columns
  const expectedTypes = columnTypes(loaded[0].rows, expected)
  const issues = loaded.slice(1).flatMap(dataset => {
    const columnsMatch = sameSet(expected, dataset.columns)
    const actualTypes = columnTypes(dataset.rows, dataset.columns)
    const typeMismatches = expected.filter(column =>
      actualTypes[column] && expectedTypes[column] && actualTypes[column] !== expectedTypes[column]
    )
    return columnsMatch && !typeMismatches.length ? [] : [{
      file: dataset.file,
      missing: expected.filter(column => !dataset.columns.includes(column)),
      extra: dataset.columns.filter(column => !expected.includes(column)),
      typeMismatches: typeMismatches.map(column => ({
        field: column, expected: expectedTypes[column], actual: actualTypes[column]
      }))
    }]
  })
  if (issues.length) {
    return agentError('MULTI_FILE_SCHEMA_MISMATCH', 'Input files are not schema-compatible after field mapping.', {
      referenceFile: loaded[0].file, issues
    })
  }
  const rows = loaded.flatMap(dataset => dataset.rows)
  return ok({
    file: loaded.map(dataset => dataset.file).join(','),
    rows: typeof options.limit === 'number' ? rows.slice(0, options.limit) : rows,
    columns: expected,
    ...(options.sheet ? { sheet: options.sheet } : {})
  })
}

function createDataset(file: string, rows: Record<string, unknown>[], limit?: number): LoadedDataset {
  const limitedRows = typeof limit === 'number' && limit >= 0 ? rows.slice(0, limit) : rows
  const columns = collectColumns(limitedRows)
  return { file, rows: limitedRows, columns }
}

function collectColumns(rows: Record<string, unknown>[]): string[] {
  const columns = new Set<string>()
  for (const row of rows) {
    for (const key of Object.keys(row)) {
      columns.add(key)
    }
  }
  return Array.from(columns)
}

function normalizeRows(values: unknown[]): Record<string, unknown>[] {
  return values.map((value, index) => {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>
    }
    return { index, value }
  })
}

function parseDelimited(text: string, delimiter: string): Record<string, unknown>[] {
  const records = parseDelimitedRecords(text, delimiter).filter(row => row.some(cell => cell.length > 0))
  if (records.length === 0) return []

  const headers = records[0].map((header, index) => header.trim() || `column_${index + 1}`)
  return records.slice(1).map(record => {
    const row: Record<string, unknown> = {}
    headers.forEach((header, index) => {
      row[header] = coerceCell(record[index] ?? '')
    })
    return row
  })
}

function parseDelimitedRecords(text: string, delimiter: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === delimiter && !inQuotes) {
      row.push(cell)
      cell = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }

  row.push(cell)
  rows.push(row)
  return rows
}

function coerceCell(value: string): unknown {
  const trimmed = value.trim()
  if (trimmed === '') return null
  if (trimmed.toLowerCase() === 'true') return true
  if (trimmed.toLowerCase() === 'false') return false
  const numeric = Number(trimmed)
  if (!Number.isNaN(numeric) && trimmed !== '') return numeric
  return trimmed
}

function applyFieldMap(rows: Record<string, unknown>[], fieldMap?: Record<string, string>): Record<string, unknown>[] {
  if (!fieldMap) return rows
  return rows.map(row => {
    const mapped: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(row)) {
      const target = fieldMap[key] ?? key
      if (target in mapped && target !== key) {
        throw new Error(`Field mapping creates duplicate target '${target}'.`)
      }
      mapped[target] = value
    }
    return mapped
  })
}

function sameSet(left: string[], right: string[]): boolean {
  return left.length === right.length && left.every(value => right.includes(value))
}

function columnTypes(rows: Record<string, unknown>[], columns: string[]): Record<string, string> {
  return Object.fromEntries(columns.map(column => {
    const value = rows.map(row => row[column]).find(item => item !== null && item !== undefined)
    const type = value instanceof Date ? 'date' : typeof value
    return [column, type]
  }))
}
