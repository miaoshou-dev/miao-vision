<script lang="ts">
  import type { DataTableData, SortState, FilterState, ColumnFilter } from './types'
  import { processData, toggleSort } from './operations'
  import { downloadCSV, downloadExcel } from './export'
  import { drilldownService } from '@core/engine/drilldown'

  // Import sub-components
  import { TableToolbar, TableHeader, TableBody, TableFooter, EmptyState } from './components'

  // Import pure logic functions
  import {
    applyFilters,
    addOrUpdateFilter as addFilter,
    removeFilter as removeFilterFn,
    calculateRowHeight,
    calculateOverscan,
    calculateVisibleRange,
    calculateTotalHeight,
    calculateOffsetY,
    getVisibleRows,
    calculateSummaryRow,
    initializeColumnVisibility,
    toggleColumnVisibility as toggleColVisibility,
    getVisibleColumns,
    canHideColumn,
    toggleRowSelection as toggleRowSel,
    toggleSelectAll as toggleAllSel,
    clearSelection as clearSel,
    isAllSelected,
    isSomeSelected,
    startResize as startResizeFn,
    calculateResizeWidth,
    updateColumnWidth,
    getCellValue,
    buildDrilldownActionConfig,
    buildDrilldownExecuteConfig,
    buildDrilldownContext,
    type ColumnWidths
  } from './logic'

  interface Props {
    data: DataTableData
    inputStore?: any
  }

  let { data, inputStore }: Props = $props()

  // === State ===
  let searchQuery = $state('')
  let sortState = $state<SortState | null>(null)
  let scrollTop = $state(0)
  let filterState = $state<FilterState>([])
  let activeFilterColumn = $state<string | null>(null)
  let selectedRows = $state<Set<number>>(new Set())
  let columnVisibility = $state<Record<string, boolean>>({})
  let columnVisibilityInitialized = $state(false)
  let columnWidths = $state<ColumnWidths>({})
  let resizingColumn = $state<string | null>(null)
  let resizeStartX = $state(0)
  let resizeStartWidth = $state(0)

  // === Effects ===
  $effect(() => {
    if (inputStore && data.config.drilldown?.enabled) {
      drilldownService.setInputStore(inputStore)
    }
  })

  $effect(() => {
    if (typeof document === 'undefined') return

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizingColumn) return
      const newWidth = calculateResizeWidth(
        { resizingColumn, resizeStartX, resizeStartWidth },
        e.clientX
      )
      columnWidths = updateColumnWidth(columnWidths, resizingColumn, newWidth)
    }

    const handleMouseUp = () => {
      resizingColumn = null
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  })

  $effect.pre(() => {
    if (!columnVisibilityInitialized) {
      columnVisibility = initializeColumnVisibility(data.columns)
      columnVisibilityInitialized = true
    }
  })

  // === Derived State ===
  const config = $derived(data.config)
  const visibleColumns = $derived(getVisibleColumns(data.columns, columnVisibility))

  const processedData = $derived(
    processData(
      applyFilters(data.rows, filterState),
      searchQuery,
      sortState,
      data.columns.map(c => c.name)
    )
  )

  const rowHeight = $derived(calculateRowHeight(visibleColumns, config.rowHeight))
  const maxHeight = $derived(config.maxHeight || 600)
  const overscan = $derived(calculateOverscan(visibleColumns))

  const visibleRange = $derived(
    calculateVisibleRange(scrollTop, processedData.length, rowHeight, maxHeight, overscan)
  )

  const visibleRows = $derived(getVisibleRows(processedData, visibleRange))
  const totalHeight = $derived(calculateTotalHeight(processedData.length, rowHeight))
  const offsetY = $derived(calculateOffsetY(visibleRange.start, rowHeight))

  const summaryRow = $derived.by(() => {
    if (!config.summaryRow) return null
    return calculateSummaryRow(processedData, visibleColumns)
  })

  const allSelected = $derived(isAllSelected(selectedRows, processedData.length))
  const someSelected = $derived(isSomeSelected(selectedRows, processedData.length))

  const drilldownEnabled = $derived(config.drilldown?.enabled === true)
  const drilldownCursor = $derived(config.drilldown?.cursor || 'pointer')
  const drilldownHighlight = $derived(config.drilldown?.highlight !== false)
  const drilldownTooltip = $derived(config.drilldown?.tooltip || 'Click to drill down')

  // === Event Handlers ===
  function handleSearch(query: string) {
    searchQuery = query
    scrollTop = 0
  }

  function handleSort(columnName: string) {
    if (!config.sortable) return
    sortState = toggleSort(sortState, columnName)
  }

  let scrollRAF: number | null = null
  function handleScroll(event: Event) {
    const target = event.target as HTMLElement
    if (scrollRAF !== null) cancelAnimationFrame(scrollRAF)
    scrollRAF = requestAnimationFrame(() => {
      scrollTop = target.scrollTop
      scrollRAF = null
    })
  }

  function handleToggleColumnVisibility(columnName: string) {
    if (!canHideColumn(columnVisibility, columnName)) return
    columnVisibility = toggleColVisibility(columnVisibility, columnName)
  }

  function handleAddFilter(filter: ColumnFilter) {
    filterState = addFilter(filterState, filter)
    scrollTop = 0
  }

  function handleRemoveFilter(columnName: string) {
    filterState = removeFilterFn(filterState, columnName)
    scrollTop = 0
  }

  function handleClearFilters() {
    filterState = []
    scrollTop = 0
  }

  function handleToggleRowSelection(rowIndex: number) {
    selectedRows = toggleRowSel(selectedRows, rowIndex)
  }

  function handleToggleSelectAll() {
    selectedRows = toggleAllSel(selectedRows, processedData.length)
  }

  function handleClearSelection() {
    selectedRows = clearSel()
  }

  function handleStartResize(columnName: string, event: MouseEvent) {
    if (!config.resizableColumns) return
    const state = startResizeFn(columnName, event.clientX, data.columns, columnWidths)
    resizingColumn = state.resizingColumn
    resizeStartX = state.resizeStartX
    resizeStartWidth = state.resizeStartWidth
    event.preventDefault()
    event.stopPropagation()
  }

  function handleExportCSV() {
    if (!config.exportable) return
    const filename = `${config.query}_${new Date().toISOString().split('T')[0]}.csv`
    downloadCSV(processedData, visibleColumns, filename, (row, col) => getCellValue(row, col))
  }

  function handleExportExcel() {
    if (!config.exportable) return
    const filename = `${config.query}_${new Date().toISOString().split('T')[0]}.xlsx`
    downloadExcel(processedData, visibleColumns, filename, 'Data', (row, col) => getCellValue(row, col))
  }

  function handleDrilldownClick(row: Record<string, unknown>, rowIndex: number) {
    const drilldown = config.drilldown
    if (!drilldown?.enabled) return

    const actionConfig = buildDrilldownActionConfig(drilldown)
    if (!actionConfig) {
      console.warn('Drilldown setInput action requires mappings')
      return
    }

    const executeConfig = buildDrilldownExecuteConfig(drilldown, actionConfig)
    const context = buildDrilldownContext(row, rowIndex, config.query)
    drilldownService.execute(executeConfig, context)
  }
</script>

<div class="datatable-container">
  <TableToolbar
    searchable={config.searchable}
    {searchQuery}
    totalRows={data.rows.length}
    filteredRows={processedData.length}
    filterCount={filterState.length}
    selectedCount={selectedRows.size}
    selectable={config.selectable}
    exportable={config.exportable}
    columnSelector={config.columnSelector}
    filterable={config.filterable}
    columns={data.columns}
    {columnVisibility}
    onSearch={handleSearch}
    onClearFilters={handleClearFilters}
    onClearSelection={handleClearSelection}
    onExportCSV={handleExportCSV}
    onExportExcel={handleExportExcel}
    onToggleColumnVisibility={handleToggleColumnVisibility}
  />

  <div class="table-scroll" style="max-height: {maxHeight}px;" onscroll={handleScroll}>
    <div class="table-wrapper">
      <table class="datatable">
        <TableHeader
          columns={visibleColumns}
          {sortState}
          sortable={config.sortable}
          filterable={config.filterable}
          resizable={config.resizableColumns}
          selectable={config.selectable}
          {allSelected}
          {someSelected}
          {columnWidths}
          {activeFilterColumn}
          {filterState}
          onSort={handleSort}
          onToggleSelectAll={handleToggleSelectAll}
          onStartResize={handleStartResize}
          onToggleFilter={(col) => activeFilterColumn = activeFilterColumn === col ? null : col}
          onAddFilter={handleAddFilter}
          onRemoveFilter={handleRemoveFilter}
          onCloseFilter={() => activeFilterColumn = null}
        />

        <TableBody
          {visibleRows}
          allRows={processedData}
          columns={visibleColumns}
          {visibleRange}
          {rowHeight}
          {totalHeight}
          {offsetY}
          selectable={config.selectable}
          {selectedRows}
          {drilldownEnabled}
          {drilldownCursor}
          {drilldownHighlight}
          {drilldownTooltip}
          {columnWidths}
          onRowClick={handleDrilldownClick}
          onToggleRowSelection={handleToggleRowSelection}
        />

        <TableFooter
          columns={visibleColumns}
          {summaryRow}
          selectable={config.selectable}
        />
      </table>

      {#if processedData.length === 0}
        <EmptyState {searchQuery} />
      {/if}
    </div>
  </div>
</div>

<style>
  .datatable-container {
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 8px;
    margin: 2rem 0;
    overflow: hidden;
  }

  .table-scroll {
    overflow: auto;
    position: relative;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
    transform: translate3d(0, 0, 0);
    will-change: scroll-position;
  }

  .table-wrapper {
    position: relative;
    width: 100%;
  }

  .datatable {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
    table-layout: fixed;
  }

  @media (max-width: 640px) {
    .datatable {
      font-size: 0.75rem;
    }
  }
</style>
