/**
 * DataTable Component Definition (Adapter Layer)
 *
 * Declarative component definition using the new adapter layer.
 */

import { defineComponent, DataTableSchema } from '@core/registry'
import { DataTableMetadata } from './metadata'
import DataTable from './DataTable.svelte'
import { inferColumnType } from './formatter'
import type {
  DataTableConfig,
  DataTableData,
  ColumnConfig,
  ColumnMeta,
  FormatType
} from './types'

/**
 * Props passed to DataTable.svelte
 */
interface DataTableProps {
  data: DataTableData
}

/**
 * Map column type to default format
 */
function typeToFormat(type: ColumnMeta['type']): FormatType {
  switch (type) {
    case 'number':
      return 'number'
    case 'date':
      return 'date'
    case 'boolean':
      return 'text'
    default:
      return 'text'
  }
}

/**
 * Auto-detect column metadata from data
 */
function detectColumnMetadata(data: any[], columns: string[]): ColumnMeta[] {
  return columns.map(colName => {
    const values = data.map(row => row[colName])
    const type = inferColumnType(values)
    const sample = values.filter(v => v !== null && v !== undefined).slice(0, 5)

    return {
      name: colName,
      type,
      sample
    }
  })
}

/**
 * Merge user-defined columns with auto-detected metadata
 */
function mergeColumnConfig(
  userColumns: ColumnConfig[] | undefined,
  metadata: ColumnMeta[]
): ColumnConfig[] {
  if (!userColumns || userColumns.length === 0) {
    return metadata.map(meta => ({
      name: meta.name,
      label: meta.name,
      format: typeToFormat(meta.type),
      align: meta.type === 'number' ? 'right' : 'left'
    }))
  }

  const columnMap = new Map(userColumns.map(col => [col.name, col]))

  return metadata.map(meta => {
    const userCol = columnMap.get(meta.name)

    return {
      name: meta.name,
      label: userCol?.label || meta.name,
      format: userCol?.format || typeToFormat(meta.type),
      align: userCol?.align || (meta.type === 'number' ? 'right' : 'left'),
      width: userCol?.width,
      visible: userCol?.visible,
      resizable: userCol?.resizable,
      summary: userCol?.summary,
      conditionalFormat: userCol?.conditionalFormat,
      showDataBar: userCol?.showDataBar,
      colorScale: userCol?.colorScale,
      iconSet: userCol?.iconSet,
      // NEW: Advanced column features
      contentType: userCol?.contentType,
      imageConfig: userCol?.imageConfig,
      frozen: userCol?.frozen
    }
  })
}

/**
 * DataTable component registration using adapter layer
 */
export const dataTableRegistration = defineComponent<DataTableConfig, DataTableProps>({
  metadata: DataTableMetadata,
  configSchema: DataTableSchema,
  component: DataTable,
  containerClass: 'datatable-wrapper',

  // Data binding: extract table data from SQL query result
  dataBinding: {
    sourceField: 'query',
    transform: (queryResult, config) => {
      const { columns, data } = queryResult

      // Auto-detect column metadata
      const metadata = detectColumnMetadata(data, columns)

      // Merge with user-defined column config
      const finalColumns = mergeColumnConfig(config.columns, metadata)

      return {
        columns: finalColumns,
        rows: data,
        metadata
      }
    }
  },

  // Build props
  buildProps: (config, extractedData) => {
    if (!extractedData) return null

    const { columns, rows } = extractedData as {
      columns: ColumnConfig[]
      rows: any[]
      metadata: ColumnMeta[]
    }

    return {
      data: {
        config: {
          ...config
        },
        columns,
        rows,
        filteredRows: rows,
        sortState: null,
        searchQuery: ''
      }
    }
  }
})

export default dataTableRegistration
