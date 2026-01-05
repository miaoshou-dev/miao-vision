/**
 * RelationCircle Structure Types
 *
 * Circular arrangement showing relationships between items.
 */
import type { Palette } from '../../theme'

/**
 * Circle node data
 */
export interface CircleNodeData {
  /** Unique identifier */
  id: string
  /** Node label */
  label: string
  /** Optional description */
  desc?: string
  /** Optional icon */
  icon?: string
  /** Custom color */
  color?: string
}

/**
 * Connection between nodes
 */
export interface CircleConnectionData {
  /** Source node id */
  from: string
  /** Target node id */
  to: string
  /** Optional label */
  label?: string
  /** Bidirectional connection */
  bidirectional?: boolean
}

/**
 * Calculated node layout
 */
export interface CircleNodeLayout {
  /** Node data */
  node: CircleNodeData
  /** Center X */
  cx: number
  /** Center Y */
  cy: number
  /** Angle in radians */
  angle: number
  /** Index */
  index: number
}

/**
 * RelationCircle component props
 */
export interface RelationCircleProps {
  /** Array of nodes */
  nodes: CircleNodeData[]
  /** Connections between nodes */
  connections?: CircleConnectionData[]
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Node size */
  nodeSize?: number
  /** Show connection labels */
  showConnectionLabels?: boolean
  /** Show center element */
  showCenter?: boolean
  /** Center label */
  centerLabel?: string
  /** Connection curve amount (0=straight, 1=curved) */
  curveAmount?: number
  /** Palette override */
  palette?: Palette
}

/**
 * Default values
 */
export const RELATION_CIRCLE_DEFAULTS = {
  width: 500,
  height: 500,
  nodeSize: 50,
  showConnectionLabels: false,
  showCenter: true,
  centerLabel: '',
  curveAmount: 0.3
}
