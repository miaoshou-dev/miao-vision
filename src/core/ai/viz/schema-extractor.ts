export interface ExtractedSchema {
  sourceName: string
  columns: Array<{ name: string; type: string }>
  rowCount: number
  sampleData: Record<string, unknown>[]
}

export class SchemaExtractor {
  extract(name: string, data: Record<string, unknown>[]): ExtractedSchema {
    if (!data || data.length === 0) {
      return {
        sourceName: name,
        columns: [],
        rowCount: 0,
        sampleData: []
      }
    }

    // Infer column types from the first valid row
    const firstRow = data.find(row => row && typeof row === 'object')

    if (!firstRow) {
        return {
            sourceName: name,
            columns: [],
            rowCount: data.length,
            sampleData: []
        }
    }

    const columns = Object.entries(firstRow).map(([key, value]) => ({
      name: key,
      type: this.inferType(value)
    }))

    return {
      sourceName: name,
      columns,
      rowCount: data.length,
      sampleData: data.slice(0, 5)
    }
  }

  private inferType(value: unknown): string {
    if (typeof value === 'number') return 'number'
    if (value instanceof Date) return 'date'
    return 'string'
  }
}

export const schemaExtractor = new SchemaExtractor()
