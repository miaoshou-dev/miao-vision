<script lang="ts">
  /**
   * BadgeCard Item Component
   *
   * A card with a colored badge/header section and content area.
   * Great for categorized information display.
   */
  import { getIconPath } from '../icons/mdi-paths'
  import type { ThemeColors } from '../theme'
  import { gradientUrl } from '../theme'

  interface Props {
    /** Main label/title */
    label: string
    /** Description text */
    desc?: string
    /** Optional value */
    value?: string | number
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
    /** Badge height ratio (0-1) */
    badgeRatio?: number
    /** Border radius */
    borderRadius?: number
  }

  let {
    label,
    desc,
    value,
    icon,
    themeColors,
    width = 160,
    height = 120,
    gradientId,
    badgeRatio = 0.4,
    borderRadius = 10
  }: Props = $props()

  const iconPath = $derived(getIconPath(icon || 'circle'))
  const badgeFill = $derived(gradientId ? gradientUrl(gradientId) : themeColors.colorPrimary)

  // Layout calculations
  const badgeHeight = $derived(height * badgeRatio)
  const contentHeight = $derived(height - badgeHeight)
  const centerX = $derived(width / 2)
  const iconSize = $derived(Math.min(24, badgeHeight * 0.5))
  const iconY = $derived(badgeHeight / 2)

  // Text positions
  const labelY = $derived(badgeHeight + contentHeight * 0.35)
  const valueY = $derived(badgeHeight + contentHeight * 0.6)
  const descY = $derived(badgeHeight + contentHeight * 0.85)
</script>

<g class="badge-card">
  <!-- Card background -->
  <rect
    x="0"
    y="0"
    {width}
    {height}
    rx={borderRadius}
    fill={themeColors.colorBgElevated}
  />

  <!-- Badge header -->
  <clipPath id="badge-clip-{gradientId || label}">
    <rect
      x="0"
      y="0"
      {width}
      height={badgeHeight}
      rx={borderRadius}
    />
    <rect
      x="0"
      y={borderRadius}
      {width}
      height={badgeHeight - borderRadius}
    />
  </clipPath>

  <rect
    x="0"
    y="0"
    {width}
    height={badgeHeight}
    fill={badgeFill}
    clip-path="url(#badge-clip-{gradientId || label})"
  />

  <!-- Icon in badge -->
  {#if iconPath}
    <g transform="translate({centerX - iconSize / 2}, {iconY - iconSize / 2})">
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
        <path d={iconPath} fill={themeColors.colorWhite} />
      </svg>
    </g>
  {/if}

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
    {label}
  </text>

  <!-- Value -->
  {#if value !== undefined}
    <text
      x={centerX}
      y={valueY}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={themeColors.colorPrimary}
      font-size="16"
      font-weight="700"
    >
      {value}
    </text>
  {/if}

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
      {desc}
    </text>
  {/if}
</g>
