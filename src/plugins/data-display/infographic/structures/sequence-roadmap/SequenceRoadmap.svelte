<script lang="ts">
  /**
   * SequenceRoadmap Structure Component
   *
   * Renders a horizontal roadmap with milestones.
   * Great for project timelines, product roadmaps, release planning.
   *
   * @example
   * ```svelte
   * <SequenceRoadmap
   *   milestones={projectMilestones}
   *   showLine={true}
   *   alternate={true}
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../../theme'
  import { getIconPath } from '../../icons/mdi-paths'
  import type { MilestoneData, MilestoneLayout, SequenceRoadmapProps } from './types'
  import { SEQUENCE_ROADMAP_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends SequenceRoadmapProps {
    /** Milestone rendering snippet */
    item?: import('svelte').Snippet<[{
      milestone: MilestoneData
      layout: MilestoneLayout
      themeColors: ThemeColors
      markerSize: number
      gradientId?: string
    }]>
  }

  let {
    milestones,
    width = SEQUENCE_ROADMAP_DEFAULTS.width,
    height = SEQUENCE_ROADMAP_DEFAULTS.height,
    showLine = SEQUENCE_ROADMAP_DEFAULTS.showLine,
    linePosition = SEQUENCE_ROADMAP_DEFAULTS.linePosition,
    markerSize = SEQUENCE_ROADMAP_DEFAULTS.markerSize,
    showDates = SEQUENCE_ROADMAP_DEFAULTS.showDates,
    alternate = SEQUENCE_ROADMAP_DEFAULTS.alternate,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate line Y position
  const lineY = $derived.by(() => {
    if (linePosition === 'top') return height * 0.25
    if (linePosition === 'bottom') return height * 0.75
    return height / 2
  })

  // Calculate milestone layouts
  const milestoneLayouts = $derived.by(() => {
    const count = milestones.length
    if (count === 0) return []

    const padding = markerSize + 20
    const availableWidth = width - padding * 2
    const step = availableWidth / (count - 1 || 1)

    return milestones.map((milestone, i) => {
      const x = padding + i * step
      let y = lineY

      // Alternate above/below line
      if (alternate && count > 1) {
        y = i % 2 === 0 ? lineY - 40 : lineY + 40
      }

      return {
        milestone,
        x,
        y,
        index: i
      } as MilestoneLayout
    })
  })

  // Get theme colors for milestone
  function getMilestoneThemeColors(milestone: MilestoneData, index: number): ThemeColors {
    let color = milestone.color

    if (!color) {
      // Use status-based coloring
      if (milestone.status === 'completed') {
        color = '#22c55e' // Green
      } else if (milestone.status === 'current') {
        color = '#3b82f6' // Blue
      } else {
        color = getPaletteColor(palette || ctx?.config?.palette, index, milestones.length)
      }
    }

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
    return milestoneLayouts.map((layout, i) => {
      const themeColors = getMilestoneThemeColors(layout.milestone, i)
      return createGradientDef(`grad-${instanceId}-${i}`, themeColors.colorPrimary, ctx?.gradientConfig)
    })
  })

  // Get icon path helper
  function getIcon(iconName?: string): string | null {
    return iconName ? getIconPath(iconName) : null
  }

  // Get status icon
  function getStatusIcon(status?: string): string | null {
    if (status === 'completed') return getIconPath('check')
    if (status === 'current') return getIconPath('circle')
    return null
  }
</script>

<g class="sequence-roadmap">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Connecting line -->
  {#if showLine && milestoneLayouts.length > 1}
    <line
      x1={milestoneLayouts[0].x}
      y1={lineY}
      x2={milestoneLayouts[milestoneLayouts.length - 1].x}
      y2={lineY}
      stroke={ctx?.colors?.colorTextSecondary || '#666'}
      stroke-width="3"
      stroke-linecap="round"
    />
    <!-- Progress line (completed sections) -->
    {#each milestoneLayouts as layout, i}
      {#if layout.milestone.status === 'completed' && i < milestoneLayouts.length - 1}
        {@const nextLayout = milestoneLayouts[i + 1]}
        <line
          x1={layout.x}
          y1={lineY}
          x2={nextLayout.x}
          y2={lineY}
          stroke="#22c55e"
          stroke-width="3"
          stroke-linecap="round"
        />
      {/if}
    {/each}
  {/if}

  <!-- Milestones -->
  {#each milestoneLayouts as layout, i}
    {@const themeColors = getMilestoneThemeColors(layout.milestone, i)}
    {@const gradientId = ctx?.gradientsEnabled ? `grad-${instanceId}-${i}` : undefined}
    {@const isAbove = alternate && i % 2 === 0}

    <g class="milestone" transform="translate({layout.x}, {layout.y})">
      {#if itemSnippet}
        {@render itemSnippet({
          milestone: layout.milestone,
          layout,
          themeColors,
          markerSize,
          gradientId
        })}
      {:else}
        <!-- Connector line from main line to marker -->
        {#if alternate}
          <line
            x1="0"
            y1="0"
            x2="0"
            y2={isAbove ? 40 : -40}
            stroke={ctx?.colors?.colorTextSecondary || '#666'}
            stroke-width="2"
          />
        {/if}

        <!-- Marker circle -->
        <circle
          cx="0"
          cy="0"
          r={markerSize}
          fill={gradientId ? `url(#${gradientId})` : themeColors.colorPrimary}
          stroke={ctx?.colors?.colorBg || '#1a1a2e'}
          stroke-width="3"
        />

        <!-- Icon or status indicator -->
        {@const icon = getIcon(layout.milestone.icon) || getStatusIcon(layout.milestone.status)}
        {#if icon}
          <g transform="translate({-10}, {-10})">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d={icon} fill={themeColors.colorWhite} />
            </svg>
          </g>
        {/if}

        <!-- Title -->
        <text
          x="0"
          y={isAbove ? -markerSize - 24 : markerSize + 20}
          text-anchor="middle"
          fill={ctx?.colors?.colorText || '#fff'}
          font-size="13"
          font-weight="600"
        >
          {layout.milestone.title.length > 15 ? layout.milestone.title.slice(0, 14) + '…' : layout.milestone.title}
        </text>

        <!-- Date -->
        {#if showDates && layout.milestone.date}
          <text
            x="0"
            y={isAbove ? -markerSize - 10 : markerSize + 34}
            text-anchor="middle"
            fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
            font-size="11"
          >
            {layout.milestone.date}
          </text>
        {/if}

        <!-- Description -->
        {#if layout.milestone.desc}
          <text
            x="0"
            y={isAbove ? -markerSize - 38 : markerSize + 48}
            text-anchor="middle"
            fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
            font-size="10"
          >
            {layout.milestone.desc.length > 20 ? layout.milestone.desc.slice(0, 19) + '…' : layout.milestone.desc}
          </text>
        {/if}
      {/if}
    </g>
  {/each}
</g>
