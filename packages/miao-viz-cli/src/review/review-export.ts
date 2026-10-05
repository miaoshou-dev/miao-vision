import { ExportRuntimeError } from '../../../../skills/miao-vision/scripts/export-runtime.mjs'
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { exportHtmlToPdf } from '../pdf-export'
import { exportHtmlToPng } from '../png-export'
import { exportDeckToPptx } from './review-pptx'
import type { ReviewRunSnapshot } from './review-events'

export type ReviewExportFormat = 'pdf' | 'png' | 'pptx'
export type ReviewExportKind = 'report' | 'deck' | 'poster'

/**
 * Produces a presentation-safe derivative of an artifact for raster and PDF
 * delivery. Evidence remains available in the local Review Viewer, but its
 * controls and technical appendix are review-only information.
 */
export function reviewDeliveryHtml(html: string): string {
  return html
    .replace(/<button\b[^>]*\bclass=(['"])\s*[^'"]*\bevidence-trigger\b[^'"]*\1[^>]*>[\s\S]*?<\/button>/gi, '')
    .replace(/<p\b[^>]*\bclass=(['"])\s*[^'"]*\bevidence-status\b[^'"]*\1[^>]*>[\s\S]*?<\/p>/gi, '')
    .replace(/<section\b[^>]*\bclass=(['"])\s*[^'"]*\bevidence-appendix\b[^'"]*\1[^>]*>[\s\S]*?<\/section>/gi, '')
    .replace(/<aside\b[^>]*\bclass=(['"])\s*[^'"]*\bevidence-drawer\b[^'"]*\1[^>]*>[\s\S]*?<\/aside>/gi, '')
    .replace(/<script\b[^>]*>[\s\S]*?(?:miao-evidence-drawer|data-evidence-key)[\s\S]*?<\/script>/gi, '')
}

export function reviewExportSource(run: ReviewRunSnapshot): { html: string; kind: ReviewExportKind; formats: ReviewExportFormat[] } | null {
  const path = run.artifact?.primaryPath
  if (!path || extname(path).toLowerCase() !== '.html' || !existsSync(path) || !statSync(path).isFile()) return null
  if (run.kind !== 'report' && run.kind !== 'deck') return null
  const html = readFileSync(path, 'utf8')
  const kind = run.kind === 'deck' ? 'deck' : /class=["'][^"']*\bmv-poster\b/.test(html) ? 'poster' : 'report'
  return { html, kind, formats: kind === 'deck' ? ['pdf', 'pptx'] : kind === 'poster' ? ['png'] : ['pdf', 'png'] }
}

export async function createReviewExport(run: ReviewRunSnapshot, format: ReviewExportFormat): Promise<{ path: string; filename: string }> {
  const source = reviewExportSource(run)
  if (!source || !source.formats.includes(format)) throw new Error('This format is unavailable for the selected artifact.')
  const html = reviewDeliveryHtml(source.html)
  const hash = createHash('sha256').update(`${html}\0review-delivery-v1`).digest('hex').slice(0, 16)
  const runKey = createHash('sha256').update(resolve(run.artifact!.primaryPath) + '\0' + run.runId).digest('hex').slice(0, 16)
  const dir = join(tmpdir(), 'miao-vision-review', 'exports', runKey)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${hash}.${format}`)
  const filename = `${safeName(run.title || run.runId)}-${safeName(run.runId)}.${format}`
  if (existsSync(path) && statSync(path).size > 0) return { path, filename }
  if (format === 'pptx') await exportDeckToPptx(html, path)
  else if (format === 'pdf') {
    const result = await exportHtmlToPdf(html, path, { mode: source.kind })
    if (!result.ok) throw new ExportRuntimeError(result.code, result.message, result)
  } else {
    const result = await exportHtmlToPng(html, path, source.kind === 'poster'
      ? { width: posterDimension(html, 'width', 1080), height: posterDimension(html, 'height', 1350), selector: '.mv-poster' }
      : {})
    if (!result.ok) throw new ExportRuntimeError(result.code, result.message, result)
  }
  if (!existsSync(path) || !statSync(path).size) throw new Error('Export did not create a file.')
  return { path, filename }
}

function posterDimension(html: string, property: string, fallback: number): number {
  const match = new RegExp(`\\.mv-poster\\{[^}]*\\b${property}:(\\d+)px`).exec(html)
  return match ? Number(match[1]) : fallback
}

function safeName(value: string): string {
  return value.normalize('NFKD').replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'artifact'
}
