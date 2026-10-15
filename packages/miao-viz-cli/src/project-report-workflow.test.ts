import { execFileSync, spawnSync } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { beforeAll, describe, it, expect } from 'vitest'
const cli = join(mkdtempSync(join(tmpdir(), 'project-cli-')), 'cli.cjs')
beforeAll(() => execFileSync('node_modules/esbuild/bin/esbuild', ['packages/miao-viz-cli/src/cli.ts', '--bundle', '--platform=node', '--format=cjs', '--target=node20', `--outfile=${cli}`, '--log-level=warning']))
function run(args: string[]) {
  const result = spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' })
  if (!result.stdout.trim()) throw new Error(result.stderr)
  return JSON.parse(result.stdout)
}
const config = 'test_data/project_reports/config.json'
const dates = (second = false) => ['--period-start', second ? '2026-10-08' : '2026-10-01', '--period-end', second ? '2026-10-14' : '2026-10-07']
function setup(name: string) {
  const dir = mkdtempSync(join(tmpdir(), 'project-workflow-')), root = join(dir, 'report'), input = `test_data/project_reports/${name}-1.csv`, ctx = join(dir, 'context.json'), spec = join(dir, 'report.yaml'), profile = join(dir, 'profile.json')
  expect(run(['data', 'analyze', input, '--project-config', config, ...dates(), '--output', ctx])).toMatchObject({ ok: true })
  expect(run(['spec', 'block', 'instantiate', 'project-status', '--context', ctx, '--output', spec])).toMatchObject({ ok: true })
  writeFileSync(profile, JSON.stringify(run(['data', 'profile', input])))
  expect(run(['spec', 'validate', '--spec', spec, '--profile', profile, '--context', ctx, '--verify'])).toMatchObject({ ok: true })
  return { dir, root, input, ctx, spec }
}
describe('project report CLI workflow', () => {
  it.each(['normal', 'blocked', 'changed'])('runs two-period %s reports through evidence validation and rendering', name => {
    const s = setup(name)
    const html = join(s.dir, 'one-off.html')
    expect(run(['render', 'report', '--input', s.input, '--spec', s.spec, '--context', s.ctx, '--output', html])).toMatchObject({ ok: true })
    expect(readFileSync(html, 'utf8')).toContain('project-gantt')
    const init = ['report', 'init', s.root, '--input', s.input, '--spec', s.spec, '--context', s.ctx, '--project-config', config, '--period', 'W1', ...dates()]
    expect(run([...init, '--dry-run'])).toMatchObject({ ok: true })
    expect(existsSync(s.root)).toBe(false)
    expect(run(init)).toMatchObject({ ok: true, value: { status: 'ready' } })
    const update = ['report', 'update', s.root, '--input', `test_data/project_reports/${name}-2.csv`, '--period', 'W2', ...dates(true)]
    const result = run(update)
    expect(result).toMatchObject({ ok: true, value: { status: name === 'changed' ? 'needs_review' : 'ready' } })
    const brief = JSON.parse(readFileSync(result.value.artifacts.projectBrief, 'utf8'))
    expect(brief.baselineRunId).toBe('W1')
    expect(readFileSync(result.value.artifacts.html, 'utf8')).toContain('gantt-baseline')
    expect(run(update)).toMatchObject({ ok: false, code: 'REPORT_RUN_ALREADY_EXISTS' })
    expect(run(['report', 'info', s.root])).toMatchObject({ ok: true })
    expect(run(['report', 'history', s.root]).value).toHaveLength(2)
    expect(run(['report', 'update', s.root, '--input', s.input, '--period', 'W1-r2', ...dates()])).toMatchObject({ code: 'PROJECT_PERIOD_ALREADY_EXISTS' })
    expect(run(['report', 'update', s.root, '--input', s.input, '--period', 'W1-r2', ...dates(), '--replaces-run', 'W1'])).toMatchObject({ ok: true })
    expect(JSON.parse(readFileSync(join(s.root, 'latest.json'), 'utf8')).runId).toBe('W2')
    expect(existsSync(join(s.root, 'runs', 'W1', 'report.html'))).toBe(true)
    if (name === 'normal') {
      const oldInput = join(s.dir, 'historical.csv')
      writeFileSync(oldInput, readFileSync(s.input, 'utf8').replaceAll('2026-10-02', '2026-09-24').replaceAll('2026-09-28', '2026-09-20'))
      expect(run(['report', 'update', s.root, '--input', oldInput, '--period', 'historical', '--period-start', '2026-09-19', '--period-end', '2026-09-25'])).toMatchObject({ ok: true })
      expect(JSON.parse(readFileSync(join(s.root, 'latest.json'), 'utf8')).runId).toBe('W2')
      expect(run(['report', 'update', s.root, '--input', 'test_data/project_reports/normal-2.csv', '--period', 'W2-r2', ...dates(true), '--replaces-run', 'W2'])).toMatchObject({ ok: true })
      expect(run(['report', 'update', s.root, '--input', 'test_data/project_reports/normal-2.csv', '--period', 'W2-branch', ...dates(true), '--replaces-run', 'W2'])).toMatchObject({ code: 'PROJECT_REVISION_INVALID' })
      const next = ['report', 'update', s.root, '--input', 'test_data/project_reports/normal-2.csv', '--period', 'W3', '--period-start', '2026-10-15', '--period-end', '2026-10-21']
      const snapPath = join(s.root, 'runs', 'W2-r2', 'project-snapshot.json'), snap = readFileSync(snapPath, 'utf8')
      writeFileSync(snapPath, snap.replace('视觉设计', '篡改标题'))
      expect(run(next)).toMatchObject({ code: 'REPORT_PROJECT_INVALID' })
      writeFileSync(snapPath, snap)
      expect(run(next)).toMatchObject({ ok: true, value: { projectBrief: { baselineRunId: 'W2-r2' } } })
    }
    const saved = JSON.parse(readFileSync(join(s.root, 'project-config.json'), 'utf8'))
    saved.name = 'Silently changed'
    writeFileSync(join(s.root, 'project-config.json'), JSON.stringify(saved))
    expect(run(['report', 'update', s.root, '--input', s.input, '--period', 'W3', ...dates(true)])).toMatchObject({ code: 'REPORT_PROJECT_INVALID' })
  }, 90_000)
})
