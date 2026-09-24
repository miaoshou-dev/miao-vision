import { mkdtempSync, writeFileSync } from 'node:fs'
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

      const evidence = await fetch(`${server.url}api/runs/run-1/evidence`)
      expect(evidence.status).toBe(200)
      expect(await evidence.json()).toMatchObject({ value: { runId: 'run-1', verified: true, issues: [], items: [{ id: 'sales_total' }] } })

      const changes = await fetch(`${server.url}api/runs/run-1/changes`)
      expect(changes.status).toBe(200)
      expect(await changes.json()).toMatchObject({ value: { runId: 'run-1', comparable: false } })

      expect(await (await fetch(`${server.url}api/runs/run-1/spec-map`)).json()).toMatchObject({ value: { runId: 'run-1', items: [] } })
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
})
