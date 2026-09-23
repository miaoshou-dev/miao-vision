import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { startReviewServer, type ReviewServer } from './review-server'

interface JsonRpcRequest {
  jsonrpc?: string
  id?: string | number | null
  method?: string
  params?: Record<string, unknown>
}

export async function runReviewMcp(): Promise<void> {
  const workflowArgs = new Map<string, Record<string, unknown>>()
  let server: ReviewServer
  server = await startReviewServer({
    retryRun: async runId => {
      const previous = workflowArgs.get(runId)
      if (!previous) throw new Error('Retry metadata is unavailable for this run.')
      return runWorkflow({ ...previous, parentRunId: runId }, server, workflowArgs)
    }
  })
  const input = createInterface({ input: process.stdin, crlfDelay: Infinity })
  const output = (value: unknown) => process.stdout.write(`${JSON.stringify(value)}\n`)
  let closed = false
  const close = async () => {
    if (closed) return
    closed = true
    input.close()
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
      output({ jsonrpc: '2.0', id: request.id, result: await handleRequest(request, server, workflowArgs) })
    } catch (error) {
      output({ jsonrpc: '2.0', id: request.id, error: { code: -32000, message: error instanceof Error ? error.message : 'MCP request failed' } })
    }
  }
  await close()
}

async function handleRequest(request: JsonRpcRequest, server: ReviewServer, workflowArgs: Map<string, Record<string, unknown>>): Promise<unknown> {
  if (request.method === 'initialize') {
    return { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'miao-viz', version: '0.8.2' } }
  }
  if (request.method === 'ping') return {}
  if (request.method === 'tools/list') {
    return { tools: [
      { name: 'open_miao_vision_viewer', description: 'Returns the local Miao Vision Review Viewer URL.', inputSchema: { type: 'object', properties: {} } },
      { name: 'run_miao_viz', description: 'Runs a local Miao Vision report, deck, or article workflow and publishes progress to the Review Viewer.', inputSchema: {
        type: 'object', required: ['kind', 'output'], properties: {
          kind: { type: 'string', enum: ['report', 'deck', 'article'] }, input: { type: 'string' }, spec: { type: 'string' }, context: { type: 'string' }, output: { type: 'string' }, theme: { type: 'string' }, parentRunId: { type: 'string', description: 'Optional earlier Viewer run to associate as the source of this revision.' }
        }
      } }
    ] }
  }
  if (request.method !== 'tools/call') throw new Error(`Unsupported MCP method: ${request.method ?? '(missing)'}`)
  const params = request.params ?? {}
  const name = typeof params.name === 'string' ? params.name : ''
  const args = (params.arguments && typeof params.arguments === 'object' ? params.arguments : {}) as Record<string, unknown>
  if (name === 'open_miao_vision_viewer') {
    return { content: [{ type: 'text', text: `Miao Vision Review Viewer is available at ${server.url}. Open this URL in the embedded browser.` }] }
  }
  if (name === 'run_miao_viz') return { content: [{ type: 'text', text: JSON.stringify(await runWorkflow(args, server, workflowArgs)) }] }
  throw new Error(`Unknown MCP tool: ${name}`)
}

async function runWorkflow(args: Record<string, unknown>, server: ReviewServer, workflowArgs: Map<string, Record<string, unknown>>): Promise<unknown> {
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
  const result = await spawnCli(cliPath, childArgs)
  workflowArgs.set(runId, { ...args })
  return { runId, viewerUrl: server.url, result }
}

function spawnCli(cliPath: string, args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', code => {
      try {
        const parsed = JSON.parse(stdout.trim())
        resolve(parsed)
      } catch {
        reject(new Error(`Miao Viz workflow returned invalid JSON${stderr ? `: ${stderr.trim()}` : ''}`))
      }
      if (code !== 0 && !stdout.trim()) reject(new Error(stderr || `Miao Viz exited with code ${code}`))
    })
  })
}

function stringArg(args: Record<string, unknown>, name: string): string | undefined {
  return typeof args[name] === 'string' && args[name] ? args[name] as string : undefined
}
