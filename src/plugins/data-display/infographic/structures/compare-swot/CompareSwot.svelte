<script lang="ts">
  /**
   * CompareSwot Structure Component
   *
   * Renders a SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis diagram.
   * Uses 2x2 grid layout with customizable colors and icons.
   *
   * @example
   * ```svelte
   * <CompareSwot
   *   data={swotData}
   *   width={800}
   *   height={600}
   * >
   *   {#snippet item({ item, quadrant, themeColors })}
   *     <text>{item.label}</text>
   *   {/snippet}
   * </CompareSwot>
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { createGradientDef, gradientDefToSVG } from '../../theme'
  import { calculateSwotLayout, calculateItemPositions } from './layout'
  import type {
    SwotData,
    SwotItem,
    SwotQuadrant,
    QuadrantLayout,
    CompareSwotProps,
    COMPARE_SWOT_DEFAULTS
  } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends CompareSwotProps {
    /** Item rendering snippet */
    item?: import('svelte').Snippet<[{
      item: SwotItem
      quadrant: SwotQuadrant
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
      index: number
    }]>
  }

  let {
    data,
    width = 800,
    height = 600,
    gap = 10,
    showHeaders = true,
    showIcons = true,
    palette,
    titles,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Generate unique instance ID for gradients
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate SWOT layout
  const swotLayout = $derived(
    calculateSwotLayout(data, {
      width,
      height,
      gap,
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
      instanceId,
      titles
    })
  )

  // Generate gradient definitions
  const gradientDefs = $derived.by(() => {
    if (!ctx?.gradientsEnabled) return []
    return swotLayout.quadrants.map((q) =>
      createGradientDef(
        q.gradientId!,
        q.config.color,
        ctx?.gradientConfig
      )
    )
  })

  // Get item positions for each quadrant
  function getItemPositions(quadrant: QuadrantLayout) {
    return calculateItemPositions(
      quadrant.items,
      quadrant.width,
      quadrant.height,
      showHeaders
    )
  }

  // Header height constant
  const HEADER_HEIGHT = 40
</script>

<g class="compare-swot">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Quadrants -->
  {#each swotLayout.quadrants as quadrant}
    <g
      class="swot-quadrant swot-{quadrant.quadrant}"
      transform="translate({quadrant.x}, {quadrant.y})"
    >
      <!-- Quadrant background -->
      <rect
        x="0"
        y="0"
        width={quadrant.width}
        height={quadrant.height}
        rx="8"
        fill={quadrant.config.bgColor}
        stroke={quadrant.config.color}
        stroke-width="1"
        opacity="0.8"
      />

      <!-- Header -->
      {#if showHeaders}
        <rect
          x="0"
          y="0"
          width={quadrant.width}
          height={HEADER_HEIGHT}
          rx="8"
          fill={quadrant.gradientId
            ? `url(#${quadrant.gradientId})`
            : quadrant.config.color}
        />
        <!-- Square off bottom corners of header -->
        <rect
          x="0"
          y={HEADER_HEIGHT - 8}
          width={quadrant.width}
          height="8"
          fill={quadrant.gradientId
            ? `url(#${quadrant.gradientId})`
            : quadrant.config.color}
        />
        <text
          x={quadrant.width / 2}
          y={HEADER_HEIGHT / 2}
          text-anchor="middle"
          dominant-baseline="middle"
          fill="white"
          font-size="14"
          font-weight="600"
        >
          {quadrant.config.title}
        </text>
      {/if}

      <!-- Items -->
      {#each getItemPositions(quadrant) as pos, idx}
        <g transform="translate({pos.x}, {pos.y})">
          {#if itemSnippet}
            {@render itemSnippet({
              item: quadrant.items[idx],
              quadrant: quadrant.quadrant,
              themeColors: quadrant.themeColors,
              width: pos.width,
              height: pos.height,
              gradientId: quadrant.gradientId,
              index: idx
            })}
          {:else}
            <!-- Default item rendering -->
            <rect
              x="0"
              y="0"
              width={pos.width}
              height={pos.height}
              rx="4"
              fill={ctx?.colors?.colorBgElevated || '#2a2a4a'}
              stroke={quadrant.config.color}
              stroke-width="1"
              opacity="0.6"
            />
            <text
              x="12"
              y={pos.height / 2}
              dominant-baseline="middle"
              fill={ctx?.colors?.colorText || '#ffffff'}
              font-size="12"
            >
              {quadrant.items[idx].label}
            </text>
            {#if quadrant.items[idx].desc}
              <text
                x={pos.width - 12}
                y={pos.height / 2}
                text-anchor="end"
                dominant-baseline="middle"
                fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
                font-size="10"
              >
                {quadrant.items[idx].desc}
              </text>
            {/if}
          {/if}
        </g>
      {/each}

      <!-- Empty state -->
      {#if quadrant.items.length === 0}
        <text
          x={quadrant.width / 2}
          y={(quadrant.height + (showHeaders ? HEADER_HEIGHT : 0)) / 2}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
          font-size="12"
          opacity="0.6"
        >
          No items
        </text>
      {/if}
    </g>
  {/each}
</g>
