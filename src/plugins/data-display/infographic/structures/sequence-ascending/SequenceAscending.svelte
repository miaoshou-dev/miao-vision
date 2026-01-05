<script lang="ts">
  /**
   * SequenceAscending Structure Component
   *
   * Renders an ascending progression with arrow connections.
   * Great for growth visualization, progress steps, achievement levels.
   *
   * @example
   * ```svelte
   * <SequenceAscending
   *   steps={progressSteps}
   *   showArrows={true}
   *   showNumbers={true}
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../../theme'
  import { getIconPath } from '../../icons/mdi-paths'
  import type { AscendingStepData, AscendingStepLayout, SequenceAscendingProps } from './types'
  import { SEQUENCE_ASCENDING_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends SequenceAscendingProps {
    /** Step rendering snippet */
    item?: import('svelte').Snippet<[{
      step: AscendingStepData
      layout: AscendingStepLayout
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
    }]>
  }

  let {
    steps,
    width = SEQUENCE_ASCENDING_DEFAULTS.width,
    height = SEQUENCE_ASCENDING_DEFAULTS.height,
    gap = SEQUENCE_ASCENDING_DEFAULTS.gap,
    showArrows = SEQUENCE_ASCENDING_DEFAULTS.showArrows,
    showNumbers = SEQUENCE_ASCENDING_DEFAULTS.showNumbers,
    minHeightRatio = SEQUENCE_ASCENDING_DEFAULTS.minHeightRatio,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Reserve space for labels
  const labelHeight = 40
  const chartHeight = $derived(height - labelHeight)

  // Calculate step layouts
  const stepLayouts = $derived.by(() => {
    const count = steps.length
    if (count === 0) return []

    const arrowSpace = showArrows ? 24 : 0
    const totalArrowSpace = (count - 1) * arrowSpace
    const totalGaps = (count - 1) * gap
    const barWidth = (width - totalGaps - totalArrowSpace) / count

    const minHeight = chartHeight * minHeightRatio
    const heightIncrement = (chartHeight - minHeight) / (count - 1 || 1)

    return steps.map((step, i) => {
      const barHeight = minHeight + i * heightIncrement
      const x = i * (barWidth + gap + arrowSpace)
      const y = chartHeight - barHeight

      return {
        step,
        x,
        y,
        width: barWidth,
        height: barHeight,
        index: i
      } as AscendingStepLayout
    })
  })

  // Get theme colors for step
  function getStepThemeColors(step: AscendingStepData, index: number): ThemeColors {
    const color = step.color || getPaletteColor(palette || ctx?.config?.palette, index, steps.length)
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

  // Generate gradient definitions
  const gradientDefs = $derived.by(() => {
    if (!ctx?.gradientsEnabled) return []
    return stepLayouts.map((layout, i) => {
      const themeColors = getStepThemeColors(layout.step, i)
      return createGradientDef(`grad-${instanceId}-${i}`, themeColors.colorPrimary, ctx?.gradientConfig)
    })
  })

  // Get icon path helper
  function getIcon(iconName?: string): string | null {
    return iconName ? getIconPath(iconName) : null
  }

  // Arrow marker ID
  const arrowMarkerId = `arrow-${instanceId}`
</script>

<g class="sequence-ascending">
  <!-- Definitions -->
  <defs>
    <!-- Arrow marker -->
    <marker
      id={arrowMarkerId}
      markerWidth="10"
      markerHeight="10"
      refX="9"
      refY="3"
      orient="auto"
      markerUnits="strokeWidth"
    >
      <path d="M0,0 L0,6 L9,3 z" fill={ctx?.colors?.colorTextSecondary || '#666'} />
    </marker>
    <!-- Gradient definitions -->
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Arrows between steps -->
  {#if showArrows && stepLayouts.length > 1}
    <g class="ascending-arrows">
      {#each stepLayouts.slice(0, -1) as layout, i}
        {@const nextLayout = stepLayouts[i + 1]}
        {@const arrowX = layout.x + layout.width + gap / 2}
        {@const fromY = layout.y + layout.height / 2}
        {@const toY = nextLayout.y + nextLayout.height / 2}
        <path
          d="M {arrowX} {fromY} L {arrowX + 20} {toY}"
          fill="none"
          stroke={ctx?.colors?.colorTextSecondary || '#666'}
          stroke-width="2"
          stroke-linecap="round"
          marker-end="url(#{arrowMarkerId})"
        />
      {/each}
    </g>
  {/if}

  <!-- Steps -->
  {#each stepLayouts as layout, i}
    {@const themeColors = getStepThemeColors(layout.step, i)}
    {@const gradientId = ctx?.gradientsEnabled ? `grad-${instanceId}-${i}` : undefined}
    {@const icon = getIcon(layout.step.icon)}

    <g class="ascending-step" transform="translate({layout.x}, 0)">
      {#if itemSnippet}
        <g transform="translate(0, {layout.y})">
          {@render itemSnippet({
            step: layout.step,
            layout,
            themeColors,
            width: layout.width,
            height: layout.height,
            gradientId
          })}
        </g>
      {:else}
        <!-- Bar -->
        <rect
          x="0"
          y={layout.y}
          width={layout.width}
          height={layout.height}
          rx="8"
          fill={gradientId ? `url(#${gradientId})` : themeColors.colorPrimary}
        />

        <!-- Number badge -->
        {#if showNumbers}
          <circle
            cx={layout.width / 2}
            cy={layout.y + 16}
            r="12"
            fill={themeColors.colorBgElevated}
          />
          <text
            x={layout.width / 2}
            y={layout.y + 16}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={themeColors.colorWhite}
            font-size="11"
            font-weight="700"
          >
            {i + 1}
          </text>
        {/if}

        <!-- Icon -->
        {#if icon && layout.height > 60}
          <g transform="translate({layout.width / 2 - 10}, {layout.y + (showNumbers ? 36 : 16)})">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d={icon} fill={themeColors.colorWhite} />
            </svg>
          </g>
        {/if}

        <!-- Label below bar -->
        <text
          x={layout.width / 2}
          y={chartHeight + 16}
          text-anchor="middle"
          fill={ctx?.colors?.colorText || '#fff'}
          font-size="12"
          font-weight="500"
        >
          {layout.step.label.length > 10 ? layout.step.label.slice(0, 9) + '…' : layout.step.label}
        </text>

        <!-- Description -->
        {#if layout.step.desc}
          <text
            x={layout.width / 2}
            y={chartHeight + 30}
            text-anchor="middle"
            fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
            font-size="10"
          >
            {layout.step.desc.length > 12 ? layout.step.desc.slice(0, 11) + '…' : layout.step.desc}
          </text>
        {/if}
      {/if}
    </g>
  {/each}
</g>
