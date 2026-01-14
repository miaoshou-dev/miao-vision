/**
 * Grid Adapter
 *
 * Transforms SectionItem[] to format expected by ListGrid.
 * Used by: grid-comparison template
 */

import type { SectionItem } from '../types'

/**
 * Grid item format for ListGrid
 */
export interface GridItem {
  id: string
  label: string
  value?: string | number
  desc?: string
  icon?: string
  trend?: string
  color?: string
}

/**
 * Adapt section items to grid format
 */
export function adaptToGrid(items: SectionItem[]): GridItem[] {
  return items.map((item, index) => ({
    id: `grid-item-${index}`,
    label: item.label,
    value: item.value,
    desc: item.desc,
    icon: item.icon,
    trend: item.trend,
    color: item.color
  }))
}
