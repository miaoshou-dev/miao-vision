import { startManagedMcp } from './runtime.mjs'

const objectSchema = (properties, required = []) => ({ type: 'object', properties, ...(required.length ? { required } : {}) })
const toolResult = value => {
  if (value && typeof value === 'object' && Array.isArray(value.content)) return { ...value, details: value.details ?? {} }
  return { content: [{ type: 'text', text: typeof value === 'string' ? value : JSON.stringify(value) }], details: {} }
}

export function createMiaoVisionExtension(start = startManagedMcp) {
  return function miaoVisionPiExtension(pi) {
    let managed
    let starting

    const ensureStarted = async cwd => {
      if (managed?.client.running) return managed
      if (!starting) starting = start(cwd).then(value => (managed = value)).finally(() => { starting = undefined })
      const value = await starting
      if (!value) throw new Error('Miao Vision MCP failed to start.')
      return value
    }
    const stop = async () => {
      const current = managed
      managed = undefined
      if (current) await current.client.close()
    }
    const call = async (name, args, signal, ctx) => {
      const current = await ensureStarted(ctx.cwd)
      const abort = () => { void stop() }
      signal.addEventListener('abort', abort, { once: true })
      try { return toolResult(await current.client.callTool(name, args)) }
      finally { signal.removeEventListener('abort', abort) }
    }

    pi.registerTool({
      name: 'open_miao_vision_viewer', label: 'Open Miao Vision Viewer',
      description: 'Start or reconnect to the local Miao Vision Review Viewer and return its URL.',
      parameters: objectSchema({}),
      execute: async (_id, args, signal, _update, ctx) => call('open_miao_vision_viewer', args, signal, ctx)
    })
    pi.registerTool({
      name: 'run_miao_viz', label: 'Run Miao Vision',
      description: 'Run a report, deck, or article render and publish progress to the local Review Viewer.',
      parameters: objectSchema({
        kind: { type: 'string', enum: ['report', 'deck', 'article'] }, input: { type: 'string' }, spec: { type: 'string' },
        context: { type: 'string' }, output: { type: 'string' }, theme: { type: 'string' }, parentRunId: { type: 'string' }
      }, ['kind', 'output']),
      execute: async (_id, args, signal, _update, ctx) => call('run_miao_viz', args, signal, ctx)
    })
    pi.registerTool({
      name: 'get_miao_vision_revision', label: 'Get Miao Vision Revision',
      description: 'Read a Review Viewer revision request and its confirmed plan.',
      parameters: objectSchema({ revisionId: { type: 'string' } }, ['revisionId']),
      execute: async (_id, args, signal, _update, ctx) => call('get_miao_vision_revision', args, signal, ctx)
    })
    pi.registerTool({
      name: 'apply_miao_vision_revision', label: 'Apply Miao Vision Revision',
      description: 'Apply a confirmed restricted PatchSet and render a child version.',
      parameters: objectSchema({ revisionId: { type: 'string' }, patchSet: objectSchema({ operations: { type: 'array' } }) }, ['revisionId', 'patchSet']),
      execute: async (_id, args, signal, _update, ctx) => call('apply_miao_vision_revision', args, signal, ctx)
    })

    pi.registerCommand('miao-viewer', {
      description: 'Start, inspect, or stop the Miao Vision Review Viewer',
      handler: async (args, ctx) => {
        const action = args.trim().toLowerCase()
        if (action === 'stop') {
          await stop()
          ctx.ui?.notify('Miao Vision Review Viewer stopped.', 'info')
          return
        }
        if (action === 'status') {
          ctx.ui?.notify(managed?.client.running
            ? `Miao Vision Viewer running · PID ${managed.client.pid ?? 'unknown'} · CLI ${managed.cliVersion} · ${managed.url}`
            : 'Miao Vision Review Viewer is stopped.', 'info')
          return
        }
        if (action) {
          ctx.ui?.notify('Usage: /miao-viewer [status|stop]', 'warning')
          return
        }
        const current = await ensureStarted(ctx.cwd)
        ctx.ui?.notify(`Miao Vision Review Viewer: ${current.url}`, 'info')
      }
    })

    pi.on('session_shutdown', stop)
  }
}

export default createMiaoVisionExtension()
