/**
 * RelationNetwork Structure Types
 *
 * Network graph layout for showing relationships between nodes.
 */
import type { Palette } from '../../theme'

/**
 * Network node data
 */
export interface NetworkNodeData {
  /** Unique node identifier */
  id: string
  /** Node label */
  label: string
  /** Optional description */
  desc?: string
  /** Optional icon name */
  icon?: string
  /** Custom color (overrides palette) */
  color?: string
  /** Node size multiplier (1 = default) */
  size?: number
  /** Node group for coloring */
  group?: string | number
}

/**
 * Network edge/link data
 */
export interface NetworkEdgeData {
  /** Source node ID */
  source: string
  /** Target node ID */
  target: string
  /** Optional edge label */
  label?: string
  /** Edge weight (affects thickness) */
  weight?: number
  /** Edge color */
  color?: string
  /** Is directed (show arrow) */
  directed?: boolean
}

/**
 * Calculated node layout
 */
export interface NetworkNodeLayout {
  /** Node data */
  node: NetworkNodeData
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Calculated radius */
  radius: number
  /** Node index */
  index: number
}

/**
 * Network layout algorithm
 */
export type NetworkLayout = 'circular' | 'force' | 'grid'

/**
 * RelationNetwork component props
 */
export interface RelationNetworkProps {
  /** Array of nodes */
  nodes: NetworkNodeData[]
  /** Array of edges/links */
  edges: NetworkEdgeData[]
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Layout algorithm */
  layout?: NetworkLayout
  /** Node base radius */
  nodeRadius?: number
  /** Show edge labels */
  showEdgeLabels?: boolean
  /** Show node labels */
  showNodeLabels?: boolean
  /** Edge curvature (0 = straight) */
  edgeCurvature?: number
  /** Palette override */
  palette?: Palette
}

/**
 * Default values
 */
export const RELATION_NETWORK_DEFAULTS = {
  width: 600,
  height: 500,
  layout: 'circular' as NetworkLayout,
  nodeRadius: 30,
  showEdgeLabels: false,
  showNodeLabels: true,
  edgeCurvature: 0.2
}
