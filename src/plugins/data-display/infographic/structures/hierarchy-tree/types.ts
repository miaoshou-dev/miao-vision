/**
 * HierarchyTree Structure Types
 *
 * Type definitions for tree/organization chart layouts.
 * Supports vertical and horizontal orientations with customizable spacing.
 *
 * @module plugins/data-display/infographic/structures/hierarchy-tree
 *
 * @example
 * // Basic tree data structure
 * const orgData: TreeNode = {
 *   id: 'ceo',
 *   label: 'CEO',
 *   children: [
 *     { id: 'cto', label: 'CTO', children: [...] },
 *     { id: 'cfo', label: 'CFO', children: [...] }
 *   ]
 * }
 */

import type { ThemeColors, Palette } from '../../theme'

/**
 * Single node in the tree hierarchy
 *
 * @property id - Unique identifier for the node
 * @property label - Display text for the node
 * @property desc - Optional description text
 * @property value - Optional numeric or string value
 * @property icon - Optional icon name (MDI)
 * @property color - Optional custom color (overrides palette)
 * @property children - Child nodes (recursive structure)
 * @property collapsed - Whether children are collapsed (for interactive trees)
 */
export interface TreeNode {
  id: string
  label: string
  desc?: string
  value?: string | number
  icon?: string
  color?: string
  children?: TreeNode[]
  collapsed?: boolean
}

/**
 * Tree orientation options
 *
 * - vertical: Root at top, children below (org chart style)
 * - horizontal: Root at left, children to the right
 */
export type TreeOrientation = 'vertical' | 'horizontal'

/**
 * Line style for connections between nodes
 */
export type LineStyle = 'straight' | 'curved' | 'elbow'

/**
 * Calculated layout position for a node
 * Used internally for rendering
 */
export interface NodeLayout {
  /** Node data */
  node: TreeNode
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Node width */
  width: number
  /** Node height */
  height: number
  /** Depth level (0 = root) */
  depth: number
  /** Index among siblings */
  siblingIndex: number
  /** Parent node layout (null for root) */
  parent: NodeLayout | null
  /** Theme colors for this node */
  themeColors: ThemeColors
  /** Gradient ID if gradients enabled */
  gradientId?: string
}

/**
 * Connection line between parent and child
 */
export interface ConnectionLine {
  /** Parent node layout */
  from: NodeLayout
  /** Child node layout */
  to: NodeLayout
  /** SVG path data */
  pathData: string
}

/**
 * Tree layout calculation result
 */
export interface TreeLayout {
  /** All node layouts */
  nodes: NodeLayout[]
  /** Connection lines between nodes */
  connections: ConnectionLine[]
  /** Total width of the tree */
  totalWidth: number
  /** Total height of the tree */
  totalHeight: number
}

/**
 * HierarchyTree component props
 */
export interface HierarchyTreeProps {
  /** Root node of the tree */
  root: TreeNode
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Tree orientation */
  orientation?: TreeOrientation
  /** Horizontal gap between siblings */
  siblingGap?: number
  /** Vertical gap between levels */
  levelGap?: number
  /** Minimum node width */
  nodeWidth?: number
  /** Minimum node height */
  nodeHeight?: number
  /** Line style for connections */
  lineStyle?: LineStyle
  /** Color palette */
  palette?: Palette
  /** Whether to show connection lines */
  showConnections?: boolean
}

/**
 * Default configuration values
 */
export const HIERARCHY_TREE_DEFAULTS = {
  width: 800,
  height: 400,
  orientation: 'vertical' as TreeOrientation,
  siblingGap: 20,
  levelGap: 60,
  nodeWidth: 120,
  nodeHeight: 60,
  lineStyle: 'elbow' as LineStyle,
  showConnections: true
} as const
