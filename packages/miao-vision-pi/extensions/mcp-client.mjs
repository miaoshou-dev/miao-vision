import { createInterface } from 'node:readline'

export class McpProcessClient {
  constructor(child, options = {}) {
    this.child = child
    this.timeoutMs = options.timeoutMs ?? 30_000
    this.nextId = 1
    this.pending = new Map()
    this.closed = false
    this.stderr = ''
    this.lines = createInterface({ input: child.stdout, crlfDelay: Infinity })
    this.lines.on('line', line => this.handleLine(line))
    child.stderr.on('data', chunk => { this.stderr = `${this.stderr}${String(chunk)}`.slice(-8_000) })
    child.once('error', error => this.failAll(error))
    child.once('exit', (code, signal) => this.failAll(new Error(`Miao Vision MCP exited${signal ? ` from ${signal}` : ` with code ${code ?? 'unknown'}`}${this.stderr.trim() ? `: ${this.stderr.trim()}` : ''}`)))
  }

  get pid() { return this.child.pid }
  get running() { return !this.closed && this.child.exitCode === null }

  request(method, params = {}) {
    if (!this.running) return Promise.reject(new Error('Miao Vision MCP is not running.'))
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id)
        reject(new Error(`Miao Vision MCP request timed out: ${method}`))
      }, this.timeoutMs)
      this.pending.set(id, { resolve, reject, timer })
      this.child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`, error => {
        if (!error) return
        const pending = this.pending.get(id)
        if (!pending) return
        clearTimeout(pending.timer)
        this.pending.delete(id)
        pending.reject(error)
      })
    })
  }

  async initialize() {
    return this.request('initialize', { protocolVersion: '2024-11-05', capabilities: {}, clientInfo: { name: '@miao-vision/pi', version: '0.10.2' } })
  }

  callTool(name, args = {}) {
    return this.request('tools/call', { name, arguments: args })
  }

  async close() {
    if (this.closed) return
    this.closed = true
    this.lines.close()
    this.failAll(new Error('Miao Vision MCP was stopped.'))
    if (this.child.exitCode !== null) return
    this.child.kill('SIGTERM')
    await new Promise(resolve => {
      const timer = setTimeout(() => { if (this.child.exitCode === null) this.child.kill('SIGKILL'); resolve() }, 2_000)
      this.child.once('exit', () => { clearTimeout(timer); resolve() })
    })
  }

  handleLine(line) {
    let message
    try { message = JSON.parse(line) } catch {
      this.failAll(new Error('Miao Vision MCP returned malformed JSON.'))
      return
    }
    const pending = this.pending.get(message.id)
    if (!pending) return
    clearTimeout(pending.timer)
    this.pending.delete(message.id)
    if (message.error) pending.reject(new Error(message.error.message ?? 'Miao Vision MCP request failed.'))
    else pending.resolve(message.result)
  }

  failAll(error) {
    if (this.closed && this.pending.size === 0) return
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer)
      pending.reject(error)
    }
    this.pending.clear()
  }
}
