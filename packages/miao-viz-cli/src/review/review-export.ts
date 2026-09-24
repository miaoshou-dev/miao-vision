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
  const hash = createHash('sha256').update(source.html).digest('hex').slice(0, 16)
  const runKey = createHash('sha256').update(resolve(run.artifact!.primaryPath) + '\0' + run.runId).digest('hex').slice(0, 16)
  const dir = join(tmpdir(), 'miao-vision-review', 'exports', runKey)
  mkdirSync(dir, { recursive: true })
  const path = join(dir, `${hash}.${format}`)
  const filename = `${safeName(run.title || run.runId)}-${safeName(run.runId)}.${format}`
  if (existsSync(path) && statSync(path).size > 0) return { path, filename }
  if (format === 'pptx') await exportDeckToPptx(source.html, path)
  else if (format === 'pdf') {
    const result = await exportHtmlToPdf(source.html, path, { mode: source.kind })
    if (!result.ok) throw new Error(result.message)
  } else {
    const result = await exportHtmlToPng(source.html, path, source.kind === 'poster'
      ? { width: posterDimension(source.html, 'width', 1080), height: posterDimension(source.html, 'height', 1350), selector: '.mv-poster' }
      : {})
    if (!result.ok) throw new Error(result.message)
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
