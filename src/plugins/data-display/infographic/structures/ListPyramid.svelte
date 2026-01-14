<script lang="ts">
  /**
   * ListPyramid Structure
   *
   * Renders items in a true pyramid/triangle shape with trapezoid layers.
   * Each layer is a trapezoid that forms a visually cohesive pyramid.
   * Great for hierarchy, ranking, or funnel visualizations.
   *
   * Label positioning strategy (inspired by AntV G2):
   * - 'inside': Labels inside the shape
   * - 'outside': Labels outside with connector lines
   * - 'auto': Automatically choose based on available space
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

  interface ConnectorStyle {
    stroke?: string
    width?: number
    dash?: number[]
    distance?: number
    opacity?: number
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
    /** Label position: 'inside', 'outside', or 'auto' (default) */
    labelPosition?: 'inside' | 'outside' | 'auto'
    /** Show connector lines for outside labels */
    showConnector?: boolean
    /** Connector line style */
    connectorStyle?: ConnectorStyle
    /** Padding for outside labels */
    labelPadding?: number
  }

  let {
    items,
    width = 600,
    height = 300,
    gap = 4,
    direction = 'up',
    palette,
    labelPosition = 'auto',
    showConnector = true,
    connectorStyle = {},
    labelPadding = 120
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Fixed font sizes for consistency
  const FONT_SIZES = {
    label: 14,
    value: 13,
    desc: 11,
    minLabel: 11
  }

  // Connector defaults
  const defaultConnector: Required<ConnectorStyle> = {
    stroke: '#888',
    width: 1,
    dash: [],
    distance: 8,
    opacity: 0.6
  }

  const connector = $derived({ ...defaultConnector, ...connectorStyle })

  // Generate a unique ID for this component instance
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate pyramid width (excluding label area)
  const pyramidWidth = $derived(labelPosition === 'inside' ? width : width - labelPadding)

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
   * Get the average width of a layer (for space detection)
   */
  function getLayerWidth(layerIndex: number): number {
    const totalLayers = numLayers
    if (layerIndex === 0) {
      // Triangle: average width is roughly 1/2 of bottom width
      const bottomRatio = 1 / totalLayers
      return pyramidWidth * bottomRatio * 0.6
    }
    const topRatio = layerIndex / totalLayers
    const bottomRatio = (layerIndex + 1) / totalLayers
    return pyramidWidth * (topRatio + bottomRatio) / 2
  }

  /**
   * Estimate text width (approximate)
   */
  function estimateTextWidth(text: string, fontSize: number): number {
    return text.length * fontSize * 0.6
  }

  /**
   * Determine if label should be outside for a layer
   */
  function shouldLabelBeOutside(layerIndex: number, data: ItemData): boolean {
    if (labelPosition === 'inside') return false
    if (labelPosition === 'outside') return true

    // Auto mode: check available space
    const layerW = getLayerWidth(layerIndex)
    const labelWidth = estimateTextWidth(data.label, FONT_SIZES.label)
    const valueWidth = data.value !== undefined ? estimateTextWidth(String(data.value), FONT_SIZES.value) : 0
    const maxTextWidth = Math.max(labelWidth, valueWidth)

    // If text needs more than 80% of layer width, put it outside
    return maxTextWidth > layerW * 0.8
  }

  /**
   * Calculate trapezoid/triangle points for a pyramid layer
   */
  function getTrapezoidPath(layerIndex: number): string {
    const totalLayers = numLayers
    const centerX = pyramidWidth / 2

    const y1 = layerIndex * (layerHeight + gap)
    const y2 = y1 + layerHeight

    // First layer (top) is a triangle with pointed top
    if (layerIndex === 0) {
      const bottomRatio = (layerIndex + 1) / totalLayers
      const bottomWidth = pyramidWidth * bottomRatio
      const bottomLeft = centerX - bottomWidth / 2
      const bottomRight = centerX + bottomWidth / 2
      return `M ${centerX} ${y1} L ${bottomRight} ${y2} L ${bottomLeft} ${y2} Z`
    }

    // Other layers are trapezoids
    const topRatio = layerIndex / totalLayers
    const bottomRatio = (layerIndex + 1) / totalLayers

    const topWidth = pyramidWidth * topRatio
    const bottomWidth = pyramidWidth * bottomRatio

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
   * Get the right edge X position for a layer at its center Y
   */
  function getLayerRightEdge(layerIndex: number): number {
    const totalLayers = numLayers
    const centerX = pyramidWidth / 2
    const bounds = getLayerBounds(layerIndex)

    if (layerIndex === 0) {
      // Triangle: interpolate between point and bottom edge
      const bottomRatio = 1 / totalLayers
      const bottomHalfWidth = (pyramidWidth * bottomRatio) / 2
      // At center Y, width is roughly half of bottom width
      return centerX + bottomHalfWidth * 0.5
    }

    // Trapezoid: interpolate between top and bottom widths
    const topRatio = layerIndex / totalLayers
    const bottomRatio = (layerIndex + 1) / totalLayers
    const avgRatio = (topRatio + bottomRatio) / 2
    return centerX + (pyramidWidth * avgRatio) / 2
  }

  /**
   * Calculate outside label positions with overlap dodge
   */
  const outsideLabels = $derived.by(() => {
    const labels: Array<{
      layerIndex: number
      y: number
      originalY: number
      rightEdgeX: number
    }> = []

    itemConfigs.forEach((config, layerIndex) => {
      if (shouldLabelBeOutside(layerIndex, config.data)) {
        const bounds = getLayerBounds(layerIndex)
        labels.push({
          layerIndex,
          y: bounds.center,
          originalY: bounds.center,
          rightEdgeX: getLayerRightEdge(layerIndex)
        })
      }
    })

    // Apply overlapDodgeY - adjust positions to avoid overlap
    const minGap = 24 // Minimum gap between labels
    for (let i = 1; i < labels.length; i++) {
      const prev = labels[i - 1]
      const curr = labels[i]
      if (curr.y - prev.y < minGap) {
        curr.y = prev.y + minGap
      }
    }

    // Boundary check - ensure labels don't exceed height
    for (let i = labels.length - 1; i >= 0; i--) {
      const label = labels[i]
      const maxY = height - 10
      if (label.y > maxY) {
        label.y = maxY
        // Push previous labels up if needed
        for (let j = i - 1; j >= 0; j--) {
          if (labels[j].y > labels[j + 1].y - minGap) {
            labels[j].y = labels[j + 1].y - minGap
          }
        }
      }
    }

    return labels
  })

  /**
   * Get outside label position for a layer
   */
  function getOutsideLabelPosition(layerIndex: number): { y: number; rightEdgeX: number } | null {
    const label = outsideLabels.find(l => l.layerIndex === layerIndex)
    return label ? { y: label.y, rightEdgeX: label.rightEdgeX } : null
  }

  /**
   * Check if there's enough space for description inside
   */
  function canShowDescInside(layerIndex: number, hasValue: boolean): boolean {
    const minHeight = hasValue ? 60 : 50
    return layerHeight >= minHeight && getLayerWidth(layerIndex) > 100
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
    {@const isOutside = shouldLabelBeOutside(layerIndex, config.data)}
    {@const outsidePos = isOutside ? getOutsideLabelPosition(layerIndex) : null}
    {@const hasValue = config.data.value !== undefined}
    {@const hasDesc = config.data.desc}

    <!-- Trapezoid shape -->
    <path
      d={getTrapezoidPath(layerIndex)}
      fill={config.gradientId ? `url(#${config.gradientId})` : config.color}
      stroke={config.themeColors.colorBgElevated}
      stroke-width="1"
    />

    {#if isOutside && outsidePos}
      <!-- Outside label with connector -->
      {@const connectorStartX = outsidePos.rightEdgeX + 4}
      {@const connectorMidX = pyramidWidth + 20}
      {@const connectorEndX = pyramidWidth + connector.distance + 20}
      {@const labelX = connectorEndX + 4}

      <!-- Connector line -->
      {#if showConnector}
        <path
          d={`M ${connectorStartX} ${bounds.center} L ${connectorMidX} ${bounds.center} L ${connectorMidX + 10} ${outsidePos.y}`}
          fill="none"
          stroke={connectorStyle.stroke || config.color}
          stroke-width={connector.width}
          stroke-dasharray={connector.dash.length > 0 ? connector.dash.join(' ') : 'none'}
          opacity={connector.opacity}
        />
        <!-- Connector dot -->
        <circle
          cx={connectorStartX}
          cy={bounds.center}
          r="2"
          fill={config.color}
        />
      {/if}

      <!-- Outside label text -->
      <text
        x={labelX}
        y={outsidePos.y - (hasValue ? 8 : 0)}
        text-anchor="start"
        dominant-baseline="middle"
        fill={ctx?.colors?.colorText || '#ffffff'}
        font-size={FONT_SIZES.label}
        font-weight="600"
      >
        {config.data.label}
      </text>

      {#if hasValue}
        <text
          x={labelX}
          y={outsidePos.y + 10}
          text-anchor="start"
          dominant-baseline="middle"
          fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
          font-size={FONT_SIZES.value}
          font-weight="500"
        >
          {config.data.value}
        </text>
      {/if}

      {#if hasDesc}
        <text
          x={labelX}
          y={outsidePos.y + (hasValue ? 26 : 10)}
          text-anchor="start"
          dominant-baseline="middle"
          fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
          font-size={FONT_SIZES.desc}
          opacity="0.7"
        >
          {config.data.desc}
        </text>
      {/if}
    {:else}
      <!-- Inside label -->
      {@const showDescInside = hasDesc && canShowDescInside(layerIndex, hasValue)}
      {@const lineCount = 1 + (hasValue ? 1 : 0) + (showDescInside ? 1 : 0)}
      {@const lineSpacing = Math.min(18, layerHeight / (lineCount + 1))}
      {@const startY = bounds.center - ((lineCount - 1) * lineSpacing) / 2}

      <text
        x={pyramidWidth / 2}
        y={startY}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={config.themeColors.colorWhite}
        font-size={FONT_SIZES.label}
        font-weight="600"
      >
        {config.data.label}
      </text>

      {#if hasValue}
        <text
          x={pyramidWidth / 2}
          y={startY + lineSpacing}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={config.themeColors.colorWhite}
          font-size={FONT_SIZES.value}
          font-weight="500"
          opacity="0.9"
        >
          {config.data.value}
        </text>
      {/if}

      {#if showDescInside}
        <text
          x={pyramidWidth / 2}
          y={startY + lineSpacing * (hasValue ? 2 : 1)}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={config.themeColors.colorWhite}
          font-size={FONT_SIZES.desc}
          opacity="0.7"
        >
          {config.data.desc}
        </text>
      {/if}
    {/if}
  {/each}
</g>
