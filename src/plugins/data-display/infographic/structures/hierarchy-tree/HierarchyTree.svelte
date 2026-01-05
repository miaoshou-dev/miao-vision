<script lang="ts">
  /**
   * HierarchyTree Structure Component
   *
   * Renders a tree/organization chart with customizable orientation.
   * Supports vertical (top-down) and horizontal (left-right) layouts.
   *
   * @example
   * ```svelte
   * <HierarchyTree
   *   root={orgData}
   *   orientation="vertical"
   *   palette="vibrant"
   * >
   *   {#snippet item({ node, themeColors, width, height })}
   *     <BadgeCard label={node.label} ... />
   *   {/snippet}
   * </HierarchyTree>
   * ```
   */
  import { getContext } from 'svelte'
  import type { ThemeColors, ThemeConfig, Palette, GradientConfig } from '../../theme'
  import { createGradientDef, gradientDefToSVG } from '../../theme'
  import { calculateTreeLayout } from './layout'
  import type {
    TreeNode,
    TreeOrientation,
    LineStyle,
    NodeLayout,
    HierarchyTreeProps,
    HIERARCHY_TREE_DEFAULTS
  } from './types'

  interface InfographicContext {
    colors: ThemeColors
    config: ThemeConfig
    gradientsEnabled: boolean
    gradientConfig?: GradientConfig
  }

  interface Props extends HierarchyTreeProps {
    /** Item rendering snippet */
    item?: import('svelte').Snippet<[{
      node: TreeNode
      layout: NodeLayout
      themeColors: ThemeColors
      width: number
      height: number
      gradientId?: string
      depth: number
      isLeaf: boolean
    }]>
  }

  let {
    root,
    width = 800,
    height = 400,
    orientation = 'vertical',
    siblingGap = 20,
    levelGap = 60,
    nodeWidth = 120,
    nodeHeight = 60,
    lineStyle = 'elbow',
    palette,
    showConnections = true,
    item: itemSnippet
  }: Props = $props()

  const ctx = getContext<InfographicContext>('infographic-theme')

  // Generate unique instance ID for gradients
  const instanceId = Math.random().toString(36).slice(2, 8)

  // Calculate tree layout
  const treeLayout = $derived(
    calculateTreeLayout(root, {
      orientation,
      siblingGap,
      levelGap,
      nodeWidth,
      nodeHeight,
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
    return treeLayout.nodes
      .filter((n) => n.gradientId)
      .map((n) =>
        createGradientDef(
          n.gradientId!,
          n.themeColors.colorPrimary,
          ctx?.gradientConfig
        )
      )
  })

  // Calculate view box to fit all nodes with padding
  const viewBox = $derived.by(() => {
    const padding = 20
    const minX = Math.min(...treeLayout.nodes.map((n) => n.x - n.width / 2)) - padding
    const minY = Math.min(...treeLayout.nodes.map((n) => n.y - n.height / 2)) - padding
    const maxX = Math.max(...treeLayout.nodes.map((n) => n.x + n.width / 2)) + padding
    const maxY = Math.max(...treeLayout.nodes.map((n) => n.y + n.height / 2)) + padding
    return `${minX} ${minY} ${maxX - minX} ${maxY - minY}`
  })

  // Check if node is a leaf
  function isLeafNode(node: TreeNode): boolean {
    return !node.children || node.children.length === 0
  }
</script>

<g class="hierarchy-tree">
  <!-- Gradient definitions -->
  <defs>
    {#each gradientDefs as gradDef}
      {@html gradientDefToSVG(gradDef)}
    {/each}
  </defs>

  <!-- Connection lines -->
  {#if showConnections}
    <g class="tree-connections">
      {#each treeLayout.connections as connection}
        <path
          d={connection.pathData}
          fill="none"
          stroke={ctx?.colors?.colorTextSecondary || '#666'}
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
        />
      {/each}
    </g>
  {/if}

  <!-- Nodes -->
  <g class="tree-nodes">
    {#each treeLayout.nodes as nodeLayout}
      <g transform="translate({nodeLayout.x - nodeLayout.width / 2}, {nodeLayout.y - nodeLayout.height / 2})">
        {#if itemSnippet}
          {@render itemSnippet({
            node: nodeLayout.node,
            layout: nodeLayout,
            themeColors: nodeLayout.themeColors,
            width: nodeLayout.width,
            height: nodeLayout.height,
            gradientId: nodeLayout.gradientId,
            depth: nodeLayout.depth,
            isLeaf: isLeafNode(nodeLayout.node)
          })}
        {:else}
          <!-- Default node rendering -->
          <rect
            x="0"
            y="0"
            width={nodeLayout.width}
            height={nodeLayout.height}
            rx="8"
            fill={nodeLayout.gradientId
              ? `url(#${nodeLayout.gradientId})`
              : nodeLayout.themeColors.colorPrimary}
          />
          <text
            x={nodeLayout.width / 2}
            y={nodeLayout.height / 2 - 6}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={nodeLayout.themeColors.colorWhite}
            font-size="12"
            font-weight="600"
          >
            {nodeLayout.node.label}
          </text>
          {#if nodeLayout.node.desc}
            <text
              x={nodeLayout.width / 2}
              y={nodeLayout.height / 2 + 10}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={nodeLayout.themeColors.colorTextSecondary}
              font-size="10"
            >
              {nodeLayout.node.desc}
            </text>
          {/if}
        {/if}
      </g>
    {/each}
  </g>
</g>
