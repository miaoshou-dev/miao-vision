<script lang="ts">
  /**
   * ListPyramid Structure
   *
   * Renders items in a true pyramid/triangle shape with trapezoid layers.
   * Each layer is a trapezoid that forms a visually cohesive pyramid.
   * Great for hierarchy, ranking, or funnel visualizations.
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, Palette, GradientConfig } from '../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../theme'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface ItemData {
    /** Item label/title */
    label: string
    /** Optional description */
    desc?: string
    /** Optional value */
    value?: string | number
    /** Icon name */
    icon?: string
    /** Custom color (overrides palette) */
    color?: string
    /** Rank/position (1-based) */
    rank?: number
  }

  interface Props {
    /** Array of items to render */
    items: ItemData[]
    /** Available width */
    width?: number
    /** Available height */
    height?: number
    /** Gap between layers */
    gap?: number
    /** Direction: 'up' (narrow at top) or 'down' (narrow at bottom) */
    direction?: 'up' | 'down'
    /** Palette override */
    palette?: Palette
    /** Top width ratio (0-1, how narrow the top is relative to bottom) */
    topWidthRatio?: number
  }

  let {
    items,
    width = 600,
    height = 300,
    gap = 4,
    direction = 'up',
    palette,
    topWidthRatio = 0.2
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Generate a unique ID for this component instance
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Order items based on direction
  const orderedItems = $derived(direction === 'up' ? items : [...items].reverse())
  const numLayers = $derived(orderedItems.length)
  const layerHeight = $derived(numLayers > 0 ? (height - (numLayers - 1) * gap) / numLayers : 0)

  // Generate theme colors and gradients for each item
  const itemConfigs = $derived.by(() => {
    return orderedItems.map((itemData, index) => {
      const color = itemData.color || getPaletteColor(palette || ctx?.config?.palette, index, orderedItems.length)
      const themeColors = generateItemThemeColors(color, ctx?.colors || {
        colorPrimary: color,
        colorPrimaryBg: '#1a1a2e',
        colorPrimaryText: '#ffffff',
        colorText: '#ffffff',
        colorTextSecondary: '#a0a0b0',
        colorWhite: '#ffffff',
        colorBg: '#1a1a2e',
        colorBgElevated: '#2a2a4a',
        isDarkMode: true
      })

      const gradientId = ctx?.gradientsEnabled ? `grad-${instanceId}-${index}` : undefined
      const gradientDef = gradientId ? createGradientDef(gradientId, color, ctx?.gradientConfig) : undefined

      // Rank based on original order (direction='up': first item is rank 1 at top)
      const rank = direction === 'up' ? index + 1 : numLayers - index

      return {
        data: itemData,
        index,
        themeColors,
        color,
        gradientId,
        gradientDef,
        rank
      }
    })
  })

  /**
   * Calculate trapezoid points for a pyramid layer
   * Returns SVG path points for a trapezoid shape
   */
  function getTrapezoidPath(layerIndex: number): string {
    const totalLayers = numLayers
    const centerX = width / 2

    // Calculate widths based on layer position
    // Top layer is narrowest, bottom is widest
    const topRatio = topWidthRatio + (1 - topWidthRatio) * (layerIndex / totalLayers)
    const bottomRatio = topWidthRatio + (1 - topWidthRatio) * ((layerIndex + 1) / totalLayers)

    const topWidth = width * topRatio
    const bottomWidth = width * bottomRatio

    const y1 = layerIndex * (layerHeight + gap)
    const y2 = y1 + layerHeight

    // Trapezoid corners
    const topLeft = centerX - topWidth / 2
    const topRight = centerX + topWidth / 2
    const bottomLeft = centerX - bottomWidth / 2
    const bottomRight = centerX + bottomWidth / 2

    return `M ${topLeft} ${y1} L ${topRight} ${y1} L ${bottomRight} ${y2} L ${bottomLeft} ${y2} Z`
  }

  /**
   * Get center position for text in a trapezoid layer
   */
  function getLayerCenter(layerIndex: number) {
    const y = layerIndex * (layerHeight + gap) + layerHeight / 2
    return { x: width / 2, y }
  }

  /**
   * Get the average width of a layer (for text sizing)
   */
  function getLayerWidth(layerIndex: number): number {
    const totalLayers = numLayers
    const topRatio = topWidthRatio + (1 - topWidthRatio) * (layerIndex / totalLayers)
    const bottomRatio = topWidthRatio + (1 - topWidthRatio) * ((layerIndex + 1) / totalLayers)
    return width * (topRatio + bottomRatio) / 2
  }
</script>

<g class="list-pyramid">
  <!-- Gradient definitions -->
  <defs>
    {#each itemConfigs as config}
      {#if config.gradientDef}
        {@html gradientDefToSVG(config.gradientDef)}
      {/if}
    {/each}
  </defs>

  <!-- Render each layer as a trapezoid -->
  {#each itemConfigs as config, layerIndex}
    {@const center = getLayerCenter(layerIndex)}
    {@const layerW = getLayerWidth(layerIndex)}

    <!-- Trapezoid shape -->
    <path
      d={getTrapezoidPath(layerIndex)}
      fill={config.gradientId ? `url(#${config.gradientId})` : config.color}
      stroke={config.themeColors.colorBgElevated}
      stroke-width="1"
    />

    <!-- Label -->
    <text
      x={center.x}
      y={center.y - (config.data.value !== undefined ? 8 : 0)}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={config.themeColors.colorWhite}
      font-size={Math.min(16, layerW / 10)}
      font-weight="600"
    >
      {config.data.label}
    </text>

    <!-- Value (if provided) -->
    {#if config.data.value !== undefined}
      <text
        x={center.x}
        y={center.y + 12}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={config.themeColors.colorTextSecondary}
        font-size={Math.min(14, layerW / 12)}
        font-weight="500"
      >
        {config.data.value}
      </text>
    {/if}

    <!-- Description (if provided, and layer is wide enough) -->
    {#if config.data.desc && layerW > 150}
      <text
        x={center.x}
        y={center.y + (config.data.value !== undefined ? 28 : 16)}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={config.themeColors.colorTextSecondary}
        font-size={Math.min(11, layerW / 15)}
        opacity="0.7"
      >
        {config.data.desc}
      </text>
    {/if}
  {/each}
</g>
