/**
 * MindMap Structure Types
 *
 * Radial mind map layout for hierarchical idea visualization.
 */
import type { Palette } from '../../theme'

/**
 * Mind map node data
 */
export interface MindMapNodeData {
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
  /** Child nodes */
  children?: MindMapNodeData[]
}

/**
 * Calculated node layout
 */
export interface MindMapNodeLayout {
  /** Node data */
  node: MindMapNodeData
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
  /** Angle from center (radians) */
  angle: number
  /** Parent node layout (null for root) */
  parent: MindMapNodeLayout | null
  /** Index among siblings */
  index: number
  /** Total siblings count */
  siblingCount: number
}

/**
 * MindMap layout direction
 */
export type MindMapDirection = 'radial' | 'right' | 'left' | 'both'

/**
 * MindMap component props
 */
export interface MindMapProps {
  /** Root node data */
  root: MindMapNodeData
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Layout direction */
  direction?: MindMapDirection
  /** Node width */
  nodeWidth?: number
  /** Node height */
  nodeHeight?: number
  /** Gap between levels */
  levelGap?: number
  /** Gap between siblings */
  siblingGap?: number
  /** Show connection lines */
  showConnections?: boolean
  /** Connection line style */
  connectionStyle?: 'curve' | 'straight' | 'elbow'
  /** Palette override */
  palette?: Palette
}

/**
 * Default values
 */
export const MIND_MAP_DEFAULTS = {
  width: 800,
  height: 600,
  direction: 'radial' as MindMapDirection,
  nodeWidth: 120,
  nodeHeight: 40,
  levelGap: 100,
  siblingGap: 20,
  showConnections: true,
  connectionStyle: 'curve' as const
}
