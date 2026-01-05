<script lang="ts">
  import type { DataSourceInfo } from '@core/ai'

  interface Props {
    availableSources: DataSourceInfo[]
    selectedSources: DataSourceInfo[]
    onSelectionChange: (sources: DataSourceInfo[]) => void
    onImportData?: () => void
    onLoadSampleData?: () => void
  }

  let { availableSources, selectedSources, onSelectionChange, onImportData, onLoadSampleData }: Props = $props()

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
        <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 7v10c0 1.1.9 2 2 2h12a2 2 0 002-2V7"/>
          <path d="M4 7l8-4 8 4"/>
          <path d="M4 7l8 4 8-4"/>
          <circle cx="12" cy="11" r="1"/>
        </svg>
      </div>
      <h4 class="empty-title">No Data Sources Yet</h4>
      <p class="empty-desc">Import your data to generate AI-powered reports with insights and visualizations.</p>

      <div class="empty-actions">
        {#if onImportData}
          <button class="btn-primary" onclick={onImportData}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
              <polyline points="17 8 12 3 7 8"/>
              <line x1="12" y1="3" x2="12" y2="15"/>
            </svg>
            Import Data
          </button>
        {/if}
        {#if onLoadSampleData}
          <button class="btn-secondary" onclick={onLoadSampleData}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            Try Sample Data
          </button>
        {/if}
      </div>

      <div class="empty-tips">
        <span class="tip-label">Supported formats:</span>
        <div class="tip-formats">
          <span class="format-badge">CSV</span>
          <span class="format-badge">Parquet</span>
          <span class="format-badge">JSON</span>
          <span class="format-badge">Excel</span>
        </div>
      </div>
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
    padding: 40px 24px;
    color: #9ca3af;
    text-align: center;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.05), rgba(139, 92, 246, 0.05));
    border: 1px dashed rgba(99, 102, 241, 0.3);
    border-radius: 12px;
  }

  .empty-icon {
    color: #6366f1;
    margin-bottom: 16px;
    opacity: 0.7;
  }

  .empty-title {
    margin: 0 0 8px;
    font-size: 16px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .empty-desc {
    margin: 0 0 24px;
    font-size: 13px;
    color: #9ca3af;
    max-width: 320px;
    line-height: 1.5;
  }

  .empty-actions {
    display: flex;
    gap: 12px;
    margin-bottom: 24px;
  }

  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-primary:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
  }

  .btn-secondary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 10px 20px;
    background: transparent;
    color: #a0a0b0;
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.3);
    color: #e0e0e0;
  }

  .empty-tips {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
  }

  .tip-label {
    font-size: 11px;
    color: #6b7280;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }

  .tip-formats {
    display: flex;
    gap: 6px;
  }

  .format-badge {
    padding: 4px 10px;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 4px;
    font-size: 11px;
    color: #9ca3af;
    font-family: 'JetBrains Mono', monospace;
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
