/**
 * SequenceStairs Structure Types
 *
 * Stair-step progression layout.
 */
import type { Palette } from '../../theme'

/**
 * Stair step data
 */
export interface StairStepData {
  /** Unique identifier */
  id: string
  /** Step label */
  label: string
  /** Optional description */
  desc?: string
  /** Optional icon */
  icon?: string
  /** Optional value/metric */
  value?: string | number
  /** Custom color */
  color?: string
}

/**
 * Calculated step layout
 */
export interface StairStepLayout {
  /** Step data */
  step: StairStepData
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Step width */
  width: number
  /** Step height */
  height: number
  /** Step index */
  index: number
}

/**
 * SequenceStairs component props
 */
export interface SequenceStairsProps {
  /** Array of steps */
  steps: StairStepData[]
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Direction (ascending up or down) */
  direction?: 'up' | 'down'
  /** Gap between steps */
  gap?: number
  /** Show step numbers */
  showNumbers?: boolean
  /** Palette override */
  palette?: Palette
}

/**
 * Default values
 */
export const SEQUENCE_STAIRS_DEFAULTS = {
  width: 700,
  height: 300,
  direction: 'up' as const,
  gap: 8,
  showNumbers: true
}
