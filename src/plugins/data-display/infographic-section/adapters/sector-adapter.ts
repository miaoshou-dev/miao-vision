/**
 * Sector Adapter
 *
 * Transforms SectionItem[] to format expected by ListSector.
 * Used by: pie-distribution template
 */

import type { SectionItem } from '../types'

/**
 * Sector item format for ListSector
 */
export interface SectorItemData {
  id: string
  label: string
  value: number
  color?: string
}

/**
 * Adapt section items to sector format
 * Converts string values to numbers for pie chart calculations
 */
export function adaptToSector(items: SectionItem[]): SectorItemData[] {
  return items.map((item, index) => {
    // Parse value to number
    let numValue = 0
    if (typeof item.value === 'number') {
      numValue = item.value
    } else if (typeof item.value === 'string') {
      // Try to extract number from string (e.g., "45%" -> 45, "$12M" -> 12)
      const match = item.value.match(/[\d.]+/)
      numValue = match ? parseFloat(match[0]) : 0
    }

    return {
      id: `sector-${index}`,
      label: item.label,
      value: numValue,
      color: item.color
    }
  })
}
