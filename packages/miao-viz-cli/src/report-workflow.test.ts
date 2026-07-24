import { execFileSync, spawnSync } from 'node:child_process'
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
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

  it('initializes, updates, inspects, and safely cleans a recurring report project', () => {
    const dir = mkdtempSync(join(tmpdir(), 'miao-recurring-workflow-'))
    const contextPath = join(dir, 'context.json')
    const specPath = join(dir, 'report.yaml')
    const project = join(dir, 'sales-weekly')
    expect(runCli(['data', 'analyze', fixture, '--intent', 'sales performance', '--output', contextPath])).toMatchObject({ ok: true })
    expect(runCli(['spec', 'block', 'instantiate', 'trend-ranking', '--context', contextPath, '--output', specPath])).toMatchObject({ ok: true })
    expect(runCli(['report', 'init', project, '--input', fixture, '--spec', specPath, '--context', contextPath, '--period', '2026-W28', '--dry-run']))
      .toMatchObject({ ok: true, value: { dryRun: true } })
    expect(existsSync(project)).toBe(false)
    expect(runCli(['report', 'init', project, '--input', fixture, '--spec', specPath, '--context', contextPath, '--period', '2026-W28']))
      .toMatchObject({ ok: true, value: { status: 'ready' } })
    expect(runCli(['report', 'update', project, '--input', fixture, '--period', '2026-W29']))
      .toMatchObject({ ok: true, value: { status: 'ready' } })
    const history = runCli(['report', 'history', project]) as { value: Array<{ specHash: string; evidencePlanHash: string }> }
    expect(history.value).toHaveLength(2)
    expect(new Set(history.value.map(run => run.specHash)).size).toBe(1)
    expect(new Set(history.value.map(run => run.evidencePlanHash)).size).toBe(1)
    expect(runCli(['report', 'info', project])).toMatchObject({ ok: true, value: { evidenceCount: 3 } })
    expect(runCli(['report', 'clean', project, '--keep', '1'])).toMatchObject({ ok: true, value: { dryRun: true } })
    expect(existsSync(join(project, 'runs', '2026-W28'))).toBe(true)
  })
})
