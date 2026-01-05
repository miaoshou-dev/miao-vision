/**
 * CompareQuadrant Structure Types
 *
 * 2x2 matrix/quadrant layout for categorization.
 * Common uses: BCG Matrix, Eisenhower Matrix, Risk Matrix.
 */

import type { Palette, ThemeColors } from '../../theme'

/** Quadrant position */
export type QuadrantPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight'

/** Single item in a quadrant */
export interface QuadrantItem {
  id: string
  label: string
  desc?: string
  icon?: string
  color?: string
}

/** Quadrant data with items */
export interface QuadrantData {
  /** Top-left quadrant items */
  topLeft: QuadrantItem[]
  /** Top-right quadrant items */
  topRight: QuadrantItem[]
  /** Bottom-left quadrant items */
  bottomLeft: QuadrantItem[]
  /** Bottom-right quadrant items */
  bottomRight: QuadrantItem[]
}

/** Axis label configuration */
export interface AxisLabels {
  /** X-axis left label */
  xLeft?: string
  /** X-axis right label */
  xRight?: string
  /** Y-axis top label */
  yTop?: string
  /** Y-axis bottom label */
  yBottom?: string
}

/** Quadrant label configuration */
export interface QuadrantLabels {
  topLeft?: string
  topRight?: string
  bottomLeft?: string
  bottomRight?: string
}

/** CompareQuadrant props */
export interface CompareQuadrantProps {
  /** Quadrant data */
  data: QuadrantData
  /** Total width */
  width?: number
  /** Total height */
  height?: number
  /** Gap between quadrants */
  gap?: number
  /** Show axis lines */
  showAxes?: boolean
  /** Axis labels */
  axisLabels?: AxisLabels
  /** Quadrant labels */
  quadrantLabels?: QuadrantLabels
  /** Show quadrant background colors */
  showQuadrantColors?: boolean
  /** Palette override */
  palette?: Palette
}

/** Default colors for quadrants */
export const QUADRANT_COLORS = {
  topLeft: '#22c55e',     // Green - Stars/Do First
  topRight: '#3b82f6',    // Blue - Question Marks/Schedule
  bottomLeft: '#f59e0b',  // Yellow - Cash Cows/Delegate
  bottomRight: '#ef4444'  // Red - Dogs/Eliminate
}

/** Default values */
export const COMPARE_QUADRANT_DEFAULTS = {
  width: 500,
  height: 400,
  gap: 8,
  showAxes: true,
  showQuadrantColors: true
}
