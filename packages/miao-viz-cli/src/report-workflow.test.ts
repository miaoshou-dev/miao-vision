import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { beforeAll, describe, expect, it } from 'vitest'

const fixture = 'test_data/report_workflow_sales.csv'
const cliPath = join(mkdtempSync(join(tmpdir(), 'miao-report-cli-')), 'cli.cjs')

beforeAll(() => {
  execFileSync('node_modules/esbuild/bin/esbuild', [
    'packages/miao-viz-cli/src/cli.ts',
    '--bundle',
    '--platform=node',
    '--format=cjs',
    '--target=node20',
    `--outfile=${cliPath}`,
    '--log-level=warning'
  ])
})

function runCli(args: string[]): unknown {
  const result = spawnSync(process.execPath, [cliPath, ...args], { encoding: 'utf8' })
  const out = result.stdout.trim()
  if (!out) throw new Error(result.stderr || `miao-viz exited with ${result.status}`)
  return JSON.parse(out)
}

describe('report workflow smoke', () => {
  it('runs analyze, profile, instantiate, validate --verify, and render report', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-report-workflow-'))
    const contextPath = join(dir, 'context.json')
    const profilePath = join(dir, 'profile.json')
    const specPath = join(dir, 'report.yaml')
    const htmlPath = join(dir, 'report.html')

    expect(runCli(['data', 'analyze', fixture, '--intent', 'sales performance', '--output', contextPath])).toMatchObject({ ok: true })
    writeFileSync(profilePath, JSON.stringify(runCli(['data', 'profile', fixture]), null, 2))
    expect(runCli(['spec', 'block', 'instantiate', 'trend-ranking', '--context', contextPath, '--output', specPath])).toMatchObject({ ok: true })
    expect(runCli(['spec', 'validate', '--spec', specPath, '--profile', profilePath, '--context', contextPath, '--verify'])).toMatchObject({ ok: true })
    expect(runCli(['render', 'report', '--input', fixture, '--spec', specPath, '--context', contextPath, '--output', htmlPath])).toMatchObject({ ok: true })

    const html = readFileSync(htmlPath, 'utf8')
    expect(html).toContain('<svg')
    expect(html).toContain('insight')
    expect(html).not.toContain('$evidence:')
    expect(html).not.toContain('[?')
  })

  it('fails blocked chart specs under --strict with structured details', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-report-strict-'))
    const contextPath = join(dir, 'context.json')
    const profilePath = join(dir, 'profile.json')
    const specPath = join(dir, 'blocked.json')
    expect(runCli(['data', 'analyze', fixture, '--intent', 'sales by sku', '--output', contextPath])).toMatchObject({ ok: true })
    writeFileSync(profilePath, JSON.stringify(runCli(['data', 'profile', fixture]), null, 2))
    const context = JSON.parse(readFileSync(contextPath, 'utf8'))
    context.value.catalog.blockedCharts.push({ type: 'bar', reason: 'TEST_BLOCKED_CHART: forced strict-path coverage' })
    writeFileSync(contextPath, JSON.stringify(context, null, 2))
    writeFileSync(specPath, JSON.stringify({
      charts: [{
        id: 'too-many-skus',
        type: 'bar',
        encoding: {
          x: { field: 'sku', type: 'nominal' },
          y: { field: 'sales', type: 'quantitative' }
        }
      }]
    }, null, 2))

    const result = runCli(['spec', 'validate', '--spec', specPath, '--profile', profilePath, '--context', contextPath, '--verify', '--strict'])
    expect(result).toMatchObject({ ok: false })
    expect(JSON.stringify(result)).toContain('BLOCKED_CHART_STRICT')
  })
})
