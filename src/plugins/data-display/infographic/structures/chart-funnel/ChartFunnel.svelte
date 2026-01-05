<script lang="ts">
  /**
   * ChartFunnel Structure
   *
   * Funnel chart for conversion/pipeline visualization.
   * Supports tapered and stepped shapes with conversion rate display.
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, GradientConfig } from '../../theme'
  import { createGradientDef, gradientDefToSVG, getPaletteColors } from '../../theme'
  import type { ChartFunnelProps, FunnelStageLayout } from './types'

  let {
    stages = [],
    showValues = true,
    showPercentages = true,
    showConversionRates = false,
    valuePrefix = '',
    valueSuffix = '',
    shape = 'tapered',
    minWidth = 0.3,
    stageGap = 4,
    palette,
    stage,
    width = 500,
    height = 400
  }: ChartFunnelProps = $props()

  // Get theme from context
  const themeColors = getContext<ThemeColors>('infographic-theme')
  const gradientConfig = getContext<GradientConfig | undefined>('infographic-gradient')

  // Layout constants
  const padding = { top: 20, right: 120, bottom: 20, left: 120 }
  const chartWidth = $derived(width - padding.left - padding.right)
  const chartHeight = $derived(height - padding.top - padding.bottom)

  // Get max value (first stage typically)
  const maxValue = $derived(stages.length > 0 ? stages[0].value : 1)

  // Get palette colors
  const paletteColors = $derived(palette ? getPaletteColors(palette, stages.length) : [])

  // Stage colors - prioritize: item color > palette > fallback
  const stageColors = $derived.by(() => {
    const fallbackColors = [
      themeColors.colorPrimary,
      '#6366f1',
      '#10b981',
      '#f59e0b',
      '#ef4444',
      '#8b5cf6'
    ]
    return stages.map((s, i) => {
      if (s.color) return s.color
      if (paletteColors.length > 0) return paletteColors[i % paletteColors.length]
      return fallbackColors[i % fallbackColors.length]
    })
  })

  // Calculate stage layouts
  const stageLayouts = $derived.by(() => {
    const layouts: FunnelStageLayout[] = []
    const stageCount = stages.length
    if (stageCount === 0) return layouts

    const totalGaps = (stageCount - 1) * stageGap
    const stageHeight = (chartHeight - totalGaps) / stageCount
    const centerX = padding.left + chartWidth / 2

    stages.forEach((stageData, index) => {
      const percentage = (stageData.value / maxValue) * 100
      const conversionRate = index > 0
        ? (stageData.value / stages[index - 1].value) * 100
        : 100

      let topWidth: number
      let bottomWidth: number

      if (shape === 'stepped') {
        // Stepped: each stage has proportional width
        const widthRatio = stageData.value / maxValue
        const adjustedRatio = minWidth + (1 - minWidth) * widthRatio
        topWidth = chartWidth * adjustedRatio
        bottomWidth = topWidth
      } else {
        // Tapered: continuous taper
        const topRatio = index === 0 ? 1 : stages[index - 1].value / maxValue
        const bottomRatio = stageData.value / maxValue
        topWidth = chartWidth * (minWidth + (1 - minWidth) * topRatio)
        bottomWidth = chartWidth * (minWidth + (1 - minWidth) * bottomRatio)
      }

      const y = padding.top + index * (stageHeight + stageGap)

      layouts.push({
        data: stageData,
        index,
        topWidth,
        bottomWidth,
        x: centerX,
        y,
        height: stageHeight,
        percentage,
        conversionRate,
        themeColors,
        gradientId: gradientConfig ? `funnel-gradient-${index}` : undefined
      })
    })

    return layouts
  })

  // Generate trapezoid path
  function generateTrapezoidPath(layout: FunnelStageLayout): string {
    const halfTopWidth = layout.topWidth / 2
    const halfBottomWidth = layout.bottomWidth / 2
    const x = layout.x
    const y = layout.y
    const h = layout.height

    return `
      M ${x - halfTopWidth} ${y}
      L ${x + halfTopWidth} ${y}
      L ${x + halfBottomWidth} ${y + h}
      L ${x - halfBottomWidth} ${y + h}
      Z
    `
  }

  // Format value
  function formatValue(value: number): string {
    if (value >= 1000000) return `${valuePrefix}${(value / 1000000).toFixed(1)}M${valueSuffix}`
    if (value >= 1000) return `${valuePrefix}${(value / 1000).toFixed(1)}K${valueSuffix}`
    return `${valuePrefix}${value.toFixed(0)}${valueSuffix}`
  }

  // Gradient definitions
  const gradientDefs = $derived.by(() => {
    if (!gradientConfig) return []
    return stages.map((_, i) =>
      createGradientDef(`funnel-gradient-${i}`, stageColors[i], gradientConfig)
    )
  })
</script>

<svg {width} {height} viewBox="0 0 {width} {height}">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as def}
      {@html gradientDefToSVG(def)}
    {/each}
  </defs>

  <!-- Stages -->
  {#each stageLayouts as layout, i}
    {#if stage}
      {@render stage(layout)}
    {:else}
      <g class="funnel-stage">
        <!-- Stage shape -->
        <path
          d={generateTrapezoidPath(layout)}
          fill={layout.gradientId ? `url(#${layout.gradientId})` : stageColors[i]}
          opacity="0.9"
        />

        <!-- Stage label (left) -->
        <text
          x={layout.x - layout.topWidth / 2 - 15}
          y={layout.y + layout.height / 2 + 4}
          text-anchor="end"
          fill={themeColors.colorText}
          font-size="13"
          font-weight="500"
        >
          {layout.data.label}
        </text>

        <!-- Value (right) -->
        {#if showValues}
          <text
            x={layout.x + layout.topWidth / 2 + 15}
            y={layout.y + layout.height / 2}
            text-anchor="start"
            fill={themeColors.colorText}
            font-size="14"
            font-weight="600"
          >
            {formatValue(layout.data.value)}
          </text>
        {/if}

        <!-- Percentage -->
        {#if showPercentages}
          <text
            x={layout.x + layout.topWidth / 2 + 15}
            y={layout.y + layout.height / 2 + 16}
            text-anchor="start"
            fill={themeColors.colorTextSecondary}
            font-size="11"
          >
            {layout.percentage.toFixed(1)}%
          </text>
        {/if}

        <!-- Conversion rate arrow -->
        {#if showConversionRates && i > 0}
          <g transform="translate({layout.x}, {layout.y - stageGap / 2})">
            <text
              x="0"
              y="0"
              text-anchor="middle"
              fill={layout.conversionRate >= 50 ? '#10b981' : layout.conversionRate >= 25 ? '#f59e0b' : '#ef4444'}
              font-size="10"
              font-weight="500"
            >
              ↓ {layout.conversionRate.toFixed(0)}%
            </text>
          </g>
        {/if}

        <!-- Center value (inside stage) -->
        <text
          x={layout.x}
          y={layout.y + layout.height / 2 + 5}
          text-anchor="middle"
          fill="white"
          font-size="12"
          font-weight="600"
          opacity="0.9"
        >
          {layout.percentage.toFixed(0)}%
        </text>
      </g>
    {/if}
  {/each}
</svg>
