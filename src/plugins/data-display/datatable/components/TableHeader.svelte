<script lang="ts">
  import type { ColumnDef, SortState, ColumnFilter, FilterOperator } from '../types'
  import { getSortIcon } from '../operations'
  import { getColumnWidth, getFrozenOffset } from '../logic'
  import type { ColumnWidths } from '../logic'

  interface Props {
    columns: ColumnDef[]
    sortState: SortState | null
    sortable: boolean
    filterable: boolean
    resizable: boolean
    selectable: boolean
    allSelected: boolean
    someSelected: boolean
    columnWidths: ColumnWidths
    activeFilterColumn: string | null
    filterState: ColumnFilter[]
    onSort: (columnName: string) => void
    onToggleSelectAll: () => void
    onStartResize: (columnName: string, event: MouseEvent) => void
    onToggleFilter: (columnName: string) => void
    onAddFilter: (filter: ColumnFilter) => void
    onRemoveFilter: (columnName: string) => void
    onCloseFilter: () => void
  }

  let {
    columns,
    sortState,
    sortable,
    filterable,
    resizable,
    selectable,
    allSelected,
    someSelected,
    columnWidths,
    activeFilterColumn,
    filterState,
    onSort,
    onToggleSelectAll,
    onStartResize,
    onToggleFilter,
    onAddFilter,
    onRemoveFilter,
    onCloseFilter
  }: Props = $props()

  function getActiveFilter(columnName: string): ColumnFilter | undefined {
    return filterState.find(f => f.column === columnName)
  }

  function handleFilterChange(column: ColumnDef, operator: FilterOperator, value: string) {
    if (value) {
      onAddFilter({ column: column.name, operator, value })
    }
  }
</script>

<thead>
  <tr>
    {#if selectable}
      <th class="header-cell select-cell" style="width: 50px;">
        <input
          type="checkbox"
          checked={allSelected}
          indeterminate={someSelected}
          onchange={onToggleSelectAll}
          class="select-checkbox"
        />
      </th>
    {/if}

    {#each columns as column}
      {@const frozenOffset = getFrozenOffset(column, columns, columnWidths, selectable)}
      <th
        class="header-cell"
        class:sortable
        class:sorted={sortState?.column === column.name}
        class:filtered={getActiveFilter(column.name)}
        class:resizable
        class:frozen-left={column.frozen === 'left'}
        class:frozen-right={column.frozen === 'right'}
        style:text-align={column.align || 'left'}
        style:width={getColumnWidth(column, columnWidths)}
        style:left={column.frozen === 'left' ? `${frozenOffset}px` : undefined}
        style:right={column.frozen === 'right' ? `${frozenOffset}px` : undefined}
      >
        <div class="header-content">
          <button
            type="button"
            class="header-label"
            class:clickable={sortable}
            onclick={() => onSort(column.name)}
            disabled={!sortable}
          >
            {column.label || column.name}
          </button>
          <div class="header-icons">
            {#if sortable}
              <button type="button" class="sort-icon" onclick={() => onSort(column.name)} aria-label="Sort">
                {getSortIcon(column.name, sortState)}
              </button>
            {/if}
            {#if filterable}
              <button
                type="button"
                class="filter-icon"
                class:active={getActiveFilter(column.name)}
                onclick={() => onToggleFilter(column.name)}
                aria-label="Filter"
              >
                🔽
              </button>
            {/if}
          </div>
        </div>

        {#if filterable && activeFilterColumn === column.name}
          <div
            class="filter-dropdown"
            onclick={(e) => e.stopPropagation()}
            onkeydown={(e) => e.stopPropagation()}
            role="dialog"
            aria-label="Filter options"
            tabindex="-1"
          >
            {#if column.format === 'number' || column.format === 'currency' || column.format === 'percent'}
              <div class="filter-content">
                <div class="filter-header">Filter: {column.label || column.name}</div>
                <select class="filter-operator" value={getActiveFilter(column.name)?.operator || 'greater_than'}>
                  <option value="greater_than">Greater than</option>
                  <option value="less_than">Less than</option>
                  <option value="between">Between</option>
                  <option value="equals">Equals</option>
                </select>
                <input
                  type="number"
                  class="filter-input"
                  placeholder="Value"
                  value={getActiveFilter(column.name)?.value || ''}
                  oninput={(e) => {
                    const val = (e.target as HTMLInputElement).value
                    if (val) {
                      const operator = getActiveFilter(column.name)?.operator || 'greater_than'
                      onAddFilter({ column: column.name, operator, value: val })
                    }
                  }}
                />
                <div class="filter-actions">
                  <button class="filter-apply-btn" onclick={onCloseFilter}>Apply</button>
                  <button class="filter-clear-btn" onclick={() => { onRemoveFilter(column.name); onCloseFilter() }}>Clear</button>
                </div>
              </div>
            {:else if column.format === 'date'}
              <div class="filter-content">
                <div class="filter-header">Filter: {column.label || column.name}</div>
                <select class="filter-operator" value={getActiveFilter(column.name)?.operator || 'after'}>
                  <option value="after">After</option>
                  <option value="before">Before</option>
                  <option value="date_between">Between</option>
                  <option value="equals">On date</option>
                </select>
                <input
                  type="date"
                  class="filter-input"
                  placeholder="Date"
                  value={getActiveFilter(column.name)?.value || ''}
                  oninput={(e) => {
                    const val = (e.target as HTMLInputElement).value
                    if (val) {
                      const operator = getActiveFilter(column.name)?.operator || 'after'
                      onAddFilter({ column: column.name, operator, value: val })
                    }
                  }}
                />
                <div class="filter-actions">
                  <button class="filter-apply-btn" onclick={onCloseFilter}>Apply</button>
                  <button class="filter-clear-btn" onclick={() => { onRemoveFilter(column.name); onCloseFilter() }}>Clear</button>
                </div>
              </div>
            {:else}
              <div class="filter-content">
                <div class="filter-header">Filter: {column.label || column.name}</div>
                <select class="filter-operator" value={getActiveFilter(column.name)?.operator || 'contains'}>
                  <option value="contains">Contains</option>
                  <option value="not_contains">Does not contain</option>
                  <option value="equals">Equals</option>
                  <option value="not_equals">Not equals</option>
                </select>
                <input
                  type="text"
                  class="filter-input"
                  placeholder="Search text..."
                  value={getActiveFilter(column.name)?.value || ''}
                  oninput={(e) => {
                    const val = (e.target as HTMLInputElement).value
                    if (val) {
                      const operator = getActiveFilter(column.name)?.operator || 'contains'
                      onAddFilter({ column: column.name, operator, value: val })
                    }
                  }}
                />
                <div class="filter-actions">
                  <button class="filter-apply-btn" onclick={onCloseFilter}>Apply</button>
                  <button class="filter-clear-btn" onclick={() => { onRemoveFilter(column.name); onCloseFilter() }}>Clear</button>
                </div>
              </div>
            {/if}
          </div>
        {/if}

        {#if resizable}
          <div
            class="resize-handle"
            onmousedown={(e) => onStartResize(column.name, e)}
            role="separator"
            aria-label="Resize column"
          ></div>
        {/if}
      </th>
    {/each}
  </tr>
</thead>

<style>
  thead {
    position: sticky;
    top: 0;
    z-index: 10;
    background: #374151;
  }

  .header-cell {
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: #F3F4F6;
    border-bottom: 2px solid #E5E7EB;
    white-space: nowrap;
    background: #374151;
  }

  .header-cell.sortable {
    cursor: pointer;
    user-select: none;
  }

  .header-cell.sortable:hover {
    background: #4B5563;
  }

  .header-cell.sorted {
    background: #4B5563;
    color: #60A5FA;
  }

  .header-cell.filtered {
    background: #FEF3C7;
    color: #92400E;
  }

  .header-content {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: space-between;
    position: relative;
  }

  .header-label {
    flex: 1;
    background: none;
    border: none;
    color: inherit;
    font: inherit;
    text-align: inherit;
    padding: 0;
  }

  .header-label.clickable {
    cursor: pointer;
    user-select: none;
  }

  .header-icons {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }

  .sort-icon {
    opacity: 0.5;
    font-size: 0.75rem;
    cursor: pointer;
    background: none;
    border: none;
    color: inherit;
    padding: 0;
  }

  .header-cell.sorted .sort-icon {
    opacity: 1;
  }

  .filter-icon {
    opacity: 0.4;
    font-size: 0.625rem;
    cursor: pointer;
    transition: opacity 0.2s;
    background: none;
    border: none;
    padding: 0;
  }

  .filter-icon:hover {
    opacity: 0.8;
  }

  .filter-icon.active {
    opacity: 1;
    color: #F59E0B;
  }

  .select-cell {
    text-align: center;
    padding: 0.5rem;
  }

  .select-checkbox {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  /* Filter dropdown styles */
  .filter-dropdown {
    position: absolute;
    top: 100%;
    left: 0;
    margin-top: 0.5rem;
    background: #1F2937;
    border: 1px solid #D1D5DB;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    z-index: 20;
    min-width: 250px;
  }

  .filter-content {
    padding: 1rem;
  }

  .filter-header {
    font-weight: 600;
    font-size: 0.875rem;
    color: #F3F4F6;
    margin-bottom: 0.75rem;
  }

  .filter-operator {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    font-size: 0.875rem;
    margin-bottom: 0.5rem;
    background: #111827;
    color: #F3F4F6;
  }

  .filter-input {
    width: 100%;
    padding: 0.5rem;
    border: 1px solid #D1D5DB;
    border-radius: 6px;
    font-size: 0.875rem;
    margin-bottom: 0.75rem;
    background: #111827;
    color: #F3F4F6;
  }

  .filter-actions {
    display: flex;
    gap: 0.5rem;
  }

  .filter-apply-btn {
    flex: 1;
    padding: 0.5rem;
    background: #3B82F6;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .filter-apply-btn:hover {
    background: #2563EB;
  }

  .filter-clear-btn {
    flex: 1;
    padding: 0.5rem;
    background: #6B7280;
    color: white;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
  }

  .filter-clear-btn:hover {
    background: #4B5563;
  }

  /* Resize handle */
  .resize-handle {
    position: absolute;
    top: 0;
    right: 0;
    width: 8px;
    height: 100%;
    cursor: col-resize;
    background: transparent;
    z-index: 10;
  }

  .resize-handle:hover {
    background: rgba(59, 130, 246, 0.3);
  }

  .resize-handle:active {
    background: rgba(59, 130, 246, 0.5);
  }

  /* Frozen column styles */
  .header-cell.frozen-left {
    position: sticky;
    z-index: 15;
    background: #374151;
  }

  .header-cell.frozen-right {
    position: sticky;
    z-index: 15;
    background: #374151;
  }

  .frozen-left::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 8px;
    pointer-events: none;
    box-shadow: inset -8px 0 8px -8px rgba(0, 0, 0, 0.3);
  }

  .frozen-right::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 8px;
    pointer-events: none;
    box-shadow: inset 8px 0 8px -8px rgba(0, 0, 0, 0.3);
  }
</style>
