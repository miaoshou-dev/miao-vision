<script lang="ts">
  /**
   * Bar Chart Component
   *
   * Displays categorical data comparison with bars.
   * Supports vertical/horizontal orientation, grouping, and customization.
   */
  import './bar-chart.css'
  import type { BarChartData } from './types'

  interface Props {
    data: BarChartData
  }

  let { data }: Props = $props()

  // Derived values
  let config = $derived(data.config)
  let categories = $derived(data.categories)
  let groups = $derived(data.groups)
  let bars = $derived(data.bars)
  let maxValue = $derived(data.maxValue)

  // Cross-view linking
  let selectable = $derived(data.config.selectable ?? false)
  let selectedValues = $derived(data.selectedValues)
  let selectionField = $derived(data.selectionField || data.config.x)
  let onSelect = $derived(data.onSelect)
  let hasSelection = $derived(selectedValues && selectedValues.size > 0)

  // Check if a category is selected
  function isSelected(category: string): boolean {
    return selectedValues?.has(category) ?? false
  }

  // Check if a category should be dimmed (has selection but not selected)
  function isDimmed(category: string): boolean {
    return hasSelection && !isSelected(category)
  }

  // Handle bar click
  function handleBarClick(category: string) {
    if (selectable && onSelect && selectionField) {
      onSelect(selectionField, category)
    }
  }

  // Configuration with defaults
  let height = $derived(config.height || 300)
  let horizontal = $derived(config.horizontal || false)
  let showLabels = $derived(config.showLabels !== false)
  let showLegend = $derived(config.showLegend !== false && groups.length > 1)
  let showGrid = $derived(config.showGrid !== false)
  let borderRadius = $derived(config.borderRadius ?? 4)
  let title = $derived(config.title)
  let subtitle = $derived(config.subtitle)
  let xLabel = $derived(config.xLabel)
  let yLabel = $derived(config.yLabel)

  // Color palette for groups
  const defaultColors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
  ]
  let colors = $derived(config.colors || defaultColors)

  // Get bars for a specific category
  function getBarsForCategory(category: string) {
    return bars.filter(b => b.category === category)
  }

  // Calculate Y-axis ticks
  function getYAxisTicks(max: number): number[] {
    if (max === 0) return [0]
    const tickCount = 5

    // Round max to nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
    const normalized = max / magnitude
    let niceMax: number
    if (normalized <= 1) niceMax = magnitude
    else if (normalized <= 2) niceMax = 2 * magnitude
    else if (normalized <= 5) niceMax = 5 * magnitude
    else niceMax = 10 * magnitude

    const step = niceMax / tickCount
    const ticks: number[] = []
    for (let i = 0; i <= tickCount; i++) {
      ticks.push(Math.round(i * step))
    }
    return ticks
  }

  let yTicks = $derived(getYAxisTicks(maxValue))
  let yMax = $derived(yTicks[yTicks.length - 1] || maxValue || 1)

  // Format value
  function formatValue(value: number): string {
    const format = config.valueFormat || 'number'
    const currency = config.currencySymbol || '$'

    if (format === 'currency') {
      return `${currency}${value.toLocaleString()}`
    }
    if (format === 'percent') {
      return `${value.toFixed(1)}%`
    }
    return value.toLocaleString()
  }
</script>

<div class="bar-chart-container {config.class || ''}" class:horizontal>
  {#if title}
    <h3 class="chart-title">{title}</h3>
  {/if}
  {#if subtitle}
    <p class="chart-subtitle">{subtitle}</p>
  {/if}

  {#if showLegend && groups.length > 1}
    <div class="chart-legend">
      {#each groups as group, i}
        <div class="legend-item">
          <span class="legend-color" style="background-color: {colors[i % colors.length]}"></span>
          <span class="legend-label">{group}</span>
        </div>
      {/each}
    </div>
  {/if}

  <div class="chart-wrapper" style="height: {height}px">
    {#if !horizontal}
      <!-- Vertical Bar Chart -->
      <div class="chart-content vertical">
        {#if showGrid}
          <div class="y-axis">
            {#if yLabel}
              <div class="axis-label y-axis-label">{yLabel}</div>
            {/if}
            <div class="y-axis-ticks">
              {#each [...yTicks].reverse() as tick}
                <div class="y-tick">
                  <span class="tick-label">{formatValue(tick)}</span>
                  <span class="tick-line"></span>
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <div class="chart-area">
          <div class="bars-container">
            {#each categories as category}
              {@const categoryBars = getBarsForCategory(category)}
              <div class="bar-group" style="width: {100 / categories.length}%">
                <div class="bars-row">
                  {#each categoryBars as bar (bar.id)}
                    <div
                      class="bar-wrapper"
                      class:selectable
                      class:selected={isSelected(bar.category)}
                      class:dimmed={isDimmed(bar.category)}
                      style="width: {100 / categoryBars.length}%"
                      title="{bar.category}{bar.group ? ` - ${bar.group}` : ''}: {bar.formatted}"
                      onclick={() => handleBarClick(bar.category)}
                      onkeydown={(e) => e.key === 'Enter' && handleBarClick(bar.category)}
                      role={selectable ? 'button' : undefined}
                      tabindex={selectable ? 0 : undefined}
                    >
                      <div class="bar-column">
                        {#if showLabels && bar.value > 0}
                          <div class="bar-tooltip">{bar.formatted}</div>
                        {/if}
                        <div
                          class="bar"
                          style="
                            height: {(bar.value / yMax) * 100}%;
                            background-color: {bar.color};
                            border-radius: {borderRadius}px {borderRadius}px 0 0;
                          "
                        ></div>
                      </div>
                    </div>
                  {/each}
                </div>
              </div>
            {/each}
          </div>

          <div class="x-axis">
            <div class="x-axis-ticks">
              {#each categories as category}
                <div class="x-tick" style="width: {100 / categories.length}%">
                  <span class="tick-label" title={category}>{category}</span>
                </div>
              {/each}
            </div>
            {#if xLabel}
              <div class="axis-label x-axis-label">{xLabel}</div>
            {/if}
          </div>
        </div>
      </div>
    {:else}
      <!-- Horizontal Bar Chart -->
      <div class="chart-content horizontal">
        <div class="chart-area-horizontal">
          {#each categories as category}
            {@const categoryBars = getBarsForCategory(category)}
            <div class="bar-row-horizontal">
              <div class="category-label" title={category}>{category}</div>
              <div class="bars-horizontal">
                {#each categoryBars as bar (bar.id)}
                  <div
                    class="bar-horizontal-wrapper"
                    class:selectable
                    class:selected={isSelected(bar.category)}
                    class:dimmed={isDimmed(bar.category)}
                    title="{bar.category}{bar.group ? ` - ${bar.group}` : ''}: {bar.formatted}"
                    onclick={() => handleBarClick(bar.category)}
                    onkeydown={(e) => e.key === 'Enter' && handleBarClick(bar.category)}
                    role={selectable ? 'button' : undefined}
                    tabindex={selectable ? 0 : undefined}
                  >
                    <div
                      class="bar-horizontal"
                      style="
                        width: {(bar.value / yMax) * 100}%;
                        background-color: {bar.color};
                        border-radius: 0 {borderRadius}px {borderRadius}px 0;
                      "
                    >
                      {#if showLabels && bar.value > 0}
                        <span class="bar-label-horizontal">{bar.formatted}</span>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            </div>
          {/each}
        </div>

        {#if showGrid}
          <div class="x-axis-horizontal">
            {#each yTicks as tick}
              <div class="x-tick-horizontal" style="left: {(tick / yMax) * 100}%">
                <span class="tick-line-horizontal"></span>
                <span class="tick-label">{formatValue(tick)}</span>
              </div>
            {/each}
          </div>
        {/if}
      </div>
    {/if}
  </div>
</div>

