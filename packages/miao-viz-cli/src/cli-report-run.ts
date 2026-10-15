import { cpSync, mkdirSync } from 'node:fs';
import { basename, join, relative, resolve } from 'node:path';
import { buildDelivery, reportDeliverySummary } from './artifact-delivery';
import { createArtifactPreview } from './artifact-preview';
import { fail, writeOutput } from './cli-utils';
import { type AnalyzeContext } from './context-schema';
import { profileDataset } from './data-profiler';
import { agentError } from './errors';
import { renderStaticHtml } from './html-export';
import { exportHtmlToPdf } from './pdf-export';
import { buildPeriodOutcomeBrief } from './period-outcome-builder';
import { injectPeriodOutcomeHtml } from './period-outcome-html';
import { validateProvenance } from './provenance-validator';
import { compareEvidence, injectChangesHtml } from './report-changes';
import type { ReportProfileV1 } from './report-profile';
import { loadReportLogoDataUri } from './report-profile-assets';
import { atomicWriteJson, hashFile, hashValue, readRunManifest } from './report-project-storage';
import { type ReportProject, type RunManifest } from './report-project-types';
import { evaluateReportReview, type ReportReviewReason } from './report-review';
import type { AgentError, AgentReportSpec, LoadedDataset } from './types';
import type { ProjectPeriodBrief } from './project-period-brief';
import { renderProjectReportHtml } from './project-report-html';
import type { ProjectSnapshot } from './project-snapshot';
import { changeSummary, readLatest, readPreferences } from './report-lifecycle-utils';

export async function createRun(
  root: string,
  project: ReportProject,
  dataset: LoadedDataset,
  context: AnalyzeContext,
  spec: AgentReportSpec,
  period: string,
  options: {
    copyInput: boolean
    inputPath: string
    formats: Array<'html' | 'pdf'>
    pdfTimeout?: number
    keepTemp?: boolean
    baseline?: { runId: string | null; evidence: AnalyzeContext['evidence'] }
    profile?: ReportProfileV1 | null
    reviewReasons?: ReportReviewReason[]
    projectData?: { snapshot: ProjectSnapshot; brief: ProjectPeriodBrief; frozen: ProjectSnapshot; comparison?: ProjectSnapshot | null; replacesRunId?: string }
  }
): Promise<unknown> {
  const runRoot = join(root, 'runs', period)
  mkdirSync(runRoot, { recursive: true })
  const now = new Date().toISOString()
  const inputHash = hashFile(options.inputPath)
  const changes = compareEvidence(options.baseline?.evidence ?? null, context.evidence, options.baseline?.runId ?? null)
  const outcomeBrief = options.profile
    ? buildPeriodOutcomeBrief({ period, changes, profile: options.profile })
    : null
  const review = outcomeBrief ? evaluateReportReview(outcomeBrief, [], options.reviewReasons) : null
  const provenance = validateProvenance(spec, context)
  const manifestData = {
    id: period, status: 'running' as const,
    input: { path: resolve(options.inputPath), sha256: inputHash, ...(dataset.sheet ? { sheet: dataset.sheet } : {}) },
    projectVersion: project.projectVersion, inputHash, specHash: project.specHash,
    evidencePlanHash: project.evidencePlanHash, evidenceResultHash: hashValue(context.evidence),
    lineageHash: hashValue({
      charts: spec.charts.map(chart => chart.provenance),
      insights: spec.insights?.map(insight => typeof insight === 'string' ? insight : insight.provenance)
    }),
    coverage: {
      objectCoverage: provenance.coverage.objectCoverage,
      claimCheckCoverage: provenance.coverage.claimCheckCoverage,
      eligibleObjects: provenance.coverage.eligibleObjects,
      coveredObjects: provenance.coverage.coveredObjects
    },
    createdAt: now, updatedAt: now, artifacts: {},
    baselineRunId: changes.baselineRunId,
    changes: changeSummary(changes)
  }
  const manifest: RunManifest = project.schemaVersion === 3 && options.projectData ? {
    schemaVersion: 4, ...manifestData, projectConfigHash: project.projectConfigHash, snapshotHash: hashValue(options.projectData.snapshot),
    period: options.projectData.snapshot.period, timezone: options.projectData.snapshot.config.timezone,
    baselineRunId: options.projectData.brief.baselineRunId,
    ...(options.projectData.replacesRunId ? { replacesRunId: options.projectData.replacesRunId } : {}),
    review: { status: options.projectData.brief.status, warnings: options.projectData.brief.warnings.length }
  } : project.schemaVersion === 2 && review ? {
    schemaVersion: 3,
    ...manifestData,
    reportProfileHash: project.reportProfileHash,
    review: {
      status: review.status, materialChanges: review.materialChanges,
      warnings: review.warnings, blockingIssues: review.blockingIssues
    }
  } : { schemaVersion: 2, ...manifestData }
  atomicWriteJson(join(runRoot, 'manifest.json'), manifest)
  if (options.copyInput) {
    const copiedPath = join(runRoot, `input${basename(options.inputPath).includes('.') ? basename(options.inputPath).slice(basename(options.inputPath).lastIndexOf('.')) : ''}`)
    cpSync(options.inputPath, copiedPath)
    manifest.input.copiedPath = relative(runRoot, copiedPath)
  }
  atomicWriteJson(join(runRoot, 'context.json'), context)
  atomicWriteJson(join(runRoot, 'evidence.json'), { schemaVersion: 1, evidence: context.evidence })
  atomicWriteJson(join(runRoot, 'changes.json'), changes)
  manifest.artifacts.evidence = 'evidence.json'
  manifest.artifacts.changes = 'changes.json'
  if (outcomeBrief && review) {
    atomicWriteJson(join(runRoot, 'period-outcome-brief.json'), outcomeBrief)
    atomicWriteJson(join(runRoot, 'review.json'), review)
    manifest.artifacts.outcomeBrief = 'period-outcome-brief.json'
    manifest.artifacts.review = 'review.json'
  }
  if (options.projectData) {
    atomicWriteJson(join(runRoot, 'project-snapshot.json'), options.projectData.snapshot)
    atomicWriteJson(join(runRoot, 'project-period-brief.json'), options.projectData.brief)
    atomicWriteJson(join(runRoot, 'review.json'), { status: options.projectData.brief.status, reasons: options.projectData.brief.warnings })
    manifest.artifacts.snapshot = 'project-snapshot.json'
    manifest.artifacts.projectBrief = 'project-period-brief.json'
    manifest.artifacts.review = 'review.json'
  }
  const theme = readPreferences(root).theme as Parameters<typeof renderStaticHtml>[3]
  const baseHtml = renderStaticHtml(spec, profileDataset(dataset), dataset.rows, theme, {
    enabled: true, context, coverage: provenance.coverage
  })
  const html = options.projectData ? renderProjectReportHtml(options.projectData.snapshot, options.projectData.brief, options.projectData.frozen.tasks, context.evidence, options.projectData.comparison) : outcomeBrief && review
    ? injectPeriodOutcomeHtml(baseHtml, outcomeBrief, review, {
      profile: options.profile ?? undefined,
      logoDataUri: options.profile ? loadReportLogoDataUri(options.profile, root) : undefined
    })
    : injectChangesHtml(baseHtml, changes)
  if (options.formats.includes('html')) {
    writeOutput(join(runRoot, 'report.html'), html)
    manifest.artifacts.html = 'report.html'
  }
  if (options.formats.includes('pdf')) {
    const pdfPath = join(runRoot, 'report.pdf')
    const pdf = await exportHtmlToPdf(html, pdfPath, {
      mode: 'report', ...(options.projectData ? { orientation: 'landscape' as const } : {}), timeout: options.pdfTimeout, keepTemp: options.keepTemp
    })
    if (!pdf.ok) {
      manifest.status = 'failed'
      manifest.updatedAt = new Date().toISOString()
      manifest.error = { code: pdf.code, message: pdf.message }
      atomicWriteJson(join(runRoot, 'manifest.json'), manifest)
      return fail(pdf)
    }
    manifest.artifacts.pdf = 'report.pdf'
  }
  const primaryPath = manifest.artifacts.html
    ? join(runRoot, manifest.artifacts.html)
    : join(runRoot, manifest.artifacts.pdf)
  const preview = await createArtifactPreview(html, primaryPath, { fixedName: 'report.preview.png' })
  if (preview.path) manifest.artifacts.preview = 'report.preview.png'
  manifest.status = options.projectData?.brief.status ?? (review?.status === 'needs_review' ? 'needs_review' : 'ready')
  manifest.updatedAt = new Date().toISOString()
  atomicWriteJson(join(runRoot, 'manifest.json'), manifest)
  const latest = readLatest(root)
  const latestManifest = latest ? readRunManifest(join(root, 'runs', latest.runId, 'manifest.json')) : null
  if (manifest.schemaVersion !== 4 || latestManifest?.schemaVersion !== 4 || manifest.period.end >= latestManifest.period.end) {
    atomicWriteJson(join(root, 'latest.json'), { schemaVersion: 1, runId: period, manifest: `runs/${period}/manifest.json` })
  }
  const summary = options.projectData ? {
    metrics: [
      { label: '有效任务', value: options.projectData.brief.metrics.active ?? '不可用', evidenceId: 'project_summary', evidencePath: '$evidence:project_summary.values.active' },
      { label: '逾期任务', value: options.projectData.brief.metrics.overdue ?? '不可用', evidenceId: 'project_summary', evidencePath: '$evidence:project_summary.values.overdue' },
      { label: '阻塞任务', value: options.projectData.brief.metrics.blocked ?? '不可用', evidenceId: 'project_summary', evidencePath: '$evidence:project_summary.values.blocked' }
    ],
    highlights: [{ text: `本期按完成日期确认完成 ${options.projectData.brief.metrics.completed_in_period} 项。`, evidenceIds: ['project_summary', 'project_tasks'] }]
  } : reportDeliverySummary(spec, context, provenance.issues.length === 0)
  const delivery = buildDelivery({
    kind: 'recurring-report', title: spec.title ?? 'Miao Vision Report', period,
    outputs: ['html', 'pdf'].flatMap(format => manifest.artifacts[format] ? [join(runRoot, manifest.artifacts[format])] : []),
    primaryPath, previewPath: preview.path, verified: provenance.issues.length === 0,
    coverage: provenance.coverage, warnings: options.projectData?.brief.warnings.map(reason => reason.message) ?? review?.reasons.map(reason => reason.message) ?? [], ...summary,
    changeCounts: options.projectData?.brief.baselineRunId ? { up: options.projectData.brief.changes.filter(change => change.kind === 'completed' || change.kind === 'unblocked').length, down: options.projectData.brief.changes.filter(change => change.kind === 'reopened' || change.kind === 'blocked').length, warnings: options.projectData.brief.warnings.length } : changes.baselineRunId ? {
      up: changes.metrics.filter(change => change.absolute > 0).length,
      down: changes.metrics.filter(change => change.absolute < 0).length,
      warnings: changes.anomalies.added.length + changes.notComparable.length
    } : undefined,
    recurring: true
  })
  const warnings = preview.warning ? [preview.warning] : []
  return { ok: true, value: {
    project: root, runId: period, status: manifest.status,
    artifacts: Object.fromEntries(Object.entries(manifest.artifacts).map(([key, value]) => [key, join(runRoot, value)])),
    changes: 'changes' in manifest ? manifest.changes : undefined,
    ...(review ? { review } : {}), ...(options.projectData ? { projectBrief: options.projectData.brief, review: { status: options.projectData.brief.status, reasons: options.projectData.brief.warnings } } : {}), warnings, delivery
  } }
}

export function failedRun(root: string, project: ReportProject, dataset: LoadedDataset, input: string, period: string, error: AgentError): unknown {
  const runRoot = join(root, 'runs', period)
  mkdirSync(runRoot, { recursive: true })
  const now = new Date().toISOString()
  const inputHash = hashFile(input)
  const manifestData = {
    id: period, status: 'failed' as const,
    input: { path: resolve(input), sha256: inputHash, ...(dataset.sheet ? { sheet: dataset.sheet } : {}) },
    projectVersion: project.projectVersion, inputHash, specHash: project.specHash,
    evidencePlanHash: project.evidencePlanHash, createdAt: now, updatedAt: now, artifacts: {},
    error: { code: error.code, message: error.message }
  }
  atomicWriteJson(join(runRoot, 'manifest.json'), project.schemaVersion === 2 ? {
    schemaVersion: 3, ...manifestData, reportProfileHash: project.reportProfileHash, baselineRunId: null,
    changes: { status: 'partial', metrics: 0, rankings: 0, anomaliesAdded: 0, anomaliesRemoved: 0, notComparable: 1 },
    review: { status: 'blocked', materialChanges: 0, warnings: 0, blockingIssues: 1 }
  } : { schemaVersion: 2, ...manifestData })
  return fail(agentError('REPORT_UPDATE_VALIDATION_FAILED', error.message, { runId: period, cause: error }))
}

