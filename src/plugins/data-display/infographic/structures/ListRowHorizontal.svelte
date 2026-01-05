<script lang="ts">
  /**
   * ListRowHorizontal Structure
   *
   * Renders items in a horizontal row with optional arrows between them.
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
    /** Gap between items */
    gap?: number
    /** Show arrows between items */
    showArrows?: boolean
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
    /** Arrow component snippet */
    arrow?: import('svelte').Snippet<[{ x: number, y: number, color: string }]>
  }

  let {
    items,
    width = 752,
    height = 120,
    gap = 16,
    showArrows = true,
    palette,
    item: itemSnippet,
    arrow: arrowSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Calculate item dimensions
  const arrowWidth = $derived(showArrows ? 24 : 0)
  const totalArrowsWidth = $derived(showArrows ? (items.length - 1) * arrowWidth : 0)
  const totalGapsWidth = $derived((items.length - 1) * gap)
  const availableWidth = $derived(width - totalArrowsWidth - totalGapsWidth)
  const itemWidth = $derived(Math.floor(availableWidth / items.length))
  const itemHeight = $derived(height)

  // Generate a unique ID for this component instance
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Generate theme colors and gradients for each item (pure computation, no state mutation)
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

      return {
        data: itemData,
        index,
        themeColors,
        color,
        gradientId,
        gradientDef
      }
    })
  })

  // Calculate x position for each item
  function getItemX(index: number): number {
    return index * (itemWidth + gap + (showArrows ? arrowWidth : 0))
  }

  // Calculate arrow x position
  function getArrowX(index: number): number {
    return (index + 1) * itemWidth + index * (gap + arrowWidth) + gap / 2
  }
</script>

<g class="list-row-horizontal">
  <!-- Gradient definitions -->
  <defs>
    {#each itemConfigs as config}
      {#if config.gradientDef}
        {@html gradientDefToSVG(config.gradientDef)}
      {/if}
    {/each}
  </defs>

  {#each itemConfigs as config, i}
    <!-- Item -->
    <g transform="translate({getItemX(i)}, 0)">
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
      {/if}
    </g>

    <!-- Arrow between items -->
    {#if showArrows && i < items.length - 1}
      <g transform="translate({getArrowX(i)}, {itemHeight / 2 - 12})">
        {#if arrowSnippet}
          {@render arrowSnippet({
            x: 0,
            y: 0,
            color: ctx?.colors?.colorTextSecondary || '#666'
          })}
        {:else}
          <!-- Default arrow -->
          <svg viewBox="0 0 24 24" width="24" height="24">
            <path
              d="M4,11V13H16L10.5,18.5L11.92,19.92L19.84,12L11.92,4.08L10.5,5.5L16,11H4Z"
              fill={ctx?.colors?.colorTextSecondary || '#666'}
            />
          </svg>
        {/if}
      </g>
    {/if}
  {/each}
</g>
