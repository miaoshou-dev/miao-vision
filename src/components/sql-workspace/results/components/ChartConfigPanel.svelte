<script lang="ts">
  /**
   * Chart Configuration Panel Component
   *
   * Provides UI for configuring chart type, data mapping, and advanced options.
   */
  import type { ResultsChartConfig, ColumnStatistics } from '../types'
  import { CHART_TYPES, AGGREGATIONS } from '../logic'

  interface Props {
    config: ResultsChartConfig
    allColumns: string[]
    columnTypes: Record<string, ColumnStatistics['type']>
    chartWidth: number
    chartHeight: number
    chartTitle: string
    xLabel: string
    yLabel: string
    dataLimit: number
    sortOrder: 'desc' | 'asc' | 'none'
    showAdvanced: boolean
    onConfigChange: (config: ResultsChartConfig) => void
    onChartTypeSelect: (type: string) => void
    onWidthChange: (width: number) => void
    onHeightChange: (height: number) => void
    onTitleChange: (title: string) => void
    onXLabelChange: (label: string) => void
    onYLabelChange: (label: string) => void
    onDataLimitChange: (limit: number) => void
    onSortOrderChange: (order: 'desc' | 'asc' | 'none') => void
    onAdvancedToggle: () => void
    onSaveConfig: () => void
    onLoadConfig: () => void
  }

  let {
    config,
    allColumns,
    columnTypes,
    chartWidth,
    chartHeight,
    chartTitle,
    xLabel,
    yLabel,
    dataLimit,
    sortOrder,
    showAdvanced,
    onConfigChange,
    onChartTypeSelect,
    onWidthChange,
    onHeightChange,
    onTitleChange,
    onXLabelChange,
    onYLabelChange,
    onDataLimitChange,
    onSortOrderChange,
    onAdvancedToggle,
    onSaveConfig,
    onLoadConfig
  }: Props = $props()
</script>

<aside class="chart-config">
  <div class="config-section">
    <h4>Chart Type</h4>
    <div class="chart-type-select">
      <select
        value={config.type}
        onchange={(e) => onChartTypeSelect(e.currentTarget.value)}
      >
        <option value="" disabled>Select chart type...</option>
        {#each CHART_TYPES as ct}
          <option value={ct.value}>{ct.label}</option>
        {/each}
      </select>
    </div>
  </div>

  <div class="config-section">
    <h4>Data Mapping</h4>

    <div class="config-field">
      <label for="x-column">X Axis</label>
      <select
        id="x-column"
        value={config.xColumn || ''}
        onchange={(e) => onConfigChange({ ...config, xColumn: e.currentTarget.value || null })}
      >
        <option value="">Select column...</option>
        {#each allColumns as col}
          <option value={col}>{col} ({columnTypes[col]})</option>
        {/each}
      </select>
    </div>

    <div class="config-field">
      <label for="y-column">Y Axis</label>
      <select
        id="y-column"
        value={config.yColumns[0] || ''}
        onchange={(e) => onConfigChange({ ...config, yColumns: e.currentTarget.value ? [e.currentTarget.value] : [] })}
      >
        <option value="">Select column...</option>
        {#each allColumns as col}
          <option value={col}>{col} ({columnTypes[col]})</option>
        {/each}
      </select>
    </div>

    {#if config.type !== 'scatter' && config.type !== 'histogram'}
      <div class="config-field">
        <label for="aggregation">Aggregation</label>
        <select
          id="aggregation"
          value={config.aggregation || 'sum'}
          onchange={(e) => onConfigChange({ ...config, aggregation: e.currentTarget.value as any })}
        >
          {#each AGGREGATIONS as agg}
            <option value={agg.value}>{agg.label}</option>
          {/each}
        </select>
      </div>
    {/if}
  </div>

  <button class="advanced-toggle" onclick={onAdvancedToggle}>
    {showAdvanced ? '▼' : '▶'} Advanced Options
  </button>

  {#if showAdvanced}
    <div class="config-section advanced">
      <div class="config-row">
        <div class="config-field">
          <label for="limit">Max Items</label>
          <select id="limit" value={dataLimit} onchange={(e) => onDataLimitChange(Number(e.currentTarget.value))}>
            <option value={10}>Top 10</option>
            <option value={20}>Top 20</option>
            <option value={30}>Top 30</option>
            <option value={50}>Top 50</option>
            <option value={0}>All</option>
          </select>
        </div>
        <div class="config-field">
          <label for="sort">Sort</label>
          <select id="sort" value={sortOrder} onchange={(e) => onSortOrderChange(e.currentTarget.value as any)}>
            <option value="desc">High → Low</option>
            <option value="asc">Low → High</option>
            <option value="none">Original</option>
          </select>
        </div>
      </div>

      <div class="config-row">
        <div class="config-field">
          <label for="width">Width</label>
          <input id="width" type="number" value={chartWidth} onchange={(e) => onWidthChange(Number(e.currentTarget.value))} min="400" max="1200" step="50" />
        </div>
        <div class="config-field">
          <label for="height">Height</label>
          <input id="height" type="number" value={chartHeight} onchange={(e) => onHeightChange(Number(e.currentTarget.value))} min="250" max="800" step="50" />
        </div>
      </div>

      <div class="config-field">
        <label for="title">Chart Title</label>
        <input id="title" type="text" value={chartTitle} oninput={(e) => onTitleChange(e.currentTarget.value)} placeholder="Optional title..." />
      </div>

      <div class="config-field">
        <label for="x-label">X Axis Label</label>
        <input id="x-label" type="text" value={xLabel} oninput={(e) => onXLabelChange(e.currentTarget.value)} placeholder="Optional label..." />
      </div>

      <div class="config-field">
        <label for="y-label">Y Axis Label</label>
        <input id="y-label" type="text" value={yLabel} oninput={(e) => onYLabelChange(e.currentTarget.value)} placeholder="Optional label..." />
      </div>

      <div class="config-field">
        <label>Configuration</label>
        <div class="config-buttons">
          <button class="config-btn" onclick={onSaveConfig} title="Save chart configuration">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/>
              <polyline points="17 21 17 13 7 13 7 21"/>
              <polyline points="7 3 7 8 15 8"/>
            </svg>
            Save Config
          </button>
          <button class="config-btn" onclick={onLoadConfig} title="Load chart configuration">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4"/>
              <polyline points="16 8 12 4 8 8"/>
              <line x1="12" y1="4" x2="12" y2="16"/>
            </svg>
            Load Config
          </button>
        </div>
        <p class="hint">Save/load all chart settings as JSON</p>
      </div>
    </div>
  {/if}
</aside>

<style>
  .chart-config {
    width: 220px;
    flex-shrink: 0;
    padding: 0.75rem;
    background: #0F172A;
    border-right: 1px solid #1F2937;
    overflow-y: auto;
  }

  .config-section {
    margin-bottom: 1rem;
  }

  .config-section h4 {
    margin: 0 0 0.5rem 0;
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #6B7280;
  }

  .chart-type-select select {
    width: 100%;
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #E5E7EB;
    font-size: 0.8125rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .chart-type-select select:hover {
    background: #374151;
    border-color: #4B5563;
  }

  .chart-type-select select:focus {
    outline: none;
    border-color: #4285F4;
  }

  .config-field {
    margin-bottom: 0.75rem;
  }

  .config-field label {
    display: block;
    margin-bottom: 0.25rem;
    font-size: 0.75rem;
    color: #9CA3AF;
  }

  .config-field select,
  .config-field input {
    width: 100%;
    padding: 0.375rem 0.5rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #E5E7EB;
    font-size: 0.75rem;
  }

  .config-field select:focus,
  .config-field input:focus {
    outline: none;
    border-color: #4285F4;
  }

  .config-row {
    display: flex;
    gap: 0.5rem;
  }

  .config-row .config-field {
    flex: 1;
  }

  .advanced-toggle {
    width: 100%;
    padding: 0.5rem;
    background: none;
    border: none;
    color: #6B7280;
    font-size: 0.75rem;
    text-align: left;
    cursor: pointer;
    transition: color 0.15s;
  }

  .advanced-toggle:hover {
    color: #9CA3AF;
  }

  .config-section.advanced {
    padding-top: 0.5rem;
    border-top: 1px solid #1F2937;
  }

  .config-buttons {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .config-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 4px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
    width: 100%;
  }

  .config-btn:hover {
    background: #374151;
    border-color: #4B5563;
    color: #E5E7EB;
  }

  .config-btn svg {
    flex-shrink: 0;
  }

  .hint {
    margin-top: 0.25rem;
    font-size: 0.7rem;
    color: #6B7280;
  }
</style>
