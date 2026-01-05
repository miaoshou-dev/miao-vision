<script lang="ts">
  /**
   * ListZigzag Structure
   *
   * Renders items in a zigzag pattern (alternating rows).
   * Items flow left-to-right then right-to-left.
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
    label: string
    desc?: string
    value?: string | number
    icon?: string
    color?: string
  }

  interface Props {
    items: ItemData[]
    width?: number
    height?: number
    itemsPerRow?: number
    rowGap?: number
    colGap?: number
    showConnectors?: boolean
    palette?: Palette
    item?: import('svelte').Snippet<[{
      data: ItemData
      index: number
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
      row: number
      col: number
      isReversed: boolean
    }]>
  }

  let {
    items,
    width = 752,
    height = 300,
    itemsPerRow = 4,
    rowGap = 24,
    colGap = 16,
    showConnectors = true,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Calculate layout
  const rows = $derived(Math.ceil(items.length / itemsPerRow))
  const itemWidth = $derived((width - (itemsPerRow - 1) * colGap) / itemsPerRow)
  const itemHeight = $derived((height - (rows - 1) * rowGap) / rows)

  // Generate a unique ID for this component instance
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Generate item configs with position info (pure computation)
  const itemConfigs = $derived.by(() => {
    return items.map((itemData, index) => {
      const row = Math.floor(index / itemsPerRow)
      const isReversed = row % 2 === 1
      const colInRow = index % itemsPerRow
      const col = isReversed ? (itemsPerRow - 1 - colInRow) : colInRow

      const color = itemData.color || getPaletteColor(
        palette || ctx?.config?.palette,
        index,
        items.length
      )
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

      const gradientId = ctx?.gradientsEnabled ? `zgrad-${instanceId}-${index}` : undefined
      const gradientDef = gradientId ? createGradientDef(gradientId, color, ctx?.gradientConfig) : undefined

      const x = col * (itemWidth + colGap)
      const y = row * (itemHeight + rowGap)

      return {
        data: itemData,
        index,
        themeColors,
        color,
        gradientId,
        gradientDef,
        row,
        col,
        isReversed,
        x,
        y
      }
    })
  })

  // Generate connector paths between items
  const connectors = $derived.by(() => {
    if (!showConnectors || items.length <= 1) return []

    const paths: { d: string; color: string }[] = []
    const connectorColor = ctx?.colors?.colorTextSecondary || '#666'

    for (let i = 0; i < itemConfigs.length - 1; i++) {
      const curr = itemConfigs[i]
      const next = itemConfigs[i + 1]

      const currCenterX = curr.x + itemWidth / 2
      const currCenterY = curr.y + itemHeight / 2
      const nextCenterX = next.x + itemWidth / 2
      const nextCenterY = next.y + itemHeight / 2

      // Same row: horizontal connector
      if (curr.row === next.row) {
        const startX = curr.isReversed ? curr.x : curr.x + itemWidth
        const endX = curr.isReversed ? next.x + itemWidth : next.x
        const y = currCenterY

        paths.push({
          d: `M ${startX} ${y} L ${endX} ${y}`,
          color: connectorColor
        })
      } else {
        // Different row: curved connector to next row
        const startX = currCenterX
        const startY = curr.y + itemHeight
        const endX = nextCenterX
        const endY = next.y

        const midY = (startY + endY) / 2

        paths.push({
          d: `M ${startX} ${startY} C ${startX} ${midY}, ${endX} ${midY}, ${endX} ${endY}`,
          color: connectorColor
        })
      }
    }

    return paths
  })
</script>

<g class="list-zigzag">
  <!-- Gradient definitions -->
  <defs>
    {#each itemConfigs as config}
      {#if config.gradientDef}
        {@html gradientDefToSVG(config.gradientDef)}
      {/if}
    {/each}
  </defs>

  <!-- Connectors -->
  {#each connectors as connector}
    <path
      d={connector.d}
      stroke={connector.color}
      stroke-width="2"
      fill="none"
      stroke-dasharray="4,4"
      opacity="0.5"
    />
  {/each}

  <!-- Items -->
  {#each itemConfigs as config}
    <g transform="translate({config.x}, {config.y})">
      {#if itemSnippet}
        {@render itemSnippet({
          data: config.data,
          index: config.index,
          themeColors: config.themeColors,
          width: itemWidth,
          height: itemHeight,
          gradientId: config.gradientId,
          row: config.row,
          col: config.col,
          isReversed: config.isReversed
        })}
      {:else}
        <!-- Default rendering -->
        <rect
          x="0"
          y="0"
          width={itemWidth}
          height={itemHeight}
          rx="8"
          fill={config.gradientId ? `url(#${config.gradientId})` : config.color}
        />
        <text
          x={itemWidth / 2}
          y={itemHeight / 2}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={config.themeColors.colorWhite}
          font-size="12"
          font-weight="500"
        >
          {config.data.label}
        </text>
      {/if}
    </g>
  {/each}
</g>
