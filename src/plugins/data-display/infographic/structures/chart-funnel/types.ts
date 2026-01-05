/**
 * ChartFunnel Types
 *
 * Funnel chart infographic - conversion/pipeline visualization
 */

import type { Snippet } from 'svelte'
import type { ThemeColors } from '../../theme'

/**
 * Funnel stage data
 */
export interface FunnelStageData {
  /** Stage label */
  label: string
  /** Stage value */
  value: number
  /** Optional description */
  desc?: string
  /** Optional icon */
  icon?: string
  /** Optional custom color */
  color?: string
}

/**
 * Funnel stage layout
 */
export interface FunnelStageLayout {
  /** Stage data */
  data: FunnelStageData
  /** Index */
  index: number
  /** Top width */
  topWidth: number
  /** Bottom width */
  bottomWidth: number
  /** X position (center) */
  x: number
  /** Y position (top) */
  y: number
  /** Height */
  height: number
  /** Percentage of first stage */
  percentage: number
  /** Conversion rate from previous stage */
  conversionRate: number
  /** Theme colors */
  themeColors: ThemeColors
  /** Gradient ID */
  gradientId?: string
}

/**
 * ChartFunnel props
 */
export interface ChartFunnelProps {
  /** Funnel stages */
  stages: FunnelStageData[]
  /** Show values */
  showValues?: boolean
  /** Show percentages */
  showPercentages?: boolean
  /** Show conversion rates between stages */
  showConversionRates?: boolean
  /** Value prefix */
  valuePrefix?: string
  /** Value suffix */
  valueSuffix?: string
  /** Funnel shape: tapered (traditional) or stepped */
  shape?: 'tapered' | 'stepped'
  /** Minimum width at bottom (0-1) */
  minWidth?: number
  /** Gap between stages */
  stageGap?: number
  /** Color palette name */
  palette?: string
  /** Custom stage renderer */
  stage?: Snippet<[FunnelStageLayout]>
  /** Width */
  width?: number
  /** Height */
  height?: number
}
