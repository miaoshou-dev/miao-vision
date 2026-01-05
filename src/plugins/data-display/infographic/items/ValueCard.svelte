<script lang="ts">
  /**
   * ValueCard Item Component
   *
   * A card focused on displaying a large value/metric.
   * Ideal for KPIs, statistics, and key numbers.
   */
  import { getIconPath } from '../icons/mdi-paths'
  import type { ThemeColors } from '../theme'
  import { gradientUrl } from '../theme'

  interface Props {
    /** The main value to display */
    value: string | number
    /** Label/title for the value */
    label: string
    /** Optional description or unit */
    desc?: string
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
    /** Value font size */
    valueFontSize?: number
    /** Show background fill */
    showBackground?: boolean
    /** Layout variant */
    variant?: 'default' | 'compact' | 'icon-left'
  }

  let {
    value,
    label,
    desc,
    icon,
    themeColors,
    width = 140,
    height = 100,
    gradientId,
    borderRadius = 10,
    valueFontSize = 24,
    showBackground = true,
    variant = 'default'
  }: Props = $props()

  const iconPath = $derived(getIconPath(icon || ''))
  const fill = $derived(gradientId ? gradientUrl(gradientId) : themeColors.colorPrimary)

  // Layout based on variant
  const centerX = $derived(width / 2)

  // Icon-left variant calculations
  const iconLeftOffset = $derived(variant === 'icon-left' ? 40 : 0)
  const contentCenterX = $derived(variant === 'icon-left' ? (width + iconLeftOffset) / 2 : centerX)
</script>

<g class="value-card">
  <!-- Background -->
  {#if showBackground}
    <rect
      x="0"
      y="0"
      {width}
      {height}
      rx={borderRadius}
      fill={fill}
    />
  {/if}

  {#if variant === 'icon-left' && iconPath}
    <!-- Icon on the left -->
    <g transform="translate(12, {height / 2 - 16})">
      <svg viewBox="0 0 24 24" width="32" height="32">
        <path d={iconPath} fill={showBackground ? themeColors.colorWhite : themeColors.colorPrimary} opacity="0.8" />
      </svg>
    </g>

    <!-- Value -->
    <text
      x={contentCenterX}
      y={height * 0.4}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={showBackground ? themeColors.colorWhite : themeColors.colorText}
      font-size={valueFontSize}
      font-weight="700"
    >
      {value}
    </text>

    <!-- Label -->
    <text
      x={contentCenterX}
      y={height * 0.7}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={showBackground ? themeColors.colorWhite : themeColors.colorTextSecondary}
      font-size="11"
      opacity="0.9"
    >
      {label}
    </text>

  {:else if variant === 'compact'}
    <!-- Compact: Value and label side by side -->
    <text
      x={width * 0.35}
      y={height / 2}
      text-anchor="end"
      dominant-baseline="middle"
      fill={showBackground ? themeColors.colorWhite : themeColors.colorText}
      font-size={valueFontSize}
      font-weight="700"
    >
      {value}
    </text>

    <text
      x={width * 0.4}
      y={height / 2}
      text-anchor="start"
      dominant-baseline="middle"
      fill={showBackground ? themeColors.colorWhite : themeColors.colorTextSecondary}
      font-size="12"
      opacity="0.9"
    >
      {label}
    </text>

  {:else}
    <!-- Default: Stacked layout -->
    {#if iconPath}
      <g transform="translate({centerX - 12}, {height * 0.15})">
        <svg viewBox="0 0 24 24" width="24" height="24">
          <path d={iconPath} fill={showBackground ? themeColors.colorWhite : themeColors.colorPrimary} opacity="0.7" />
        </svg>
      </g>
    {/if}

    <!-- Value -->
    <text
      x={centerX}
      y={iconPath ? height * 0.52 : height * 0.42}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={showBackground ? themeColors.colorWhite : themeColors.colorText}
      font-size={valueFontSize}
      font-weight="700"
    >
      {value}
    </text>

    <!-- Label -->
    <text
      x={centerX}
      y={height * 0.75}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={showBackground ? themeColors.colorWhite : themeColors.colorTextSecondary}
      font-size="11"
      opacity="0.9"
    >
      {label}
    </text>

    <!-- Description -->
    {#if desc}
      <text
        x={centerX}
        y={height * 0.9}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={showBackground ? themeColors.colorWhite : themeColors.colorTextSecondary}
        font-size="9"
        opacity="0.7"
      >
        {desc}
      </text>
    {/if}
  {/if}
</g>
