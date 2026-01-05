<script lang="ts">
  /**
   * ListGrid Structure
   *
   * Renders items in a grid layout (2 columns by default).
   * Automatically calculates rows based on item count.
   * Each item gets its own color from the palette.
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
  }

  interface Props {
    /** Array of items to render */
    items: ItemData[]
    /** Available width */
    width?: number
    /** Available height */
    height?: number
    /** Number of columns */
    columns?: number
    /** Gap between items */
    gap?: number
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
    }]>
  }

  let {
    items,
    width = 752,
    height = 300,
    columns = 2,
    gap = 16,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Calculate grid dimensions
  const rows = $derived(Math.ceil(items.length / columns))
  const totalGapWidth = $derived((columns - 1) * gap)
  const totalGapHeight = $derived((rows - 1) * gap)
  const itemWidth = $derived(Math.floor((width - totalGapWidth) / columns))
  const itemHeight = $derived(Math.floor((height - totalGapHeight) / rows))

  // Generate a unique ID for this component instance
  const instanceId = Math.random().toString(36).slice(2, 8)

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

      // Generate gradient ID deterministically
      const gradientId = ctx?.gradientsEnabled ? `grad-${instanceId}-${index}` : undefined
      const gradientDef = gradientId ? createGradientDef(gradientId, color, ctx?.gradientConfig) : undefined

      // Calculate grid position
      const col = index % columns
      const row = Math.floor(index / columns)
      const x = col * (itemWidth + gap)
      const y = row * (itemHeight + gap)

      return {
        data: itemData,
        index,
        themeColors,
        color,
        gradientId,
        gradientDef,
        x,
        y
      }
    })
  })
</script>

<g class="list-grid">
  <!-- Gradient definitions -->
  <defs>
    {#each itemConfigs as config}
      {#if config.gradientDef}
        {@html gradientDefToSVG(config.gradientDef)}
      {/if}
    {/each}
  </defs>

  {#each itemConfigs as config}
    <g transform="translate({config.x}, {config.y})">
      {#if itemSnippet}
        {@render itemSnippet({
          data: config.data,
          index: config.index,
          themeColors: config.themeColors,
          width: itemWidth,
          height: itemHeight,
          gradientId: config.gradientId
        })}
      {:else}
        <!-- Default item rendering -->
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
          font-size="14"
          font-weight="500"
        >
          {config.data.label}
        </text>
        {#if config.data.value !== undefined}
          <text
            x={itemWidth / 2}
            y={itemHeight / 2 + 20}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={config.themeColors.colorTextSecondary}
            font-size="20"
            font-weight="600"
          >
            {config.data.value}
          </text>
        {/if}
      {/if}
    </g>
  {/each}
</g>
