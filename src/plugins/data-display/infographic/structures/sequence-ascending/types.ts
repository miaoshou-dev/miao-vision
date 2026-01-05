/**
 * SequenceAscending Structure Types
 *
 * Ascending progression with connected arrow flow.
 */
import type { Palette } from '../../theme'

/**
 * Ascending step data
 */
export interface AscendingStepData {
  /** Unique identifier */
  id: string
  /** Step label */
  label: string
  /** Optional description */
  desc?: string
  /** Optional icon */
  icon?: string
  /** Custom color */
  color?: string
}

/**
 * Calculated step layout
 */
export interface AscendingStepLayout {
  /** Step data */
  step: AscendingStepData
  /** X position (center) */
  x: number
  /** Y position (bottom of bar) */
  y: number
  /** Bar width */
  width: number
  /** Bar height */
  height: number
  /** Step index */
  index: number
}

/**
 * SequenceAscending component props
 */
export interface SequenceAscendingProps {
  /** Array of steps */
  steps: AscendingStepData[]
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Gap between bars */
  gap?: number
  /** Show connecting arrows */
  showArrows?: boolean
  /** Show step numbers */
  showNumbers?: boolean
  /** Minimum bar height ratio (0-1) */
  minHeightRatio?: number
  /** Palette override */
  palette?: Palette
}

/**
 * Default values
 */
export const SEQUENCE_ASCENDING_DEFAULTS = {
  width: 700,
  height: 250,
  gap: 16,
  showArrows: true,
  showNumbers: true,
  minHeightRatio: 0.3
}
