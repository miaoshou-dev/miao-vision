import type { ChartCatalogItem } from './chart-catalog-types'
import { CHART_CATALOG as CORE_CATALOG } from './chart-catalog-core'
import { EXTENDED_CATALOG } from './chart-catalog-ext'

export { type ValidationIssue, type ChartRule, type ChartCatalogItem } from './chart-catalog-types'
export const CHART_CATALOG: ChartCatalogItem[] = [...CORE_CATALOG, ...EXTENDED_CATALOG]

export function getCatalogItem(chartType: string): ChartCatalogItem | undefined {
  return CHART_CATALOG.find(c => c.id === chartType)
}
