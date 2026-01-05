<script lang="ts">
  /**
   * FlowLinear Structure Component
   *
   * Renders a linear process flow with numbered steps and arrows.
   * Great for step-by-step processes, workflows, procedures.
   *
   * @example
   * ```svelte
   * <FlowLinear
   *   steps={processSteps}
   *   direction="horizontal"
   *   showNumbers={true}
   *   arrowStyle="chevron"
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../../theme'
  import type { FlowStep, FlowLinearProps, StepLayout } from './types'
  import { FLOW_LINEAR_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends FlowLinearProps {
    /** Step rendering snippet */
    item?: import('svelte').Snippet<[{
      step: FlowStep
      layout: StepLayout
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
    }]>
  }

  let {
    steps,
    width = FLOW_LINEAR_DEFAULTS.width,
    height = FLOW_LINEAR_DEFAULTS.height,
    direction = FLOW_LINEAR_DEFAULTS.direction,
    showNumbers = FLOW_LINEAR_DEFAULTS.showNumbers,
    showArrows = FLOW_LINEAR_DEFAULTS.showArrows,
    arrowStyle = FLOW_LINEAR_DEFAULTS.arrowStyle,
    gap = FLOW_LINEAR_DEFAULTS.gap,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate step layouts
  const stepLayouts = $derived.by(() => {
    const count = steps.length
    if (count === 0) return []

    const isHorizontal = direction === 'horizontal'
    const arrowSpace = showArrows ? 40 : 0

    // Calculate step dimensions
    const totalArrowSpace = (count - 1) * arrowSpace
    const totalGapSpace = (count - 1) * gap
    const availableSpace = (isHorizontal ? width : height) - totalArrowSpace - totalGapSpace

    const stepSize = availableSpace / count
    const stepWidth = isHorizontal ? stepSize : width
    const stepHeight = isHorizontal ? height : stepSize

    const layouts: StepLayout[] = []

    steps.forEach((step, index) => {
      const offset = index * (stepSize + arrowSpace + gap)
      const x = isHorizontal ? offset : 0
      const y = isHorizontal ? 0 : offset

      const color = step.color || getPaletteColor(palette || ctx?.config?.palette, index, count)
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

      layouts.push({
        step,
        index,
        x,
        y,
        width: stepWidth,
        height: stepHeight,
        number: step.number ?? index + 1,
        themeColors,
        gradientId
      })
    })

    return layouts
  })

  // Generate gradient definitions
  const gradientDefs = $derived.by(() => {
    if (!ctx?.gradientsEnabled) return []
    return stepLayouts
      .filter(l => l.gradientId)
      .map(l => createGradientDef(l.gradientId!, l.themeColors.colorPrimary, ctx?.gradientConfig))
  })

  // Get arrow path between two steps
  function getArrowPath(from: StepLayout, to: StepLayout): string {
    const isHorizontal = direction === 'horizontal'

    if (isHorizontal) {
      const startX = from.x + from.width
      const startY = from.height / 2
      const endX = to.x
      const endY = to.height / 2
      const midX = (startX + endX) / 2

      if (arrowStyle === 'chevron') {
        return `M ${startX + 8} ${startY - 12} L ${midX} ${startY} L ${startX + 8} ${startY + 12}`
      }
      return `M ${startX + 4} ${startY} L ${endX - 4} ${endY}`
    } else {
      const startX = from.width / 2
      const startY = from.y + from.height
      const endX = to.width / 2
      const endY = to.y
      const midY = (startY + endY) / 2

      if (arrowStyle === 'chevron') {
        return `M ${startX - 12} ${startY + 8} L ${startX} ${midY} L ${startX + 12} ${startY + 8}`
      }
      return `M ${startX} ${startY + 4} L ${endX} ${endY - 4}`
    }
  }

  // Arrow marker ID
  const arrowMarkerId = `flow-arrow-${instanceId}`
</script>

<g class="flow-linear">
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
  {#if showArrows && steps.length > 1}
    <g class="flow-arrows">
      {#each stepLayouts.slice(0, -1) as layout, i}
        {@const nextLayout = stepLayouts[i + 1]}
        {#if arrowStyle === 'chevron'}
          <path
            d={getArrowPath(layout, nextLayout)}
            fill="none"
            stroke={ctx?.colors?.colorTextSecondary || '#666'}
            stroke-width="3"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        {:else}
          <path
            d={getArrowPath(layout, nextLayout)}
            fill="none"
            stroke={ctx?.colors?.colorTextSecondary || '#666'}
            stroke-width="2"
            stroke-linecap="round"
            stroke-dasharray={arrowStyle === 'dotted' ? '4,4' : 'none'}
            marker-end={arrowStyle !== 'line' ? `url(#${arrowMarkerId})` : undefined}
          />
        {/if}
      {/each}
    </g>
  {/if}

  <!-- Steps -->
  <g class="flow-steps">
    {#each stepLayouts as layout}
      <g transform="translate({layout.x}, {layout.y})">
        {#if itemSnippet}
          {@render itemSnippet({
            step: layout.step,
            layout,
            themeColors: layout.themeColors,
            width: layout.width,
            height: layout.height,
            gradientId: layout.gradientId
          })}
        {:else}
          <!-- Default step rendering -->
          {@const hasDesc = layout.step.desc && layout.height >= 60}
          {@const numberSize = Math.min(24, layout.width * 0.2)}
          {@const contentX = showNumbers ? numberSize + 8 : 8}
          {@const contentWidth = layout.width - contentX - 8}

          <!-- Background -->
          <rect
            x="0"
            y="0"
            width={layout.width}
            height={layout.height}
            rx="8"
            fill={layout.gradientId ? `url(#${layout.gradientId})` : layout.themeColors.colorPrimary}
          />

          <!-- Step number badge -->
          {#if showNumbers}
            <circle
              cx={numberSize / 2 + 4}
              cy={layout.height / 2}
              r={numberSize / 2}
              fill={layout.themeColors.colorBgElevated}
            />
            <text
              x={numberSize / 2 + 4}
              y={layout.height / 2}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={layout.themeColors.colorWhite}
              font-size={numberSize * 0.5}
              font-weight="700"
            >
              {layout.number}
            </text>
          {/if}

          <!-- Label -->
          <text
            x={contentX + contentWidth / 2}
            y={hasDesc ? layout.height / 2 - 8 : layout.height / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={layout.themeColors.colorWhite}
            font-size={Math.min(14, contentWidth / 8)}
            font-weight="600"
          >
            {layout.step.label.length > 15 ? layout.step.label.slice(0, 14) + '…' : layout.step.label}
          </text>

          <!-- Description -->
          {#if hasDesc && layout.step.desc}
            <text
              x={contentX + contentWidth / 2}
              y={layout.height / 2 + 10}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={layout.themeColors.colorTextSecondary}
              font-size={Math.min(11, contentWidth / 10)}
            >
              {layout.step.desc.length > 20 ? layout.step.desc.slice(0, 19) + '…' : layout.step.desc}
            </text>
          {/if}
        {/if}
      </g>
    {/each}
  </g>
</g>
