/**
 * SequenceRoadmap Structure Types
 *
 * Horizontal roadmap/timeline with milestones.
 */
import type { Palette } from '../../theme'

/**
 * Milestone status
 */
export type MilestoneStatus = 'completed' | 'current' | 'upcoming'

/**
 * Milestone data
 */
export interface MilestoneData {
  /** Unique identifier */
  id: string
  /** Milestone title */
  title: string
  /** Time/date label */
  date?: string
  /** Description */
  desc?: string
  /** Icon name */
  icon?: string
  /** Status */
  status?: MilestoneStatus
  /** Custom color */
  color?: string
}

/**
 * Calculated milestone layout
 */
export interface MilestoneLayout {
  /** Milestone data */
  milestone: MilestoneData
  /** X position */
  x: number
  /** Y position */
  y: number
  /** Index */
  index: number
}

/**
 * SequenceRoadmap component props
 */
export interface SequenceRoadmapProps {
  /** Array of milestones */
  milestones: MilestoneData[]
  /** Available width */
  width?: number
  /** Available height */
  height?: number
  /** Show connecting line */
  showLine?: boolean
  /** Line position (top/middle/bottom) */
  linePosition?: 'top' | 'middle' | 'bottom'
  /** Milestone marker size */
  markerSize?: number
  /** Show date labels */
  showDates?: boolean
  /** Alternate milestone positions (zigzag) */
  alternate?: boolean
  /** Palette override */
  palette?: Palette
}

/**
 * Default values
 */
export const SEQUENCE_ROADMAP_DEFAULTS = {
  width: 800,
  height: 200,
  showLine: true,
  linePosition: 'middle' as const,
  markerSize: 20,
  showDates: true,
  alternate: false
}
