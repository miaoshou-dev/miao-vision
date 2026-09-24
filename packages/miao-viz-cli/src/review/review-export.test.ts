import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { createReviewExport, reviewExportSource } from './review-export'
import { ReviewStore } from './review-store'

function runFor(kind: 'report' | 'deck', html: string) {
  const path = join(mkdtempSync(join(tmpdir(), 'miao-review-export-')), 'artifact.html')
  writeFileSync(path, html)
  const store = new ReviewStore()
  store.create({ runId: 'export-test', kind, title: 'Export test' })
  store.publish({ type: 'artifact.updated', runId: 'export-test', sequence: 0, timestamp: new Date().toISOString(), kind, primaryPath: path, verified: true, deliveryStatus: 'ready' })
  return store.get('export-test')!
}

describe('review exports', () => {
  it('offers only artifact-specific formats', () => {
    expect(reviewExportSource(runFor('report', '<main>Report</main>'))?.formats).toEqual(['pdf', 'png'])
    expect(reviewExportSource(runFor('report', '<main class="mv-poster">Poster</main>'))?.formats).toEqual(['png'])
    expect(reviewExportSource(runFor('deck', '<section class="slide">Deck</section>'))?.formats).toEqual(['pdf', 'pptx'])
  })

  it('packages each deck slide as a PNG in a readable PPTX', async () => {
    const html = `<html><head><style>.slide{width:1280px;height:720px;background:white}</style></head><body><div class="slide-viewport"><div class="slide-canvas"><section class="slide active">One</section><section class="slide">Two</section></div></div><script>document.documentElement.dataset.miaoRenderReady='true'</script></body></html>`
    const run = runFor('deck', html)
    const result = await createReviewExport(run, 'pptx')
    const { execFileSync } = await import('node:child_process')
    const entries = execFileSync('unzip', ['-Z', '-1', resolve(result.path)], { encoding: 'utf8' })
    expect(entries).toContain('ppt/media/image1.png')
    expect(entries).toContain('ppt/media/image2.png')
    expect(entries).toContain('ppt/slides/slide2.xml')
  }, 30_000)

  it('exports a poster at its canvas size', async () => {
    const html = `<html><head><style>.mv-poster{width:1080px;height:1350px;background:#fff}</style></head><body><main class="mv-poster">Poster</main><script>document.documentElement.dataset.miaoRenderReady='true'</script></body></html>`
    const result = await createReviewExport(runFor('report', html), 'png')
    const image = readFileSync(result.path)
    expect(image.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a')
    expect(image.readUInt32BE(16)).toBe(1080)
    expect(image.readUInt32BE(20)).toBe(1350)
  }, 30_000)
})
