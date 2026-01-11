<script lang="ts">
  import type { FilterState, ColumnDef } from '../types'

  interface Props {
    searchable: boolean
    searchQuery: string
    totalRows: number
    filteredRows: number
    filterCount: number
    selectedCount: number
    selectable: boolean
    exportable: boolean
    columnSelector: boolean
    filterable: boolean
    columns: ColumnDef[]
    columnVisibility: Record<string, boolean>
    onSearch: (query: string) => void
    onClearFilters: () => void
    onClearSelection: () => void
    onExportCSV: () => void
    onExportExcel: () => void
    onToggleColumnVisibility: (columnName: string) => void
  }

  let {
    searchable,
    searchQuery,
    totalRows,
    filteredRows,
    filterCount,
    selectedCount,
    selectable,
    exportable,
    columnSelector,
    filterable,
    columns,
    columnVisibility,
    onSearch,
    onClearFilters,
    onClearSelection,
    onExportCSV,
    onExportExcel,
    onToggleColumnVisibility
  }: Props = $props()

  let showExportMenu = $state(false)
  let showColumnSelector = $state(false)

  function handleSearch(event: Event) {
    const target = event.target as HTMLInputElement
    onSearch(target.value)
  }

  function toggleExportMenu() {
    showExportMenu = !showExportMenu
  }

  function toggleColumnSelector() {
    showColumnSelector = !showColumnSelector
  }

  function handleExportCSV() {
    onExportCSV()
    showExportMenu = false
  }

  function handleExportExcel() {
    onExportExcel()
    showExportMenu = false
  }

  let visibleColumnCount = $derived(
    Object.values(columnVisibility).filter(v => v).length
  )
</script>

<div class="datatable-toolbar">
  {#if searchable}
    <div class="search-box">
      <input
        type="text"
        placeholder="Search..."
        value={searchQuery}
        oninput={handleSearch}
        class="search-input"
      />
      <span class="search-icon">🔍</span>
    </div>
  {/if}

  <div class="stats">
    {filteredRows} {filteredRows === 1 ? 'row' : 'rows'}
    {#if searchQuery || filterCount > 0}
      <span class="filter-hint">(filtered from {totalRows})</span>
    {/if}
    {#if filterCount > 0}
      <span class="filter-badge">{filterCount} {filterCount === 1 ? 'filter' : 'filters'}</span>
    {/if}
    {#if selectable && selectedCount > 0}
      <span class="selection-badge">{selectedCount} selected</span>
    {/if}
  </div>

  {#if filterable && filterCount > 0}
    <button class="clear-filters-btn" onclick={onClearFilters}>
      Clear Filters
    </button>
  {/if}

  {#if selectable && selectedCount > 0}
    <button class="clear-selection-btn" onclick={onClearSelection}>
      Clear Selection
    </button>
  {/if}

  {#if exportable}
    <div class="export-wrapper">
      <button class="export-btn" onclick={toggleExportMenu}>
        📥 Export
      </button>
      {#if showExportMenu}
        <div class="export-dropdown">
          <button class="export-option" onclick={handleExportCSV}>
            📄 CSV
          </button>
          <button class="export-option" onclick={handleExportExcel}>
            📊 Excel
          </button>
        </div>
      {/if}
    </div>
  {/if}

  {#if columnSelector}
    <div class="column-selector-wrapper">
      <button class="column-selector-btn" onclick={toggleColumnSelector}>
        ⚙️ Columns
      </button>

      {#if showColumnSelector}
        <div class="column-selector-dropdown">
          <div class="dropdown-header">Show/Hide Columns</div>
          <div class="column-list">
            {#each columns as column}
              <label class="column-item">
                <input
                  type="checkbox"
                  checked={columnVisibility[column.name]}
                  onchange={() => onToggleColumnVisibility(column.name)}
                  disabled={visibleColumnCount === 1 && columnVisibility[column.name]}
                />
                <span>{column.label || column.name}</span>
              </label>
            {/each}
          </div>
        </div>
      {/if}
    </div>
  {/if}
</div>

<style>
  .datatable-toolbar {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #4B5563;
    background: #111827;
  }

  .search-box {
    position: relative;
    flex: 1;
    max-width: 300px;
  }

  .search-input {
    width: 100%;
    padding: 0.5rem 2rem 0.5rem 0.75rem;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    font-size: 0.875rem;
    background: #1F2937;
    color: #F3F4F6;
  }

  .search-input::placeholder {
    color: #9CA3AF;
  }

  .search-input:focus {
    outline: none;
    border-color: #3B82F6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }

  .search-icon {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    opacity: 0.5;
    pointer-events: none;
  }

  .stats {
    flex: 1;
    font-size: 0.875rem;
    color: #D1D5DB;
  }

  .filter-hint {
    opacity: 0.7;
    margin-left: 0.25rem;
  }

  .filter-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    margin-left: 0.5rem;
    background: #3B82F6;
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .selection-badge {
    display: inline-block;
    padding: 0.125rem 0.5rem;
    margin-left: 0.5rem;
    background: #10B981;
    color: white;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .clear-filters-btn,
  .clear-selection-btn {
    padding: 0.5rem 1rem;
    background: #6B7280;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .clear-filters-btn:hover,
  .clear-selection-btn:hover {
    background: #4B5563;
  }

  .export-wrapper {
    position: relative;
  }

  .export-btn {
    padding: 0.5rem 1rem;
    background: #3B82F6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .export-btn:hover {
    background: #2563EB;
  }

  .export-dropdown {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 6px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    z-index: 20;
    min-width: 120px;
    overflow: hidden;
  }

  .export-option {
    display: block;
    width: 100%;
    padding: 0.5rem 1rem;
    text-align: left;
    background: transparent;
    border: none;
    color: #F3F4F6;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s;
  }

  .export-option:hover {
    background: #374151;
  }

  .export-option:first-child {
    border-bottom: 1px solid #4B5563;
  }

  .column-selector-wrapper {
    position: relative;
  }

  .column-selector-btn {
    padding: 0.5rem 1rem;
    background: #6B7280;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .column-selector-btn:hover {
    background: #4B5563;
  }

  .column-selector-dropdown {
    position: absolute;
    right: 0;
    top: 100%;
    margin-top: 0.5rem;
    background: #1F2937;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 10;
    min-width: 200px;
  }

  .dropdown-header {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #E5E7EB;
    font-weight: 600;
    font-size: 0.875rem;
    color: #F3F4F6;
  }

  .column-list {
    padding: 0.5rem;
    max-height: 300px;
    overflow-y: auto;
  }

  .column-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    cursor: pointer;
    border-radius: 4px;
    transition: background 0.2s;
    font-size: 0.875rem;
  }

  .column-item:hover {
    background: #374151;
  }

  @media (max-width: 640px) {
    .datatable-toolbar {
      flex-wrap: wrap;
    }

    .search-box {
      max-width: 100%;
      order: -1;
      flex-basis: 100%;
    }
  }
</style>
