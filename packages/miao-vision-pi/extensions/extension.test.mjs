import assert from 'node:assert/strict'
import test from 'node:test'
import { createMiaoVisionExtension } from './extension.mjs'

function harness(start) {
  const tools = new Map()
  const commands = new Map()
  const events = new Map()
  const notices = []
  const pi = {
    registerTool(tool) { tools.set(tool.name, tool) },
    registerCommand(name, command) { commands.set(name, command) },
    on(name, handler) { events.set(name, handler) }
  }
  createMiaoVisionExtension(start)(pi)
  const ctx = { cwd: '/tmp/project', ui: { notify: (message, level) => notices.push({ message, level }) } }
  return { tools, command: commands.get('miao-viewer'), shutdown: events.get('session_shutdown'), notices, ctx }
}

function managed(id = 1) {
  const calls = []
  const client = {
    running: true,
    pid: 1000 + id,
    closeCount: 0,
    async close() { this.running = false; this.closeCount += 1 },
    async callTool(name, args) {
      calls.push({ name, args })
      return { content: [{ type: 'text', text: `${name}:${id}` }] }
    }
  }
  return { client, calls, url: `http://127.0.0.1:${5000 + id}/`, cliVersion: '0.9.3' }
}

test('lazily starts once and reuses one MCP for concurrent tool calls', async () => {
  const process = managed()
  let starts = 0
  const app = harness(async cwd => { starts += 1; assert.equal(cwd, '/tmp/project'); await Promise.resolve(); return process })
  const signal = new AbortController().signal
  const tool = app.tools.get('open_miao_vision_viewer')
  const [left, right] = await Promise.all([
    tool.execute('1', {}, signal, undefined, app.ctx),
    tool.execute('2', {}, signal, undefined, app.ctx)
  ])
  assert.equal(starts, 1)
  assert.equal(process.calls.length, 2)
  assert.equal(left.content[0].text, 'open_miao_vision_viewer:1')
  assert.equal(right.content[0].text, 'open_miao_vision_viewer:1')
})

test('status, stop, and restart only manage extension-owned processes', async () => {
  const processes = [managed(1), managed(2)]
  let starts = 0
  const app = harness(async () => processes[starts++])
  await app.command.handler('', app.ctx)
  await app.command.handler('status', app.ctx)
  await app.command.handler('stop', app.ctx)
  await app.command.handler('', app.ctx)
  assert.equal(starts, 2)
  assert.equal(processes[0].client.closeCount, 1)
  assert.equal(processes[1].client.closeCount, 0)
  assert.equal(app.notices[1].message,
    `Miao Vision Viewer running · PID ${processes[0].client.pid} · CLI ${processes[0].cliVersion} · ${processes[0].url}`)
})

test('session shutdown closes the managed MCP and is idempotent', async () => {
  const process = managed()
  const app = harness(async () => process)
  await app.command.handler('', app.ctx)
  await app.shutdown()
  await app.shutdown()
  assert.equal(process.client.closeCount, 1)
})

test('startup errors remain actionable and do not disable registered tools', async () => {
  const startupError = new Error('Recommended CLI 0.9.3 is required.')
  const app = harness(async () => { throw startupError })
  await assert.rejects(app.command.handler('', app.ctx), error => error === startupError)
  assert.equal(app.tools.size, 4)
  assert.equal(app.notices.length, 0)
})

test('export setup requires confirmation and does not start the Viewer', async () => {
  let setups = 0, starts = 0
  const commands = new Map()
  createMiaoVisionExtension(async () => { starts++; return managed() }, async () => { setups++; return { version: '1.57.0', root: '/shared' } })({
    registerTool() {}, registerCommand(name, command) { commands.set(name, command) }, on() {}
  })
  const ctx = { cwd: '/tmp', ui: { confirm: async () => false, notify() {} } }
  await commands.get('miao-viewer').handler('setup', ctx)
  assert.equal(setups, 0)
  ctx.ui.confirm = async () => true
  await commands.get('miao-viewer').handler('setup', ctx)
  assert.equal(setups, 1)
  assert.equal(starts, 0)
})
