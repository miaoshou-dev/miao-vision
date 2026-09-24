import { createServer, type IncomingMessage, type Server, type ServerResponse } from 'node:http'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, statSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { extname, resolve, relative, isAbsolute, join } from 'node:path'
import { ReviewStore } from './review-store'
import type { ReviewEvent } from './review-events'
import { artifactSpecMap, batchSummary, revisionActions, visualDiff } from './review-p2'
import { summarizeReviewChanges } from './review-changes'
import { reviewViewerHtml } from './review-ui'
import { createReviewExport, reviewExportSource, type ReviewExportFormat } from './review-export'

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8', '.htm': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.pdf': 'application/pdf'
}

export const DEFAULT_REVIEW_PORT = 43179

export interface ReviewServer {
  readonly port: number
  readonly url: string
  readonly store: ReviewStore
  close(): Promise<void>
}

export interface StartReviewServerOptions {
  port?: number
  artifactRoot?: string
  retryRun?: (runId: string) => Promise<unknown>
}

export async function startReviewServer(options: StartReviewServerOptions = {}): Promise<ReviewServer> {
  const artifactRoot = resolve(options.artifactRoot ?? process.cwd())
  const cacheKey = createHash('sha256').update(artifactRoot).digest('hex').slice(0, 16)
  const store = new ReviewStore(20, join(tmpdir(), 'miao-vision-review', cacheKey, 'runs.json'))
  const clients = new Map<string, Set<ServerResponse>>()
  const server = createServer((request, response) => { void handleRequest(request, response, store, artifactRoot, clients, options.retryRun) })
  try {
    await listen(server, options.port ?? 0)
  } catch (error) {
    if (options.port && (error as NodeJS.ErrnoException).code === 'EADDRINUSE') {
      throw new Error(`Review Viewer port ${options.port} is already in use. Stop the existing Viewer or choose another port with --port.`, { cause: error })
    }
    throw error
  }
  const address = server.address()
  if (!address || typeof address === 'string') throw new Error('Review server did not expose a TCP port.')
  return {
    port: address.port,
    url: `http://127.0.0.1:${address.port}/`,
    store,
    close: async () => {
      for (const streams of clients.values()) for (const client of streams) client.end()
      await new Promise<void>((resolveClose, reject) => server.close(error => error ? reject(error) : resolveClose()))
    }
  }
}

async function handleRequest(request: IncomingMessage, response: ServerResponse, store: ReviewStore, artifactRoot: string, clients: Map<string, Set<ServerResponse>>, retryRun?: (runId: string) => Promise<unknown>): Promise<void> {
  const url = new URL(request.url ?? '/', 'http://127.0.0.1')
  if (request.method === 'POST' && url.pathname === '/api/runs') {
    const body = await readJsonBody(request)
    if (!body || typeof body.runId !== 'string' || !['report', 'deck', 'article'].includes(String(body.kind)) || typeof body.title !== 'string' || (body.parentRunId !== undefined && typeof body.parentRunId !== 'string')) {
      return respondJson(response, 400, { ok: false, code: 'INVALID_RUN', message: 'runId, kind, and title are required.' })
    }
    const existing = store.get(body.runId)
    if (existing) return respondJson(response, 200, { ok: true, value: existing })
    const run = store.create({ runId: body.runId, kind: body.kind as 'report' | 'deck' | 'article', title: body.title, ...(typeof body.parentRunId === 'string' ? { parentRunId: body.parentRunId } : {}) })
    return respondJson(response, 201, { ok: true, value: run })
  }
  const eventMatch = /^\/api\/runs\/([^/]+)\/events$/.exec(url.pathname)
  if (request.method === 'POST' && eventMatch) {
    const body = await readJsonBody(request)
    try {
      store.publish(body as ReviewEvent)
      return respondJson(response, 202, { ok: true })
    } catch (error) {
      return respondJson(response, 400, { ok: false, code: 'INVALID_REVIEW_EVENT', message: error instanceof Error ? error.message : 'Invalid review event.' })
    }
  }
  const retryMatch = /^\/api\/runs\/([^/]+)\/retry$/.exec(url.pathname)
  if (request.method === 'POST' && retryMatch) {
    const runId = decodeURIComponent(retryMatch[1])
    if (!store.get(runId)) return respondJson(response, 404, { ok: false, code: 'RUN_NOT_FOUND', message: 'Review run not found.' })
    if (!retryRun) return respondJson(response, 409, { ok: false, code: 'RETRY_UNAVAILABLE', message: 'This run was not started by a retry-capable MCP workflow.' })
    try {
      return respondJson(response, 202, { ok: true, value: await retryRun(runId) })
    } catch (error) {
      return respondJson(response, 409, { ok: false, code: 'RETRY_FAILED', message: error instanceof Error ? error.message : 'Unable to retry this run.' })
    }
  }
  if (request.method !== 'GET') return respondJson(response, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', message: 'Review server only accepts run/event writes and read requests.' })
  if (url.pathname === '/api/health') return respondJson(response, 200, { ok: true })
  if (url.pathname === '/api/runs') return respondJson(response, 200, { ok: true, value: store.list() })
  if (url.pathname === '/api/runs/history') return respondJson(response, 200, { ok: true, value: store.history() })
  const exportMatch = /^\/api\/runs\/([^/]+)\/export(?:\/(pdf|png|pptx))?$/.exec(url.pathname)
  if (exportMatch) {
    const run = store.get(decodeURIComponent(exportMatch[1]))
    if (!run) return respondJson(response, 404, { ok: false, code: 'RUN_NOT_FOUND', message: 'Review run not found.' })
    const source = reviewExportSource(run)
    if (!exportMatch[2]) return respondJson(response, 200, { ok: true, value: { kind: source?.kind ?? run.kind, formats: source?.formats ?? [] } })
    const format = exportMatch[2] as ReviewExportFormat
    if (!source?.formats.includes(format)) return respondJson(response, 409, { ok: false, code: 'EXPORT_UNAVAILABLE', message: 'This format is unavailable for the selected artifact.' })
    try {
      const output = await createReviewExport(run, format)
      response.writeHead(200, {
        'Content-Type': format === 'pdf' ? 'application/pdf' : format === 'png' ? 'image/png' : 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(output.filename)}"; filename*=UTF-8''${encodeURIComponent(output.filename)}`,
        'Content-Length': statSync(output.path).size,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff'
      })
      return response.end(readFileSync(output.path))
    } catch (error) {
      return respondJson(response, 500, { ok: false, code: 'EXPORT_FAILED', message: error instanceof Error ? error.message : 'Export failed.' })
    }
  }
  if (url.pathname === '/api/compare') {
    const before = store.get(url.searchParams.get('before') ?? '')
    const after = store.get(url.searchParams.get('after') ?? '')
    if (!before || !after) return respondJson(response, 404, { ok: false, code: 'RUN_NOT_FOUND', message: 'Both review runs must exist.' })
    if (before.kind !== after.kind) return respondJson(response, 400, { ok: false, code: 'ARTIFACT_KIND_MISMATCH', message: 'Compare two artifacts of the same kind.' })
    return respondJson(response, 200, { ok: true, value: {
      beforeRunId: before.runId, afterRunId: after.runId,
      beforeUrl: before.artifact ? `/artifacts/${encodeURIComponent(before.runId)}/primary` : undefined,
      afterUrl: after.artifact ? `/artifacts/${encodeURIComponent(after.runId)}/primary` : undefined,
      changes: summarizeReviewChanges(after, before)
    } })
  }
  if (url.pathname === '/api/batch') return respondJson(response, 200, { ok: true, value: batchSummary(store.list()) })
  const changesMatch = /^\/api\/runs\/([^/]+)\/changes$/.exec(url.pathname)
  if (changesMatch) {
    const run = store.get(decodeURIComponent(changesMatch[1]))
    if (!run) return respondJson(response, 404, { ok: false, code: 'RUN_NOT_FOUND', message: 'Review run not found.' })
    const parent = run.parentRunId ? store.get(run.parentRunId) : undefined
    return respondJson(response, 200, { ok: true, value: summarizeReviewChanges(run, parent) })
  }
  const p2Match = /^\/api\/runs\/([^/]+)\/(spec-map|revision-actions|visual-diff)$/.exec(url.pathname)
  if (p2Match) {
    const run = store.get(decodeURIComponent(p2Match[1]))
    if (!run) return respondJson(response, 404, { ok: false, code: 'RUN_NOT_FOUND', message: 'Review run not found.' })
    const parent = run.parentRunId ? store.get(run.parentRunId) : undefined
    const value = p2Match[2] === 'spec-map' ? artifactSpecMap(run) : p2Match[2] === 'revision-actions' ? revisionActions(run, parent) : visualDiff(run, parent)
    return respondJson(response, 200, { ok: true, value })
  }
  const evidenceMatch = /^\/api\/runs\/([^/]+)\/evidence$/.exec(url.pathname)
  if (evidenceMatch) {
    const run = store.get(decodeURIComponent(evidenceMatch[1]))
    if (!run) return respondJson(response, 404, { ok: false, code: 'RUN_NOT_FOUND', message: 'Review run not found.' })
    return respondJson(response, 200, {
      ok: true,
      value: {
        runId: run.runId,
        verified: run.artifact?.verified === true,
        coverage: run.artifact?.coverage ?? null,
        evidence: run.artifact?.evidence ?? null,
        dataQuality: run.artifact?.dataQuality ?? null,
        items: run.artifact?.evidenceItems ?? [],
        issues: run.issues
      }
    })
  }
  const runMatch = /^\/api\/runs\/([^/]+)$/.exec(url.pathname)
  if (runMatch) {
    const run = store.get(decodeURIComponent(runMatch[1]))
    return run ? respondJson(response, 200, { ok: true, value: run }) : respondJson(response, 404, { ok: false, code: 'RUN_NOT_FOUND', message: 'Review run not found.' })
  }
  const streamMatch = /^\/api\/runs\/([^/]+)\/events$/.exec(url.pathname)
  if (streamMatch) return streamEvents(response, decodeURIComponent(streamMatch[1]), store, clients)
  if (url.pathname === '/' || url.pathname === '/index.html') return respondHtml(response, reviewViewerHtml())
  const namedArtifact = /^\/artifacts\/([^/]+)\/(primary|preview)$/.exec(url.pathname)
  if (namedArtifact) return serveNamedArtifact(response, decodeURIComponent(namedArtifact[1]), namedArtifact[2] as 'primary' | 'preview', store)
  if (url.pathname.startsWith('/artifacts/')) return serveArtifact(response, url.pathname.slice('/artifacts/'.length), artifactRoot)
  return respondJson(response, 404, { ok: false, code: 'NOT_FOUND', message: 'Review server route not found.' })
}

function streamEvents(response: ServerResponse, runId: string, store: ReviewStore, clients: Map<string, Set<ServerResponse>>): void {
  const run = store.get(runId)
  if (!run) return respondJson(response, 404, { ok: false, code: 'RUN_NOT_FOUND', message: 'Review run not found.' })
  response.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache', Connection: 'keep-alive', 'X-Accel-Buffering': 'no' })
  response.write(': ready\n\n')
  for (const event of run.events) response.write(`data: ${JSON.stringify(event)}\n\n`)
  const listeners = clients.get(runId) ?? new Set<ServerResponse>()
  listeners.add(response)
  clients.set(runId, listeners)
  const unsubscribe = store.on(runId, (event: ReviewEvent) => {
    if (!response.writableEnded) response.write(`data: ${JSON.stringify(event)}\n\n`)
  })
  response.on('close', () => { unsubscribe(); listeners.delete(response); if (!listeners.size) clients.delete(runId) })
}

function serveArtifact(response: ServerResponse, encodedPath: string, artifactRoot: string): void {
  const requested = decodeURIComponent(encodedPath)
  const absolute = resolve(artifactRoot, requested)
  const rel = relative(artifactRoot, absolute)
  if (rel.startsWith('..') || isAbsolute(rel)) return respondJson(response, 403, { ok: false, code: 'ARTIFACT_PATH_FORBIDDEN', message: 'Artifact is outside the review root.' })
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return respondJson(response, 404, { ok: false, code: 'ARTIFACT_NOT_FOUND', message: 'Artifact not found.' })
  response.writeHead(200, { 'Content-Type': MIME_TYPES[extname(absolute).toLowerCase()] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' })
  response.end(readFileSync(absolute))
}

function serveNamedArtifact(response: ServerResponse, runId: string, kind: 'primary' | 'preview', store: ReviewStore): void {
  const artifact = store.get(runId)?.artifact
  const file = kind === 'primary' ? artifact?.primaryPath : artifact?.previewPath
  if (!file) return respondJson(response, 404, { ok: false, code: 'ARTIFACT_NOT_FOUND', message: 'Artifact not found.' })
  const absolute = resolve(file)
  if (!existsSync(absolute) || !statSync(absolute).isFile()) return respondJson(response, 404, { ok: false, code: 'ARTIFACT_NOT_FOUND', message: 'Artifact not found.' })
  response.writeHead(200, { 'Content-Type': MIME_TYPES[extname(absolute).toLowerCase()] ?? 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' })
  response.end(readFileSync(absolute))
}

function listen(server: Server, port: number): Promise<void> {
  return new Promise((resolveListen, reject) => {
    server.once('error', reject)
    server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolveListen() })
  })
}

function respondJson(response: ServerResponse, status: number, value: unknown): void {
  response.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(JSON.stringify(value))
}

function respondHtml(response: ServerResponse, html: string): void {
  response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' })
  response.end(html)
}

function readJsonBody(request: IncomingMessage): Promise<Record<string, unknown> | null> {
  return new Promise(resolveBody => {
    let body = ''
    request.setEncoding('utf8')
    request.on('data', chunk => { body += chunk; if (body.length > 512 * 1024) request.destroy() })
    request.on('end', () => { try { resolveBody(JSON.parse(body) as Record<string, unknown>) } catch { resolveBody(null) } })
    request.on('error', () => resolveBody(null))
  })
}
