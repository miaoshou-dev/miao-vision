<script lang="ts">
  /**
   * Histogram Component
   *
   * Displays data distribution as binned bars.
   */
  import type { HistogramData } from './types'

  interface Props {
    data: HistogramData
  }

  let { data }: Props = $props()

  // Derived values
  let bins = $derived(data.bins)
  let config = $derived(data.config)
  let title = $derived(data.title)
  let subtitle = $derived(data.subtitle)
  let maxCount = $derived(data.maxCount)
  let totalCount = $derived(data.totalCount)

  // Palette color mapping
  const PALETTE_COLORS: Record<string, string> = {
    vibrant: '#6366f1',
    business: '#3b82f6',
    ocean: '#0ea5e9',
    sunset: '#f43f5e',
    forest: '#22c55e',
    categorical: '#3b82f6',
    pastel: '#c4b5fd',
    darkMode: '#818cf8'
  }

  function getColorFromPalette(palette?: string): string {
    if (!palette) return '#3B82F6'
    return PALETTE_COLORS[palette] || '#3B82F6'
  }

  // Configuration with defaults
  let height = $derived(config.height || 300)
  let color = $derived(config.color || getColorFromPalette(config.palette))
  let showXAxis = $derived(config.showXAxis !== false)
  let showYAxis = $derived(config.showYAxis !== false)
  let showLabels = $derived(config.showLabels !== false)
  let xAxisLabel = $derived(config.xAxisLabel || '')
  let yAxisLabel = $derived(config.yAxisLabel || 'Count')

  // Calculate Y-axis ticks
  function getYAxisTicks(max: number): number[] {
    if (max === 0) return [0]
    const tickCount = 5
    const step = Math.ceil(max / tickCount)
    const ticks: number[] = []
    for (let i = 0; i <= max; i += step) {
      ticks.push(i)
    }
    if (ticks[ticks.length - 1] < max) {
      ticks.push(max)
    }
    return ticks
  }

  let yTicks = $derived(getYAxisTicks(maxCount))
</script>

<div class="histogram-container {config.class || ''}">
  {#if title}
    <h3 class="histogram-title">{title}</h3>
  {/if}
  {#if subtitle}
    <p class="histogram-subtitle">{subtitle}</p>
  {/if}

  <div class="histogram-chart" style="height: {height}px">
    {#if showYAxis}
      <div class="y-axis">
        <div class="y-axis-label">{yAxisLabel}</div>
        <div class="y-axis-ticks">
          {#each [...yTicks].reverse() as tick}
            <div class="y-tick">
              <span class="tick-label">{tick}</span>
              <span class="tick-line"></span>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <div class="chart-area">
      <div class="bars-container">
        {#each bins as bin (bin.id)}
          <div
            class="bar-wrapper"
            style="width: {100 / bins.length}%"
            title="{bin.label}: {bin.count} ({bin.percent.toFixed(1)}%)"
          >
            <div class="bar-column">
              {#if showLabels && bin.count > 0}
                <div class="bar-label">{bin.count}</div>
              {/if}
              <div
                class="bar"
                style="height: {bin.heightPercent}%; background-color: {color}"
              ></div>
            </div>
          </div>
        {/each}
      </div>

      {#if showXAxis}
        <div class="x-axis">
          <div class="x-axis-ticks">
            {#each bins as bin, i (bin.id)}
              <div class="x-tick" style="width: {100 / bins.length}%">
                <span class="tick-label">
                  {#if i === 0}
                    {bin.min.toLocaleString()}
                  {:else if i === bins.length - 1}
                    {bin.max.toLocaleString()}
                  {:else if bins.length <= 10}
                    {bin.min.toLocaleString()}
                  {/if}
                </span>
              </div>
            {/each}
          </div>
          {#if xAxisLabel}
            <div class="x-axis-label">{xAxisLabel}</div>
          {/if}
        </div>
      {/if}
    </div>
  </div>

  <div class="histogram-summary">
    <span class="summary-item">
      <span class="summary-label">Total:</span>
      <span class="summary-value">{totalCount.toLocaleString()}</span>
    </span>
    <span class="summary-item">
      <span class="summary-label">Bins:</span>
      <span class="summary-value">{bins.length}</span>
    </span>
    <span class="summary-item">
      <span class="summary-label">Range:</span>
      <span class="summary-value">{data.minValue.toLocaleString()} - {data.maxValue.toLocaleString()}</span>
    </span>
  </div>
</div>

<style>
  .histogram-container {
    font-family: var(--font-sans, system-ui, sans-serif);
    padding: 1rem;
    background: var(--bg-card, white);
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }

  .histogram-title {
    margin: 0 0 0.25rem 0;
    font-size: 1.125rem;
    font-weight: 600;
    color: var(--text-primary, #111827);
  }

  .histogram-subtitle {
    margin: 0 0 1rem 0;
    font-size: 0.875rem;
    color: var(--text-secondary, #6b7280);
  }

  .histogram-chart {
    display: flex;
    gap: 0.5rem;
  }

  .y-axis {
    display: flex;
    flex-direction: column;
    width: 60px;
    flex-shrink: 0;
  }

  .y-axis-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
    text-align: center;
    padding-bottom: 0.5rem;
    writing-mode: vertical-rl;
    text-orientation: mixed;
    transform: rotate(180deg);
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .y-axis-ticks {
    flex: 1;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    padding-bottom: 24px;
  }

  .y-tick {
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .y-tick .tick-label {
    font-size: 0.625rem;
    color: var(--text-muted, #9ca3af);
    width: 32px;
    text-align: right;
  }

  .y-tick .tick-line {
    flex: 1;
    height: 1px;
    background: var(--border-color, #e5e7eb);
  }

  .chart-area {
    flex: 1;
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .bars-container {
    flex: 1;
    display: flex;
    align-items: flex-end;
    gap: 1px;
    border-bottom: 1px solid var(--border-color, #e5e7eb);
  }

  .bar-wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    height: 100%;
  }

  .bar-column {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-end;
  }

  .bar {
    width: calc(100% - 2px);
    min-height: 1px;
    border-radius: 2px 2px 0 0;
    transition: opacity 0.2s;
  }

  .bar-wrapper:hover .bar {
    opacity: 0.8;
  }

  .bar-label {
    font-size: 0.625rem;
    color: var(--text-secondary, #6b7280);
    padding-bottom: 2px;
  }

  .x-axis {
    padding-top: 4px;
  }

  .x-axis-ticks {
    display: flex;
  }

  .x-tick {
    text-align: center;
  }

  .x-tick .tick-label {
    font-size: 0.625rem;
    color: var(--text-muted, #9ca3af);
  }

  .x-axis-label {
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-secondary, #6b7280);
    text-align: center;
    padding-top: 0.5rem;
  }

  .histogram-summary {
    display: flex;
    gap: 1.5rem;
    margin-top: 1rem;
    padding-top: 0.75rem;
    border-top: 1px solid var(--border-color, #e5e7eb);
    font-size: 0.75rem;
  }

  .summary-item {
    display: flex;
    gap: 0.25rem;
  }

  .summary-label {
    color: var(--text-secondary, #6b7280);
  }

  .summary-value {
    font-weight: 500;
    color: var(--text-primary, #111827);
  }
</style>
