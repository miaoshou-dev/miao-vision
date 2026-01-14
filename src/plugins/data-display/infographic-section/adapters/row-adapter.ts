/**
 * Row Adapter
 *
 * Transforms SectionItem[] to format expected by ListRowHorizontal.
 * Used by: kpi-row-badge template
 */

import type { SectionItem } from '../types'

/**
 * Row item format for ListRowHorizontal
 */
export interface RowItem {
  id: string
  label: string
  value?: string | number
  desc?: string
  icon?: string
  trend?: string
  color?: string
}

/**
 * Adapt section items to row format
 */
export function adaptToRow(items: SectionItem[]): RowItem[] {
  return items.map((item, index) => ({
    id: `row-item-${index}`,
    label: item.label,
    value: item.value,
    desc: item.desc,
    icon: item.icon,
    trend: item.trend,
    color: item.color
  }))
}
