<script lang="ts">
  /**
   * Chart Preview Component
   *
   * Displays chart preview with loading states and export toolbar.
   */
  import type { MosaicChartSpec } from '../MosaicChartAdapter'
  import { isVgplotSupported } from '../logic'

  interface Props {
    chartType: string | undefined
    userHasInteracted: boolean
    canRender: boolean
    mosaicLoading: boolean
    mosaicError: string | null
    mosaicChartSpec: MosaicChartSpec | null
    chartSVG: string
    chartContainer: HTMLDivElement | null
    onExportPNG: () => void
    onExportSVG: () => void
  }

  let {
    chartType,
    userHasInteracted,
    canRender,
    mosaicLoading,
    mosaicError,
    mosaicChartSpec,
    chartSVG,
    chartContainer = $bindable<HTMLDivElement | null>(null),
    onExportPNG,
    onExportSVG
  }: Props = $props()

  // Export chartContainer to parent via $bindable - used in template with bind:this
  void chartContainer
</script>

<div class="chart-preview">
  {#if !userHasInteracted && !chartType}
    <div class="chart-placeholder initial">
      <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="3" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="14" y="14" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/>
      </svg>
      <h3>Select Chart Type</h3>
      <p>Choose a chart type from the left panel to visualize your data</p>
      <div class="chart-type-hints">
        <span>📊 Bar</span>
        <span>📈 Line</span>
        <span>🥧 Pie</span>
        <span>⚬ Scatter</span>
        <span>📶 Histogram</span>
      </div>
    </div>
  {:else if canRender}
    {#if isVgplotSupported(chartType)}
      {#if mosaicLoading}
        <div class="chart-skeleton">
          <div class="skeleton-header"></div>
          <div class="skeleton-chart">
            <div class="skeleton-y-axis"></div>
            <div class="skeleton-bars">
              {#each Array(8) as _}
                <div class="skeleton-bar" style="height: {20 + Math.random() * 60}%"></div>
              {/each}
            </div>
          </div>
          <div class="skeleton-x-axis"></div>
        </div>
      {:else if mosaicError}
        <div class="mosaic-error">
          <strong>⚠ Chart Error</strong>
          <p>{mosaicError}</p>
        </div>
      {:else if mosaicChartSpec}
        <div class="mosaic-info">
          <span class="perf">Rendered in {mosaicChartSpec.renderTime.toFixed(2)}ms</span>
        </div>
        <div class="chart-container" bind:this={chartContainer}></div>
      {/if}
    {:else}
      <div class="chart-container">
        {@html chartSVG}
      </div>
    {/if}

    <div class="export-toolbar">
      <button class="export-btn" onclick={onExportPNG} title="Export as PNG">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        PNG
      </button>
      <button class="export-btn" onclick={onExportSVG} title="Export as SVG">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
          <polyline points="7 10 12 15 17 10"/>
          <line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        SVG
      </button>
    </div>
  {:else}
    <div class="chart-placeholder">
      <span class="icon">📊</span>
      <span class="text">Select X and Y columns to generate chart</span>
    </div>
  {/if}
</div>

<style>
  .chart-preview {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem;
    overflow: auto;
    position: relative;
  }

  .chart-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    max-width: 100%;
    overflow: visible;
  }

  .export-toolbar {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.75rem;
  }

  .export-btn {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.75rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 6px;
    color: #9CA3AF;
    font-size: 0.75rem;
    cursor: pointer;
    transition: all 0.15s;
  }

  .export-btn:hover {
    background: #374151;
    border-color: #4B5563;
    color: #E5E7EB;
  }

  .export-btn svg {
    flex-shrink: 0;
  }

  .chart-placeholder {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    color: #6B7280;
  }

  .chart-placeholder .icon {
    font-size: 2.5rem;
    opacity: 0.4;
  }

  .chart-placeholder .text {
    font-size: 0.875rem;
  }

  .chart-placeholder.initial {
    justify-content: center;
    height: 100%;
    gap: 1.5rem;
    padding: 3rem 2rem;
  }

  .chart-placeholder.initial svg {
    opacity: 0.3;
    stroke: #4B5563;
  }

  .chart-placeholder.initial h3 {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #9CA3AF;
  }

  .chart-placeholder.initial p {
    margin: 0;
    font-size: 0.875rem;
    color: #6B7280;
    text-align: center;
    max-width: 320px;
  }

  .chart-type-hints {
    display: flex;
    gap: 0.75rem;
    flex-wrap: wrap;
    justify-content: center;
    margin-top: 0.5rem;
  }

  .chart-type-hints span {
    padding: 0.375rem 0.75rem;
    background: rgba(75, 85, 99, 0.3);
    border: 1px solid #374151;
    border-radius: 6px;
    font-size: 0.75rem;
    color: #9CA3AF;
  }

  .chart-skeleton {
    width: 100%;
    max-width: 700px;
    padding: 2rem;
  }

  .skeleton-header {
    height: 24px;
    width: 200px;
    background: linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
    margin-bottom: 2rem;
  }

  .skeleton-chart {
    display: flex;
    gap: 1rem;
    height: 350px;
  }

  .skeleton-y-axis {
    width: 40px;
    background: linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
  }

  .skeleton-bars {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 0.5rem;
    padding-bottom: 0.5rem;
  }

  .skeleton-bar {
    flex: 1;
    background: linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px 4px 0 0;
    min-height: 50px;
  }

  .skeleton-x-axis {
    height: 20px;
    width: 100%;
    background: linear-gradient(90deg, #1F2937 25%, #374151 50%, #1F2937 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 4px;
    margin-top: 0.5rem;
  }

  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }

  .mosaic-error {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.75rem;
    padding: 2rem;
    color: #9CA3AF;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
  }

  .mosaic-error strong {
    color: #FCA5A5;
    font-size: 0.9rem;
  }

  .mosaic-info {
    display: flex;
    gap: 1rem;
    align-items: center;
    margin-bottom: 0.5rem;
    font-size: 0.75rem;
  }

  .mosaic-info .perf {
    color: #10B981;
    font-weight: 500;
  }

  :global(.chart-preview svg) {
    max-width: 100%;
    height: auto;
  }

  :global(.chart-container svg) {
    max-width: 100%;
    height: auto;
    font-family: inherit;
    background-color: transparent !important;
    display: block;
  }

  :global(.chart-container svg rect[fill="white"]),
  :global(.chart-container svg rect[fill="#ffffff"]) {
    fill: #1F2937 !important;
  }

  :global(.chart-container svg text) {
    fill: #E5E7EB !important;
  }

  :global(.chart-container svg .grid line) {
    stroke: #374151 !important;
  }

  :global(.chart-container .mark) {
    transition: opacity 0.2s;
  }

  :global(.chart-container .mark:hover) {
    opacity: 0.8;
  }
</style>
