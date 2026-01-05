<script lang="ts">
  /**
   * StatCard Item Component
   *
   * A card displaying a statistic value with optional trend indicator,
   * comparison value, and sparkline. Great for KPI displays.
   *
   * @example
   * ```svelte
   * <StatCard
   *   label="Revenue"
   *   value="$1.2M"
   *   trend={12.5}
   *   trendLabel="vs last month"
   *   themeColors={colors}
   *   width={180}
   *   height={100}
   * />
   * ```
   */
  import type { ThemeColors } from '../theme'
  import { gradientUrl } from '../theme'
  import { getIconPath } from '../icons/mdi-paths'

  /**
   * Trend direction
   */
  export type TrendDirection = 'up' | 'down' | 'neutral'

  interface Props {
    /** Main label/title */
    label: string
    /** Primary value to display */
    value: string | number
    /** Trend percentage (positive = up, negative = down) */
    trend?: number
    /** Label for trend context (e.g., "vs last month") */
    trendLabel?: string
    /** Secondary/comparison value */
    compareValue?: string | number
    /** Compare label */
    compareLabel?: string
    /** Icon name */
    icon?: string
    /** Theme colors */
    themeColors: ThemeColors
    /** Card width */
    width?: number
    /** Card height */
    height?: number
    /** Gradient ID */
    gradientId?: string
    /** Border radius */
    borderRadius?: number
    /** Show accent bar on left */
    showAccent?: boolean
    /** Invert trend colors (down is good) */
    invertTrend?: boolean
    /** Format value as currency */
    prefix?: string
    /** Value suffix */
    suffix?: string
  }

  let {
    label,
    value,
    trend,
    trendLabel,
    compareValue,
    compareLabel,
    icon,
    themeColors,
    width = 180,
    height = 100,
    gradientId,
    borderRadius = 8,
    showAccent = true,
    invertTrend = false,
    prefix = '',
    suffix = ''
  }: Props = $props()

  // Layout calculations
  const accentWidth = $derived(showAccent ? 4 : 0)
  const contentX = $derived(accentWidth + 12)
  const contentWidth = $derived(width - contentX - 12)
  const iconPath = $derived(icon ? getIconPath(icon) : null)
  const iconSize = 20

  // Trend calculations
  const trendDirection = $derived.by<TrendDirection>(() => {
    if (trend === undefined || trend === 0) return 'neutral'
    return trend > 0 ? 'up' : 'down'
  })

  const trendColor = $derived.by(() => {
    const dir = trendDirection
    if (dir === 'neutral') return themeColors.colorTextSecondary
    const isPositive = invertTrend ? dir === 'down' : dir === 'up'
    return isPositive ? '#22c55e' : '#ef4444' // Green / Red
  })

  const trendIconPath = $derived.by(() => {
    const dir = trendDirection
    if (dir === 'up') return getIconPath('trending-up')
    if (dir === 'down') return getIconPath('trending-down')
    return getIconPath('minus')
  })

  const formattedTrend = $derived.by(() => {
    if (trend === undefined) return ''
    const absValue = Math.abs(trend)
    const sign = trend >= 0 ? '+' : ''
    return `${sign}${absValue.toFixed(1)}%`
  })

  // Formatted value
  const displayValue = $derived(`${prefix}${value}${suffix}`)

  // Text positions
  const labelY = $derived(icon ? 18 : 20)
  const valueY = $derived(icon ? 45 : 50)
  const trendY = $derived(height - 22)

  // Fill colors
  const accentFill = $derived(
    gradientId ? gradientUrl(gradientId) : themeColors.colorPrimary
  )
</script>

<g class="stat-card">
  <!-- Card background -->
  <rect
    x="0"
    y="0"
    {width}
    {height}
    rx={borderRadius}
    fill={themeColors.colorBgElevated}
  />

  <!-- Accent bar -->
  {#if showAccent}
    <rect
      x="0"
      y="0"
      width={accentWidth}
      {height}
      rx={borderRadius / 2}
      fill={accentFill}
    />
    <!-- Clip right corners -->
    <rect
      x={accentWidth / 2}
      y="0"
      width={accentWidth / 2}
      {height}
      fill={accentFill}
    />
  {/if}

  <!-- Icon (if present) -->
  {#if iconPath}
    <g transform="translate({width - iconSize - 12}, 12)">
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
        <path d={iconPath} fill={themeColors.colorTextSecondary} opacity="0.6" />
      </svg>
    </g>
  {/if}

  <!-- Label -->
  <text
    x={contentX}
    y={labelY}
    fill={themeColors.colorTextSecondary}
    font-size="11"
    font-weight="500"
  >
    {label}
  </text>

  <!-- Primary value -->
  <text
    x={contentX}
    y={valueY}
    fill={themeColors.colorText}
    font-size="22"
    font-weight="700"
  >
    {displayValue}
  </text>

  <!-- Compare value (if present) -->
  {#if compareValue !== undefined}
    <text
      x={contentX}
      y={valueY + 18}
      fill={themeColors.colorTextSecondary}
      font-size="11"
    >
      {compareLabel ? `${compareLabel}: ` : ''}{compareValue}
    </text>
  {/if}

  <!-- Trend indicator -->
  {#if trend !== undefined}
    <g transform="translate({contentX}, {trendY - 10})">
      <!-- Trend icon -->
      {#if trendIconPath}
        <svg viewBox="0 0 24 24" width="14" height="14">
          <path d={trendIconPath} fill={trendColor} />
        </svg>
      {/if}
      <!-- Trend value -->
      <text
        x="18"
        y="11"
        fill={trendColor}
        font-size="12"
        font-weight="600"
      >
        {formattedTrend}
      </text>
      <!-- Trend label -->
      {#if trendLabel}
        <text
          x={18 + formattedTrend.length * 7}
          y="11"
          fill={themeColors.colorTextSecondary}
          font-size="10"
        >
          {trendLabel}
        </text>
      {/if}
    </g>
  {/if}
</g>
