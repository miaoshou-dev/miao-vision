<script lang="ts">
  /**
   * ChartLine Structure
   *
   * Line chart infographic with multiple series support.
   * Supports smooth curves, area fills, and custom point rendering.
   */
  import { getContext } from 'svelte'
  import type { ThemeColors } from '../../theme'
  import { getPaletteColors } from '../../theme'
  import type { ChartLineProps, PointLayout } from './types'

  let {
    series = [],
    showPoints = true,
    pointRadius = 5,
    lineWidth = 2,
    showGrid = true,
    showXLabels = true,
    showYLabels = true,
    valuePrefix = '',
    valueSuffix = '',
    curveType = 'smooth',
    palette,
    point,
    width = 600,
    height = 400
  }: ChartLineProps = $props()

  // Get theme from context
  const themeColors = getContext<ThemeColors>('infographic-theme')

  // Get palette colors
  const paletteColors = $derived(palette ? getPaletteColors(palette, series.length) : [])

  // Layout constants
  const padding = { top: 40, right: 40, bottom: 60, left: 60 }
  const chartWidth = $derived(width - padding.left - padding.right)
  const chartHeight = $derived(height - padding.top - padding.bottom)

  // Get all unique X labels
  const xLabels = $derived.by(() => {
    const labels = new Set<string>()
    series.forEach(s => s.points.forEach(p => labels.add(p.label)))
    return Array.from(labels)
  })

  // Calculate Y range
  const yRange = $derived.by(() => {
    let min = Infinity
    let max = -Infinity
    series.forEach(s => {
      s.points.forEach(p => {
        min = Math.min(min, p.value)
        max = Math.max(max, p.value)
      })
    })
    // Add some padding
    const range = max - min || 1
    return {
      min: Math.max(0, min - range * 0.1),
      max: max + range * 0.1
    }
  })

  // Series colors - prioritize: item color > palette > fallback
  const seriesColors = $derived.by(() => {
    const fallbackColors = [
      themeColors.colorPrimary,
      '#10b981', // emerald
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6'  // violet
    ]
    return series.map((s, i) => {
      if (s.color) return s.color
      if (paletteColors.length > 0) return paletteColors[i % paletteColors.length]
      return fallbackColors[i % fallbackColors.length]
    })
  })

  // Calculate point positions for each series
  const seriesLayouts = $derived.by(() => {
    return series.map((s, seriesIndex) => {
      const points: PointLayout[] = s.points.map((p, i) => {
        const xIndex = xLabels.indexOf(p.label)
        const x = padding.left + (xIndex / Math.max(1, xLabels.length - 1)) * chartWidth
        const yNorm = (p.value - yRange.min) / (yRange.max - yRange.min)
        const y = padding.top + chartHeight - yNorm * chartHeight

        return {
          data: p,
          series: s,
          index: i,
          x,
          y,
          themeColors
        }
      })
      return { series: s, points, color: seriesColors[seriesIndex] }
    })
  })

  // Generate path for a series
  function generatePath(points: PointLayout[]): string {
    if (points.length === 0) return ''

    if (curveType === 'linear') {
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
    }

    if (curveType === 'step') {
      let path = `M ${points[0].x} ${points[0].y}`
      for (let i = 1; i < points.length; i++) {
        path += ` H ${points[i].x} V ${points[i].y}`
      }
      return path
    }

    // Smooth curve (catmull-rom to bezier)
    if (points.length < 2) return `M ${points[0].x} ${points[0].y}`

    let path = `M ${points[0].x} ${points[0].y}`

    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[Math.max(0, i - 1)]
      const p1 = points[i]
      const p2 = points[i + 1]
      const p3 = points[Math.min(points.length - 1, i + 2)]

      const cp1x = p1.x + (p2.x - p0.x) / 6
      const cp1y = p1.y + (p2.y - p0.y) / 6
      const cp2x = p2.x - (p3.x - p1.x) / 6
      const cp2y = p2.y - (p3.y - p1.y) / 6

      path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`
    }

    return path
  }

  // Generate area path
  function generateAreaPath(points: PointLayout[]): string {
    if (points.length === 0) return ''
    const linePath = generatePath(points)
    const lastPoint = points[points.length - 1]
    const firstPoint = points[0]
    const baseline = padding.top + chartHeight
    return `${linePath} L ${lastPoint.x} ${baseline} L ${firstPoint.x} ${baseline} Z`
  }

  // Get line dash array
  function getLineDash(style: string | undefined): string {
    switch (style) {
      case 'dashed': return '8 4'
      case 'dotted': return '2 4'
      default: return 'none'
    }
  }

  // Grid lines
  const yGridLines = $derived.by(() => {
    const lines: { y: number; label: string }[] = []
    const steps = 5
    for (let i = 0; i <= steps; i++) {
      const value = yRange.min + ((yRange.max - yRange.min) / steps) * i
      const y = padding.top + chartHeight - (i / steps) * chartHeight
      lines.push({ y, label: formatValue(value) })
    }
    return lines
  })

  // Format value
  function formatValue(value: number): string {
    if (value >= 1000000) return `${valuePrefix}${(value / 1000000).toFixed(1)}M${valueSuffix}`
    if (value >= 1000) return `${valuePrefix}${(value / 1000).toFixed(1)}K${valueSuffix}`
    return `${valuePrefix}${value.toFixed(0)}${valueSuffix}`
  }
</script>

<svg {width} {height} viewBox="0 0 {width} {height}">
  <!-- Grid lines -->
  {#if showGrid}
    <g class="grid">
      <!-- Horizontal grid lines -->
      {#each yGridLines as line}
        <line
          x1={padding.left}
          y1={line.y}
          x2={padding.left + chartWidth}
          y2={line.y}
          stroke={themeColors.colorTextSecondary}
          stroke-opacity="0.2"
          stroke-dasharray="4 4"
        />
        {#if showYLabels}
          <text
            x={padding.left - 10}
            y={line.y + 4}
            text-anchor="end"
            fill={themeColors.colorTextSecondary}
            font-size="11"
          >
            {line.label}
          </text>
        {/if}
      {/each}

      <!-- Vertical grid lines for each X label -->
      {#each xLabels as label, i}
        {@const x = padding.left + (i / Math.max(1, xLabels.length - 1)) * chartWidth}
        <line
          x1={x}
          y1={padding.top}
          x2={x}
          y2={padding.top + chartHeight}
          stroke={themeColors.colorTextSecondary}
          stroke-opacity="0.1"
        />
        {#if showXLabels}
          <text
            x={x}
            y={padding.top + chartHeight + 20}
            text-anchor="middle"
            fill={themeColors.colorTextSecondary}
            font-size="11"
          >
            {label}
          </text>
        {/if}
      {/each}
    </g>
  {/if}

  <!-- Series -->
  {#each seriesLayouts as layout}
    <!-- Area fill -->
    {#if layout.series.showArea}
      <path
        d={generateAreaPath(layout.points)}
        fill={layout.color}
        fill-opacity="0.15"
      />
    {/if}

    <!-- Line -->
    <path
      d={generatePath(layout.points)}
      fill="none"
      stroke={layout.color}
      stroke-width={lineWidth}
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-dasharray={getLineDash(layout.series.lineStyle)}
    />

    <!-- Points -->
    {#if showPoints}
      {#each layout.points as pointLayout}
        {#if point}
          {@render point(pointLayout)}
        {:else}
          <circle
            cx={pointLayout.x}
            cy={pointLayout.y}
            r={pointRadius}
            fill={themeColors.colorBg}
            stroke={layout.color}
            stroke-width="2"
          />
        {/if}
      {/each}
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

  <!-- Legend -->
  {#if series.length > 1}
    <g class="legend" transform="translate({padding.left}, {height - 20})">
      {#each series as s, i}
        {@const xOffset = i * 120}
        <rect x={xOffset} y="-6" width="16" height="3" rx="1" fill={seriesColors[i]} />
        <text x={xOffset + 22} y="0" fill={themeColors.colorText} font-size="11">
          {s.name}
        </text>
      {/each}
    </g>
  {/if}
</svg>
