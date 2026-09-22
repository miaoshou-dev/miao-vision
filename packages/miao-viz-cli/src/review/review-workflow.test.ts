import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { startReviewServer, type ReviewServer } from './review-server'

const fixture = 'test_data/report_workflow_sales.csv'
const cliPath = join(mkdtempSync(join(tmpdir(), 'miao-review-cli-')), 'cli.cjs')
let server: ReviewServer

beforeAll(async () => {
  execFileSync('node_modules/esbuild/bin/esbuild', [
    'packages/miao-viz-cli/src/cli.ts', '--bundle', '--platform=node', '--format=cjs',
    '--target=node20', `--outfile=${cliPath}`, '--log-level=warning'
  ])
  server = await startReviewServer({ artifactRoot: tmpdir() })
})

afterAll(async () => { await server.close() })

function runCliAsync(args: string[]): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cliPath, ...args], { stdio: ['ignore', 'pipe', 'pipe'] })
    let stdout = ''
    let stderr = ''
    child.stdout.on('data', chunk => { stdout += String(chunk) })
    child.stderr.on('data', chunk => { stderr += String(chunk) })
    child.on('error', reject)
    child.on('close', code => {
      try {
        const output = JSON.parse(stdout.trim())
        resolve(output)
      } catch {
        reject(new Error(stderr || `miao-viz exited with ${code}`))
      }
    })
  })
}

describe('review workflow smoke', () => {
  it('publishes a complete report timeline and a previewable artifact', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-review-workflow-'))
    const contextPath = join(dir, 'context.json')
    const profilePath = join(dir, 'profile.json')
    const specPath = join(dir, 'report.yaml')
    const htmlPath = join(dir, 'report.html')
    const runId = 'workflow-smoke'
    const reviewArgs = ['--review-url', server.url, '--review-run-id', runId]

    await expect(runCliAsync(['data', 'analyze', fixture, '--intent', 'sales performance', '--output', contextPath, ...reviewArgs])).resolves.toMatchObject({ ok: true })
    writeFileSync(profilePath, JSON.stringify(await runCliAsync(['data', 'profile', fixture, ...reviewArgs])))
    await expect(runCliAsync(['spec', 'block', 'instantiate', 'trend-ranking', '--context', contextPath, '--output', specPath, ...reviewArgs])).resolves.toMatchObject({ ok: true })
    await expect(runCliAsync(['spec', 'validate', '--spec', specPath, '--profile', profilePath, '--context', contextPath, '--verify', ...reviewArgs])).resolves.toMatchObject({ ok: true })
    await expect(runCliAsync([
      'render', 'report', '--input', fixture, '--spec', specPath, '--context', contextPath, '--output', htmlPath,
      ...reviewArgs
    ])).resolves.toMatchObject({ ok: true })

    const run = server.store.get(runId)
    expect(run).toMatchObject({ status: 'warning', artifact: { primaryPath: htmlPath, kind: 'report' } })
    expect(run?.events.filter(event => event.type === 'run.stage').map(event => event.stage)).toEqual([
      'input_resolved', 'analyzed', 'profiled', 'spec_instantiated', 'validated', 'rendered', 'delivery_verified'
    ])
    expect(new Set(run?.events.map(event => event.sequence)).size).toBe(run?.events.length)
    expect(run?.artifact).toMatchObject({
      delivery: { format: 'html', hasPreview: true },
      dataQuality: { rows: 45, columnCount: 6 },
      evidence: { missingCount: expect.any(Number) },
      fingerprints: {
        specHash: expect.stringMatching(/^[a-f0-9]{64}$/),
        dataFingerprint: expect.stringMatching(/^[a-f0-9]{64}$/)
      },
      composition: {
        charts: expect.any(Array), insights: expect.any(Array), evidence: expect.any(Array)
      },
      evidenceItems: expect.arrayContaining([expect.objectContaining({ id: expect.any(String), query: expect.any(String) })])
    })
    const history = server.store.history().find(item => item.runId === runId)
    expect(history?.artifact).toMatchObject({
      specHash: run?.artifact?.fingerprints?.specHash,
      dataFingerprint: run?.artifact?.fingerprints?.dataFingerprint
    })
  }, 30_000)
})
