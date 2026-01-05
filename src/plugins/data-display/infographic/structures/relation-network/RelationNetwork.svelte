<script lang="ts">
  /**
   * RelationNetwork Structure Component
   *
   * Renders a network graph with nodes and edges.
   * Supports circular, force-directed, and grid layouts.
   *
   * @example
   * ```svelte
   * <RelationNetwork
   *   nodes={networkNodes}
   *   edges={networkEdges}
   *   layout="circular"
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../../theme'
  import type { NetworkNodeData, NetworkEdgeData, NetworkNodeLayout, RelationNetworkProps } from './types'
  import { RELATION_NETWORK_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends RelationNetworkProps {
    /** Node rendering snippet */
    item?: import('svelte').Snippet<[{
      node: NetworkNodeData
      layout: NetworkNodeLayout
      themeColors: ThemeColors
      radius: number
      gradientId?: string
    }]>
  }

  let {
    nodes,
    edges,
    width = RELATION_NETWORK_DEFAULTS.width,
    height = RELATION_NETWORK_DEFAULTS.height,
    layout = RELATION_NETWORK_DEFAULTS.layout,
    nodeRadius = RELATION_NETWORK_DEFAULTS.nodeRadius,
    showEdgeLabels = RELATION_NETWORK_DEFAULTS.showEdgeLabels,
    showNodeLabels = RELATION_NETWORK_DEFAULTS.showNodeLabels,
    edgeCurvature = RELATION_NETWORK_DEFAULTS.edgeCurvature,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Center point
  const centerX = $derived(width / 2)
  const centerY = $derived(height / 2)

  // Calculate node layouts
  const nodeLayouts = $derived.by(() => {
    const layouts: NetworkNodeLayout[] = []
    const count = nodes.length

    if (count === 0) return layouts

    if (layout === 'circular') {
      // Circular layout
      const radius = Math.min(width, height) / 2 - nodeRadius - 20
      const angleStep = (Math.PI * 2) / count

      nodes.forEach((node, i) => {
        const angle = -Math.PI / 2 + i * angleStep // Start from top
        const x = centerX + radius * Math.cos(angle)
        const y = centerY + radius * Math.sin(angle)
        const r = nodeRadius * (node.size || 1)

        layouts.push({
          node,
          x,
          y,
          radius: r,
          index: i
        })
      })
    } else if (layout === 'grid') {
      // Grid layout
      const cols = Math.ceil(Math.sqrt(count))
      const rows = Math.ceil(count / cols)
      const cellWidth = width / (cols + 1)
      const cellHeight = height / (rows + 1)

      nodes.forEach((node, i) => {
        const col = i % cols
        const row = Math.floor(i / cols)
        const x = cellWidth * (col + 1)
        const y = cellHeight * (row + 1)
        const r = nodeRadius * (node.size || 1)

        layouts.push({
          node,
          x,
          y,
          radius: r,
          index: i
        })
      })
    } else {
      // Force-directed (simplified - just spread out from center)
      const radius = Math.min(width, height) / 3
      const angleStep = (Math.PI * 2) / count

      nodes.forEach((node, i) => {
        const angle = i * angleStep
        const r = radius * (0.5 + Math.random() * 0.5)
        const x = centerX + r * Math.cos(angle)
        const y = centerY + r * Math.sin(angle)
        const nodeR = nodeRadius * (node.size || 1)

        layouts.push({
          node,
          x,
          y,
          radius: nodeR,
          index: i
        })
      })
    }

    return layouts
  })

  // Create node ID to layout map
  const nodeLayoutMap = $derived.by(() => {
    const map = new Map<string, NetworkNodeLayout>()
    for (const layout of nodeLayouts) {
      map.set(layout.node.id, layout)
    }
    return map
  })

  // Get group colors
  const groupColors = $derived.by(() => {
    const groups = new Set<string | number>()
    for (const node of nodes) {
      if (node.group !== undefined) {
        groups.add(node.group)
      }
    }
    return Array.from(groups)
  })

  // Get theme colors for a node
  function getNodeThemeColors(node: NetworkNodeData, index: number): ThemeColors {
    let colorIndex = index
    if (node.group !== undefined) {
      colorIndex = groupColors.indexOf(node.group)
    }
    const color = node.color || getPaletteColor(palette || ctx?.config?.palette, colorIndex, Math.max(nodes.length, groupColors.length))
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
      const themeColors = getNodeThemeColors(layout.node, i)
      return createGradientDef(`grad-${instanceId}-${i}`, themeColors.colorPrimary, ctx?.gradientConfig)
    })
  })

  // Get edge path
  function getEdgePath(edge: NetworkEdgeData): string | null {
    const source = nodeLayoutMap.get(edge.source)
    const target = nodeLayoutMap.get(edge.target)

    if (!source || !target) return null

    const dx = target.x - source.x
    const dy = target.y - source.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    // Adjust start/end points to be on node edge
    const startX = source.x + (dx / dist) * source.radius
    const startY = source.y + (dy / dist) * source.radius
    const endX = target.x - (dx / dist) * target.radius
    const endY = target.y - (dy / dist) * target.radius

    if (edgeCurvature === 0) {
      return `M ${startX} ${startY} L ${endX} ${endY}`
    }

    // Curved edge
    const midX = (startX + endX) / 2
    const midY = (startY + endY) / 2
    const perpX = -dy / dist * edgeCurvature * 50
    const perpY = dx / dist * edgeCurvature * 50
    const controlX = midX + perpX
    const controlY = midY + perpY

    return `M ${startX} ${startY} Q ${controlX} ${controlY} ${endX} ${endY}`
  }

  // Arrow marker ID
  const arrowMarkerId = `arrow-${instanceId}`
</script>

<g class="relation-network">
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

  <!-- Edges -->
  <g class="network-edges">
    {#each edges as edge}
      {@const path = getEdgePath(edge)}
      {#if path}
        <path
          d={path}
          fill="none"
          stroke={edge.color || ctx?.colors?.colorTextSecondary || '#666'}
          stroke-width={Math.max(1, (edge.weight || 1) * 1.5)}
          stroke-linecap="round"
          marker-end={edge.directed ? `url(#${arrowMarkerId})` : undefined}
        />
        {#if showEdgeLabels && edge.label}
          {@const source = nodeLayoutMap.get(edge.source)}
          {@const target = nodeLayoutMap.get(edge.target)}
          {#if source && target}
            <text
              x={(source.x + target.x) / 2}
              y={(source.y + target.y) / 2 - 8}
              text-anchor="middle"
              fill={ctx?.colors?.colorTextSecondary || '#a0a0b0'}
              font-size="10"
            >
              {edge.label}
            </text>
          {/if}
        {/if}
      {/if}
    {/each}
  </g>

  <!-- Nodes -->
  <g class="network-nodes">
    {#each nodeLayouts as layout, i}
      {@const themeColors = getNodeThemeColors(layout.node, i)}
      {@const gradientId = ctx?.gradientsEnabled ? `grad-${instanceId}-${i}` : undefined}

      <g transform="translate({layout.x}, {layout.y})">
        {#if itemSnippet}
          {@render itemSnippet({
            node: layout.node,
            layout,
            themeColors,
            radius: layout.radius,
            gradientId
          })}
        {:else}
          <!-- Default node rendering -->
          <circle
            cx="0"
            cy="0"
            r={layout.radius}
            fill={gradientId ? `url(#${gradientId})` : themeColors.colorPrimary}
          />
          {#if showNodeLabels}
            <text
              x="0"
              y={layout.radius + 14}
              text-anchor="middle"
              fill={ctx?.colors?.colorText || '#fff'}
              font-size="11"
              font-weight="500"
            >
              {layout.node.label.length > 10 ? layout.node.label.slice(0, 9) + '…' : layout.node.label}
            </text>
          {/if}
        {/if}
      </g>
    {/each}
  </g>
</g>
