/**
 * Report Rendering Logic
 *
 * Pure functions for report rendering and block mounting.
 */

import type { Report } from '@/types/report'

/**
 * Check for missing data sources
 */
export function findMissingDataSources(
  report: Report,
  tableMapping: Map<string, string> | undefined
): string[] {
  const requiredSources = report.metadata?.dataSources || []

  if (requiredSources.length === 0 || !tableMapping) {
    return []
  }

  const availableTables = new Set(tableMapping.keys())
  return requiredSources.filter(src => !availableTables.has(src))
}

/**
 * Check if report has changed (different ID)
 */
export function hasReportChanged(
  currentReportId: string | null,
  newReportId: string
): boolean {
  return currentReportId !== null && currentReportId !== newReportId
}

/**
 * Get content to render (processed or original)
 */
export function getContentToRender(report: Report): string {
  return report.metadata?._processedContent || report.content
}

/**
 * Clear chart elements from DOM
 */
export function clearChartElements(chartElements: HTMLElement[]): void {
  chartElements.forEach(el => {
    if (el.parentNode) {
      el.parentNode.removeChild(el)
    }
  })
}

/**
 * Calculate render stats for debugging
 */
export function calculateRenderStats(report: Report): {
  blocksCount: number
  blocksWithResults: number
} {
  const blocksCount = report.blocks?.length || 0
  const blocksWithResults = report.blocks?.filter(b => b.sqlResult).length || 0

  return {
    blocksCount,
    blocksWithResults
  }
}

/**
 * Log render debug info
 */
export function logRenderDebug(
  prefix: string,
  stats: ReturnType<typeof calculateRenderStats>,
  tableMappingSize: number
): void {
  console.log(`🔄 ${prefix} triggered`)
  console.log(`  Blocks: ${stats.blocksCount}, SQL results: ${stats.blocksWithResults}`)
  console.log(`  tableMapping size: ${tableMappingSize}`)
}
