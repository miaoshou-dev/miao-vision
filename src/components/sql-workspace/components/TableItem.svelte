<script lang="ts">
  /**
   * Table Item Component
   *
   * Expandable table row with columns list and stats popover.
   */
  import type { ColumnSchema, TableSchema } from '@/types/schema'
  import ColumnStatsPopover from '../ColumnStatsPopover.svelte'
  import {
    formatRowCount,
    getColumnTypeIcon,
    getColumnBadges,
    getColumnTooltip
  } from '../logic/data-explorer'

  interface Props {
    tableName: string
    rowCount: number | undefined
    schema: TableSchema | undefined
    isExpanded: boolean
    onToggle: () => void
    onInsertTable: (e: MouseEvent) => void
    onPreview: (e: MouseEvent) => void
    onRemove: (e: MouseEvent) => void
    onInsertColumn: (columnName: string, e: MouseEvent) => void
    onColumnHover: (column: ColumnSchema) => void
    onColumnLeave: () => void
    hoveredColumn: string | null
  }

  let {
    tableName,
    rowCount,
    schema,
    isExpanded,
    onToggle,
    onInsertTable,
    onPreview,
    onRemove,
    onInsertColumn,
    onColumnHover,
    onColumnLeave,
    hoveredColumn
  }: Props = $props()
</script>

<div class="table-item" class:expanded={isExpanded}>
  <div class="table-header">
    <button class="table-toggle" onclick={onToggle}>
      <span class="expand-icon">{isExpanded ? '▼' : '▶'}</span>
      <span class="table-icon">📊</span>
      <span class="table-info">
        <span class="table-name">{tableName}</span>
        {#if rowCount !== undefined}
          <span class="row-count">{formatRowCount(rowCount)}</span>
        {/if}
      </span>
    </button>
    <div class="table-actions">
      <button
        class="btn-action"
        onclick={onInsertTable}
        title="Insert table name"
      >
        +
      </button>
      <button
        class="btn-action"
        onclick={onPreview}
        title="Preview data (SELECT * LIMIT 100)"
      >
        👁
      </button>
      <button
        class="btn-action btn-danger"
        onclick={onRemove}
        title="Remove table"
      >
        ×
      </button>
    </div>
  </div>

  {#if isExpanded && schema}
    <div class="columns-list">
      {#each schema.columns as column}
        {@const badges = getColumnBadges(column)}
        {@const isHovered = hoveredColumn === column.name}
        <div
          class="column-item-wrapper"
          role="group"
          onmouseenter={() => onColumnHover(column)}
          onmouseleave={onColumnLeave}
        >
          <button
            class="column-item"
            class:has-fk={column.isForeignKey}
            class:has-pk={column.isPrimaryKey}
            onclick={(e) => onInsertColumn(column.name, e)}
            title={getColumnTooltip(column)}
          >
            <span class="type-icon" data-type={column.typeCategory}>
              {getColumnTypeIcon(column)}
            </span>
            <span class="column-name">{column.name}</span>
            {#if badges.length > 0}
              <span class="column-badges">
                {#each badges as badge}
                  <span class="badge" class:pk={badge === 'PK'} class:fk={badge === 'FK'} class:uq={badge === 'UQ'}>{badge}</span>
                {/each}
              </span>
            {/if}
            <span class="column-type">{column.type}</span>
          </button>

          {#if isHovered}
            <div class="stats-popover-container">
              <ColumnStatsPopover
                stats={column.stats}
                columnType={column.type}
                typeCategory={column.typeCategory}
              />
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  .table-item {
    border-bottom: 1px solid transparent;
  }

  .table-item.expanded {
    background: rgba(66, 133, 244, 0.05);
    border-bottom-color: #1F2937;
  }

  .table-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0 0.75rem 0 0;
    transition: background 0.15s;
  }

  .table-header:hover {
    background: #1F2937;
  }

  .table-toggle {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.5rem 0.5rem 0.75rem;
    background: none;
    border: none;
    color: #E5E7EB;
    font-size: 0.8125rem;
    cursor: pointer;
    text-align: left;
  }

  .expand-icon {
    font-size: 0.625rem;
    color: #6B7280;
    width: 0.75rem;
  }

  .table-icon {
    font-size: 0.875rem;
  }

  .table-info {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.125rem;
    overflow: hidden;
  }

  .table-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }

  .row-count {
    font-size: 0.625rem;
    color: #6B7280;
    font-weight: 400;
  }

  .table-actions {
    display: none;
    gap: 0.25rem;
  }

  .table-header:hover .table-actions {
    display: flex;
  }

  .btn-action {
    padding: 0.125rem 0.375rem;
    background: #374151;
    border: none;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .btn-action:hover {
    background: #4285F4;
    color: white;
  }

  .btn-action.btn-danger:hover {
    background: #DC2626;
    color: white;
  }

  .columns-list {
    padding: 0.25rem 0 0.5rem 1.5rem;
  }

  .column-item-wrapper {
    position: relative;
  }

  .column-item {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.375rem 0.75rem;
    background: none;
    border: none;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    text-align: left;
    border-radius: 4px;
    transition: all 0.15s;
  }

  .column-item:hover {
    background: #1F2937;
    color: #F3F4F6;
  }

  .column-item.has-pk {
    border-left: 2px solid #F59E0B;
    padding-left: calc(0.75rem - 2px);
  }

  .column-item.has-fk {
    border-left: 2px solid #8B5CF6;
    padding-left: calc(0.75rem - 2px);
  }

  .type-icon {
    width: 1.25rem;
    height: 1.25rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #374151;
    border-radius: 4px;
    font-size: 0.625rem;
    font-weight: 600;
    color: #9CA3AF;
  }

  .column-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .column-badges {
    display: flex;
    gap: 0.125rem;
    flex-shrink: 0;
  }

  .column-badges .badge {
    padding: 0.0625rem 0.25rem;
    border-radius: 3px;
    font-size: 0.5625rem;
    font-weight: 600;
    text-transform: uppercase;
  }

  .column-badges .badge.pk {
    background: rgba(245, 158, 11, 0.2);
    color: #FBBF24;
  }

  .column-badges .badge.fk {
    background: rgba(139, 92, 246, 0.2);
    color: #A78BFA;
  }

  .column-badges .badge.uq {
    background: rgba(16, 185, 129, 0.2);
    color: #6EE7B7;
  }

  .column-type {
    font-size: 0.6875rem;
    color: #6B7280;
    font-family: 'JetBrains Mono', monospace;
    flex-shrink: 0;
  }

  .stats-popover-container {
    position: absolute;
    left: 100%;
    top: 0;
    margin-left: 0.5rem;
    z-index: 100;
  }
</style>
