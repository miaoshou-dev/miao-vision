/**
 * SequenceSnake Structure Types
 *
 * Type definitions for snake/serpentine sequence layouts.
 * Items flow left-to-right on odd rows and right-to-left on even rows,
 * creating a continuous snake pattern.
 *
 * @module plugins/data-display/infographic/structures/sequence-snake
 *
 * @example
 * // Basic snake layout
 * // Row 1: [1] [2] [3]
 * // Row 2: [6] [5] [4]  (reversed)
 * // Row 3: [7] [8] [9]
 */

import type { ThemeColors, Palette } from '../../theme'

/**
 * Single item in the snake sequence
 *
 * @property id - Unique identifier
 * @property label - Display text
 * @property value - Optional value
 * @property desc - Optional description
 * @property icon - Optional icon name (MDI)
 * @property color - Optional custom color
 */
export interface SnakeItem {
  id: string
  label: string
  value?: string | number
  desc?: string
  icon?: string
  color?: string
}

/**
 * Calculated layout for a single item in the snake
 */
export interface SnakeItemLayout {
  /** Original item data */
  item: SnakeItem
  /** Index in original list */
  index: number
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Item width */
  width: number
  /** Item height */
  height: number
  /** Row number (0-indexed) */
  row: number
  /** Column number (0-indexed) */
  column: number
  /** Whether this row flows right-to-left */
  isReversed: boolean
  /** Theme colors for this item */
  themeColors: ThemeColors
  /** Gradient ID if enabled */
  gradientId?: string
}

/**
 * Connection between adjacent items
 */
export interface SnakeConnection {
  /** Start item layout */
  from: SnakeItemLayout
  /** End item layout */
  to: SnakeItemLayout
  /** SVG path data */
  pathData: string
  /** Connection type */
  type: 'horizontal' | 'vertical' | 'turn'
}

/**
 * Complete snake layout result
 */
export interface SnakeLayout {
  /** All item layouts */
  items: SnakeItemLayout[]
  /** Connections between items */
  connections: SnakeConnection[]
  /** Number of rows */
  rowCount: number
  /** Items per row */
  itemsPerRow: number
  /** Total width */
  totalWidth: number
  /** Total height */
  totalHeight: number
}

/**
 * SequenceSnake component props
 */
export interface SequenceSnakeProps {
  /** Items to display */
  items: SnakeItem[]
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Items per row (columns) */
  itemsPerRow?: number
  /** Horizontal gap between items */
  horizontalGap?: number
  /** Vertical gap between rows */
  verticalGap?: number
  /** Item width */
  itemWidth?: number
  /** Item height */
  itemHeight?: number
  /** Show connection lines */
  showConnections?: boolean
  /** Show step numbers */
  showNumbers?: boolean
  /** Color palette */
  palette?: Palette
  /** Connection line style */
  lineStyle?: 'straight' | 'curved'
}

/**
 * Default configuration values
 */
export const SEQUENCE_SNAKE_DEFAULTS = {
  width: 800,
  height: 400,
  itemsPerRow: 4,
  horizontalGap: 20,
  verticalGap: 40,
  itemWidth: 150,
  itemHeight: 80,
  showConnections: true,
  showNumbers: true,
  lineStyle: 'curved' as const
} as const
