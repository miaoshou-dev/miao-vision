<script lang="ts">
  /**
   * MindMap Structure Component
   *
   * Renders a radial or directional mind map layout.
   * Great for brainstorming, concept mapping, knowledge organization.
   *
   * @example
   * ```svelte
   * <MindMap
   *   root={ideaTree}
   *   direction="radial"
   *   showConnections={true}
   * />
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, GradientConfig } from '../../theme'
  import { getPaletteColor, generateItemThemeColors, createGradientDef, gradientDefToSVG } from '../../theme'
  import type { MindMapNodeData, MindMapNodeLayout, MindMapProps } from './types'
  import { MIND_MAP_DEFAULTS } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends MindMapProps {
    /** Node rendering snippet */
    item?: import('svelte').Snippet<[{
      node: MindMapNodeData
      layout: MindMapNodeLayout
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
    }]>
  }

  let {
    root,
    width = MIND_MAP_DEFAULTS.width,
    height = MIND_MAP_DEFAULTS.height,
    direction = MIND_MAP_DEFAULTS.direction,
    nodeWidth = MIND_MAP_DEFAULTS.nodeWidth,
    nodeHeight = MIND_MAP_DEFAULTS.nodeHeight,
    levelGap = MIND_MAP_DEFAULTS.levelGap,
    siblingGap = MIND_MAP_DEFAULTS.siblingGap,
    showConnections = MIND_MAP_DEFAULTS.showConnections,
    connectionStyle = MIND_MAP_DEFAULTS.connectionStyle,
    palette,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Center point
  const centerX = $derived(width / 2)
  const centerY = $derived(height / 2)

  // Count total nodes at each depth for radial layout
  function countNodesAtDepth(node: MindMapNodeData, depth: number, counts: Map<number, number>): void {
    counts.set(depth, (counts.get(depth) || 0) + 1)
    if (node.children) {
      for (const child of node.children) {
        countNodesAtDepth(child, depth + 1, counts)
      }
    }
  }

  // Calculate all node layouts
  const nodeLayouts = $derived.by(() => {
    const layouts: MindMapNodeLayout[] = []

    if (!root) return layouts

    if (direction === 'radial') {
      // Radial layout - nodes spread around center
      layoutRadial(root, null, 0, 0, Math.PI * 2, layouts)
    } else {
      // Directional layout (right, left, both)
      layoutDirectional(root, null, 0, layouts)
    }

    return layouts
  })

  // Radial layout algorithm
  function layoutRadial(
    node: MindMapNodeData,
    parent: MindMapNodeLayout | null,
    depth: number,
    startAngle: number,
    angleSpan: number,
    layouts: MindMapNodeLayout[]
  ): MindMapNodeLayout {
    const radius = depth * levelGap
    const angle = startAngle + angleSpan / 2

    const x = centerX + radius * Math.cos(angle)
    const y = centerY + radius * Math.sin(angle)

    const layout: MindMapNodeLayout = {
      node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      depth,
      angle,
      parent,
      index: layouts.length,
      siblingCount: node.children?.length || 0
    }
    layouts.push(layout)

    // Layout children
    if (node.children && node.children.length > 0) {
      const childCount = node.children.length
      const childAngleSpan = angleSpan / childCount

      node.children.forEach((child, i) => {
        const childStartAngle = startAngle + i * childAngleSpan
        layoutRadial(child, layout, depth + 1, childStartAngle, childAngleSpan, layouts)
      })
    }

    return layout
  }

  // Directional layout algorithm (tree-like)
  function layoutDirectional(
    node: MindMapNodeData,
    parent: MindMapNodeLayout | null,
    depth: number,
    layouts: MindMapNodeLayout[]
  ): { layout: MindMapNodeLayout; totalHeight: number } {
    // Calculate subtree height first
    let childLayouts: { layout: MindMapNodeLayout; totalHeight: number }[] = []
    let totalChildHeight = 0

    if (node.children && node.children.length > 0) {
      for (const child of node.children) {
        const childResult = layoutDirectional(child, null, depth + 1, [])
        childLayouts.push(childResult)
        totalChildHeight += childResult.totalHeight
      }
      totalChildHeight += (node.children.length - 1) * siblingGap
    }

    const nodeTreeHeight = Math.max(nodeHeight, totalChildHeight)

    // Calculate position based on direction
    let x: number
    let y: number

    if (depth === 0) {
      // Root node at center
      x = centerX
      y = centerY
    } else if (direction === 'right' || direction === 'both') {
      x = centerX + depth * levelGap
      y = parent ? parent.y : centerY
    } else {
      x = centerX - depth * levelGap
      y = parent ? parent.y : centerY
    }

    const layout: MindMapNodeLayout = {
      node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      depth,
      angle: 0,
      parent,
      index: layouts.length,
      siblingCount: node.children?.length || 0
    }
    layouts.push(layout)

    // Position children
    if (node.children && node.children.length > 0) {
      let currentY = y - totalChildHeight / 2 + nodeHeight / 2

      node.children.forEach((child, i) => {
        const childResult = layoutDirectional(child, layout, depth + 1, layouts)
        // Update child Y position
        const childLayout = layouts.find(l => l.node.id === child.id)
        if (childLayout) {
          childLayout.y = currentY + childResult.totalHeight / 2 - nodeHeight / 2
        }
        currentY += childResult.totalHeight + siblingGap
      })
    }

    return { layout, totalHeight: nodeTreeHeight }
  }

  // Generate theme colors for each node
  function getNodeThemeColors(node: MindMapNodeData, depth: number): ThemeColors {
    const color = node.color || getPaletteColor(palette || ctx?.config?.palette, depth, 5)
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

  // Get gradient ID for a node
  function getGradientId(layout: MindMapNodeLayout): string | undefined {
    return ctx?.gradientsEnabled ? `grad-${instanceId}-${layout.index}` : undefined
  }

  // Generate gradient definitions
  const gradientDefs = $derived.by(() => {
    if (!ctx?.gradientsEnabled) return []
    return nodeLayouts.map(layout => {
      const themeColors = getNodeThemeColors(layout.node, layout.depth)
      return createGradientDef(`grad-${instanceId}-${layout.index}`, themeColors.colorPrimary, ctx?.gradientConfig)
    })
  })

  // Generate connection path
  function getConnectionPath(from: MindMapNodeLayout, to: MindMapNodeLayout): string {
    const fromX = from.x
    const fromY = from.y
    const toX = to.x
    const toY = to.y

    if (connectionStyle === 'straight') {
      return `M ${fromX} ${fromY} L ${toX} ${toY}`
    }

    if (connectionStyle === 'elbow') {
      const midX = (fromX + toX) / 2
      return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`
    }

    // Curve (default)
    if (direction === 'radial') {
      // Curved line for radial
      const controlX = (fromX + toX) / 2
      const controlY = (fromY + toY) / 2
      return `M ${fromX} ${fromY} Q ${controlX} ${controlY} ${toX} ${toY}`
    } else {
      // S-curve for directional
      const midX = (fromX + toX) / 2
      return `M ${fromX} ${fromY} C ${midX} ${fromY} ${midX} ${toY} ${toX} ${toY}`
    }
  }
</script>

<g class="mind-map">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Connection lines -->
  {#if showConnections}
    <g class="mind-map-connections">
      {#each nodeLayouts as layout}
        {#if layout.parent}
          <path
            d={getConnectionPath(layout.parent, layout)}
            fill="none"
            stroke={ctx?.colors?.colorTextSecondary || '#666'}
            stroke-width="2"
            stroke-linecap="round"
          />
        {/if}
      {/each}
    </g>
  {/if}

  <!-- Nodes -->
  <g class="mind-map-nodes">
    {#each nodeLayouts as layout}
      {@const themeColors = getNodeThemeColors(layout.node, layout.depth)}
      {@const gradientId = getGradientId(layout)}

      <g transform="translate({layout.x - layout.width / 2}, {layout.y - layout.height / 2})">
        {#if itemSnippet}
          {@render itemSnippet({
            node: layout.node,
            layout,
            themeColors,
            width: layout.width,
            height: layout.height,
            gradientId
          })}
        {:else}
          <!-- Default node rendering -->
          {@const isRoot = layout.depth === 0}
          {@const rx = isRoot ? layout.height / 2 : 8}

          <rect
            x="0"
            y="0"
            width={layout.width}
            height={layout.height}
            {rx}
            fill={gradientId ? `url(#${gradientId})` : themeColors.colorPrimary}
          />
          <text
            x={layout.width / 2}
            y={layout.height / 2}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={themeColors.colorWhite}
            font-size={isRoot ? 14 : 12}
            font-weight={isRoot ? '700' : '500'}
          >
            {layout.node.label.length > 12 ? layout.node.label.slice(0, 11) + '…' : layout.node.label}
          </text>
        {/if}
      </g>
    {/each}
  </g>
</g>
