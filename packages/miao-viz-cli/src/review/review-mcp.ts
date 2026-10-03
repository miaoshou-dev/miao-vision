import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createInterface } from 'node:readline'
import { DEFAULT_REVIEW_PORT, startReviewServer, type ReviewServer } from './review-server'
import packageJson from '../../package.json'
import { revisionOutputPath, writeRevisionSpec } from './review-revision-apply'
import type { StoredRevision } from './review-store'

interface JsonRpcRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

export interface ReviewMcpOptions {
  port?: number
  artifactRoot?: string
}

export async function runReviewMcp(options: ReviewMcpOptions = {}): Promise<void> {
  const workflowArgs = new Map<string, Record<string, unknown>>()
  const activeChildren = new Set<ChildProcessWithoutNullStreams>()
  let server: ReviewServer
  server = await startReviewServer({
    port: options.port ?? DEFAULT_REVIEW_PORT,
    artifactRoot: options.artifactRoot,
    retryRun: async runId => {
      const previous = workflowArgs.get(runId)
      if (!previous) throw new Error('Retry metadata is unavailable for this run.')
      return runWorkflow({ ...previous, parentRunId: runId }, server, workflowArgs, activeChildren)
    },
    applyRevision: async revision => applyRevision(revision, server, workflowArgs, activeChildren)
  })
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
  const output = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`)
  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    input.close()
    for (const child of activeChildren) child.kill('SIGTERM')
    await server.close()
  }
  process.once('SIGINT', () => { void close() })
  process.once('SIGTERM', () => { void close() })

  for await (const line of input) {
    if (!line.trim()) continue
    let request: JsonRpcRequest
    try { request = JSON.parse(line) as JsonRpcRequest } catch {
      output({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } })
      continue
    }
    if (request.id === undefined) continue
    try {
      output({ jsonrpc: '2.0', id: request.id, result: await handleRequest(request, server, workflowArgs, activeChildren) })
    } catch (error) {
      output({ jsonrpc: '2.0', id: request.id, error: { code: -32000, message: error instanceof Error ? error.message : 'MCP request failed' } })
    }
  }
  await close()
}

async function handleRequest(request: JsonRpcRequest, server: ReviewServer, workflowArgs: Map<string, Record<string, unknown>>, activeChildren: Set<ChildProcessWithoutNullStreams>): Promise<unknown> {
  if (request.method === 'initialize') {
    return { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'miao-viz', version: packageJson.version } }
  }
  if (request.method === 'ping') return {}
  if (request.method === 'tools/list') {
    return { tools: [
      { name: 'open_miao_vision_viewer', description: 'Returns the local Miao Vision Review Viewer URL.', inputSchema: { type: 'object', properties: {} } },
      { name: 'run_miao_viz', description: 'Runs a local Miao Vision report, deck, or article workflow and publishes progress to the Review Viewer.', inputSchema: {
        type: 'object', required: ['kind', 'output'], properties: {
          kind: { type: 'string', enum: ['report', 'deck', 'article'] }, input: { type: 'string' }, spec: { type: 'string' }, context: { type: 'string' }, output: { type: 'string' }, theme: { type: 'string' }, parentRunId: { type: 'string', description: 'Optional earlier Viewer run to associate as the source of this revision.' }
        }
      } },
      { name: 'get_miao_vision_revision', description: 'Reads a Viewer revision request and its human-readable plan. The plan must be confirmed in Viewer before applying.', inputSchema: { type: 'object', required: ['revisionId'], properties: { revisionId: { type: 'string' } } } },
      { name: 'apply_miao_vision_revision', description: 'Applies a confirmed Viewer revision using a restricted PatchSet, validates and renders it as a child run. It cannot alter data, evidence, provenance, or arbitrary files.', inputSchema: { type: 'object', required: ['revisionId', 'patchSet'], properties: { revisionId: { type: 'string' }, patchSet: { type: 'object', properties: { operations: { type: 'array' } } } } } }
    ] }
  }
  if (request.method !== 'tools/call') throw new Error(`Unsupported MCP method: ${request.method ?? '(missing)'}`)
  const params = request.params ?? {}
  const name = typeof params.name === 'string' ? params.name : ''
  const args = (params.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Record<string, unknown>
  if (name === 'open_miao_vision_viewer') {
    return { content: [{ type: 'text', text: `Miao Vision Review Viewer is available at ${server.url}. Open this URL in the embedded browser.` }] }
  }
  if (name === 'run_miao_viz') return { content: [{ type: 'text', text: JSON.stringify(await runWorkflow(args, server, workflowArgs, activeChildren)) }] }
  if (name === 'get_miao_vision_revision') return { content: [{ type: 'text', text: JSON.stringify(await revisionRequest(server, stringArg(args, 'revisionId'))) }] }
  if (name === 'apply_miao_vision_revision') return { content: [{ type: 'text', text: JSON.stringify(await applyRevisionRequest(server, stringArg(args, 'revisionId'), args.patchSet)) }] }
  throw new Error(`Unknown MCP tool: ${name}`)
}

async function revisionRequest(server: ReviewServer, revisionId?: string): Promise<unknown> {
  if (!revisionId) throw new Error('revisionId is required')
  const response = await fetch(new URL(`/api/revisions/${encodeURIComponent(revisionId)}`, server.url))
  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? 'Revision request was not found.')
  return body.value
}

async function applyRevisionRequest(server: ReviewServer, revisionId: string | undefined, patchSet: unknown): Promise<unknown> {
  if (!revisionId || !patchSet || typeof patchSet !== 'object') throw new Error('revisionId and patchSet are required')
  const response = await fetch(new URL(`/api/revisions/${encodeURIComponent(revisionId)}/apply`, server.url), { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(patchSet) })
  const body = await response.json()
  if (!response.ok) throw new Error(body.message ?? 'Revision could not be applied.')
  return body.value
}

async function applyRevision(revision: StoredRevision, server: ReviewServer, workflowArgs: Map<string, Record<string, unknown>>, activeChildren: Set<ChildProcessWithoutNullStreams>): Promise<{ childRunId: string }> {
  const previous = workflowArgs.get(revision.request.parentRunId)
  if (!previous) throw new Error('The parent run was not started by this MCP session, so it cannot be applied automatically.')
  if (!revision.plan.patchSet) throw new Error('A PatchSet is required to apply a revision.')
  const spec = writeRevisionSpec(revision.request, revision.plan.patchSet)
  const output = typeof previous.output === 'string' ? revisionOutputPath(revision.request, previous.output) : undefined
  if (!output) throw new Error('The parent workflow has no output path.')
  const result = await runWorkflow({ ...previous, spec, output, parentRunId: revision.request.parentRunId }, server, workflowArgs, activeChildren)
  const childRunId = result && typeof result === 'object' && typeof (result as { runId?: unknown }).runId === 'string' ? (result as { runId: string }).runId : undefined
  if (!childRunId) throw new Error('The revision workflow did not create a child run.')
  return { childRunId }
}

async function runWorkflow(args: Record<string, unknown>, server: ReviewServer, workflowArgs: Map<string, Record<string, unknown>>, activeChildren: Set<ChildProcessWithoutNullStreams>): Promise<unknown> {
  const kind = args.kind
  if (kind !== 'report' && kind !== 'deck' && kind !== 'article') throw new Error('kind must be report, deck, or article')
  const output = stringArg(args, 'output')
  if (!output) throw new Error('output is required')
  const input = stringArg(args, 'input')
  const spec = stringArg(args, 'spec')
  if (kind !== 'article' && (!input || !spec)) throw new Error('input and spec are required for report and deck workflows')
  if (kind === 'article' && !input && !spec) throw new Error('input or spec is required for article workflows')
  const runId = `run-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const cliPath = process.argv[1]
  if (!cliPath) throw new Error('Unable to locate the Miao Viz CLI entrypoint.')
  const childArgs = ['render', kind]
  if (kind === 'article') {
    if (input) childArgs.push(input)
    if (spec) childArgs.push('--spec-input', spec)
  } else {
    if (input) childArgs.push('--input', input)
    if (spec) childArgs.push('--spec', spec)
  }
  if (stringArg(args, 'context')) childArgs.push('--context', stringArg(args, 'context')!)
  if (stringArg(args, 'theme')) childArgs.push('--theme', stringArg(args, 'theme')!)
  if (stringArg(args, 'parentRunId')) childArgs.push('--review-parent-run-id', stringArg(args, 'parentRunId')!)
  childArgs.push('--output', output, '--review-url', server.url, '--review-run-id', runId)
  const result = await spawnCli(cliPath, childArgs, activeChildren)
  workflowArgs.set(runId, { ...args })
  return { runId, viewerUrl: server.url, result }
}

function spawnCli(cliPath: string, args: string[], activeChildren: Set<ChildProcessWithoutNullStreams>): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    activeChildren.add(child)
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.on('error', error => { activeChildren.delete(child); reject(error) })
    child.on('close', code => {
      activeChildren.delete(child)
      try {
        const parsed = JSON.parse(stdout.trim())
        if (code !== 0) reject(new Error(stderr.trim() || `Miao Viz exited with code ${code}`))
        else resolve(parsed)
      } catch {
        reject(new Error(`Miao Viz workflow returned invalid JSON${stderr ? `: ${stderr.trim()}` : ''}`))
      }
    })
  })
}

function stringArg(args: Record<string, unknown>, name: string): string | undefined {
  return typeof args[name] === 'string' && args[name] ? args[name] as string : undefined
}
