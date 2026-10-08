import { createHash } from 'node:crypto'
import { fingerprintArtifactSpec } from '../artifact-spec-fingerprint'
import { singleOrReportSpecSchema } from '../spec-schema'
import { readFileSync, writeFileSync } from 'node:fs'
import * as YAML from 'yaml'
import { escapeHtml as escapeText } from '../infographic/primitives/svg'
import type { ReviewRunSnapshot } from './review-events'

/** Text-only edits preserve rendered data and evidence; reject stale artifacts. */
export function saveReviewTitle(run: ReviewRunSnapshot, title: unknown, expectedTitle: unknown, expectedSpecHash: unknown): void {
  const artifact = run.artifact
  const source = artifact?.composition?.sourceSpecPath
  const posterTitle = artifact?.composition?.poster?.find(item => item.kind === 'posterTitle')
  const previous = posterTitle?.title ?? artifact?.composition?.title?.title
  if (run.kind !== 'report' || !source || !previous || !artifact) throw new Error('This artifact does not support direct title editing.')
  if (typeof title !== 'string' || !title.trim() || title.length > 500) throw new Error('Title must contain 1–500 characters.')
  if (expectedTitle !== previous) throw new Error('The title changed. Reload before saving.')
  const originalSpec = readFileSync(source, 'utf8')
  if (expectedSpecHash !== createHash('sha256').update(originalSpec).digest('hex')) throw new Error('Source Spec changed. Reload before saving.')
  const json = source.toLowerCase().endsWith('.json')
  const doc = json ? null : YAML.parseDocument(originalSpec)
  if (doc?.errors.length) throw new Error('Source Spec is invalid.')
  const spec = json ? JSON.parse(originalSpec) : doc!.toJS()
  const isPoster = spec.layout?.preset === 'poster'
  if ((isPoster ? spec.poster?.hero?.title : spec.title) !== previous) throw new Error('Source Spec changed. Render it again before editing.')
  const originalHtml = readFileSync(artifact.primaryPath, 'utf8')
  const oldText = escapeText(previous), newText = escapeText(title)
  // Only canonical renderer title elements are eligible. Never replace arbitrary prose.
  const heading = `<h1>${oldText}</h1>`
  const pageTitle = `<title>${oldText}</title>`
  if (!originalHtml.includes(heading) || !originalHtml.includes(pageTitle)) throw new Error('Rendered title changed or is unsupported. Render the Spec again.')
  const html = originalHtml.split(heading).join(`<h1>${newText}</h1>`).replace(pageTitle, `<title>${newText}</title>`)
  if (isPoster) {
    spec.poster.hero.title = title
    if (doc) doc.setIn(['poster', 'hero', 'title'], title)
  } else {
    spec.title = title
    if (doc) doc.set('title', title)
  }
  const specText = json ? JSON.stringify(spec, null, 2) + '\n' : doc!.toString()
  writeFileSync(source, specText)
  try { writeFileSync(artifact.primaryPath, html) } catch (error) { writeFileSync(source, originalSpec); throw error }
  if (posterTitle) posterTitle.title = title
  if (!isPoster && artifact.composition?.title) artifact.composition.title.title = title
  const parsed = singleOrReportSpecSchema.safeParse(spec)
  if (artifact.fingerprints && parsed.success) artifact.fingerprints.specHash = fingerprintArtifactSpec('report', parsed.data)
}
