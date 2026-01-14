/**
 * Flow Adapter
 *
 * Transforms SectionItem[] to format expected by FlowLinear.
 * Used by: flow-timeline template
 */

import type { SectionItem } from '../types'

/**
 * Flow step format for FlowLinear
 * Matches the FlowStep interface in flow-linear/types.ts
 */
export interface FlowStep {
  id: string
  label: string
  desc?: string
  icon?: string
}

/**
 * Adapt section items to flow steps format
 */
export function adaptToFlow(items: SectionItem[]): FlowStep[] {
  return items.map((item, index) => ({
    id: `step-${index}`,
    label: item.label,
    desc: item.desc || '',
    icon: item.icon
  }))
}
