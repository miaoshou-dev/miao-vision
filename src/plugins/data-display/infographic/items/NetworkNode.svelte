<script lang="ts">
  /**
   * NetworkNode Item Component
   *
   * A circular node for network graph visualization.
   * Supports icon, label, and optional description.
   */
  import { getIconPath } from '../icons/mdi-paths'
  import type { ThemeColors } from '../theme'
  import { gradientUrl } from '../theme'

  interface Props {
    /** Node label */
    label: string
    /** Optional description */
    desc?: string
    /** Icon name */
    icon?: string
    /** Theme colors for this node */
    themeColors: ThemeColors
    /** Node radius */
    radius?: number
    /** Gradient ID if gradients enabled */
    gradientId?: string
    /** Show label below node */
    showLabel?: boolean
  }

  let {
    label,
    desc,
    icon,
    themeColors,
    radius = 30,
    gradientId,
    showLabel = true
  }: Props = $props()

  const iconPath = $derived(icon ? getIconPath(icon) : null)
  const fill = $derived(gradientId ? gradientUrl(gradientId) : themeColors.colorPrimary)

  // Icon size based on radius
  const iconSize = $derived(Math.min(24, radius * 0.8))

  // Label truncation
  function truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text
    return text.slice(0, maxChars - 1) + '…'
  }
</script>

<g class="network-node">
  <!-- Circle background -->
  <circle
    cx="0"
    cy="0"
    r={radius}
    fill={fill}
  />

  <!-- Inner circle (subtle highlight) -->
  <circle
    cx="0"
    cy="0"
    r={radius - 3}
    fill="none"
    stroke={themeColors.colorWhite}
    stroke-width="1"
    opacity="0.2"
  />

  <!-- Icon or initial letter -->
  {#if iconPath}
    <g transform="translate({-iconSize / 2}, {-iconSize / 2})">
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
        <path d={iconPath} fill={themeColors.colorWhite} />
      </svg>
    </g>
  {:else}
    <!-- Show first letter if no icon -->
    <text
      x="0"
      y="0"
      text-anchor="middle"
      dominant-baseline="middle"
      fill={themeColors.colorWhite}
      font-size={radius * 0.6}
      font-weight="700"
    >
      {label.charAt(0).toUpperCase()}
    </text>
  {/if}

  <!-- Label below node -->
  {#if showLabel}
    <text
      x="0"
      y={radius + 14}
      text-anchor="middle"
      fill={themeColors.colorText || '#fff'}
      font-size="11"
      font-weight="500"
    >
      {truncate(label, 12)}
    </text>
    {#if desc}
      <text
        x="0"
        y={radius + 26}
        text-anchor="middle"
        fill={themeColors.colorTextSecondary || '#a0a0b0'}
        font-size="9"
      >
        {truncate(desc, 15)}
      </text>
    {/if}
  {/if}
</g>
