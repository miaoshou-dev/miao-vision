<script lang="ts">
  /**
   * SequenceStairs Structure Component
   *
   * Renders a stair-step progression layout.
   * Great for growth stages, skill levels, achievement tiers.
   *
   * @example
   * ```svelte
   * <SequenceStairs
   *   steps={growthStages}
   *   direction="up"
   *   showNumbers={true}
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../../theme'
  import { getIconPath } from '../../icons/mdi-paths'
  import type { StairStepData, StairStepLayout, SequenceStairsProps } from './types'
  import { SEQUENCE_STAIRS_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends SequenceStairsProps {
    /** Step rendering snippet */
    item?: import('svelte').Snippet<[{
      step: StairStepData
      layout: StairStepLayout
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
    }]>
  }

  let {
    steps,
    width = SEQUENCE_STAIRS_DEFAULTS.width,
    height = SEQUENCE_STAIRS_DEFAULTS.height,
    direction = SEQUENCE_STAIRS_DEFAULTS.direction,
    gap = SEQUENCE_STAIRS_DEFAULTS.gap,
    showNumbers = SEQUENCE_STAIRS_DEFAULTS.showNumbers,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate step layouts
  const stepLayouts = $derived.by(() => {
    const count = steps.length
    if (count === 0) return []

    const totalGap = (count - 1) * gap
    const stepWidth = (width - totalGap) / count
    const stepHeightIncrement = height / count

    return steps.map((step, i) => {
      const x = i * (stepWidth + gap)
      const stepHeight = (i + 1) * stepHeightIncrement
      const y = direction === 'up' ? height - stepHeight : 0

      return {
        step,
        x,
        y,
        width: stepWidth,
        height: stepHeight,
        index: i
      } as StairStepLayout
    })
  })

  // Get theme colors for step
  function getStepThemeColors(step: StairStepData, index: number): ThemeColors {
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
</script>

<g class="sequence-stairs">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Steps -->
  {#each stepLayouts as layout, i}
    {@const themeColors = getStepThemeColors(layout.step, i)}
    {@const gradientId = ctx?.gradientsEnabled ? `grad-${instanceId}-${i}` : undefined}
    {@const icon = getIcon(layout.step.icon)}

    <g class="stair-step" transform="translate({layout.x}, {layout.y})">
      {#if itemSnippet}
        {@render itemSnippet({
          step: layout.step,
          layout,
          themeColors,
          width: layout.width,
          height: layout.height,
          gradientId
        })}
      {:else}
        <!-- Step background -->
        <rect
          x="0"
          y="0"
          width={layout.width}
          height={layout.height}
          rx="8"
          fill={gradientId ? `url(#${gradientId})` : themeColors.colorPrimary}
        />

        <!-- Step number badge -->
        {#if showNumbers}
          <circle
            cx={layout.width / 2}
            cy="20"
            r="14"
            fill={themeColors.colorBgElevated}
          />
          <text
            x={layout.width / 2}
            y="20"
            text-anchor="middle"
            dominant-baseline="middle"
            fill={themeColors.colorWhite}
            font-size="12"
            font-weight="700"
          >
            {i + 1}
          </text>
        {/if}

        <!-- Icon -->
        {#if icon}
          <g transform="translate({layout.width / 2 - 12}, {showNumbers ? 42 : 16})">
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path d={icon} fill={themeColors.colorWhite} />
            </svg>
          </g>
        {/if}

        <!-- Label -->
        <text
          x={layout.width / 2}
          y={layout.height - (layout.step.desc ? 28 : 16)}
          text-anchor="middle"
          fill={themeColors.colorWhite}
          font-size="13"
          font-weight="600"
        >
          {layout.step.label.length > 12 ? layout.step.label.slice(0, 11) + '…' : layout.step.label}
        </text>

        <!-- Description -->
        {#if layout.step.desc && layout.height > 80}
          <text
            x={layout.width / 2}
            y={layout.height - 10}
            text-anchor="middle"
            fill={themeColors.colorWhite}
            font-size="10"
            opacity="0.8"
          >
            {layout.step.desc.length > 15 ? layout.step.desc.slice(0, 14) + '…' : layout.step.desc}
          </text>
        {/if}

        <!-- Value badge -->
        {#if layout.step.value !== undefined}
          <text
            x={layout.width / 2}
            y={showNumbers ? 58 : (icon ? 50 : 35)}
            text-anchor="middle"
            fill={themeColors.colorWhite}
            font-size="16"
            font-weight="700"
          >
            {layout.step.value}
          </text>
        {/if}
      {/if}
    </g>
  {/each}
</g>
