<script lang="ts">
  /**
   * IconArrowNode Item Component
   *
   * A node with icon, label, and optional description.
   * Used in horizontal list layouts for process flows.
   */
  import { getIconPath } from '../icons/mdi-paths'
  import type { ThemeColors } from '../theme'
  import { gradientUrl } from '../theme'

  interface Props {
    /** Item label */
    label: string
    /** Optional description */
    desc?: string
    /** Icon name */
    icon?: string
    /** Theme colors for this item */
    themeColors: ThemeColors
    /** Width of the node */
    width?: number
    /** Height of the node */
    height?: number
    /** Gradient ID if gradients enabled */
    gradientId?: string
    /** Border radius */
    borderRadius?: number
    /** Icon size */
    iconSize?: number
    /** Label font size */
    labelFontSize?: number
    /** Description font size */
    descFontSize?: number
  }

  let {
    label,
    desc,
    icon = 'circle',
    themeColors,
    width = 140,
    height = 120,
    gradientId,
    borderRadius = 12,
    iconSize = 32,
    labelFontSize = 14,
    descFontSize = 11
  }: Props = $props()

  const iconPath = $derived(getIconPath(icon))
  const fill = $derived(gradientId ? gradientUrl(gradientId) : themeColors.colorPrimary)

  // Layout calculations
  const centerX = $derived(width / 2)
  const iconY = $derived(height * 0.25)
  const labelY = $derived(height * 0.58)
  const descY = $derived(height * 0.78)

  // Text wrapping helper
  function truncateText(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text
    return text.slice(0, maxChars - 1) + '…'
  }

  const maxLabelChars = $derived(Math.floor(width / (labelFontSize * 0.6)))
  const maxDescChars = $derived(Math.floor(width / (descFontSize * 0.5)))
</script>

<g class="icon-arrow-node">
  <!-- Background -->
  <rect
    x="0"
    y="0"
    {width}
    {height}
    rx={borderRadius}
    {fill}
  />

  <!-- Icon -->
  {#if iconPath}
    <g transform="translate({centerX - iconSize / 2}, {iconY - iconSize / 2})">
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
        <path d={iconPath} fill={themeColors.colorWhite} />
      </svg>
    </g>
  {:else}
    <!-- Fallback circle icon -->
    <circle
      cx={centerX}
      cy={iconY}
      r={iconSize / 2 - 4}
      fill="none"
      stroke={themeColors.colorWhite}
      stroke-width="2"
    />
  {/if}

  <!-- Label -->
  <text
    x={centerX}
    y={labelY}
    text-anchor="middle"
    dominant-baseline="middle"
    fill={themeColors.colorWhite}
    font-size={labelFontSize}
    font-weight="600"
  >
    {truncateText(label, maxLabelChars)}
  </text>

  <!-- Description -->
  {#if desc}
    <text
      x={centerX}
      y={descY}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={themeColors.colorWhite}
      font-size={descFontSize}
      opacity="0.8"
    >
      {truncateText(desc, maxDescChars)}
    </text>
  {/if}
</g>
