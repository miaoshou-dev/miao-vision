<script lang="ts">
  /**
   * ChartBar Structure
   *
   * Bar chart infographic with horizontal or vertical bars.
   * Supports custom styling, gradients, and value labels.
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, GradientConfig } from '../../theme'
  import { createGradientDef, gradientDefToSVG, getPaletteColors } from '../../theme'
  import type { ChartBarProps, BarDataItem, BarLayout } from './types'

  let {
    items = [],
    orientation = 'horizontal',
    showValues = true,
    showPercentage = false,
    valuePrefix = '',
    valueSuffix = '',
    cornerRadius = 4,
    barGap = 0.2,
    showGrid = true,
    maxValue,
    palette,
    bar,
    width = 600,
    height = 400
  }: ChartBarProps = $props()

  // Get palette colors
  const paletteColors = $derived(palette ? getPaletteColors(palette, items.length) : [])

  // Get theme from context
  const themeColors = getContext<ThemeColors>('infographic-theme')
  const gradientConfig = getContext<GradientConfig | undefined>('infographic-gradient')

  // Calculate max value
  const calculatedMax = $derived.by(() => {
    if (maxValue !== undefined) return maxValue
    const max = Math.max(...items.map(item => item.value))
    // Round up to nice number
    const magnitude = Math.pow(10, Math.floor(Math.log10(max)))
    return Math.ceil(max / magnitude) * magnitude
  })

  // Layout constants
  const padding = { top: 40, right: 40, bottom: 60, left: 120 }
  const chartWidth = $derived(width - padding.left - padding.right)
  const chartHeight = $derived(height - padding.top - padding.bottom)

  // Calculate bar layouts
  const barLayouts = $derived.by(() => {
    const layouts: BarLayout[] = []
    const itemCount = items.length
    if (itemCount === 0) return layouts

    const gradientDef = gradientConfig
      ? createGradientDef('chart-bar-gradient', themeColors.colorPrimary, gradientConfig)
      : null

    if (orientation === 'horizontal') {
      // Horizontal bars
      const totalBarHeight = chartHeight / itemCount
      const actualBarHeight = totalBarHeight * (1 - barGap)
      const gap = totalBarHeight * barGap

      items.forEach((item, index) => {
        const percentage = (item.value / calculatedMax) * 100
        const barWidth = (percentage / 100) * chartWidth
        const y = padding.top + index * totalBarHeight + gap / 2

        layouts.push({
          data: item,
          index,
          x: padding.left,
          y,
          width: barWidth,
          height: actualBarHeight,
          percentage,
          formattedValue: formatValue(item.value, percentage),
          themeColors,
          gradientId: gradientDef?.id
        })
      })
    } else {
      // Vertical bars
      const totalBarWidth = chartWidth / itemCount
      const actualBarWidth = totalBarWidth * (1 - barGap)
      const gap = totalBarWidth * barGap

      items.forEach((item, index) => {
        const percentage = (item.value / calculatedMax) * 100
        const barHeight = (percentage / 100) * chartHeight
        const x = padding.left + index * totalBarWidth + gap / 2

        layouts.push({
          data: item,
          index,
          x,
          y: padding.top + chartHeight - barHeight,
          width: actualBarWidth,
          height: barHeight,
          percentage,
          formattedValue: formatValue(item.value, percentage),
          themeColors,
          gradientId: gradientDef?.id
        })
      })
    }

    return layouts
  })

  // Gradient definition
  const gradientSVG = $derived.by(() => {
    if (!gradientConfig) return ''
    const def = createGradientDef('chart-bar-gradient', themeColors.colorPrimary, gradientConfig)
    return gradientDefToSVG(def)
  })

  // Grid lines
  const gridLines = $derived.by(() => {
    const lines: { x1: number; y1: number; x2: number; y2: number; label: string }[] = []
    const steps = 5

    for (let i = 0; i <= steps; i++) {
      const value = (calculatedMax / steps) * i
      const label = formatGridValue(value)

      if (orientation === 'horizontal') {
        const x = padding.left + (i / steps) * chartWidth
        lines.push({
          x1: x,
          y1: padding.top,
          x2: x,
          y2: padding.top + chartHeight,
          label
        })
      } else {
        const y = padding.top + chartHeight - (i / steps) * chartHeight
        lines.push({
          x1: padding.left,
          y1: y,
          x2: padding.left + chartWidth,
          y2: y,
          label
        })
      }
    }

    return lines
  })

  // Format value for display
  function formatValue(value: number, percentage: number): string {
    if (showPercentage) {
      return `${percentage.toFixed(0)}%`
    }
    return `${valuePrefix}${formatNumber(value)}${valueSuffix}`
  }

  // Format number with K/M suffix
  function formatNumber(value: number): string {
    if (value >= 1000000) {
      return (value / 1000000).toFixed(1) + 'M'
    }
    if (value >= 1000) {
      return (value / 1000).toFixed(1) + 'K'
    }
    return value.toFixed(0)
  }

  // Format grid value
  function formatGridValue(value: number): string {
    return `${valuePrefix}${formatNumber(value)}${valueSuffix}`
  }

  // Get bar color
  function getBarColor(item: BarDataItem, index: number): string {
    if (item.color) return item.color
    if (gradientConfig) return `url(#chart-bar-gradient)`
    if (paletteColors.length > 0) return paletteColors[index % paletteColors.length]
    return themeColors.colorPrimary
  }
</script>

<svg {width} {height} viewBox="0 0 {width} {height}">
  <!-- Gradient definitions -->
  {#if gradientSVG}
    {@html gradientSVG}
  {/if}

  <!-- Grid lines -->
  {#if showGrid}
    <g class="grid">
      {#each gridLines as line}
        <line
          x1={line.x1}
          y1={line.y1}
          x2={line.x2}
          y2={line.y2}
          stroke={themeColors.colorTextSecondary}
          stroke-opacity="0.2"
          stroke-dasharray="4 4"
        />
        {#if orientation === 'horizontal'}
          <text
            x={line.x1}
            y={padding.top + chartHeight + 20}
            text-anchor="middle"
            fill={themeColors.colorTextSecondary}
            font-size="11"
          >
            {line.label}
          </text>
        {:else}
          <text
            x={padding.left - 10}
            y={line.y1 + 4}
            text-anchor="end"
            fill={themeColors.colorTextSecondary}
            font-size="11"
          >
            {line.label}
          </text>
        {/if}
      {/each}
    </g>
  {/if}

  <!-- Bars -->
  {#each barLayouts as layout}
    {#if bar}
      {@render bar(layout)}
    {:else}
      <g class="bar-group">
        <!-- Bar -->
        <rect
          x={layout.x}
          y={layout.y}
          width={Math.max(0, layout.width)}
          height={Math.max(0, layout.height)}
          rx={cornerRadius}
          ry={cornerRadius}
          fill={getBarColor(layout.data, layout.index)}
        />

        <!-- Label -->
        {#if orientation === 'horizontal'}
          <text
            x={padding.left - 10}
            y={layout.y + layout.height / 2 + 4}
            text-anchor="end"
            fill={themeColors.colorText}
            font-size="13"
            font-weight="500"
          >
            {layout.data.label}
          </text>
        {:else}
          <text
            x={layout.x + layout.width / 2}
            y={padding.top + chartHeight + 20}
            text-anchor="middle"
            fill={themeColors.colorText}
            font-size="12"
            font-weight="500"
            transform="rotate(-45, {layout.x + layout.width / 2}, {padding.top + chartHeight + 20})"
          >
            {layout.data.label}
          </text>
        {/if}

        <!-- Value -->
        {#if showValues}
          {#if orientation === 'horizontal'}
            <text
              x={layout.x + layout.width + 8}
              y={layout.y + layout.height / 2 + 4}
              text-anchor="start"
              fill={themeColors.colorPrimary}
              font-size="12"
              font-weight="600"
            >
              {layout.formattedValue}
            </text>
          {:else}
            <text
              x={layout.x + layout.width / 2}
              y={layout.y - 8}
              text-anchor="middle"
              fill={themeColors.colorPrimary}
              font-size="12"
              font-weight="600"
            >
              {layout.formattedValue}
            </text>
          {/if}
        {/if}
      </g>
    {/if}
  {/each}

  <!-- Axis lines -->
  <line
    x1={padding.left}
    y1={padding.top}
    x2={padding.left}
    y2={padding.top + chartHeight}
    stroke={themeColors.colorTextSecondary}
    stroke-opacity="0.5"
  />
  <line
    x1={padding.left}
    y1={padding.top + chartHeight}
    x2={padding.left + chartWidth}
    y2={padding.top + chartHeight}
    stroke={themeColors.colorTextSecondary}
    stroke-opacity="0.5"
  />
</svg>
