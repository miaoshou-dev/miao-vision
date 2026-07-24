import { profileDataset } from './data-profiler'
import { queryRecipeFields } from './query-recipe'
import type { AnalyzeContext } from './context-schema'
import type { LoadedDataset } from './types'
import type { DataContract, EvidencePlan } from './report-project-types'

export interface ContractIssue {
  field?: string
  expected: string
  actual: string
  candidates?: string[]
}

export function createDataContract(
  dataset: LoadedDataset,
  context: AnalyzeContext,
  plan: EvidencePlan
): DataContract {
  const dependencies = new Set(plan.queries.flatMap(item => queryRecipeFields(item.recipe)).filter(field => field !== '*'))
  const fields = new Map(context.fields.map(field => [field.name, field.type]))
  return {
    schemaVersion: 1,
    requiredFields: Array.from(dependencies).sort().map(name => ({ name, type: fields.get(name) ?? 'unknown' })),
    optionalFields: [],
    ...(dataset.sheet ? { sheet: dataset.sheet } : {}),
    minimumRows: 1
  }
}

export function validateDataContract(dataset: LoadedDataset, contract: DataContract): ContractIssue[] {
  const issues: ContractIssue[] = []
  if (contract.sheet && dataset.sheet !== contract.sheet) {
    issues.push({ expected: `sheet:${contract.sheet}`, actual: dataset.sheet ? `sheet:${dataset.sheet}` : 'missing' })
  }
  if (dataset.rows.length < contract.minimumRows) {
    issues.push({ expected: `minimumRows:${contract.minimumRows}`, actual: `rows:${dataset.rows.length}` })
  }
  const profile = profileDataset(dataset)
  const types = new Map(profile.columns.map(column => [column.name, column.type]))
  for (const field of contract.requiredFields) {
    const actual = types.get(field.name)
    if (!actual) {
      issues.push({
        field: field.name, expected: field.type, actual: 'missing',
        candidates: nearestFields(field.name, dataset.columns)
      })
    } else if (field.type !== 'unknown' && !compatibleType(field.type, actual)) {
      issues.push({ field: field.name, expected: field.type, actual })
    }
  }
  return issues
}

function compatibleType(expected: string, actual: string): boolean {
  if (expected === actual) return true
  return expected === 'date' && actual === 'string'
}

function nearestFields(target: string, fields: string[]): string[] {
  const parts = new Set(target.toLowerCase().split(/[_\s-]+/))
  return fields.map(field => ({
    field,
    score: field.toLowerCase().split(/[_\s-]+/).filter(part => parts.has(part)).length
  })).filter(item => item.score > 0).sort((a, b) => b.score - a.score).slice(0, 3).map(item => item.field)
}
