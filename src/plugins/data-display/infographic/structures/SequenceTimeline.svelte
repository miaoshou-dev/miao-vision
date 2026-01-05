<script lang="ts">
  /**
   * SequenceTimeline Structure
   *
   * Renders items along a horizontal timeline with connecting line.
   * Each item has a date/time marker and content card.
   * Great for milestones, project phases, or historical events.
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
    /** Date or time marker */
    date?: string
    /** Optional description */
    desc?: string
    /** Optional value */
    value?: string | number
    /** Icon name */
    icon?: string
    /** Custom color (overrides palette) */
    color?: string
    /** Status: completed, current, upcoming */
    status?: 'completed' | 'current' | 'upcoming'
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
    /** Timeline position: 'top', 'middle', 'bottom' */
    timelinePosition?: 'top' | 'middle' | 'bottom'
    /** Show connecting line */
    showLine?: boolean
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
      isFirst: boolean
      isLast: boolean
    }]>
  }

  let {
    items,
    width = 752,
    height = 200,
    gap = 24,
    timelinePosition = 'middle',
    showLine = true,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Generate a unique ID for this component instance
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate dimensions
  const nodeRadius = 12
  const lineY = $derived(
    timelinePosition === 'top' ? 30 :
    timelinePosition === 'bottom' ? height - 30 :
    height / 2
  )
  const cardHeight = $derived(height - 60) // Leave space for timeline and date
  const totalGapWidth = $derived((items.length - 1) * gap)
  const itemWidth = $derived(Math.floor((width - totalGapWidth) / items.length))

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

      const x = index * (itemWidth + gap)

      return {
        data: itemData,
        index,
        themeColors,
        color,
        gradientId,
        gradientDef,
        x,
        isFirst: index === 0,
        isLast: index === items.length - 1
      }
    })
  })

  // Get node fill based on status
  function getNodeFill(config: typeof itemConfigs[0]): string {
    const status = config.data.status || 'completed'
    if (status === 'upcoming') {
      return ctx?.colors?.colorBg || '#1a1a2e'
    }
    if (config.gradientId) {
      return `url(#${config.gradientId})`
    }
    return config.color
  }

  // Get node stroke based on status
  function getNodeStroke(config: typeof itemConfigs[0]): string {
    const status = config.data.status || 'completed'
    if (status === 'upcoming') {
      return config.color
    }
    return 'none'
  }
</script>

<g class="sequence-timeline">
  <!-- Gradient definitions -->
  <defs>
    {#each itemConfigs as config}
      {#if config.gradientDef}
        {@html gradientDefToSVG(config.gradientDef)}
      {/if}
    {/each}
  </defs>

  <!-- Timeline connecting line -->
  {#if showLine}
    <line
      x1={itemWidth / 2}
      y1={lineY}
      x2={width - itemWidth / 2}
      y2={lineY}
      stroke={ctx?.colors?.colorTextSecondary || '#666'}
      stroke-width="2"
      stroke-dasharray="4 4"
    />
  {/if}

  {#each itemConfigs as config}
    <g transform="translate({config.x}, 0)">
      <!-- Timeline node -->
      <circle
        cx={itemWidth / 2}
        cy={lineY}
        r={nodeRadius}
        fill={getNodeFill(config)}
        stroke={getNodeStroke(config)}
        stroke-width="2"
      />

      <!-- Current status pulse effect -->
      {#if config.data.status === 'current'}
        <circle
          cx={itemWidth / 2}
          cy={lineY}
          r={nodeRadius + 4}
          fill="none"
          stroke={config.color}
          stroke-width="2"
          opacity="0.5"
        >
          <animate
            attributeName="r"
            from={nodeRadius + 4}
            to={nodeRadius + 12}
            dur="1.5s"
            repeatCount="indefinite"
          />
          <animate
            attributeName="opacity"
            from="0.5"
            to="0"
            dur="1.5s"
            repeatCount="indefinite"
          />
        </circle>
      {/if}

      <!-- Date label (above or below timeline based on position) -->
      {#if config.data.date}
        {@const dateY = timelinePosition === 'bottom' ? lineY + 30 : lineY - 25}
        <text
          x={itemWidth / 2}
          y={dateY}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={config.themeColors.colorTextSecondary}
          font-size="11"
          font-weight="500"
        >
          {config.data.date}
        </text>
      {/if}

      <!-- Content card -->
      {#if itemSnippet}
        {@const cardY = timelinePosition === 'top' ? lineY + 25 : 10}
        <g transform="translate(0, {cardY})">
          {@render itemSnippet({
            data: config.data,
            index: config.index,
            themeColors: config.themeColors,
            width: itemWidth,
            height: cardHeight,
            gradientId: config.gradientId,
            isFirst: config.isFirst,
            isLast: config.isLast
          })}
        </g>
      {:else}
        <!-- Default card rendering -->
        {@const cardY = timelinePosition === 'top' ? lineY + 25 : 10}
        <g transform="translate(0, {cardY})">
          <rect
            x="0"
            y="0"
            width={itemWidth}
            height={cardHeight}
            rx="8"
            fill={config.themeColors.colorBgElevated}
            stroke={config.color}
            stroke-width="1"
          />
          <!-- Label -->
          <text
            x={itemWidth / 2}
            y={cardHeight / 2 - 8}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={config.themeColors.colorText}
            font-size="13"
            font-weight="500"
          >
            {config.data.label}
          </text>
          <!-- Description -->
          {#if config.data.desc}
            <text
              x={itemWidth / 2}
              y={cardHeight / 2 + 12}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={config.themeColors.colorTextSecondary}
              font-size="11"
            >
              {config.data.desc.length > 20 ? config.data.desc.slice(0, 20) + '...' : config.data.desc}
            </text>
          {/if}
        </g>
      {/if}
    </g>
  {/each}
</g>
