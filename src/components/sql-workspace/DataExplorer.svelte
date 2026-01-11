<script lang="ts">
  /**
   * Data Explorer Component
   *
   * Table explorer with file upload, schema viewing, and column stats.
   */
  import { databaseStore } from '@app/stores/database.svelte'
  import { queryWorkspaceStore } from '@app/stores/query-workspace.svelte'
  import ConnectionSelector from '@/components/connections/ConnectionSelector.svelte'
  import { createSchemaAnalyzer, type IQueryExecutor } from '@core/database'
  import type { ColumnSchema, TableSchema } from '@/types/schema'

  // Sub-components
  import { ImportSection, TableItem } from './components'

  // Pure logic functions
  import {
    filterTables,
    isFileSupported,
    createBasicColumnSchema,
    generatePreviewSQL,
    updateColumnStats
  } from './logic/data-explorer'

  // Create schema analyzer using databaseStore as query executor
  const queryExecutor: IQueryExecutor = {
    query: (sql: string) => databaseStore.executeQuery(sql),
    listTables: () => databaseStore.listTables()
  }
  const schemaAnalyzer = createSchemaAnalyzer(queryExecutor)

  // State
  let tables = $state<string[]>([])
  let expandedTable = $state<string | null>(null)
  let tableSchemas = $state<Record<string, TableSchema>>({})
  let tableRowCounts = $state<Record<string, number>>({})
  let isLoading = $state(false)
  let searchQuery = $state('')
  let hoveredColumn = $state<{ table: string; column: string } | null>(null)
  let columnStatsLoading = $state<string | null>(null)

  // Upload state
  let isUploading = $state(false)
  let uploadError = $state<string | null>(null)

  // Derived: Filtered tables based on search
  const filteredTables = $derived(filterTables(tables, searchQuery))

  // Load tables on mount and when database changes
  $effect(() => {
    if (databaseStore.state.initialized) {
      loadTables()
    }
  })

  // Reload when dataSources change (after file upload)
  $effect(() => {
    const sources = databaseStore.state.dataSources
    if (sources.length > 0) {
      loadTables()
    }
  })

  async function loadTables() {
    isLoading = true
    try {
      tables = await databaseStore.listTables()
      // Load row counts for each table
      for (const table of tables) {
        try {
          const result = await databaseStore.executeQuery(`SELECT COUNT(*) as cnt FROM ${table}`)
          if (result.data && result.data[0]) {
            tableRowCounts = { ...tableRowCounts, [table]: Number(result.data[0].cnt) }
          }
        } catch {
          // Ignore count errors
        }
      }
    } catch (e) {
      console.error('Failed to load tables:', e)
    } finally {
      isLoading = false
    }
  }

  async function uploadFiles(files: FileList) {
    uploadError = null
    isUploading = true

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      if (!isFileSupported(file.name)) {
        uploadError = `Unsupported file type: ${file.name}`
        continue
      }

      try {
        await databaseStore.loadFile(file)
        console.log(`File uploaded: ${file.name}`)
      } catch (error) {
        uploadError = error instanceof Error ? error.message : 'Upload failed'
        console.error('Upload error:', error)
      }
    }

    isUploading = false
    await loadTables()
  }

  async function removeTable(tableName: string, e: MouseEvent) {
    e.stopPropagation()
    if (confirm(`Remove table "${tableName}"?`)) {
      await databaseStore.removeDataSource(tableName)
      tables = tables.filter(t => t !== tableName)
      delete tableSchemas[tableName]
      delete tableRowCounts[tableName]
      if (expandedTable === tableName) {
        expandedTable = null
      }
    }
  }

  async function toggleTable(tableName: string) {
    if (expandedTable === tableName) {
      expandedTable = null
      return
    }

    expandedTable = tableName

    // Load enhanced schema with stats if not cached
    if (!tableSchemas[tableName]) {
      try {
        const schema = await schemaAnalyzer.getTableSchema(tableName, {
          includeStats: true,
          sampleSize: 10000,
          detectForeignKeys: true,
          includeTopValues: true,
          topValuesCount: 3
        })
        tableSchemas = { ...tableSchemas, [tableName]: schema }
        tableRowCounts = { ...tableRowCounts, [tableName]: schema.rowCount }
      } catch (e) {
        console.error('Failed to load schema:', e)
        // Fallback to basic schema
        try {
          const basicSchema = await databaseStore.getTableSchema(tableName)
          const columns: ColumnSchema[] = basicSchema.map((row: any) => createBasicColumnSchema(row))
          tableSchemas = { ...tableSchemas, [tableName]: {
            name: tableName,
            rowCount: tableRowCounts[tableName] || 0,
            columns,
            primaryKey: [],
            foreignKeys: []
          }}
        } catch {
          // Ignore fallback errors
        }
      }
    }
  }

  async function loadColumnStats(tableName: string, column: ColumnSchema) {
    if (column.stats) return

    const key = `${tableName}:${column.name}`
    if (columnStatsLoading === key) return

    columnStatsLoading = key
    try {
      const stats = await schemaAnalyzer.getColumnStats(
        tableName,
        column.name,
        column.type,
        tableSchemas[tableName]?.rowCount || 0
      )
      const schema = tableSchemas[tableName]
      if (schema) {
        tableSchemas = { ...tableSchemas, [tableName]: updateColumnStats(schema, column.name, stats) }
      }
    } catch (e) {
      console.error('Failed to load column stats:', e)
    } finally {
      columnStatsLoading = null
    }
  }

  function handleColumnHover(tableName: string, column: ColumnSchema) {
    hoveredColumn = { table: tableName, column: column.name }
    if (!column.stats) {
      loadColumnStats(tableName, column)
    }
  }

  function handleColumnLeave() {
    hoveredColumn = null
  }

  function insertTableName(tableName: string, e: MouseEvent) {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('insert-sql-text', { detail: { text: tableName } }))
  }

  function insertColumnName(columnName: string, e: MouseEvent) {
    e.stopPropagation()
    window.dispatchEvent(new CustomEvent('insert-sql-text', { detail: { text: columnName } }))
  }

  function previewTable(tableName: string, e: MouseEvent) {
    e.stopPropagation()
    queryWorkspaceStore.createTab(generatePreviewSQL(tableName))
  }

  function handleConnectionChange() {
    loadTables()
  }
</script>

<div class="data-explorer">
  <div class="connection-section">
    <ConnectionSelector onConnectionChange={handleConnectionChange} />
  </div>

  <ImportSection
    {isUploading}
    {uploadError}
    onUpload={uploadFiles}
  />

  <div class="explorer-header">
    <h3>Tables {tables.length > 0 ? `(${tables.length})` : ''}</h3>
    <button class="btn-refresh" onclick={loadTables} title="Refresh" aria-label="Refresh tables">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
      </svg>
    </button>
  </div>

  <div class="search-box">
    <input
      type="text"
      placeholder="Search tables..."
      bind:value={searchQuery}
    />
  </div>

  <div class="tables-list">
    {#if isLoading}
      <div class="loading">Loading tables...</div>
    {:else if filteredTables.length === 0}
      <div class="empty">
        {searchQuery ? 'No tables match your search' : 'No tables loaded'}
      </div>
    {:else}
      {#each filteredTables as table}
        <TableItem
          tableName={table}
          rowCount={tableRowCounts[table]}
          schema={tableSchemas[table]}
          isExpanded={expandedTable === table}
          onToggle={() => toggleTable(table)}
          onInsertTable={(e) => insertTableName(table, e)}
          onPreview={(e) => previewTable(table, e)}
          onRemove={(e) => removeTable(table, e)}
          onInsertColumn={(col, e) => insertColumnName(col, e)}
          onColumnHover={(col) => handleColumnHover(table, col)}
          onColumnLeave={handleColumnLeave}
          hoveredColumn={hoveredColumn?.table === table ? hoveredColumn.column : null}
        />
      {/each}
    {/if}
  </div>
</div>

<style>
  .data-explorer {
    display: flex;
    flex-direction: column;
    height: 100%;
    background: #111827;
    border-right: 1px solid #1F2937;
  }

  .connection-section {
    padding: 0.75rem;
    border-bottom: 1px solid #1F2937;
  }

  .explorer-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #1F2937;
  }

  .explorer-header h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9CA3AF;
  }

  .btn-refresh {
    padding: 0.25rem;
    background: none;
    border: none;
    color: #6B7280;
    cursor: pointer;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .btn-refresh:hover {
    color: #F3F4F6;
    background: #1F2937;
  }

  .search-box {
    padding: 0.5rem;
    border-bottom: 1px solid #1F2937;
  }

  .search-box input {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #F3F4F6;
    font-size: 0.8125rem;
  }

  .search-box input:focus {
    outline: none;
    border-color: #4285F4;
  }

  .search-box input::placeholder {
    color: #6B7280;
  }

  .tables-list {
    flex: 1;
    overflow-y: auto;
    padding: 0.5rem 0;
  }

  .loading, .empty {
    padding: 1rem;
    text-align: center;
    color: #6B7280;
    font-size: 0.8125rem;
  }
</style>
