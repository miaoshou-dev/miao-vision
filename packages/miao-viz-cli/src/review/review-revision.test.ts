import { describe, expect, it } from 'vitest'
import { createRevisionRequest, planRevision, validatePatchSet } from './review-revision'
import type { ReviewRunSnapshot } from './review-events'

const hash = 'a'.repeat(64)
const run: ReviewRunSnapshot = {
  runId: 'parent', kind: 'report', title: 'Sales', status: 'ready', startedAt: new Date().toISOString(), events: [], issues: [],
  artifact: {
    type: 'artifact.updated', runId: 'parent', sequence: 0, timestamp: new Date().toISOString(), kind: 'report', primaryPath: '/tmp/report.html', verified: true, deliveryStatus: 'ready',
    composition: { sourceSpecPath: '/tmp/report.yaml', title: { id: 'title', path: 'title', title: 'Sales' }, charts: [{ id: 'sales', type: 'bar', hash, path: 'charts[0]', evidenceIds: ['sales_total'] }], insights: [{ id: 'insight-1', hash, path: 'insights[0]', title: 'Sales grew', evidenceIds: ['sales_total'] }], evidence: [] }
  }
}

describe('controlled review revisions', () => {
  it('binds one instruction to multiple declared targets and produces an auditable plan', () => {
    const request = createRevisionRequest(run, { instruction: 'Make both clearer', targets: [
      { id: 'sales', kind: 'chart', path: 'charts[0]', evidenceIds: [] }, { id: 'insight-1', kind: 'insight', path: 'insights[0]', evidenceIds: [] }
    ] })
    expect(request.targets).toHaveLength(2)
    expect(request.evidenceIds).toEqual(['sales_total'])
    expect(planRevision(request)).toMatchObject({ changes: expect.any(Array), preserved: expect.any(Array), validations: expect.any(Array), risks: [] })
  })

  it('rejects undeclared and protected patch paths, while accepting a registered theme', () => {
    const request = createRevisionRequest(run, { instruction: 'Switch theme', targets: [{ id: 'sales', kind: 'chart', path: 'charts[0]', evidenceIds: [] }], theme: { id: 'magazine', path: 'theme' } })
    expect(validatePatchSet(request, { operations: [{ op: 'replace', path: 'theme', value: 'magazine' }] }, ['magazine'])).toBeTruthy()
    expect(() => validatePatchSet(request, { operations: [{ op: 'replace', path: 'charts[1].title', value: 'No' }] }, ['magazine'])).toThrow('not allowed')
    expect(() => validatePatchSet(request, { operations: [{ op: 'replace', path: 'charts[0].provenance', value: 'No' }] }, ['magazine'])).toThrow('protected')
    expect(() => validatePatchSet(request, { operations: [{ op: 'replace', path: 'theme', value: 'invented' }] }, ['magazine'])).toThrow('not registered')
  })
})
