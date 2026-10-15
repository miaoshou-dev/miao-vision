import { readFileSync } from 'node:fs'
import { agentError, isAgentError } from './errors'
import { parseProjectConfig, parseProjectPeriod, type ProjectConfig, type ProjectPeriod } from './project-config'
import { normalizeProjectSnapshot, executeProjectRecipe } from './project-snapshot'
import { PROJECT_REPORT_BLOCK } from './project-report-catalog'
import { toCatalogBlockEntry } from './report-block-registry'
import { buildTemplateCatalog } from './report-template-registry'
import { buildSceneCatalog } from './report-scene-registry'
import type { AnalyzeContext } from './context-schema'
import type { LoadedDataset, AgentError } from './types'
import { stringFlag, type CliArgs } from './cli-utils'
export function loadProjectConfig(path: string): ProjectConfig | AgentError {
  try { return parseProjectConfig(JSON.parse(readFileSync(path, 'utf8'))) } catch (error) { return agentError('PROJECT_FIELD_MAPPING_INVALID', 'Cannot read project configuration.', { path, detail: String(error) }) }
}
export function addProjectEvidence(context: AnalyzeContext, dataset: LoadedDataset, config: ProjectConfig, period: ProjectPeriod): AnalyzeContext | AgentError {
  const snapshot = normalizeProjectSnapshot(dataset.rows, config, period, dataset.columns)
  if (isAgentError(snapshot)) return snapshot
  const evidence: AnalyzeContext['evidence'] = []
  for (const view of ['summary', 'tasks', 'states'] as const) {
    const project = { kind: 'project-snapshot' as const, schemaVersion: 1 as const, config, period, view }
    const result = executeProjectRecipe(dataset.rows, project)
    if (isAgentError(result)) return result
    evidence.push({ id: `project_${view}`, query: result.sql, recipe: { schemaVersion: 1, project }, ...(view === 'summary' ? { values: result.rows[0] } : { rows: result.rows }) })
  }
  const result = { ...context, evidence, metricCandidates: [], clarificationQuestions: [], catalog: { ...context.catalog, charts: ['gantt', 'bar', 'table', 'bigvalue'], blockedCharts: context.catalog.blockedCharts.filter(item => !['gantt', 'bar', 'table', 'bigvalue'].includes(item.type)) } } as AnalyzeContext
  const match = { fields: result.fields, evidence: result.evidence, catalog: result.catalog, sampleWarnings: result.sampleWarnings, metricCandidates: result.metricCandidates }
  result.catalog.blocks = [toCatalogBlockEntry(PROJECT_REPORT_BLOCK, { ok: true, score: 0.98 }, match)]
  Object.assign(result.catalog, buildTemplateCatalog(match), buildSceneCatalog(match))
  return result
}
export function analyzeProjectFlags(context: AnalyzeContext, dataset: LoadedDataset, args: CliArgs): AnalyzeContext | AgentError {
  const path = stringFlag(args, 'project-config')
  if (!path) return context
  const config = loadProjectConfig(path), period = parseProjectPeriod(stringFlag(args, 'period-start'), stringFlag(args, 'period-end'))
  if (isAgentError(config)) return config
  if (isAgentError(period)) return period
  return addProjectEvidence(context, dataset, config, period)
}
