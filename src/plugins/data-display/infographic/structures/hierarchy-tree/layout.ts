/**
 * HierarchyTree Layout Calculations
 *
 * Pure functions for calculating tree node positions.
 * All functions are side-effect free and easily testable.
 *
 * @module plugins/data-display/infographic/structures/hierarchy-tree/layout
 */

import type {
  TreeNode,
  TreeOrientation,
  LineStyle,
  NodeLayout,
  ConnectionLine,
  TreeLayout
} from './types'
import type { ThemeColors, Palette } from '../../theme'
import { getPaletteColor, generateItemThemeColors } from '../../theme'

/**
 * Count total nodes in a tree (including root)
 *
 * @param node - Root node to count from
 * @returns Total number of nodes
 *
 * @example
 * countNodes({ id: '1', label: 'A', children: [{ id: '2', label: 'B' }] })
 * // => 2
 */
export function countNodes(node: TreeNode): number {
  if (!node.children || node.children.length === 0) {
    return 1
  }
  return 1 + node.children.reduce((sum, child) => sum + countNodes(child), 0)
}

/**
 * Get maximum depth of tree
 *
 * @param node - Root node
 * @param currentDepth - Current depth (internal use)
 * @returns Maximum depth (0-indexed, root = 0)
 *
 * @example
 * getMaxDepth({ id: '1', label: 'A', children: [{ id: '2', label: 'B' }] })
 * // => 1
 */
export function getMaxDepth(node: TreeNode, currentDepth = 0): number {
  if (!node.children || node.children.length === 0) {
    return currentDepth
  }
  return Math.max(
    ...node.children.map((child) => getMaxDepth(child, currentDepth + 1))
  )
}

/**
 * Get width of a subtree (number of leaf nodes)
 *
 * @param node - Root of subtree
 * @returns Width in terms of leaf node count
 */
export function getSubtreeWidth(node: TreeNode): number {
  if (!node.children || node.children.length === 0) {
    return 1
  }
  return node.children.reduce((sum, child) => sum + getSubtreeWidth(child), 0)
}

/**
 * Calculate positions for all nodes in the tree
 *
 * Uses a two-pass algorithm:
 * 1. First pass: Calculate width requirements bottom-up
 * 2. Second pass: Assign positions top-down
 *
 * @param root - Root node of tree
 * @param options - Layout options
 * @returns Tree layout with all node positions
 */
export function calculateTreeLayout(
  root: TreeNode,
  options: {
    orientation: TreeOrientation
    siblingGap: number
    levelGap: number
    nodeWidth: number
    nodeHeight: number
    palette?: Palette
    baseColors: ThemeColors
    gradientsEnabled?: boolean
    instanceId?: string
  }
): TreeLayout {
  const {
    orientation,
    siblingGap,
    levelGap,
    nodeWidth,
    nodeHeight,
    palette,
    baseColors,
    gradientsEnabled = false,
    instanceId = 'tree'
  } = options

  const nodes: NodeLayout[] = []
  const connections: ConnectionLine[] = []
  let nodeIndex = 0

  /**
   * Recursive layout calculation
   */
  function layoutNode(
    node: TreeNode,
    depth: number,
    siblingIndex: number,
    parentLayout: NodeLayout | null,
    offsetX: number,
    offsetY: number
  ): NodeLayout {
    // Calculate theme colors for this node
    const color =
      node.color ||
      getPaletteColor(palette, nodeIndex, countNodes(root))
    const themeColors = generateItemThemeColors(color, baseColors)
    const gradientId = gradientsEnabled
      ? `grad-${instanceId}-${nodeIndex}`
      : undefined

    nodeIndex++

    // Calculate position based on orientation
    let x: number, y: number

    if (orientation === 'vertical') {
      y = depth * (nodeHeight + levelGap)
      x = offsetX
    } else {
      x = depth * (nodeWidth + levelGap)
      y = offsetY
    }

    const layout: NodeLayout = {
      node,
      x,
      y,
      width: nodeWidth,
      height: nodeHeight,
      depth,
      siblingIndex,
      parent: parentLayout,
      themeColors,
      gradientId
    }

    nodes.push(layout)

    // Process children
    if (node.children && node.children.length > 0 && !node.collapsed) {
      const childCount = node.children.length
      const totalChildWidth = getSubtreeWidth(node)

      let childOffset =
        orientation === 'vertical'
          ? offsetX - ((totalChildWidth - 1) * (nodeWidth + siblingGap)) / 2
          : offsetY - ((totalChildWidth - 1) * (nodeHeight + siblingGap)) / 2

      node.children.forEach((child, idx) => {
        const childSubtreeWidth = getSubtreeWidth(child)
        const childCenterOffset =
          ((childSubtreeWidth - 1) * (nodeWidth + siblingGap)) / 2

        const childLayout = layoutNode(
          child,
          depth + 1,
          idx,
          layout,
          orientation === 'vertical'
            ? childOffset + childCenterOffset
            : x + nodeWidth + levelGap,
          orientation === 'vertical'
            ? y + nodeHeight + levelGap
            : childOffset + childCenterOffset
        )

        // Create connection line
        connections.push({
          from: layout,
          to: childLayout,
          pathData: generateConnectionPath(layout, childLayout, orientation, 'elbow')
        })

        childOffset +=
          childSubtreeWidth *
          (orientation === 'vertical'
            ? nodeWidth + siblingGap
            : nodeHeight + siblingGap)
      })
    }

    return layout
  }

  // Start layout from root
  const totalWidth = getSubtreeWidth(root)
  const maxDepth = getMaxDepth(root)

  const startX =
    orientation === 'vertical'
      ? ((totalWidth - 1) * (nodeWidth + siblingGap)) / 2 + nodeWidth / 2
      : nodeWidth / 2

  const startY =
    orientation === 'vertical'
      ? nodeHeight / 2
      : ((totalWidth - 1) * (nodeHeight + siblingGap)) / 2 + nodeHeight / 2

  layoutNode(root, 0, 0, null, startX, startY)

  // Calculate total dimensions
  const totalLayoutWidth =
    orientation === 'vertical'
      ? totalWidth * nodeWidth + (totalWidth - 1) * siblingGap
      : (maxDepth + 1) * nodeWidth + maxDepth * levelGap

  const totalLayoutHeight =
    orientation === 'vertical'
      ? (maxDepth + 1) * nodeHeight + maxDepth * levelGap
      : totalWidth * nodeHeight + (totalWidth - 1) * siblingGap

  return {
    nodes,
    connections,
    totalWidth: totalLayoutWidth,
    totalHeight: totalLayoutHeight
  }
}

/**
 * Generate SVG path for connection line
 *
 * @param from - Parent node layout
 * @param to - Child node layout
 * @param orientation - Tree orientation
 * @param style - Line style
 * @returns SVG path data string
 */
export function generateConnectionPath(
  from: NodeLayout,
  to: NodeLayout,
  orientation: TreeOrientation,
  style: LineStyle
): string {
  // Calculate connection points
  let fromX: number, fromY: number, toX: number, toY: number

  if (orientation === 'vertical') {
    fromX = from.x
    fromY = from.y + from.height / 2
    toX = to.x
    toY = to.y - to.height / 2
  } else {
    fromX = from.x + from.width / 2
    fromY = from.y
    toX = to.x - to.width / 2
    toY = to.y
  }

  switch (style) {
    case 'straight':
      return `M ${fromX} ${fromY} L ${toX} ${toY}`

    case 'curved': {
      const midY = (fromY + toY) / 2
      const midX = (fromX + toX) / 2
      if (orientation === 'vertical') {
        return `M ${fromX} ${fromY} C ${fromX} ${midY}, ${toX} ${midY}, ${toX} ${toY}`
      } else {
        return `M ${fromX} ${fromY} C ${midX} ${fromY}, ${midX} ${toY}, ${toX} ${toY}`
      }
    }

    case 'elbow':
    default: {
      if (orientation === 'vertical') {
        const midY = (fromY + toY) / 2
        return `M ${fromX} ${fromY} L ${fromX} ${midY} L ${toX} ${midY} L ${toX} ${toY}`
      } else {
        const midX = (fromX + toX) / 2
        return `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`
      }
    }
  }
}

/**
 * Flatten tree to array (pre-order traversal)
 *
 * @param node - Root node
 * @returns Array of all nodes in pre-order
 */
export function flattenTree(node: TreeNode): TreeNode[] {
  const result: TreeNode[] = [node]
  if (node.children) {
    for (const child of node.children) {
      result.push(...flattenTree(child))
    }
  }
  return result
}

/**
 * Find node by ID in tree
 *
 * @param root - Root node to search from
 * @param id - Node ID to find
 * @returns Found node or undefined
 */
export function findNodeById(
  root: TreeNode,
  id: string
): TreeNode | undefined {
  if (root.id === id) return root
  if (root.children) {
    for (const child of root.children) {
      const found = findNodeById(child, id)
      if (found) return found
    }
  }
  return undefined
}
