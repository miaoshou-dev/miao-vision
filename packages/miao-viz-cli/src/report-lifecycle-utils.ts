import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { resolveChartEvidence } from './chart-evidence';
import { readJson } from './cli-utils';
import { parseAnalyzeContext, type AnalyzeContext } from './context-schema';
import { profileDataset } from './data-profiler';
import { resolveDirectives } from './directive-resolver';
import { agentError, isAgentError } from './errors';
import { mapInsightText } from './insight-utils';
import { validateProvenance } from './provenance-validator';
import { type EvidenceChangeSet } from './report-changes';
import { readRunManifest } from './report-project-storage';
import { evidencePlanSchema, type EvidencePlan, type RunManifest } from './report-project-types';
import { type ReportReviewReason } from './report-review';
import { collectVerifyIssues, strictVerifyError, validateEvidencePaths, validateReportSpec } from './spec-validator';
import type { AgentError, AgentReportSpec, LoadedDataset } from './types';

export function verifySpec(spec: AgentReportSpec, dataset: LoadedDataset, context: AnalyzeContext): AgentReportSpec | AgentError {
  const resolved = resolveChartEvidence(structuredClone(spec), context)
  const result = validateReportSpec(resolved, profileDataset(dataset), ['html'], context)
  if (isAgentError(result)) return result
  const evidence = validateEvidencePaths(result.value, context)
  if (isAgentError(evidence)) return evidence
  const provenance = validateProvenance(result.value, context)
  const strict = strictVerifyError([...collectVerifyIssues(result.value, context), ...provenance.issues])
  if (isAgentError(strict)) return strict
  if (result.value.insights) {
    result.value.insights = result.value.insights.map(insight =>
      mapInsightText(insight, text => resolveDirectives(text, context.evidence)))
  }
  return result.value
}

export function extractPlan(context: AnalyzeContext): EvidencePlan | AgentError {
  const missing = context.evidence.filter(item => !item.recipe).map(item => item.id)
  if (missing.length) return agentError('EVIDENCE_PLAN_REQUIRED', 'Recurring reports require replayable evidence queries.', {
    hint: 'Re-run data analyze with evidence recipe output enabled.', evidenceIds: missing
  })
  return evidencePlanSchema.parse({
    schemaVersion: 1, queries: context.evidence.map(item => ({ id: item.id, recipe: item.recipe }))
  })
}

export function readContext(path: string): AnalyzeContext | AgentError {
  const parsed = parseAnalyzeContext(readJson<unknown>(path))
  return parsed ?? agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath: path })
}

export function latestContext(root: string): AnalyzeContext | AgentError {
  const latest = readLatest(root)
  if (!latest) return agentError('REPORT_PROJECT_INVALID', 'Project has no ready run.')
  return readContext(join(root, 'runs', latest.runId, 'context.json'))
}

export function readLatest(root: string): { runId: string; manifest?: string } | null {
  try { return JSON.parse(readFileSync(join(root, 'latest.json'), 'utf8')) } catch { return null }
}

export function listRuns(root: string): RunManifest[] {
  const runsRoot = join(root, 'runs')
  if (!existsSync(runsRoot)) return []
  return readdirSync(runsRoot).map(id => readRunManifest(join(runsRoot, id, 'manifest.json'))).filter((item): item is RunManifest => Boolean(item))
}

export function readPreferences(root: string): Record<string, unknown> {
  try { return JSON.parse(readFileSync(join(root, 'preferences.json'), 'utf8')) } catch { return {} }
}

export function readProfileWarnings(preferences: Record<string, unknown>): ReportReviewReason[] {
  return Array.isArray(preferences.profileWarnings) ? preferences.profileWarnings as ReportReviewReason[] : []
}

export function directoryBytes(path: string): number {
  return readdirSync(path, { withFileTypes: true }).reduce((sum, entry) => {
    const child = join(path, entry.name)
    return sum + (entry.isDirectory() ? directoryBytes(child) : statSync(child).size)
  }, 0)
}

export function parseReportFormats(value: string | undefined): Array<'html' | 'pdf'> {
  if (!value) return ['html']
  const formats = value.split(',').map(item => item.trim()).filter((item): item is 'html' | 'pdf' => item === 'html' || item === 'pdf')
  return formats.length ? Array.from(new Set(formats)) : ['html']
}

export function validateRunId(value: string): AgentError | null {
  return /^[A-Za-z0-9][A-Za-z0-9._-]*$/.test(value)
    ? null
    : agentError('INVALID_ARGUMENT', 'Run period must be a safe identifier without path separators.', { period: value })
}

export function changeSummary(changes: EvidenceChangeSet): NonNullable<Extract<RunManifest, { schemaVersion: 2 }>['changes']> {
  return {
    status: changes.baselineRunId === null ? 'no_baseline' : changes.notComparable.length ? 'partial' : 'ready',
    metrics: changes.metrics.length, rankings: changes.rankings.length,
    anomaliesAdded: changes.anomalies.added.length, anomaliesRemoved: changes.anomalies.removed.length,
    notComparable: changes.notComparable.length
  }
}

export function manifestChanges(manifest: RunManifest | null): Extract<RunManifest, { schemaVersion: 2 | 3 }>['changes'] | undefined {
  return manifest && (manifest.schemaVersion === 2 || manifest.schemaVersion === 3) ? manifest.changes : undefined
}
