import {
  existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync
} from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { createHash } from 'node:crypto'
import { agentError } from './errors'
import {
  dataContractSchema, evidencePlanSchema, projectSchema, runManifestSchema,
  type DataContract, type EvidencePlan, type ReportProject, type RunManifest
} from './report-project-types'
import type { AgentError } from './types'

export interface LoadedReportProject {
  root: string
  project: ReportProject
  contract: DataContract
  plan: EvidencePlan
  spec: unknown
  preferences: Record<string, unknown>
}

export function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`
  if (value && typeof value === 'object') {
    return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${stableJson(item)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

export function hashValue(value: unknown): string {
  return createHash('sha256').update(typeof value === 'string' ? value : stableJson(value)).digest('hex')
}

export function hashFile(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

export function atomicWriteJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true })
  const temp = `${path}.tmp-${process.pid}`
  writeFileSync(temp, `${JSON.stringify(value, null, 2)}\n`, 'utf8')
  renameSync(temp, path)
}

export function loadReportProject(path: string): LoadedReportProject | AgentError {
  const root = resolve(path)
  try {
    const project = projectSchema.parse(readJson(join(root, 'project.json')))
    const contract = dataContractSchema.parse(readJson(join(root, 'data-contract.json')))
    const plan = evidencePlanSchema.parse(readJson(join(root, 'evidence-plan.json')))
    const spec = readFileSync(join(root, 'report.yaml'), 'utf8')
    const preferencesPath = join(root, 'preferences.json')
    const preferences = existsSync(preferencesPath) ? readJson(preferencesPath) as Record<string, unknown> : {}
    return { root, project, contract, plan, spec, preferences }
  } catch (error) {
    return agentError('REPORT_PROJECT_INVALID', 'Report project is missing, invalid, or uses an unsupported version.', {
      project: root, detail: error instanceof Error ? error.message : String(error)
    })
  }
}

export function readRunManifest(path: string): RunManifest | null {
  try { return runManifestSchema.parse(readJson(path)) } catch { return null }
}

export function directorySize(path: string): number {
  if (!existsSync(path)) return 0
  const stat = statSync(path)
  if (stat.isFile()) return stat.size
  return 0
}

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, 'utf8'))
}
