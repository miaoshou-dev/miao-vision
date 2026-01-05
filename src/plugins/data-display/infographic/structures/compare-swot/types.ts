/**
 * CompareSwot Structure Types
 *
 * Type definitions for SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis layouts.
 * Supports 2x2 grid layout with customizable quadrant colors and icons.
 *
 * @module plugins/data-display/infographic/structures/compare-swot
 *
 * @example
 * // Basic SWOT data structure
 * const swotData: SwotData = {
 *   strengths: [
 *     { id: 's1', label: 'Strong brand', desc: 'High market recognition' }
 *   ],
 *   weaknesses: [
 *     { id: 'w1', label: 'Limited resources', desc: 'Small team size' }
 *   ],
 *   opportunities: [
 *     { id: 'o1', label: 'Market expansion', desc: 'New geographic markets' }
 *   ],
 *   threats: [
 *     { id: 't1', label: 'Competition', desc: 'New market entrants' }
 *   ]
 * }
 */

import type { ThemeColors, Palette } from '../../theme'

/**
 * Single item in a SWOT quadrant
 *
 * @property id - Unique identifier for the item
 * @property label - Main display text
 * @property desc - Optional description text
 * @property icon - Optional icon name (MDI)
 * @property priority - Optional priority level (1=high, 2=medium, 3=low)
 */
export interface SwotItem {
  id: string
  label: string
  desc?: string
  icon?: string
  priority?: 1 | 2 | 3
}

/**
 * SWOT quadrant types
 */
export type SwotQuadrant = 'strengths' | 'weaknesses' | 'opportunities' | 'threats'

/**
 * SWOT data structure containing all four quadrants
 *
 * @property strengths - Internal positive factors (S)
 * @property weaknesses - Internal negative factors (W)
 * @property opportunities - External positive factors (O)
 * @property threats - External negative factors (T)
 */
export interface SwotData {
  strengths: SwotItem[]
  weaknesses: SwotItem[]
  opportunities: SwotItem[]
  threats: SwotItem[]
}

/**
 * Configuration for a single quadrant
 *
 * @property title - Display title for the quadrant
 * @property icon - Icon name for the quadrant header
 * @property color - Primary color for the quadrant
 * @property bgColor - Background color for the quadrant
 */
export interface QuadrantConfig {
  title: string
  icon: string
  color: string
  bgColor: string
}

/**
 * Layout position for a quadrant
 */
export interface QuadrantLayout {
  /** Quadrant type */
  quadrant: SwotQuadrant
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Quadrant width */
  width: number
  /** Quadrant height */
  height: number
  /** Items in this quadrant */
  items: SwotItem[]
  /** Configuration for this quadrant */
  config: QuadrantConfig
  /** Theme colors for this quadrant */
  themeColors: ThemeColors
  /** Gradient ID if gradients enabled */
  gradientId?: string
}

/**
 * Complete SWOT layout calculation result
 */
export interface SwotLayout {
  /** All quadrant layouts */
  quadrants: QuadrantLayout[]
  /** Total width of the SWOT diagram */
  totalWidth: number
  /** Total height of the SWOT diagram */
  totalHeight: number
  /** Gap between quadrants */
  gap: number
}

/**
 * CompareSwot component props
 */
export interface CompareSwotProps {
  /** SWOT data */
  data: SwotData
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Gap between quadrants */
  gap?: number
  /** Whether to show quadrant headers */
  showHeaders?: boolean
  /** Whether to show item icons */
  showIcons?: boolean
  /** Color palette */
  palette?: Palette
  /** Custom quadrant titles */
  titles?: {
    strengths?: string
    weaknesses?: string
    opportunities?: string
    threats?: string
  }
}

/**
 * Default SWOT quadrant configurations
 */
export const SWOT_QUADRANT_CONFIGS: Record<SwotQuadrant, QuadrantConfig> = {
  strengths: {
    title: 'Strengths',
    icon: 'shield-check',
    color: '#22c55e', // Green
    bgColor: '#22c55e20'
  },
  weaknesses: {
    title: 'Weaknesses',
    icon: 'alert-circle',
    color: '#f59e0b', // Amber
    bgColor: '#f59e0b20'
  },
  opportunities: {
    title: 'Opportunities',
    icon: 'lightbulb',
    color: '#3b82f6', // Blue
    bgColor: '#3b82f620'
  },
  threats: {
    title: 'Threats',
    icon: 'alert-triangle',
    color: '#ef4444', // Red
    bgColor: '#ef444420'
  }
}

/**
 * Default configuration values
 */
export const COMPARE_SWOT_DEFAULTS = {
  width: 800,
  height: 600,
  gap: 10,
  showHeaders: true,
  showIcons: true,
  headerHeight: 40,
  itemPadding: 12,
  itemGap: 8
} as const
