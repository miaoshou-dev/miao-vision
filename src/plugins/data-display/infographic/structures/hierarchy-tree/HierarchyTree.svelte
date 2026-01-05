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

  // Calculate bounds and centering transform
  const treeBounds = $derived.by(() => {
    const padding = 10
    const minX = Math.min(...treeLayout.nodes.map((n) => n.x - n.width / 2)) - padding
    const minY = Math.min(...treeLayout.nodes.map((n) => n.y - n.height / 2)) - padding
    const maxX = Math.max(...treeLayout.nodes.map((n) => n.x + n.width / 2)) + padding
    const maxY = Math.max(...treeLayout.nodes.map((n) => n.y + n.height / 2)) + padding
    const contentWidth = maxX - minX
    const contentHeight = maxY - minY
    // Center the tree within the given width/height
    const translateX = (width - contentWidth) / 2 - minX
    const translateY = (height - contentHeight) / 2 - minY
    return { minX, minY, maxX, maxY, contentWidth, contentHeight, translateX, translateY }
  })

  // Check if node is a leaf
  function isLeafNode(node: TreeNode): boolean {
    return !node.children || node.children.length === 0
  }
</script>

<g class="hierarchy-tree" transform="translate({treeBounds.translateX}, {treeBounds.translateY})">
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
          {@const hasDesc = nodeLayout.node.desc && nodeLayout.height >= 50}
          {@const labelY = hasDesc ? nodeLayout.height / 2 - 8 : nodeLayout.height / 2}
          {@const maxChars = Math.floor(nodeLayout.width / 8)}
          {@const truncatedLabel = nodeLayout.node.label.length > maxChars
            ? nodeLayout.node.label.slice(0, maxChars - 1) + '…'
            : nodeLayout.node.label}
          {@const truncatedDesc = nodeLayout.node.desc && nodeLayout.node.desc.length > maxChars
            ? nodeLayout.node.desc.slice(0, maxChars - 1) + '…'
            : nodeLayout.node.desc}
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
            y={labelY}
            text-anchor="middle"
            dominant-baseline="middle"
            fill={nodeLayout.themeColors.colorWhite}
            font-size={Math.min(14, nodeLayout.width / 8)}
            font-weight="600"
          >
            {truncatedLabel}
          </text>
          {#if hasDesc}
            <text
              x={nodeLayout.width / 2}
              y={nodeLayout.height / 2 + 10}
              text-anchor="middle"
              dominant-baseline="middle"
              fill={nodeLayout.themeColors.colorTextSecondary}
              font-size={Math.min(11, nodeLayout.width / 10)}
            >
              {truncatedDesc}
            </text>
          {/if}
        {/if}
      </g>
    {/each}
  </g>
</g>
