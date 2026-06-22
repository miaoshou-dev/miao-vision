import { existsSync, readFileSync } from 'node:fs'
import { extname, resolve } from 'node:path'
import * as XLSX from 'xlsx'
import { agentError, ok } from './errors'
import type { AgentResult, LoadedDataset } from './types'

interface LoadOptions {
  sheet?: string
  limit?: number
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
      return ok(createDataset(absolutePath, parseDelimited(text, delimiter), options.limit))
    }

    if (ext === '.json') {
      const parsed = JSON.parse(readFileSync(absolutePath, 'utf8')) as unknown
      if (!Array.isArray(parsed)) {
        return agentError('INVALID_JSON_SHAPE', 'JSON input must be an array of objects.', { file: filePath })
      }
      return ok(createDataset(absolutePath, normalizeRows(parsed), options.limit))
    }

    if (ext === '.xlsx' || ext === '.xls') {
      const workbook = XLSX.readFile(absolutePath)
      const sheetName = options.sheet ?? workbook.SheetNames[0]
      if (!sheetName || !workbook.Sheets[sheetName]) {
        return agentError('SHEET_NOT_FOUND', `Sheet not found: ${options.sheet ?? '(first sheet)'}`, {
          file: filePath,
          availableSheets: workbook.SheetNames
        })
      }
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[sheetName], {
        defval: null
      })
      return ok({ ...createDataset(absolutePath, rows, options.limit), sheet: sheetName })
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
