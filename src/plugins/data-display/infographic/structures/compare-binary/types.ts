/**
 * CompareBinary Structure Types
 *
 * Left-right (VS) comparison layout for two options.
 */
import type { Palette } from '../../theme'

/**
 * Comparison item
 */
export interface CompareItem {
  /** Item text */
  text: string
  /** Optional icon */
  icon?: string
}

/**
 * Comparison side data
 */
export interface CompareSideData {
  /** Side title */
  title: string
  /** Optional subtitle/description */
  subtitle?: string
  /** Optional icon */
  icon?: string
  /** Custom color */
  color?: string
  /** List of items/points */
  items: CompareItem[]
}

/**
 * CompareBinary component props
 */
export interface CompareBinaryProps {
  /** Left side data */
  left: CompareSideData
  /** Right side data */
  right: CompareSideData
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Show VS divider */
  showVsDivider?: boolean
  /** VS label text */
  vsLabel?: string
  /** Gap between sides */
  gap?: number
  /** Header height */
  headerHeight?: number
  /** Palette override */
  palette?: Palette
}

/**
 * Default values
 */
export const COMPARE_BINARY_DEFAULTS = {
  width: 700,
  height: 400,
  showVsDivider: true,
  vsLabel: 'VS',
  gap: 40,
  headerHeight: 80
}
