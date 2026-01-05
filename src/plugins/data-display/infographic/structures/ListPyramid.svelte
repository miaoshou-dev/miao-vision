<script lang="ts">
  /**
   * ListPyramid Structure
   *
   * Renders items in a pyramid/triangle formation.
   * First row has 1 item, second has 2, third has 3, etc.
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
    /** Gap between items */
    gap?: number
    /** Row gap */
    rowGap?: number
    /** Direction: 'up' (1 at top) or 'down' (1 at bottom) */
    direction?: 'up' | 'down'
    /** Palette override */
    palette?: Palette
    /** Item component snippet */
    item?: import('svelte').Snippet<[{
      data: ItemData
      index: number
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
      rank: number
    }]>
  }

  let {
    items,
    width = 752,
    height = 300,
    gap = 12,
    rowGap = 16,
    direction = 'up',
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Generate a unique ID for this component instance
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate pyramid structure
  // For N items: row 1 = 1, row 2 = 2, row 3 = 3, etc.
  // Total items = 1+2+3+...+n = n*(n+1)/2
  // So n = (-1 + sqrt(1 + 8*total)) / 2
  const rowStructure = $derived.by(() => {
    const itemCount = items.length
    const rows: number[][] = []
    let itemIndex = 0

    // Calculate how many complete rows we can have
    let row = 1
    while (itemIndex < itemCount) {
      const itemsInRow = Math.min(row, itemCount - itemIndex)
      const indices: number[] = []
      for (let i = 0; i < itemsInRow; i++) {
        indices.push(itemIndex++)
      }
      rows.push(indices)
      row++
    }

    // Reverse for 'down' direction (wide at top, narrow at bottom)
    if (direction === 'down') {
      rows.reverse()
    }

    return rows
  })

  const numRows = $derived(rowStructure.length)
  const maxRowItems = $derived(Math.max(...rowStructure.map(r => r.length)))
  const itemHeight = $derived(Math.floor((height - (numRows - 1) * rowGap) / numRows))

  // Generate theme colors and gradients for each item
  const itemConfigs = $derived.by(() => {
    return items.map((itemData, index) => {
      const color = itemData.color || getPaletteColor(palette || ctx?.config?.palette, index, items.length)
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

      return {
        data: itemData,
        index,
        themeColors,
        color,
        gradientId,
        gradientDef,
        rank: itemData.rank || index + 1
      }
    })
  })

  // Calculate position for an item in the pyramid
  function getItemPosition(rowIndex: number, colIndex: number, itemsInRow: number) {
    // Calculate item width for this row
    const totalGapWidth = (itemsInRow - 1) * gap
    const maxItemWidth = (width - totalGapWidth) / maxRowItems
    const rowItemWidth = maxItemWidth

    // Center the row
    const rowWidth = itemsInRow * rowItemWidth + totalGapWidth
    const startX = (width - rowWidth) / 2

    const x = startX + colIndex * (rowItemWidth + gap)
    const y = rowIndex * (itemHeight + rowGap)

    return { x, y, itemWidth: rowItemWidth }
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

  {#each rowStructure as rowIndices, rowIndex}
    {#each rowIndices as itemIndex, colIndex}
      {@const config = itemConfigs[itemIndex]}
      {@const pos = getItemPosition(rowIndex, colIndex, rowIndices.length)}
      <g transform="translate({pos.x}, {pos.y})">
        {#if itemSnippet}
          {@render itemSnippet({
            data: config.data,
            index: config.index,
            themeColors: config.themeColors,
            width: pos.itemWidth,
            height: itemHeight,
            gradientId: config.gradientId,
            rank: config.rank
          })}
        {:else}
          <!-- Default item rendering with rank badge -->
          <rect
            x="0"
            y="0"
            width={pos.itemWidth}
            height={itemHeight}
            rx="8"
            fill={config.gradientId ? `url(#${config.gradientId})` : config.color}
          />
          <!-- Rank badge -->
          <circle
            cx="20"
            cy="20"
            r="14"
            fill={config.themeColors.colorPrimaryBg}
            stroke={config.themeColors.colorWhite}
            stroke-width="2"
          />
          <text
            x="20"
            y="20"
            text-anchor="middle"
            dominant-baseline="middle"
            fill={config.themeColors.colorWhite}
            font-size="12"
            font-weight="700"
          >
            {config.rank}
          </text>
          <!-- Label -->
          <text
            x={pos.itemWidth / 2}
            y={itemHeight / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={config.themeColors.colorWhite}
            font-size="14"
            font-weight="500"
          >
            {config.data.label}
          </text>
          {#if config.data.value !== undefined}
            <text
              x={pos.itemWidth / 2}
              y={itemHeight / 2 + 18}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={config.themeColors.colorTextSecondary}
              font-size="18"
              font-weight="600"
            >
              {config.data.value}
            </text>
          {/if}
        {/if}
      </g>
    {/each}
  {/each}
</g>
