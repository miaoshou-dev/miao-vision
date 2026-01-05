<script lang="ts">
  /**
   * RelationCircle Structure Component
   *
   * Renders nodes arranged in a circle with connections between them.
   * Great for showing relationships, dependencies, or interactions.
   *
   * @example
   * ```svelte
   * <RelationCircle
   *   nodes={teamMembers}
   *   connections={collaborations}
   *   centerLabel="Team"
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../../theme'
  import { getIconPath } from '../../icons/mdi-paths'
  import type { CircleNodeData, CircleNodeLayout, RelationCircleProps } from './types'
  import { RELATION_CIRCLE_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends RelationCircleProps {
    /** Node rendering snippet */
    item?: import('svelte').Snippet<[{
      node: CircleNodeData
      layout: CircleNodeLayout
      themeColors: ThemeColors
      gradientId?: string
    }]>
  }

  let {
    nodes,
    connections = [],
    width = RELATION_CIRCLE_DEFAULTS.width,
    height = RELATION_CIRCLE_DEFAULTS.height,
    nodeSize = RELATION_CIRCLE_DEFAULTS.nodeSize,
    showConnectionLabels = RELATION_CIRCLE_DEFAULTS.showConnectionLabels,
    showCenter = RELATION_CIRCLE_DEFAULTS.showCenter,
    centerLabel = RELATION_CIRCLE_DEFAULTS.centerLabel,
    curveAmount = RELATION_CIRCLE_DEFAULTS.curveAmount,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Center of the circle
  const centerX = $derived(width / 2)
  const centerY = $derived(height / 2)

  // Radius for placing nodes
  const circleRadius = $derived(Math.min(width, height) / 2 - nodeSize - 20)

  // Calculate node layouts
  const nodeLayouts = $derived.by(() => {
    const count = nodes.length
    if (count === 0) return []

    return nodes.map((node, i) => {
      const angle = (i / count) * Math.PI * 2 - Math.PI / 2 // Start from top
      return {
        node,
        cx: centerX + Math.cos(angle) * circleRadius,
        cy: centerY + Math.sin(angle) * circleRadius,
        angle,
        index: i
      } as CircleNodeLayout
    })
  })

  // Get theme colors for each node
  function getNodeThemeColors(node: CircleNodeData, index: number): ThemeColors {
    const color = node.color || getPaletteColor(palette || ctx?.config?.palette, index, nodes.length)
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
    return nodeLayouts.map((layout, i) => {
      const colors = getNodeThemeColors(layout.node, i)
      return createGradientDef(`grad-${instanceId}-${i}`, colors.colorPrimary, ctx?.gradientConfig)
    })
  })

  // Get node layout by id
  function getNodeLayout(id: string): CircleNodeLayout | undefined {
    return nodeLayouts.find(l => l.node.id === id)
  }

  // Calculate curved path between two nodes
  function getConnectionPath(fromId: string, toId: string): string {
    const from = getNodeLayout(fromId)
    const to = getNodeLayout(toId)
    if (!from || !to) return ''

    const x1 = from.cx
    const y1 = from.cy
    const x2 = to.cx
    const y2 = to.cy

    if (curveAmount === 0) {
      return `M ${x1} ${y1} L ${x2} ${y2}`
    }

    // Curved path through center
    const midX = (x1 + x2) / 2
    const midY = (y1 + y2) / 2
    const dx = midX - centerX
    const dy = midY - centerY
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Control point - pull towards center
    const cpX = midX - dx * curveAmount
    const cpY = midY - dy * curveAmount

    return `M ${x1} ${y1} Q ${cpX} ${cpY} ${x2} ${y2}`
  }

  // Get icon path
  function getIcon(iconName?: string): string | null {
    return iconName ? getIconPath(iconName) : null
  }
</script>

<g class="relation-circle">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Outer circle guide (subtle) -->
  <circle
    cx={centerX}
    cy={centerY}
    r={circleRadius}
    fill="none"
    stroke={ctx?.colors?.colorTextSecondary || '#666'}
    stroke-width="1"
    stroke-dasharray="4,4"
    opacity="0.3"
  />

  <!-- Connections -->
  <g class="connections">
    {#each connections as conn}
      {@const path = getConnectionPath(conn.from, conn.to)}
      {#if path}
        <path
          d={path}
          fill="none"
          stroke={ctx?.colors?.colorTextSecondary || '#666'}
          stroke-width="2"
          opacity="0.5"
        />
        {#if conn.bidirectional}
          <!-- Bidirectional indicator -->
        {/if}
        {#if showConnectionLabels && conn.label}
          {@const from = getNodeLayout(conn.from)}
          {@const to = getNodeLayout(conn.to)}
          {#if from && to}
            <text
              x={(from.cx + to.cx) / 2}
              y={(from.cy + to.cy) / 2 - 5}
              text-anchor="middle"
              fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
              font-size="9"
            >
              {conn.label}
            </text>
          {/if}
        {/if}
      {/if}
    {/each}
  </g>

  <!-- Center element -->
  {#if showCenter}
    <circle
      cx={centerX}
      cy={centerY}
      r={nodeSize * 0.6}
      fill={ctx?.colors?.colorBgElevated || '#2a2a4a'}
      stroke={ctx?.colors?.colorTextSecondary || '#666'}
      stroke-width="2"
    />
    {#if centerLabel}
      <text
        x={centerX}
        y={centerY}
        text-anchor="middle"
        dominant-baseline="middle"
        fill={ctx?.colors?.colorText || '#fff'}
        font-size="12"
        font-weight="600"
      >
        {centerLabel.length > 8 ? centerLabel.slice(0, 7) + '…' : centerLabel}
      </text>
    {/if}
  {/if}

  <!-- Nodes -->
  {#each nodeLayouts as layout, i}
    {@const themeColors = getNodeThemeColors(layout.node, i)}
    {@const iconPath = getIcon(layout.node.icon)}
    {@const gradientId = ctx?.gradientsEnabled ? `grad-${instanceId}-${i}` : undefined}
    <g transform="translate({layout.cx}, {layout.cy})">
      {#if itemSnippet}
        {@render itemSnippet({ node: layout.node, layout, themeColors, gradientId })}
      {:else}
        <!-- Node circle -->
        <circle
          cx="0"
          cy="0"
          r={nodeSize / 2}
          fill={gradientId ? `url(#${gradientId})` : themeColors.colorPrimary}
        />

        <!-- Inner highlight -->
        <circle
          cx="0"
          cy="0"
          r={nodeSize / 2 - 2}
          fill="none"
          stroke={themeColors.colorWhite}
          stroke-width="1"
          opacity="0.2"
        />

        <!-- Icon or initial -->
        {#if iconPath}
          <g transform="translate(-10, -10)">
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d={iconPath} fill={themeColors.colorWhite} />
            </svg>
          </g>
        {:else}
          <text
            x="0"
            y="0"
            text-anchor="middle"
            dominant-baseline="middle"
            fill={themeColors.colorWhite}
            font-size={nodeSize * 0.35}
            font-weight="700"
          >
            {layout.node.label.charAt(0).toUpperCase()}
          </text>
        {/if}

        <!-- Label below -->
        <text
          x="0"
          y={nodeSize / 2 + 14}
          text-anchor="middle"
          fill={ctx?.colors?.colorText || '#fff'}
          font-size="11"
          font-weight="500"
        >
          {layout.node.label.length > 10 ? layout.node.label.slice(0, 9) + '…' : layout.node.label}
        </text>

        <!-- Description -->
        {#if layout.node.desc}
          <text
            x="0"
            y={nodeSize / 2 + 26}
            text-anchor="middle"
            fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
            font-size="9"
          >
            {layout.node.desc.length > 15 ? layout.node.desc.slice(0, 14) + '…' : layout.node.desc}
          </text>
        {/if}
      {/if}
    </g>
  {/each}
</g>
