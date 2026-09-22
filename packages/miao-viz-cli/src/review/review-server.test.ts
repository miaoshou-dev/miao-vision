import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { startReviewServer } from './review-server'
import { stageEvent } from './review-store'

describe('review server', () => {
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
      expect(viewerHtml).toContain('Recent runs')
      expect(viewerHtml).toContain('Generation timeline')
      expect(viewerHtml).toContain('dataQualitySummary')
      expect(viewerHtml).toContain('history-line')
      expect(viewerHtml).toContain('previewMode')
      expect(viewerHtml).toContain('retryRun')
      expect(viewerHtml).toContain('changeSummary')
      expect(viewerHtml).toContain('evidenceDetails')
      expect(viewerHtml).toContain('Artifact to Spec')
      expect(viewerHtml).toContain('Agent revision')
      expect(viewerHtml).toContain('Batch overview')
      expect(viewerHtml).toContain('</script><script>')

      const namedArtifact = await fetch(`${server.url}artifacts/run-1/primary`)
      expect(namedArtifact.status).toBe(200)
      expect(await namedArtifact.text()).toContain('Report')

      const evidence = await fetch(`${server.url}api/runs/run-1/evidence`)
      expect(evidence.status).toBe(200)
      expect(await evidence.json()).toMatchObject({ value: { runId: 'run-1', verified: true, issues: [], items: [{ id: 'sales_total' }] } })

      const changes = await fetch(`${server.url}api/runs/run-1/changes`)
      expect(changes.status).toBe(200)
      expect(await changes.json()).toMatchObject({ value: { runId: 'run-1', comparable: false } })

      expect(await (await fetch(`${server.url}api/runs/run-1/spec-map`)).json()).toMatchObject({ value: { runId: 'run-1', items: [] } })
      expect(await (await fetch(`${server.url}api/runs/run-1/revision-actions`)).json()).toMatchObject({ value: { actions: expect.any(Array) } })
      expect(await (await fetch(`${server.url}api/runs/run-1/visual-diff`)).json()).toMatchObject({ value: { comparable: false } })
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
})
