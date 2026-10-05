#!/usr/bin/env node
// Exercises the built or packed CLI from an empty consumer directory.
import assert from 'node:assert/strict'
import { spawn, execFileSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { McpProcessClient } from '../packages/miao-vision-pi/extensions/mcp-client.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const cliIndex = process.argv.indexOf('--cli')
const cli = cliIndex >= 0 ? resolve(process.argv[cliIndex + 1]) : join(repo, 'packages/miao-viz-cli/dist/cli.cjs')
const root = mkdtempSync(join(tmpdir(), 'miao-export-smoke-'))
const env = { ...process.env, MIAO_VIZ_PLAYWRIGHT_ROOT: process.env.MIAO_VIZ_PLAYWRIGHT_ROOT || repo }
const invocation = args => /\.[cm]?js$/.test(cli) ? [process.execPath, [cli, ...args]] : [cli, args]
function run(args) {
  const [command, childArgs] = invocation(args)
  return execFileSync(command, childArgs, { cwd: root, env, encoding: 'utf8', timeout: 60_000 })
}
const input = join(root, 'sales.csv'), context = join(root, 'context.json'), profile = join(root, 'profile.json'), spec = join(root, 'report.yaml')
writeFileSync(input, 'month,channel,revenue,orders\n2026-07,线上,120000,600\n2026-07,门店,80000,400\n2026-08,线上,150000,650\n2026-08,门店,90000,450\n2026-09,线上,180000,720\n2026-09,门店,85000,425\n')
run(['data', 'analyze', input, '--intent', '销售收入分析', '--output', context])
writeFileSync(profile, run(['data', 'profile', input]))
run(['spec', 'block', 'instantiate', 'trend-ranking', '--context', context, '--output', spec])
const source = readFileSync(spec, 'utf8') + '\ntitle: 销售分析报告\nlocale: zh-CN\n'
writeFileSync(spec, source)
const validated = JSON.parse(run(['spec', 'validate', '--spec', spec, '--profile', profile, '--context', context, '--verify']))
assert.equal(validated.ok, true, JSON.stringify(validated))
const [command, childArgs] = invocation(['review', 'mcp', '--port', '0', '--artifact-root', root])
const child = spawn(command, childArgs, { cwd: root, env, stdio: ['pipe', 'pipe', 'pipe'] })
const client = new McpProcessClient(child)
try {
  await client.initialize()
  const opened = await client.callTool('open_miao_vision_viewer', {})
  const url = /http:\/\/127\.0\.0\.1:\d+\//.exec(opened.content[0].text)?.[0]
  assert.ok(url)
  const reply = await client.callTool('run_miao_viz', { kind: 'report', input, context, spec, output: join(root, 'report.html') })
  const { runId } = JSON.parse(reply.content[0].text)
  for (const format of ['png', 'pdf']) {
    const response = await fetch(`${url}api/runs/${runId}/export/${format}`)
    assert.equal(response.ok, true, response.ok ? '' : await response.text())
    const data = Buffer.from(await response.arrayBuffer())
    assert.ok(data.length > 1000)
    assert.equal(format === 'png' ? data.subarray(0, 8).toString('hex') : data.subarray(0, 5).toString(), format === 'png' ? '89504e470d0a1a0a' : '%PDF-')
    writeFileSync(join(root, `report.${format}`), data)
  }
  const elsewhere = join(root, 'another-directory'); mkdirSync(elsewhere)
  const [command, args] = invocation(['diagnose', '--host', 'pi', '--pdf'])
  const check = JSON.parse(execFileSync(command, args, { cwd: elsewhere, env, encoding: 'utf8' }))
  assert.equal(check.ok, true)
  console.log(JSON.stringify({ ok: true, cli, root, runId, formats: ['png', 'pdf'], verified: true }))
} finally { await client.close() }
