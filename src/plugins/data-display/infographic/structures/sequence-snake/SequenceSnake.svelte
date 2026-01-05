<script lang="ts">
  /**
   * SequenceSnake Structure Component
   *
   * Renders items in a snake/serpentine pattern.
   * Items flow left-to-right on odd rows and right-to-left on even rows.
   *
   * @example
   * ```svelte
   * <SequenceSnake
   *   items={steps}
   *   itemsPerRow={3}
   *   showConnections={true}
   *   showNumbers={true}
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { createGradientDef, gradientDefToSVG } from '../../theme'
  import { calculateSnakeLayout } from './layout'
  import type {
    SnakeItem,
    SnakeItemLayout,
    SequenceSnakeProps
  } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends SequenceSnakeProps {
    /** Item rendering snippet */
    item?: import('svelte').Snippet<[{
      item: SnakeItem
      layout: SnakeItemLayout
      themeColors: ThemeColors
      stepNumber: number
      gradientId?: string
    }]>
  }

  let {
    items,
    width = 800,
    height = 400,
    itemsPerRow = 4,
    horizontalGap = 20,
    verticalGap = 40,
    itemWidth = 150,
    itemHeight = 80,
    showConnections = true,
    showNumbers = true,
    palette,
    lineStyle = 'curved',
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Generate unique instance ID for gradients
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate snake layout
  const snakeLayout = $derived(
    calculateSnakeLayout(items, {
      width,
      height,
      itemsPerRow,
      horizontalGap,
      verticalGap,
      itemWidth,
      itemHeight,
      showConnections,
      lineStyle,
      palette: palette || ctx?.config?.palette,
      baseColors: ctx?.colors || {
        colorPrimary: '#6366f1',
        colorPrimaryBg: '#1a1a2e',
        colorPrimaryText: '#ffffff',
        colorText: '#ffffff',
        colorTextSecondary: '#a0a0b0',
        colorWhite: '#ffffff',
        colorBg: '#1a1a2e',
        colorBgElevated: '#2a2a4a',
        isDarkMode: true
      },
      gradientsEnabled: ctx?.gradientsEnabled || false,
      instanceId
    })
  )

  // Generate gradient definitions
  const gradientDefs = $derived.by(() => {
    if (!ctx?.gradientsEnabled) return []
    return snakeLayout.items.map((item) =>
      createGradientDef(
        item.gradientId!,
        item.themeColors.colorPrimary,
        ctx?.gradientConfig
      )
    )
  })
</script>

<g class="sequence-snake">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Connection lines (drawn first, behind items) -->
  {#if showConnections}
    <g class="snake-connections">
      {#each snakeLayout.connections as connection}
        <path
          d={connection.pathData}
          fill="none"
          stroke={ctx?.colors?.colorTextSecondary || '#666'}
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-dasharray={connection.type === 'turn' ? '4,4' : 'none'}
        />
      {/each}
    </g>
  {/if}

  <!-- Items -->
  <g class="snake-items">
    {#each snakeLayout.items as itemLayout}
      <g
        class="snake-item"
        transform="translate({itemLayout.x}, {itemLayout.y})"
      >
        {#if itemSnippet}
          {@render itemSnippet({
            item: itemLayout.item,
            layout: itemLayout,
            themeColors: itemLayout.themeColors,
            stepNumber: itemLayout.index + 1,
            gradientId: itemLayout.gradientId
          })}
        {:else}
          <!-- Default item rendering -->
          <rect
            x="0"
            y="0"
            width={itemLayout.width}
            height={itemLayout.height}
            rx="8"
            fill={itemLayout.gradientId
              ? `url(#${itemLayout.gradientId})`
              : itemLayout.themeColors.colorPrimary}
          />

          <!-- Step number badge -->
          {#if showNumbers}
            <circle
              cx="20"
              cy="20"
              r="14"
              fill={ctx?.colors?.colorBg || '#1a1a2e'}
              stroke={itemLayout.themeColors.colorPrimary}
              stroke-width="2"
            />
            <text
              x="20"
              y="20"
              text-anchor="middle"
              dominant-baseline="middle"
              fill={itemLayout.themeColors.colorPrimary}
              font-size="12"
              font-weight="700"
            >
              {itemLayout.index + 1}
            </text>
          {/if}

          <!-- Label -->
          <text
            x={itemLayout.width / 2}
            y={itemLayout.height / 2 - (itemLayout.item.desc ? 6 : 0)}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={itemLayout.themeColors.colorWhite}
            font-size="13"
            font-weight="600"
          >
            {itemLayout.item.label}
          </text>

          <!-- Description -->
          {#if itemLayout.item.desc}
            <text
              x={itemLayout.width / 2}
              y={itemLayout.height / 2 + 12}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={itemLayout.themeColors.colorWhite}
              font-size="10"
              opacity="0.8"
            >
              {itemLayout.item.desc}
            </text>
          {/if}

          <!-- Value -->
          {#if itemLayout.item.value !== undefined}
            <text
              x={itemLayout.width - 12}
              y="20"
              text-anchor="end"
              dominant-baseline="middle"
              fill={itemLayout.themeColors.colorWhite}
              font-size="14"
              font-weight="700"
            >
              {itemLayout.item.value}
            </text>
          {/if}
        {/if}
      </g>
    {/each}
  </g>
</g>
