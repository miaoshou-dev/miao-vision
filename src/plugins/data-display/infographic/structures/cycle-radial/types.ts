/**
 * CycleRadial Structure Types
 *
 * Circular cycle diagram for showing cyclical processes.
 */

import type { Palette, ThemeColors } from '../../theme'

/** Single cycle item */
export interface CycleItem {
  id: string
  label: string
  desc?: string
  icon?: string
  color?: string
}

/** Arrow style for connections */
export type ArrowStyle = 'curved' | 'straight' | 'none'

/** CycleRadial props */
export interface CycleRadialProps {
  /** Array of cycle items (rendered clockwise) */
  items: CycleItem[]
  /** Total width */
  width?: number
  /** Total height */
  height?: number
  /** Radius ratio (0-1) - how far from center items are placed */
  radiusRatio?: number
  /** Starting angle in degrees (0 = top, 90 = right) */
  startAngle?: number
  /** Show connecting arrows between items */
  showArrows?: boolean
  /** Arrow style */
  arrowStyle?: ArrowStyle
  /** Show center element */
  showCenter?: boolean
  /** Center label */
  centerLabel?: string
  /** Center description */
  centerDesc?: string
  /** Item node size (diameter) */
  nodeSize?: number
  /** Palette override */
  palette?: Palette
}

/** Calculated node position */
export interface NodePosition {
  item: CycleItem
  index: number
  x: number
  y: number
  angle: number
  themeColors: ThemeColors
  gradientId?: string
}

/** Default values */
export const CYCLE_RADIAL_DEFAULTS = {
  width: 400,
  height: 400,
  radiusRatio: 0.7,
  startAngle: -90,
  showArrows: true,
  arrowStyle: 'curved' as ArrowStyle,
  showCenter: false,
  nodeSize: 80
}
