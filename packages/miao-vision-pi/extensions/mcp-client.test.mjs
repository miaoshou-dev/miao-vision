import test from 'node:test'
import assert from 'node:assert/strict'
import { EventEmitter } from 'node:events'
import { PassThrough, Writable } from 'node:stream'
import { McpProcessClient } from './mcp-client.mjs'

function fakeChild() {
  const child = new EventEmitter()
  child.stdout = new PassThrough()
  child.stderr = new PassThrough()
  child.exitCode = null
  child.pid = 1234
  child.requests = []
  child.stdin = new Writable({
    write(chunk, _encoding, callback) {
      child.requests.push(JSON.parse(String(chunk)))
      callback()
    }
  })
  child.kill = signal => {
    child.exitCode = 0
    queueMicrotask(() => child.emit('exit', 0, signal === 'SIGTERM' ? null : signal))
    return true
  }
  return child
}

test('matches concurrent JSON-RPC responses by id', async () => {
  const child = fakeChild()
  const client = new McpProcessClient(child, { timeoutMs: 1_000 })
  const first = client.request('first')
  const second = client.request('second')
  child.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: 2, result: 'two' })}\n`)
  child.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, result: 'one' })}\n`)
  assert.deepEqual(await Promise.all([first, second]), ['one', 'two'])
  await client.close()
})

test('rejects MCP errors and malformed JSON', async () => {
  const child = fakeChild()
  const client = new McpProcessClient(child, { timeoutMs: 1_000 })
  const failed = client.request('failure')
  child.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id: 1, error: { message: 'nope' } })}\n`)
  await assert.rejects(failed, /nope/)
  const malformed = client.request('malformed')
  child.stdout.write('not-json\n')
  await assert.rejects(malformed, /malformed JSON/)
  await client.close()
})

test('rejects pending calls when the process exits', async () => {
  const child = fakeChild()
  const client = new McpProcessClient(child, { timeoutMs: 1_000 })
  const pending = client.request('pending')
  child.exitCode = 1
  child.emit('exit', 1, null)
  await assert.rejects(pending, /exited with code 1/)
})
