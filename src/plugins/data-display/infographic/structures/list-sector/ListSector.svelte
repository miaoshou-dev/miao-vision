<script lang="ts">
  /**
   * ListSector Structure Component
   *
   * Renders items in a radial sector (pie/donut) layout.
   * Supports proportional or equal sizing, with customizable angles.
   *
   * @example
   * ```svelte
   * <ListSector
   *   items={[
   *     { id: '1', label: 'Category A', value: 30 },
   *     { id: '2', label: 'Category B', value: 70 }
   *   ]}
   *   innerRadius={0.4}
   *   showLabels={true}
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { createGradientDef, gradientDefToSVG } from '../../theme'
  import { calculateSectorLayout, calculatePercentage } from './layout'
  import type {
    SectorItem,
    SectorLayout,
    ListSectorProps,
    LIST_SECTOR_DEFAULTS
  } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends ListSectorProps {
    /** Item rendering snippet */
    item?: import('svelte').Snippet<[{
      sector: SectorLayout
      item: SectorItem
      themeColors: ThemeColors
      percentage: number
      gradientId?: string
    }]>
  }

  let {
    items,
    width = 400,
    height = 400,
    innerRadius = 0,
    outerRadius,
    startAngle = 0,
    endAngle = 360,
    sectorGap = 2,
    proportional = true,
    showLabels = true,
    labelPosition = 'outside',
    palette,
    showCenter = false,
    centerLabel,
    centerValue,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Generate unique instance ID for gradients
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate sector layout
  const sectorLayout = $derived(
    calculateSectorLayout(items, {
      width,
      height,
      innerRadius,
      outerRadius,
      startAngle,
      endAngle,
      sectorGap,
      proportional,
      labelPosition,
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
    return sectorLayout.sectors.map((s) =>
      createGradientDef(
        s.gradientId!,
        s.themeColors.colorPrimary,
        ctx?.gradientConfig
      )
    )
  })

  // Helper to get text anchor based on label position
  function getLabelAnchor(sector: SectorLayout): string {
    if (labelPosition === 'inside' || labelPosition === 'center') {
      return 'middle'
    }
    // For outside labels, anchor based on which side
    const adjustedAngle = sector.midAngle - Math.PI / 2
    const x = Math.cos(adjustedAngle)
    if (x > 0.1) return 'start'
    if (x < -0.1) return 'end'
    return 'middle'
  }
</script>

<g class="list-sector">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Sectors -->
  {#each sectorLayout.sectors as sector}
    <g class="sector sector-{sector.index}">
      <!-- Sector path -->
      <path
        d={sector.pathData}
        fill={sector.gradientId
          ? `url(#${sector.gradientId})`
          : sector.themeColors.colorPrimary}
        stroke={ctx?.colors?.colorBg || '#1a1a2e'}
        stroke-width="1"
      />

      <!-- Custom item rendering -->
      {#if itemSnippet}
        {@render itemSnippet({
          sector,
          item: sector.item,
          themeColors: sector.themeColors,
          percentage: calculatePercentage(
            sector.item.value ?? 1,
            sectorLayout.totalValue
          ),
          gradientId: sector.gradientId
        })}
      {/if}

      <!-- Default label rendering -->
      {#if showLabels && !itemSnippet}
        <text
          x={sector.labelX}
          y={sector.labelY}
          text-anchor={getLabelAnchor(sector)}
          dominant-baseline="middle"
          fill={labelPosition === 'inside'
            ? sector.themeColors.colorWhite
            : (ctx?.colors?.colorText || '#ffffff')}
          font-size="11"
          font-weight="500"
        >
          {sector.item.label}
        </text>
        {#if sector.item.value !== undefined && proportional}
          <text
            x={sector.labelX}
            y={sector.labelY + 14}
            text-anchor={getLabelAnchor(sector)}
            dominant-baseline="middle"
            fill={labelPosition === 'inside'
              ? sector.themeColors.colorWhite
              : (ctx?.colors?.colorTextSecondary || '#a0a0b0')}
            font-size="10"
          >
            {calculatePercentage(sector.item.value, sectorLayout.totalValue).toFixed(1)}%
          </text>
        {/if}
      {/if}
    </g>
  {/each}

  <!-- Center content (for donut charts) -->
  {#if showCenter && innerRadius > 0}
    <g class="sector-center">
      {#if centerValue !== undefined}
        <text
          x={sectorLayout.centerX}
          y={sectorLayout.centerY - 8}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={ctx?.colors?.colorText || '#ffffff'}
          font-size="24"
          font-weight="700"
        >
          {centerValue}
        </text>
      {/if}
      {#if centerLabel}
        <text
          x={sectorLayout.centerX}
          y={sectorLayout.centerY + (centerValue !== undefined ? 12 : 0)}
          text-anchor="middle"
          dominant-baseline="middle"
          fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
          font-size="12"
        >
          {centerLabel}
        </text>
      {/if}
    </g>
  {/if}
</g>
