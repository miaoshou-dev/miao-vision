<script lang="ts">
  /**
   * MindMapNode Item Component
   *
   * A node for mind map visualization with icon and label.
   * Supports different styles for root vs branch nodes.
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
    /** Width of the node */
    width?: number
    /** Height of the node */
    height?: number
    /** Gradient ID if gradients enabled */
    gradientId?: string
    /** Is this the root node */
    isRoot?: boolean
    /** Depth level */
    depth?: number
  }

  let {
    label,
    desc,
    icon,
    themeColors,
    width = 120,
    height = 40,
    gradientId,
    isRoot = false,
    depth = 0
  }: Props = $props()

  const iconPath = $derived(icon ? getIconPath(icon) : null)
  const fill = $derived(gradientId ? gradientUrl(gradientId) : themeColors.colorPrimary)

  // Root nodes are pill-shaped, others are rounded rectangles
  const rx = $derived(isRoot ? height / 2 : 8)

  // Icon size based on node size
  const iconSize = $derived(Math.min(20, height * 0.5))

  // Layout calculations
  const hasIcon = $derived(!!iconPath)
  const contentX = $derived(hasIcon ? iconSize + 8 : 8)
  const textWidth = $derived(width - contentX - 8)

  // Font sizes based on depth
  const fontSize = $derived(isRoot ? 14 : Math.max(10, 13 - depth))
  const fontWeight = $derived(isRoot ? '700' : '500')

  // Text truncation
  function truncate(text: string, maxChars: number): string {
    if (text.length <= maxChars) return text
    return text.slice(0, maxChars - 1) + '…'
  }

  const maxChars = $derived(Math.floor(textWidth / (fontSize * 0.6)))
</script>

<g class="mind-map-node" class:is-root={isRoot}>
  <!-- Background -->
  <rect
    x="0"
    y="0"
    {width}
    {height}
    {rx}
    fill={fill}
  />

  <!-- Icon -->
  {#if iconPath}
    <g transform="translate({6}, {(height - iconSize) / 2})">
      <svg viewBox="0 0 24 24" width={iconSize} height={iconSize}>
        <path d={iconPath} fill={themeColors.colorWhite} />
      </svg>
    </g>
  {/if}

  <!-- Label -->
  <text
    x={hasIcon ? contentX + textWidth / 2 : width / 2}
    y={desc ? height * 0.4 : height / 2}
    text-anchor="middle"
    dominant-baseline="middle"
    fill={themeColors.colorWhite}
    font-size={fontSize}
    font-weight={fontWeight}
  >
    {truncate(label, maxChars)}
  </text>

  <!-- Description (if space allows) -->
  {#if desc && height >= 50}
    <text
      x={hasIcon ? contentX + textWidth / 2 : width / 2}
      y={height * 0.7}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={themeColors.colorWhite}
      font-size={fontSize - 2}
      opacity="0.8"
    >
      {truncate(desc, maxChars + 2)}
    </text>
  {/if}
</g>
