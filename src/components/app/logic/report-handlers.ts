/**
 * Report Handlers Logic
 *
 * Pure functions and handlers for report operations.
 */

import { reportStore } from '@app/stores/report.svelte'
import { databaseStore } from '@app/stores/database.svelte'
import { getInputStore } from '@app/stores/report-inputs'
import { reportExecutionService } from '@core/engine/report-execution.service'
import { htmlExportService, shareService, staticSiteExporter, exportToMVR, parseMVR, MVR_EXTENSION } from '@core/export'
import { exportToPDF } from '@/lib/export'
import type { Report } from '@/types/report'
import type { InputStore } from '@app/stores/report-inputs'

export interface ReportHandlerContext {
  setExecuting: (value: boolean) => void
  setSaving: (value: boolean) => void
  setExporting: (value: boolean) => void
  setExportingPDF: (value: boolean) => void
  setSharing: (value: boolean) => void
  setExportingStaticSite: (value: boolean) => void
  setExportingMVR: (value: boolean) => void
  setImportingMVR: (value: boolean) => void
  setCurrentInputStore: (store: InputStore | null) => void
}

/**
 * Handle report content change
 */
export function handleReportContentChange(content: string, reportId: string): void {
  const currentReport = reportStore.state.currentReport
  if (!currentReport) return

  if (currentReport.type === 'multi-page') {
    const currentPage = reportStore.getCurrentPage()
    if (currentPage) {
      reportStore.updatePageContent(currentPage.id, content)
    }
  } else {
    reportStore.updateContent(content, reportId)
  }
}

/**
 * Handle report selection
 */
export function handleSelectReport(report: Report, ctx: ReportHandlerContext): void {
  const inputStore = getInputStore(report.id)
  ctx.setCurrentInputStore(inputStore)

  const currentReport = reportStore.state.currentReport
  if (currentReport && currentReport.blocks && currentReport.blocks.length > 0) {
    currentReport.blocks.forEach(block => {
      block.status = 'pending'
      delete block.chartConfig
      delete block.sqlResult
    })
  }

  reportExecutionService.clearExecutionState(report.id)
}

/**
 * Execute the current report
 */
export async function executeReport(ctx: ReportHandlerContext): Promise<void> {
  const currentReport = reportStore.state.currentReport
  if (!currentReport) {
    alert('No report to execute')
    return
  }

  ctx.setExecuting(true)

  try {
    const inputStore = getInputStore(currentReport.id)
    ctx.setCurrentInputStore(inputStore)

    const result = await reportExecutionService.executeReport(
      currentReport,
      inputStore,
      (progress) => reportStore.updateProgress(progress),
      (updatedReport) => {
        reportStore.state.currentReport = updatedReport
      }
    )

    if (result.success) {
      if (result.tableMapping) {
        reportStore.state.tableMapping = result.tableMapping
      }
      reportStore.saveReports()
    } else {
      alert(`Report execution completed with ${result.failedBlocks} error(s)`)
    }
  } catch (error) {
    alert(`Failed to execute report: ${error instanceof Error ? error.message : error}`)
  } finally {
    ctx.setExecuting(false)
  }
}

/**
 * Save the current report
 */
export async function saveReport(ctx: ReportHandlerContext): Promise<void> {
  const currentReport = reportStore.state.currentReport
  if (!currentReport) return

  ctx.setSaving(true)

  try {
    reportStore.saveReports()

    const handle = await (window as any).showSaveFilePicker?.({
      suggestedName: `${currentReport.name}.md`,
      types: [{ description: 'Markdown', accept: { 'text/markdown': ['.md'] } }]
    })

    if (handle) {
      const writable = await handle.createWritable()
      await writable.write(currentReport.content)
      await writable.close()
    }
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      console.error('Failed to save report:', error)
    }
  } finally {
    ctx.setSaving(false)
  }
}

/**
 * Export report to HTML
 */
export async function exportReport(ctx: ReportHandlerContext): Promise<void> {
  const currentReport = reportStore.state.currentReport
  if (!currentReport) return

  ctx.setExporting(true)

  try {
    await htmlExportService.export(currentReport)
  } catch (error) {
    alert(`Failed to export: ${error instanceof Error ? error.message : error}`)
  } finally {
    ctx.setExporting(false)
  }
}

/**
 * Export report to PDF
 */
export async function exportReportPDF(ctx: ReportHandlerContext): Promise<void> {
  const currentReport = reportStore.state.currentReport
  if (!currentReport) return

  ctx.setExportingPDF(true)

  try {
    await exportToPDF(currentReport)
  } catch (error) {
    alert(`Failed to export PDF: ${error instanceof Error ? error.message : error}`)
  } finally {
    ctx.setExportingPDF(false)
  }
}

/**
 * Share report
 */
export async function shareReport(ctx: ReportHandlerContext): Promise<void> {
  const currentReport = reportStore.state.currentReport
  if (!currentReport) return

  ctx.setSharing(true)

  try {
    const shareUrl = await shareService.share(currentReport)
    await navigator.clipboard.writeText(shareUrl)
    alert(`Share link copied to clipboard:\n${shareUrl}`)
  } catch (error) {
    alert(`Failed to share: ${error instanceof Error ? error.message : error}`)
  } finally {
    ctx.setSharing(false)
  }
}

/**
 * Export as static site
 */
export async function exportStaticSite(ctx: ReportHandlerContext): Promise<void> {
  const currentReport = reportStore.state.currentReport
  if (!currentReport) return

  ctx.setExportingStaticSite(true)

  try {
    await staticSiteExporter.export(currentReport)
  } catch (error) {
    alert(`Failed to export static site: ${error instanceof Error ? error.message : error}`)
  } finally {
    ctx.setExportingStaticSite(false)
  }
}

/**
 * Export to MVR format
 */
export async function exportMVR(ctx: ReportHandlerContext): Promise<void> {
  const currentReport = reportStore.state.currentReport
  if (!currentReport) return

  ctx.setExportingMVR(true)

  try {
    await exportToMVR(currentReport)
  } catch (error) {
    alert(`Failed to export MVR: ${error instanceof Error ? error.message : error}`)
  } finally {
    ctx.setExportingMVR(false)
  }
}

/**
 * Import MVR file
 */
export async function importMVR(ctx: ReportHandlerContext): Promise<Report | null> {
  ctx.setImportingMVR(true)

  try {
    const [fileHandle] = await (window as any).showOpenFilePicker({
      types: [{ description: 'MVR Files', accept: { 'application/octet-stream': [MVR_EXTENSION] } }]
    })

    const file = await fileHandle.getFile()
    const arrayBuffer = await file.arrayBuffer()
    const importedReport = await parseMVR(new Uint8Array(arrayBuffer))

    const report = reportStore.createReport(importedReport.name, importedReport.content)
    return report
  } catch (error) {
    if ((error as Error).name !== 'AbortError') {
      alert(`Failed to import MVR: ${error instanceof Error ? error.message : error}`)
    }
    return null
  } finally {
    ctx.setImportingMVR(false)
  }
}

/**
 * Create a new report
 */
export function createReport(type: 'single' | 'multi-page'): Report | null {
  const defaultName = type === 'multi-page' ? 'Untitled Multi-Page Report' : 'New Report'
  const name = prompt('Enter report name:', defaultName)
  if (name) {
    return reportStore.createReport(name, undefined, type)
  }
  return null
}

/**
 * Delete a report
 */
export function deleteReport(reportId: string): void {
  reportStore.deleteReport(reportId)
}

/**
 * Infer column type for report generation
 */
export function inferColumnType(value: unknown): string {
  if (value === null || value === undefined) return 'unknown'
  if (typeof value === 'number' || typeof value === 'bigint') return 'number'
  if (typeof value === 'boolean') return 'boolean'
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
    return 'string'
  }
  return 'unknown'
}

/**
 * Convert BigInt values to numbers for JSON serialization
 */
export function convertBigIntToNumber(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj
  if (typeof obj === 'bigint') return Number(obj)
  if (Array.isArray(obj)) return obj.map(convertBigIntToNumber)
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = convertBigIntToNumber(value)
    }
    return result
  }
  return obj
}
