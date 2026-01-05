/**
 * FlowLinear Structure Types
 *
 * Linear process flow with numbered steps and arrows.
 */

import type { Palette, ThemeColors } from '../../theme'

/** Single flow step */
export interface FlowStep {
  id: string
  label: string
  desc?: string
  icon?: string
  color?: string
  /** Optional step number (auto-generated if not provided) */
  number?: number
}

/** Flow direction */
export type FlowDirection = 'horizontal' | 'vertical'

/** Arrow style */
export type FlowArrowStyle = 'arrow' | 'chevron' | 'line' | 'dotted'

/** FlowLinear props */
export interface FlowLinearProps {
  /** Array of flow steps */
  steps: FlowStep[]
  /** Total width */
  width?: number
  /** Total height */
  height?: number
  /** Flow direction */
  direction?: FlowDirection
  /** Show step numbers */
  showNumbers?: boolean
  /** Show arrows between steps */
  showArrows?: boolean
  /** Arrow style */
  arrowStyle?: FlowArrowStyle
  /** Gap between steps */
  gap?: number
  /** Palette override */
  palette?: Palette
}

/** Calculated step layout */
export interface StepLayout {
  step: FlowStep
  index: number
  x: number
  y: number
  width: number
  height: number
  number: number
  themeColors: ThemeColors
  gradientId?: string
}

/** Default values */
export const FLOW_LINEAR_DEFAULTS = {
  width: 800,
  height: 120,
  direction: 'horizontal' as FlowDirection,
  showNumbers: true,
  showArrows: true,
  arrowStyle: 'chevron' as FlowArrowStyle,
  gap: 16
}
