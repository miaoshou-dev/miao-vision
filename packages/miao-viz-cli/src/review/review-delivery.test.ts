import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { summarizeDelivery } from './review-delivery'

describe('review delivery summary', () => {
  it('reports artifact metadata without reading content', () => {
    const root = mkdtempSync(join(tmpdir(), 'miao-delivery-'))
    const primary = join(root, 'report.html')
    writeFileSync(primary, '<h1>Report</h1>')
    const summary = summarizeDelivery({
      schemaVersion: 1, kind: 'report', status: 'ready', title: 'Report',
      artifacts: { primary: { format: 'html', path: primary }, alternatives: [{ format: 'pdf', path: join(root, 'report.pdf') }] },
      verification: { verified: true, shareSafe: true }, summary: { metrics: [], highlights: [] }, actions: ['open_primary']
    })
    expect(summary).toMatchObject({ format: 'html', sizeBytes: 15, alternativeFormats: ['pdf'], hasPreview: false, shareSafe: true })
  })
})
