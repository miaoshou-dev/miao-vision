<script lang="ts">
  /**
   * RelationVenn Structure Component
   *
   * Renders a Venn diagram showing set relationships.
   * Supports 2-3 overlapping circles.
   *
   * @example
   * ```svelte
   * <RelationVenn
   *   sets={[
   *     { id: 'a', label: 'Set A', items: ['x', 'y'] },
   *     { id: 'b', label: 'Set B', items: ['z'] }
   *   ]}
   *   overlaps={[{ sets: ['a', 'b'], items: ['shared'] }]}
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors } from '../../theme'
  import type { VennSetData, VennCircleLayout, RelationVennProps } from './types'
  import { RELATION_VENN_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends RelationVennProps {
    /** Custom circle rendering snippet */
    item?: import('svelte').Snippet<[{
      set: VennSetData
      layout: VennCircleLayout
      themeColors: ThemeColors
    }]>
  }

  let {
    sets,
    overlaps = [],
    width = RELATION_VENN_DEFAULTS.width,
    height = RELATION_VENN_DEFAULTS.height,
    opacity = RELATION_VENN_DEFAULTS.opacity,
    showLabels = RELATION_VENN_DEFAULTS.showLabels,
    showItems = RELATION_VENN_DEFAULTS.showItems,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Calculate circle layouts based on number of sets
  const circleLayouts = $derived.by(() => {
    const count = sets.length
    if (count === 0) return []

    const centerX = width / 2
    const centerY = height / 2
    const maxRadius = Math.min(width, height) * 0.35

    if (count === 2) {
      // Two circles side by side with overlap
      const overlapRatio = 0.35
      const spacing = maxRadius * (2 - overlapRatio)
      return sets.map((set, i) => ({
        set,
        cx: centerX + (i === 0 ? -spacing / 2 : spacing / 2),
        cy: centerY,
        r: maxRadius,
        index: i
      } as VennCircleLayout))
    } else if (count === 3) {
      // Three circles in triangle formation
      const overlapRatio = 0.4
      const triangleRadius = maxRadius * (1 - overlapRatio / 2)
      const angles = [-90, 150, 30].map(a => a * Math.PI / 180)
      return sets.map((set, i) => ({
        set,
        cx: centerX + Math.cos(angles[i]) * triangleRadius * 0.6,
        cy: centerY + Math.sin(angles[i]) * triangleRadius * 0.6,
        r: maxRadius * 0.85,
        index: i
      } as VennCircleLayout))
    }

    // Single circle fallback
    return [{
      set: sets[0],
      cx: centerX,
      cy: centerY,
      r: maxRadius,
      index: 0
    } as VennCircleLayout]
  })

  // Get theme colors for each set
  function getSetThemeColors(set: VennSetData, index: number): ThemeColors {
    const color = set.color || getPaletteColor(palette || ctx?.config?.palette, index, sets.length)
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

  // Calculate center of overlap region for 2 sets
  function getOverlapCenter2(layout1: VennCircleLayout, layout2: VennCircleLayout): { x: number, y: number } {
    return {
      x: (layout1.cx + layout2.cx) / 2,
      y: (layout1.cy + layout2.cy) / 2
    }
  }

  // Calculate center of overlap region for 3 sets
  function getOverlapCenter3(): { x: number, y: number } {
    if (circleLayouts.length < 3) return { x: width / 2, y: height / 2 }
    const avgX = circleLayouts.reduce((sum, l) => sum + l.cx, 0) / 3
    const avgY = circleLayouts.reduce((sum, l) => sum + l.cy, 0) / 3
    return { x: avgX, y: avgY }
  }

  // Get label position for a set (outside the circle)
  function getLabelPosition(layout: VennCircleLayout, index: number): { x: number, y: number } {
    const count = sets.length
    if (count === 2) {
      const offsetX = index === 0 ? -layout.r - 10 : layout.r + 10
      return { x: layout.cx + offsetX, y: layout.cy - layout.r - 20 }
    } else if (count === 3) {
      const angles = [-90, 150, 30].map(a => a * Math.PI / 180)
      const labelDist = layout.r + 25
      return {
        x: layout.cx + Math.cos(angles[index]) * labelDist * 0.5,
        y: layout.cy + Math.sin(angles[index]) * labelDist * 0.5 - layout.r - 15
      }
    }
    return { x: layout.cx, y: layout.cy - layout.r - 20 }
  }
</script>

<g class="relation-venn">
  <!-- Circles with blend mode for overlap effect -->
  {#each circleLayouts as layout, i}
    {@const themeColors = getSetThemeColors(layout.set, i)}
    {#if itemSnippet}
      {@render itemSnippet({ set: layout.set, layout, themeColors })}
    {:else}
      <circle
        cx={layout.cx}
        cy={layout.cy}
        r={layout.r}
        fill={themeColors.colorPrimary}
        fill-opacity={opacity}
        stroke={themeColors.colorPrimary}
        stroke-width="2"
        stroke-opacity="0.8"
      />
    {/if}
  {/each}

  <!-- Labels for each set -->
  {#if showLabels}
    {#each circleLayouts as layout, i}
      {@const themeColors = getSetThemeColors(layout.set, i)}
      {@const labelPos = getLabelPosition(layout, i)}
      <g transform="translate({labelPos.x}, {labelPos.y})">
        <text
          x="0"
          y="0"
          text-anchor="middle"
          fill={themeColors.colorPrimary}
          font-size="14"
          font-weight="700"
        >
          {layout.set.label}
        </text>
        {#if layout.set.desc}
          <text
            x="0"
            y="16"
            text-anchor="middle"
            fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
            font-size="11"
          >
            {layout.set.desc.length > 20 ? layout.set.desc.slice(0, 19) + '…' : layout.set.desc}
          </text>
        {/if}
      </g>
    {/each}
  {/if}

  <!-- Items in exclusive regions -->
  {#if showItems}
    {#each circleLayouts as layout, i}
      {@const items = layout.set.items || []}
      {#if items.length > 0}
        {@const offsetAngle = sets.length === 2 ? (i === 0 ? Math.PI : 0) : ([-90, 150, 30][i] * Math.PI / 180)}
        {@const itemX = layout.cx + Math.cos(offsetAngle) * layout.r * 0.5}
        {@const itemY = layout.cy + Math.sin(offsetAngle) * layout.r * 0.5}
        <g transform="translate({itemX}, {itemY})">
          {#each items.slice(0, 3) as item, j}
            <text
              x="0"
              y={j * 14}
              text-anchor="middle"
              fill={ctx?.colors?.colorText || '#fff'}
              font-size="10"
            >
              {item.length > 12 ? item.slice(0, 11) + '…' : item}
            </text>
          {/each}
          {#if items.length > 3}
            <text
              x="0"
              y={3 * 14}
              text-anchor="middle"
              fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
              font-size="9"
            >
              +{items.length - 3} more
            </text>
          {/if}
        </g>
      {/if}
    {/each}
  {/if}

  <!-- Overlap regions labels -->
  {#if showItems && overlaps.length > 0}
    {#each overlaps as overlap}
      {#if overlap.sets.length === 2 && sets.length >= 2}
        {@const idx1 = sets.findIndex(s => s.id === overlap.sets[0])}
        {@const idx2 = sets.findIndex(s => s.id === overlap.sets[1])}
        {#if idx1 >= 0 && idx2 >= 0 && circleLayouts[idx1] && circleLayouts[idx2]}
          {@const center = getOverlapCenter2(circleLayouts[idx1], circleLayouts[idx2])}
          <g transform="translate({center.x}, {center.y})">
            {#if overlap.label}
              <text
                x="0"
                y="-10"
                text-anchor="middle"
                fill={ctx?.colors?.colorText || '#fff'}
                font-size="11"
                font-weight="600"
              >
                {overlap.label}
              </text>
            {/if}
            {#if overlap.items}
              {#each overlap.items.slice(0, 2) as item, j}
                <text
                  x="0"
                  y={j * 12 + 4}
                  text-anchor="middle"
                  fill={ctx?.colors?.colorText || '#fff'}
                  font-size="10"
                >
                  {item.length > 10 ? item.slice(0, 9) + '…' : item}
                </text>
              {/each}
            {/if}
          </g>
        {/if}
      {:else if overlap.sets.length === 3 && sets.length === 3}
        {@const center = getOverlapCenter3()}
        <g transform="translate({center.x}, {center.y})">
          {#if overlap.label}
            <text
              x="0"
              y="0"
              text-anchor="middle"
              fill={ctx?.colors?.colorText || '#fff'}
              font-size="11"
              font-weight="600"
            >
              {overlap.label}
            </text>
          {/if}
        </g>
      {/if}
    {/each}
  {/if}
</g>
