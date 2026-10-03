import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEFAULT_REVIEW_PORT, startReviewServer } from './review-server'
import { stageEvent } from './review-store'
import { reviewViewerHtml } from './review-ui'

describe('review server', () => {
  it('uses a stable default for CLI and MCP and reports port conflicts', async () => {
    expect(DEFAULT_REVIEW_PORT).toBe(43179)
    const first = await startReviewServer({ port: 0 })
    try {
      await expect(startReviewServer({ port: first.port })).rejects.toThrow(`Review Viewer port ${first.port} is already in use`)
    } finally { await first.close() }
  })
  it('serves a syntactically valid version and revision interface', () => {
    const script = reviewViewerHtml().split('<script>')[1].split('</script>')[0]
    expect(() => new Function(script)).not.toThrow()
    expect(reviewViewerHtml()).toContain('id="languageToggle"')
    expect(reviewViewerHtml()).toContain('id="quickGuide"')
    expect(reviewViewerHtml()).toContain('id="guideToggle"')
    expect(reviewViewerHtml()).toContain('id="exportToggle"')
    expect(script).toContain("localStorage.setItem('miao-review-language'")
    expect(script).toContain("mainFeatures:'Main features'")
    expect(script).toContain("guideTitle:'From review to revision'")
    expect(script).toContain("guideExportTitle:'Export a version'")
  })
  it('saves a report title directly to Spec and HTML and rejects stale writes', async () => {
    const root = mkdtempSync(join(tmpdir(), 'miao-title-'))
    const spec = join(root, 'spec.yaml'), html = join(root, 'report.html')
    writeFileSync(spec, '# keep comment\ntitle: Sales\ncharts: []\n')
    writeFileSync(html, '<title>Sales</title><h1>Sales</h1><p>Sales</p>')
    const server = await startReviewServer({ artifactRoot: root })
    try {
      server.store.create({ runId: 'title-test', kind: 'report', title: 'Sales' })
      server.store.publish({ type: 'artifact.updated', runId: 'title-test', sequence: 0, timestamp: new Date().toISOString(), kind: 'report', primaryPath: html, verified: true, deliveryStatus: 'ready', composition: { sourceSpecPath: spec, title: { id: 'title', path: 'title', title: 'Sales' }, charts: [], insights: [], evidence: [] } })
      let specHash = createHash('sha256').update(readFileSync(spec)).digest('hex')
      const save = (title: string, expectedTitle: string) => fetch(server.url + 'api/runs/title-test/title', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ title, expectedTitle, expectedSpecHash: specHash }) })
      expect((await save('销售 <新版>', 'Sales')).status).toBe(200)
      expect(readFileSync(spec, 'utf8')).toContain('title: 销售 <新版>')
      expect(readFileSync(spec, 'utf8')).toContain('# keep comment')
      expect(readFileSync(html, 'utf8')).toContain('<h1>销售 &lt;新版&gt;</h1><p>Sales</p>')
      expect(server.store.get('title-test')?.artifact?.composition?.title?.title).toBe('销售 <新版>')
      specHash = createHash('sha256').update(readFileSync(spec)).digest('hex')
      expect((await save('stale', 'Sales')).status).toBe(409)
      writeFileSync(spec, 'title: 销售 <新版>\ncharts: []\ntheme: magazine\n')
      expect((await save('overwrite other changes', '销售 <新版>')).status).toBe(409)
      expect(readFileSync(spec, 'utf8')).toContain('theme: magazine')
      writeFileSync(spec, 'title: External edit\ncharts: []\n')
      expect((await save('overwrite', '销售 <新版>')).status).toBe(409)
      expect(readFileSync(spec, 'utf8')).toContain('External edit')
    } finally { await server.close() }
  })
  it('serves health, run snapshots, and protects artifact paths', async () => {
    const root = mkdtempSync(join(tmpdir(), 'miao-review-'))
    const artifact = join(root, 'report.html')
    writeFileSync(artifact, '<h1>Report</h1>')
    let retried = ''
    const server = await startReviewServer({ artifactRoot: root, retryRun: async runId => { retried = runId; return { runId: 'run-retry' } } })
    try {
      const health = await fetch(`${server.url}api/health`)
      expect(health.status).toBe(200)
      expect(await health.json()).toEqual({ ok: true })

      server.store.create({ runId: 'run-1', kind: 'report', title: 'Sales' })
      server.store.publish(stageEvent('run-1', 0, 'rendered', 'completed'))
      server.store.publish({
        type: 'artifact.updated',
        runId: 'run-1',
        sequence: 1,
        timestamp: new Date().toISOString(),
        kind: 'report',
        primaryPath: artifact,
        verified: true,
        deliveryStatus: 'ready',
        evidenceItems: [{ id: 'sales_total', query: 'Sum sales by period', caveat: 'Partial period' }]
      })
      const snapshot = await fetch(`${server.url}api/runs/run-1`)
      expect(snapshot.status).toBe(200)
      expect((await snapshot.json()).value.status).toBe('running')

      const viewer = await fetch(`${server.url}`)
      expect(viewer.status).toBe(200)
      const viewerHtml = await viewer.text()
      expect(viewerHtml).toContain('版本比较')
      expect(viewerHtml).toContain('局部修改')
      expect(viewerHtml).toContain('versionList')
      expect(viewerHtml).toContain('copyPrompt')
      expect(viewerHtml).toContain('data-intent="conclusion"')

      const namedArtifact = await fetch(`${server.url}artifacts/run-1/primary`)
      expect(namedArtifact.status).toBe(200)
      expect(await namedArtifact.text()).toContain('Report')

      expect(await (await fetch(`${server.url}api/runs/run-1/export`)).json()).toMatchObject({ value: { kind: 'report', formats: ['pdf', 'png'] } })
      expect(await (await fetch(`${server.url}api/runs/run-1/export/pptx`)).json()).toMatchObject({ code: 'EXPORT_UNAVAILABLE' })
      expect(await (await fetch(`${server.url}api/runs/run-1/themes`)).json()).toMatchObject({
        value: { targetPath: 'theme', themes: expect.arrayContaining([expect.objectContaining({ id: 'magazine' }), expect.objectContaining({ id: 'tableau' })]) }
      })

      server.store.publish({ type: 'artifact.updated', runId: 'run-1', sequence: 2, timestamp: new Date().toISOString(), kind: 'report', primaryPath: artifact, verified: true, deliveryStatus: 'ready', evidenceItems: [{ id: 'sales_total', query: 'Sum sales by period', caveat: 'Partial period' }], composition: { sourceSpecPath: join(root, 'report.yaml'), title: { id: 'title', path: 'title', title: 'Sales' }, charts: [{ id: 'sales', type: 'bar', hash: 'a'.repeat(64), path: 'charts[0]', evidenceIds: ['sales_total'] }], insights: [], evidence: [] } })
      const revision = await fetch(`${server.url}api/runs/run-1/revisions`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ instruction: 'Use magazine and improve the chart', targets: [{ id: 'sales', kind: 'chart', path: 'charts[0]' }], theme: { id: 'magazine', path: 'theme' } }) })
      expect(revision.status).toBe(201)
      const revisionBody = await revision.json() as { value: { request: { revisionId: string, evidenceIds: string[] }, plan: { status: string, changes: string[] } } }
      expect(revisionBody.value).toMatchObject({ request: { evidenceIds: ['sales_total'] }, plan: { status: 'draft', changes: expect.any(Array) } })
      const revisionId = revisionBody.value.request.revisionId
      expect(await (await fetch(`${server.url}api/revisions/${revisionId}/apply`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operations: [{ op: 'replace', path: 'theme', value: 'magazine' }] }) })).json()).toMatchObject({ code: 'REVISION_NOT_CONFIRMED' })
      const confirmed = await fetch(`${server.url}api/revisions/${revisionId}/confirm`, { method: 'POST' })
      expect(await confirmed.json()).toMatchObject({ value: { plan: { status: 'confirmed' } } })
      expect(await (await fetch(`${server.url}api/revisions/${revisionId}/apply`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ operations: [{ op: 'replace', path: 'evidence', value: 'bad' }] }) })).json()).toMatchObject({ code: 'INVALID_PATCH_SET' })

      const evidence = await fetch(`${server.url}api/runs/run-1/evidence`)
      expect(evidence.status).toBe(200)
      expect(await evidence.json()).toMatchObject({ value: { runId: 'run-1', verified: true, issues: [], items: [{ id: 'sales_total' }] } })

      const changes = await fetch(`${server.url}api/runs/run-1/changes`)
      expect(changes.status).toBe(200)
      expect(await changes.json()).toMatchObject({ value: { runId: 'run-1', comparable: false } })

      expect(await (await fetch(`${server.url}api/runs/run-1/spec-map`)).json()).toMatchObject({ value: { runId: 'run-1', items: expect.arrayContaining([expect.objectContaining({ kind: 'title' }), expect.objectContaining({ kind: 'chart', id: 'sales' })]) } })
      expect(await (await fetch(`${server.url}api/runs/run-1/revision-actions`)).json()).toMatchObject({ value: { actions: expect.any(Array) } })
      expect(await (await fetch(`${server.url}api/runs/run-1/visual-diff`)).json()).toMatchObject({ value: { comparable: false } })
      expect(await (await fetch(`${server.url}api/compare?before=run-1&after=run-1`)).json()).toMatchObject({ value: { beforeRunId: 'run-1', afterRunId: 'run-1' } })
      expect(await (await fetch(`${server.url}api/batch`)).json()).toMatchObject({ value: { counts: { total: 1 } } })

      const retry = await fetch(`${server.url}api/runs/run-1/retry`, { method: 'POST' })
      expect(retry.status).toBe(202)
      expect(await retry.json()).toMatchObject({ value: { runId: 'run-retry' } })
      expect(retried).toBe('run-1')

      server.store.create({ runId: 'run-2', parentRunId: 'run-1', kind: 'report', title: 'Sales revision' })
      server.store.publish({ type: 'run.completed', runId: 'run-2', sequence: 0, timestamp: new Date().toISOString(), status: 'ready' })
      const history = await fetch(`${server.url}api/runs/history`)
      expect(history.status).toBe(200)
      const historyBody = await history.json() as { value: unknown[] }
      expect(historyBody.value[0]).toMatchObject({ runId: 'run-2', parentRunId: 'run-1', status: 'ready', durationMs: expect.any(Number) })

      const served = await fetch(`${server.url}artifacts/report.html`)
      expect(served.status).toBe(200)
      expect(await served.text()).toContain('Report')

      const forbidden = await fetch(`${server.url}artifacts/../package.json`)
      expect([403, 404]).toContain(forbidden.status)
    } finally {
      await server.close()
    }
  })

  it('restores version history after the local viewer restarts', async () => {
    const root = mkdtempSync(join(tmpdir(), 'miao-review-persist-'))
    const artifact = join(root, 'report.html')
    writeFileSync(artifact, '<h1>Version one</h1>')
    const first = await startReviewServer({ artifactRoot: root })
    first.store.create({ runId: 'persist-parent', kind: 'report', title: 'Report' })
    first.store.publish({ type: 'artifact.updated', runId: 'persist-parent', sequence: 0, timestamp: new Date().toISOString(), kind: 'report', primaryPath: artifact, verified: true, deliveryStatus: 'ready' })
    first.store.create({ runId: 'persist-child', parentRunId: 'persist-parent', kind: 'report', title: 'Report revision' })
    await first.close()
    const restarted = await startReviewServer({ artifactRoot: root })
    try {
      expect(restarted.store.history()).toMatchObject([{ runId: 'persist-child', parentRunId: 'persist-parent' }, { runId: 'persist-parent' }])
      const result = await fetch(`${restarted.url}api/compare?before=persist-parent&after=persist-child`)
      expect(result.status).toBe(200)
      expect(await result.json()).toMatchObject({ value: { beforeRunId: 'persist-parent', afterRunId: 'persist-child' } })
    } finally { await restarted.close() }
  })

  it('returns poster themes from the registered poster theme catalog', async () => {
    const root = mkdtempSync(join(tmpdir(), 'miao-review-poster-theme-'))
    const artifact = join(root, 'poster.html')
    writeFileSync(artifact, '<main class="mv-poster">Poster</main>')
    const server = await startReviewServer({ artifactRoot: root })
    try {
      server.store.create({ runId: 'poster-1', kind: 'report', title: 'Poster' })
      server.store.publish({ type: 'artifact.updated', runId: 'poster-1', sequence: 0, timestamp: new Date().toISOString(), kind: 'report', primaryPath: artifact, verified: true, deliveryStatus: 'ready' })
      expect(await (await fetch(`${server.url}api/runs/poster-1/themes`)).json()).toMatchObject({
        value: { targetPath: 'poster.theme', themes: expect.arrayContaining([expect.objectContaining({ id: 'editorial-light' }), expect.objectContaining({ id: 'newsroom-bold' })]) }
      })
    } finally { await server.close() }
  })
})
