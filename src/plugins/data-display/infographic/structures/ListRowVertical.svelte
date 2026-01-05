<script lang="ts">
  /**
   * ListRowVertical Structure Component
   *
   * Renders items in a vertical stack with optional arrows between them.
   * Great for top-down lists, rankings, step sequences.
   *
   * @example
   * ```svelte
   * <ListRowVertical
   *   items={topItems}
   *   showArrows={true}
   *   palette="vibrant"
   * >
   *   {#snippet item({ data, themeColors, width, height })}
   *     <BadgeCard label={data.label} ... />
   *   {/snippet}
   * </ListRowVertical>
   * ```
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
    value?: string | number
    desc?: string
    icon?: string
    color?: string
    [key: string]: unknown
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
    /** Show arrows between items */
    showArrows?: boolean
    /** Arrow direction */
    arrowDirection?: 'down' | 'up'
    /** Palette override */
    palette?: Palette
    /** Item rendering snippet */
    item?: import('svelte').Snippet<[{
      data: ItemData
      index: number
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
    }]>
  }

  let {
    items,
    width = 200,
    height = 400,
    gap = 12,
    showArrows = false,
    arrowDirection = 'down',
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate item dimensions
  const arrowHeight = $derived(showArrows ? 20 : 0)
  const totalArrowSpace = $derived((items.length - 1) * arrowHeight)
  const totalGapSpace = $derived((items.length - 1) * gap)
  const itemHeight = $derived(
    items.length > 0
      ? (height - totalArrowSpace - totalGapSpace) / items.length
      : 0
  )
  const itemWidth = $derived(width)

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
        gradientId,
        gradientDef
      }
    })
  })

  // Calculate Y position for each item
  function getItemY(index: number): number {
    return index * (itemHeight + arrowHeight + gap)
  }

  // Arrow SVG path
  function getArrowPath(index: number): string {
    const startY = getItemY(index) + itemHeight + gap / 2
    const endY = startY + arrowHeight
    const midX = width / 2

    if (arrowDirection === 'up') {
      return `M ${midX - 8} ${endY - 4} L ${midX} ${startY + 4} L ${midX + 8} ${endY - 4}`
    }
    return `M ${midX - 8} ${startY + 4} L ${midX} ${endY - 4} L ${midX + 8} ${startY + 4}`
  }
</script>

<g class="list-row-vertical">
  <!-- Gradient definitions -->
  <defs>
    {#each itemConfigs as config}
      {#if config.gradientDef}
        {@html gradientDefToSVG(config.gradientDef)}
      {/if}
    {/each}
  </defs>

  <!-- Render items vertically -->
  {#each itemConfigs as config, i}
    <!-- Item -->
    <g transform="translate(0, {getItemY(i)})">
      {#if itemSnippet}
        {@render itemSnippet({
          data: config.data,
          index: i,
          themeColors: config.themeColors,
          width: itemWidth,
          height: itemHeight,
          gradientId: config.gradientId
        })}
      {:else}
        <!-- Default item rendering -->
        {@const hasDesc = config.data.desc && itemHeight >= 50}
        {@const hasValue = config.data.value !== undefined}
        <rect
          x="0"
          y="0"
          width={itemWidth}
          height={itemHeight}
          rx="8"
          fill={config.gradientId ? `url(#${config.gradientId})` : config.themeColors.colorPrimary}
        />
        <text
          x={itemWidth / 2}
          y={hasDesc || hasValue ? itemHeight / 2 - 8 : itemHeight / 2}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={config.themeColors.colorWhite}
          font-size={Math.min(14, itemWidth / 12)}
          font-weight="600"
        >
          {config.data.label}
        </text>
        {#if hasValue}
          <text
            x={itemWidth / 2}
            y={itemHeight / 2 + 8}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={config.themeColors.colorTextSecondary}
            font-size={Math.min(12, itemWidth / 14)}
          >
            {config.data.value}
          </text>
        {:else if hasDesc}
          <text
            x={itemWidth / 2}
            y={itemHeight / 2 + 8}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={config.themeColors.colorTextSecondary}
            font-size={Math.min(11, itemWidth / 16)}
          >
            {config.data.desc}
          </text>
        {/if}
      {/if}
    </g>

    <!-- Arrow (if not last item) -->
    {#if showArrows && i < items.length - 1}
      <path
        d={getArrowPath(i)}
        fill="none"
        stroke={ctx?.colors?.colorTextSecondary || '#666'}
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    {/if}
  {/each}
</g>
