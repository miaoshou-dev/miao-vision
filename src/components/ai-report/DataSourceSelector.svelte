<script lang="ts">
  import type { DataSourceInfo } from '@core/ai'

  interface Props {
    availableSources: DataSourceInfo[]
    selectedSources: DataSourceInfo[]
    onSelectionChange: (sources: DataSourceInfo[]) => void
  }

  let { availableSources, selectedSources, onSelectionChange }: Props = $props()

  function toggleSource(source: DataSourceInfo) {
    const isSelected = selectedSources.some((s) => s.name === source.name)

    if (isSelected) {
      onSelectionChange(selectedSources.filter((s) => s.name !== source.name))
    } else {
      onSelectionChange([...selectedSources, source])
    }
  }

  function selectAll() {
    onSelectionChange([...availableSources])
  }

  function clearAll() {
    onSelectionChange([])
  }

  function isSelected(source: DataSourceInfo): boolean {
    return selectedSources.some((s) => s.name === source.name)
  }

  function formatColumnType(type: string): string {
    const lower = type.toLowerCase()
    if (lower.includes('int') || lower.includes('float') || lower.includes('double')) {
      return 'number'
    }
    if (lower.includes('date') || lower.includes('time')) {
      return 'date'
    }
    if (lower.includes('varchar') || lower.includes('string')) {
      return 'text'
    }
    return type
  }
</script>

<div class="data-source-selector">
  <div class="selector-header">
    <h3>Select Data Sources</h3>
    <div class="header-actions">
      <button class="btn-text" onclick={selectAll} disabled={selectedSources.length === availableSources.length}>
        Select All
      </button>
      <button class="btn-text" onclick={clearAll} disabled={selectedSources.length === 0}>
        Clear
      </button>
    </div>
  </div>

  {#if availableSources.length === 0}
    <div class="empty-state">
      <div class="empty-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7"/>
          <path d="M4 7l8-4 8 4"/>
          <path d="M4 7l8 4 8-4"/>
          <circle cx="12" cy="11" r="1"/>
        </svg>
      </div>
      <p>No data sources available</p>
      <span class="empty-hint">Load data files or run SQL queries first</span>
    </div>
  {:else}
    <div class="source-list">
      {#each availableSources as source}
        <button
          class="source-card"
          class:selected={isSelected(source)}
          onclick={() => toggleSource(source)}
        >
          <div class="source-header">
            <div class="source-checkbox">
              {#if isSelected(source)}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
                </svg>
              {/if}
            </div>
            <span class="source-name">{source.name}</span>
            <span class="source-rows">{source.rowCount.toLocaleString()} rows</span>
          </div>

          <div class="source-columns">
            {#each source.columns.slice(0, 5) as col}
              <span class="column-badge" title="{col.name}: {col.type}">
                <span class="col-name">{col.name}</span>
                <span class="col-type">{formatColumnType(col.type)}</span>
              </span>
            {/each}
            {#if source.columns.length > 5}
              <span class="column-badge more">+{source.columns.length - 5} more</span>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}

  <div class="selection-summary">
    <span class="summary-text">
      {selectedSources.length} of {availableSources.length} selected
    </span>
  </div>
</div>

<style>
  .data-source-selector {
    display: flex;
    flex-direction: column;
    gap: 16px;
    min-height: 200px;
  }

  .selector-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .selector-header h3 {
    margin: 0;
    font-size: 14px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .header-actions {
    display: flex;
    gap: 12px;
  }

  .btn-text {
    background: none;
    border: none;
    color: #60a5fa;
    cursor: pointer;
    font-size: 13px;
    padding: 4px 8px;
    border-radius: 4px;
    transition: background-color 0.2s;
  }

  .btn-text:hover:not(:disabled) {
    background: rgba(96, 165, 250, 0.1);
  }

  .btn-text:disabled {
    color: #6b7280;
    cursor: not-allowed;
  }

  .empty-state {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 48px 24px;
    color: #9ca3af;
    text-align: center;
  }

  .empty-icon {
    color: #4b5563;
    margin-bottom: 16px;
  }

  .empty-state p {
    margin: 0 0 8px;
    font-size: 14px;
    color: #e0e0e0;
  }

  .empty-hint {
    font-size: 12px;
    color: #6b7280;
  }

  .source-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
    max-height: 300px;
    overflow-y: auto;
    padding-right: 4px;
  }

  .source-card {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
    width: 100%;
  }

  .source-card:hover {
    border-color: #4b5563;
    background: #252525;
  }

  .source-card.selected {
    border-color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }

  .source-header {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .source-checkbox {
    width: 18px;
    height: 18px;
    border: 2px solid #4b5563;
    border-radius: 4px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    transition: all 0.2s;
  }

  .source-card.selected .source-checkbox {
    background: #60a5fa;
    border-color: #60a5fa;
    color: white;
  }

  .source-name {
    font-weight: 500;
    color: #e0e0e0;
    flex: 1;
  }

  .source-rows {
    font-size: 12px;
    color: #9ca3af;
  }

  .source-columns {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding-left: 26px;
  }

  .column-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: #2a2a2a;
    border-radius: 4px;
    font-size: 11px;
  }

  .col-name {
    color: #e0e0e0;
  }

  .col-type {
    color: #6b7280;
  }

  .column-badge.more {
    color: #9ca3af;
    font-style: italic;
  }

  .selection-summary {
    padding-top: 12px;
    border-top: 1px solid #333;
  }

  .summary-text {
    font-size: 13px;
    color: #9ca3af;
  }
</style>
