<script lang="ts">
  /**
   * CircularProgress Item Component
   *
   * A circular progress indicator with value display.
   * Great for showing completion percentages, scores, or ratios.
   */
  import { getIconPath } from '../icons/mdi-paths'
  import type { ThemeColors } from '../theme'
  import { gradientUrl } from '../theme'

  interface Props {
    /** Main label/title */
    label: string
    /** Current value (0-max) */
    value: number
    /** Maximum value (default 100) */
    max?: number
    /** Description text */
    desc?: string
    /** Icon name (shown in center when no value) */
    icon?: string
    /** Theme colors */
    themeColors: ThemeColors
    /** Card width */
    width?: number
    /** Card height */
    height?: number
    /** Gradient ID */
    gradientId?: string
    /** Show percentage instead of value */
    showPercent?: boolean
    /** Value format suffix */
    suffix?: string
    /** Ring stroke width */
    strokeWidth?: number
  }

  let {
    label,
    value,
    max = 100,
    desc,
    icon,
    themeColors,
    width = 140,
    height = 160,
    gradientId,
    showPercent = true,
    suffix = '%',
    strokeWidth = 8
  }: Props = $props()

  // Calculations
  const centerX = $derived(width / 2)
  const ringCenterY = $derived(height * 0.4)
  const ringRadius = $derived(Math.min(width, height * 0.6) / 2 - strokeWidth - 4)
  const circumference = $derived(2 * Math.PI * ringRadius)
  const percent = $derived(Math.min(100, Math.max(0, (value / max) * 100)))
  const progressOffset = $derived(circumference - (percent / 100) * circumference)

  // Display value
  const displayValue = $derived(showPercent ? Math.round(percent) : value)
  const displaySuffix = $derived(showPercent ? '%' : suffix || '')

  // Fill colors
  const progressFill = $derived(gradientId ? gradientUrl(gradientId) : themeColors.colorPrimary)
  const trackFill = $derived(themeColors.colorBgElevated)

  // Icon path
  const iconPath = $derived(icon ? getIconPath(icon) : null)
  const iconSize = $derived(20)

  // Text positions
  const labelY = $derived(height * 0.78)
  const descY = $derived(height * 0.92)
</script>

<g class="circular-progress">
  <!-- Background -->
  <rect
    x="0"
    y="0"
    {width}
    {height}
    rx="10"
    fill={themeColors.colorBg}
    opacity="0.5"
  />

  <!-- Track ring (background) -->
  <circle
    cx={centerX}
    cy={ringCenterY}
    r={ringRadius}
    fill="none"
    stroke={trackFill}
    stroke-width={strokeWidth}
    opacity="0.3"
  />

  <!-- Progress ring -->
  <circle
    cx={centerX}
    cy={ringCenterY}
    r={ringRadius}
    fill="none"
    stroke={progressFill}
    stroke-width={strokeWidth}
    stroke-linecap="round"
    stroke-dasharray={circumference}
    stroke-dashoffset={progressOffset}
    transform="rotate(-90 {centerX} {ringCenterY})"
  >
    <!-- Animate on mount -->
    <animate
      attributeName="stroke-dashoffset"
      from={circumference}
      to={progressOffset}
      dur="0.8s"
      fill="freeze"
      calcMode="spline"
      keySplines="0.4 0 0.2 1"
    />
  </circle>

  <!-- Center content -->
  <g transform="translate({centerX}, {ringCenterY})">
    {#if iconPath}
      <!-- Icon mode -->
      <g transform="translate({-iconSize / 2}, {-iconSize / 2})">
        <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
          <path d={iconPath} fill={themeColors.colorPrimary} />
        </svg>
      </g>
      <!-- Small value below icon -->
      <text
        x="0"
        y={iconSize / 2 + 12}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={themeColors.colorText}
        font-size="12"
        font-weight="600"
      >
        {displayValue}{displaySuffix}
      </text>
    {:else}
      <!-- Value display -->
      <text
        x="0"
        y="-4"
        text-anchor="middle"
        dominant-baseline="middle"
        fill={themeColors.colorText}
        font-size="24"
        font-weight="700"
      >
        {displayValue}
      </text>
      <text
        x="0"
        y="14"
        text-anchor="middle"
        dominant-baseline="middle"
        fill={themeColors.colorTextSecondary}
        font-size="12"
        font-weight="500"
      >
        {displaySuffix}
      </text>
    {/if}
  </g>

  <!-- Label -->
  <text
    x={centerX}
    y={labelY}
    text-anchor="middle"
    dominant-baseline="middle"
    fill={themeColors.colorText}
    font-size="13"
    font-weight="600"
  >
    {label.length > 12 ? label.slice(0, 12) + '...' : label}
  </text>

  <!-- Description -->
  {#if desc}
    <text
      x={centerX}
      y={descY}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={themeColors.colorTextSecondary}
      font-size="10"
    >
      {desc.length > 16 ? desc.slice(0, 16) + '...' : desc}
    </text>
  {/if}
</g>
