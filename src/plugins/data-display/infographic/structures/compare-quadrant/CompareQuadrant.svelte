<script lang="ts">
  /**
   * CompareQuadrant Structure Component
   *
   * Renders a 2x2 matrix/quadrant layout for categorization.
   * Great for BCG Matrix, Eisenhower Matrix, Risk Matrix.
   *
   * @example
   * ```svelte
   * <CompareQuadrant
   *   data={matrixData}
   *   axisLabels={{ xLeft: 'Low', xRight: 'High', yTop: 'High', yBottom: 'Low' }}
   *   quadrantLabels={{ topLeft: 'Stars', topRight: 'Question Marks' }}
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { generateItemThemeColors } from '../../theme'
  import type {
    QuadrantData,
    QuadrantPosition,
    QuadrantItem,
    CompareQuadrantProps
  } from './types'
  import { COMPARE_QUADRANT_DEFAULTS, QUADRANT_COLORS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends CompareQuadrantProps {
    /** Item rendering snippet */
    item?: import('svelte').Snippet<[{
      item: QuadrantItem
      quadrant: QuadrantPosition
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
    }]>
  }

  let {
    data,
    width = COMPARE_QUADRANT_DEFAULTS.width,
    height = COMPARE_QUADRANT_DEFAULTS.height,
    gap = COMPARE_QUADRANT_DEFAULTS.gap,
    showAxes = COMPARE_QUADRANT_DEFAULTS.showAxes,
    axisLabels,
    quadrantLabels,
    showQuadrantColors = COMPARE_QUADRANT_DEFAULTS.showQuadrantColors,
    palette: _palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate quadrant dimensions
  const quadrantWidth = $derived((width - gap) / 2)
  const quadrantHeight = $derived((height - gap) / 2)

  // Quadrant positions and colors
  const quadrants: { position: QuadrantPosition; x: number; y: number; color: string }[] = $derived([
    { position: 'topLeft', x: 0, y: 0, color: QUADRANT_COLORS.topLeft },
    { position: 'topRight', x: quadrantWidth + gap, y: 0, color: QUADRANT_COLORS.topRight },
    { position: 'bottomLeft', x: 0, y: quadrantHeight + gap, color: QUADRANT_COLORS.bottomLeft },
    { position: 'bottomRight', x: quadrantWidth + gap, y: quadrantHeight + gap, color: QUADRANT_COLORS.bottomRight }
  ])

  // Get items for a quadrant
  function getQuadrantItems(position: QuadrantPosition): QuadrantItem[] {
    return data[position] || []
  }

  // Get label for a quadrant
  function getQuadrantLabel(position: QuadrantPosition): string | undefined {
    return quadrantLabels?.[position]
  }

  // Generate theme colors for item
  function getItemThemeColors(item: QuadrantItem, quadrantColor: string): ThemeColors {
    const color = item.color || quadrantColor
    return generateItemThemeColors(color, ctx?.colors || {
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
  }

  // Calculate item positions within a quadrant (grid layout)
  function getItemLayout(items: QuadrantItem[], quadrantW: number, quadrantH: number) {
    const count = items.length
    if (count === 0) return { cols: 0, rows: 0, itemW: 0, itemH: 0 }

    // Calculate optimal grid layout
    const cols = Math.ceil(Math.sqrt(count))
    const rows = Math.ceil(count / cols)
    const padding = 8
    const headerSpace = 24 // Space for quadrant label
    const itemW = (quadrantW - padding * 2 - (cols - 1) * 4) / cols
    const itemH = (quadrantH - padding * 2 - headerSpace - (rows - 1) * 4) / rows

    return { cols, rows, itemW: Math.min(itemW, 100), itemH: Math.min(itemH, 50), padding, headerSpace }
  }
</script>

<g class="compare-quadrant">
  <!-- Quadrant backgrounds -->
  {#each quadrants as quad}
    {@const items = getQuadrantItems(quad.position)}
    {@const label = getQuadrantLabel(quad.position)}
    {@const layout = getItemLayout(items, quadrantWidth, quadrantHeight)}

    <g class="quadrant quadrant-{quad.position}" transform="translate({quad.x}, {quad.y})">
      <!-- Background -->
      <rect
        x="0"
        y="0"
        width={quadrantWidth}
        height={quadrantHeight}
        rx="8"
        fill={showQuadrantColors ? quad.color : (ctx?.colors?.colorBgElevated || '#2a2a4a')}
        opacity={showQuadrantColors ? 0.15 : 1}
      />

      <!-- Quadrant label -->
      {#if label}
        <text
          x={quadrantWidth / 2}
          y="18"
          text-anchor="middle"
          fill={showQuadrantColors ? quad.color : (ctx?.colors?.colorText || '#fff')}
          font-size="12"
          font-weight="600"
        >
          {label}
        </text>
      {/if}

      <!-- Items within quadrant -->
      {#each items as item, itemIndex}
        {@const col = itemIndex % layout.cols}
        {@const row = Math.floor(itemIndex / layout.cols)}
        {@const itemX = layout.padding + col * (layout.itemW + 4)}
        {@const itemY = layout.padding + layout.headerSpace + row * (layout.itemH + 4)}
        {@const themeColors = getItemThemeColors(item, quad.color)}
        {@const gradientId = ctx?.gradientsEnabled ? `grad-${instanceId}-${quad.position}-${itemIndex}` : undefined}

        <g transform="translate({itemX}, {itemY})">
          {#if itemSnippet}
            {@render itemSnippet({
              item,
              quadrant: quad.position,
              themeColors,
              width: layout.itemW,
              height: layout.itemH,
              gradientId
            })}
          {:else}
            <!-- Default item rendering -->
            <rect
              x="0"
              y="0"
              width={layout.itemW}
              height={layout.itemH}
              rx="4"
              fill={gradientId ? `url(#${gradientId})` : themeColors.colorPrimary}
            />
            <text
              x={layout.itemW / 2}
              y={layout.itemH / 2}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={themeColors.colorWhite}
              font-size={Math.min(11, layout.itemW / 8)}
              font-weight="500"
            >
              {item.label.length > 12 ? item.label.slice(0, 11) + '…' : item.label}
            </text>
          {/if}
        </g>
      {/each}
    </g>
  {/each}

  <!-- Axis lines -->
  {#if showAxes}
    <!-- Vertical axis -->
    <line
      x1={width / 2}
      y1="0"
      x2={width / 2}
      y2={height}
      stroke={ctx?.colors?.colorTextSecondary || '#666'}
      stroke-width="2"
    />
    <!-- Horizontal axis -->
    <line
      x1="0"
      y1={height / 2}
      x2={width}
      y2={height / 2}
      stroke={ctx?.colors?.colorTextSecondary || '#666'}
      stroke-width="2"
    />
  {/if}

  <!-- Axis labels -->
  {#if axisLabels}
    <!-- X-axis labels -->
    {#if axisLabels.xLeft}
      <text
        x="10"
        y={height / 2 - 8}
        fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
        font-size="11"
        font-weight="500"
      >
        {axisLabels.xLeft}
      </text>
    {/if}
    {#if axisLabels.xRight}
      <text
        x={width - 10}
        y={height / 2 - 8}
        text-anchor="end"
        fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
        font-size="11"
        font-weight="500"
      >
        {axisLabels.xRight}
      </text>
    {/if}
    <!-- Y-axis labels -->
    {#if axisLabels.yTop}
      <text
        x={width / 2 + 8}
        y="14"
        fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
        font-size="11"
        font-weight="500"
      >
        {axisLabels.yTop}
      </text>
    {/if}
    {#if axisLabels.yBottom}
      <text
        x={width / 2 + 8}
        y={height - 6}
        fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
        font-size="11"
        font-weight="500"
      >
        {axisLabels.yBottom}
      </text>
    {/if}
  {/if}
</g>
