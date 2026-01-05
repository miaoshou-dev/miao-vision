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
    /** Direction: 'up' (pointed at top) or 'down' (pointed at bottom) */
    direction?: 'up' | 'down'
    /** Palette override */
    palette?: Palette
  }

  let {
    items,
    width = 600,
    height = 300,
    gap = 4,
    direction = 'up',
    palette
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
   * Calculate trapezoid/triangle points for a pyramid layer
   * Top layer is a triangle (pointed), others are trapezoids
   */
  function getTrapezoidPath(layerIndex: number): string {
    const totalLayers = numLayers
    const centerX = width / 2

    const y1 = layerIndex * (layerHeight + gap)
    const y2 = y1 + layerHeight

    // First layer (top) is a triangle with pointed top
    if (layerIndex === 0) {
      const bottomRatio = (layerIndex + 1) / totalLayers
      const bottomWidth = width * bottomRatio
      const bottomLeft = centerX - bottomWidth / 2
      const bottomRight = centerX + bottomWidth / 2
      // Triangle: point at top center, flat bottom
      return `M ${centerX} ${y1} L ${bottomRight} ${y2} L ${bottomLeft} ${y2} Z`
    }

    // Other layers are trapezoids
    const topRatio = layerIndex / totalLayers
    const bottomRatio = (layerIndex + 1) / totalLayers

    const topWidth = width * topRatio
    const bottomWidth = width * bottomRatio

    const topLeft = centerX - topWidth / 2
    const topRight = centerX + topWidth / 2
    const bottomLeft = centerX - bottomWidth / 2
    const bottomRight = centerX + bottomWidth / 2

    return `M ${topLeft} ${y1} L ${topRight} ${y1} L ${bottomRight} ${y2} L ${bottomLeft} ${y2} Z`
  }

  /**
   * Get the Y bounds of a layer
   */
  function getLayerBounds(layerIndex: number) {
    const y1 = layerIndex * (layerHeight + gap)
    const y2 = y1 + layerHeight
    return { top: y1, bottom: y2, center: (y1 + y2) / 2 }
  }

  /**
   * Get the average width of a layer (for text sizing)
   */
  function getLayerWidth(layerIndex: number): number {
    const totalLayers = numLayers
    if (layerIndex === 0) {
      // Triangle: average width is roughly 1/2 of bottom width
      const bottomRatio = 1 / totalLayers
      return width * bottomRatio * 0.6
    }
    const topRatio = layerIndex / totalLayers
    const bottomRatio = (layerIndex + 1) / totalLayers
    return width * (topRatio + bottomRatio) / 2
  }

  /**
   * Check if there's enough space for description
   */
  function canShowDesc(layerIndex: number, hasValue: boolean): boolean {
    // Need at least 60px height to show desc with value, 50px without
    const minHeight = hasValue ? 60 : 50
    return layerHeight >= minHeight && getLayerWidth(layerIndex) > 120
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
    {@const bounds = getLayerBounds(layerIndex)}
    {@const layerW = getLayerWidth(layerIndex)}
    {@const hasValue = config.data.value !== undefined}
    {@const hasDesc = config.data.desc && canShowDesc(layerIndex, hasValue)}
    {@const lineCount = 1 + (hasValue ? 1 : 0) + (hasDesc ? 1 : 0)}
    {@const lineSpacing = Math.min(18, layerHeight / (lineCount + 1))}
    {@const startY = bounds.center - ((lineCount - 1) * lineSpacing) / 2}

    <!-- Trapezoid shape -->
    <path
      d={getTrapezoidPath(layerIndex)}
      fill={config.gradientId ? `url(#${config.gradientId})` : config.color}
      stroke={config.themeColors.colorBgElevated}
      stroke-width="1"
    />

    <!-- Label -->
    <text
      x={width / 2}
      y={startY}
      text-anchor="middle"
      dominant-baseline="middle"
      fill={config.themeColors.colorWhite}
      font-size={Math.min(16, layerW / 10)}
      font-weight="600"
    >
      {config.data.label}
    </text>

    <!-- Value (if provided) -->
    {#if hasValue}
      <text
        x={width / 2}
        y={startY + lineSpacing}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={config.themeColors.colorTextSecondary}
        font-size={Math.min(14, layerW / 12)}
        font-weight="500"
      >
        {config.data.value}
      </text>
    {/if}

    <!-- Description (if fits) -->
    {#if hasDesc}
      <text
        x={width / 2}
        y={startY + lineSpacing * (hasValue ? 2 : 1)}
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
