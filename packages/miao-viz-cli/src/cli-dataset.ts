import { agentError } from './errors'
import { loadDataset, loadDatasets } from './data-loader'
import { numberFlag, readJson, stringFlag } from './cli-utils'
import type { CliArgs } from './cli-utils'

export function loadCliDataset(args: CliArgs, fallback: string, applyInputLimit = true) {
  const mappingPath = stringFlag(args, 'field-map')
  let fieldMap: Record<string, string> | undefined
  if (mappingPath) {
    const raw = readJson<unknown>(mappingPath)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw) || Object.values(raw).some(value => typeof value !== 'string')) {
      return agentError('INVALID_FIELD_MAP', 'Field map must be a JSON object of source-field to canonical-field strings.', {
        fieldMap: mappingPath
      })
    }
    fieldMap = raw as Record<string, string>
  }
  const options = {
    sheet: stringFlag(args, 'sheet'),
    projectDates: usesProjectDates(args),
    limit: applyInputLimit ? numberFlag(args, 'limit') : undefined,
    fieldMap
  }
  const inputs = stringFlag(args, 'inputs')?.split(',').map(value => value.trim()).filter(Boolean)
  return inputs?.length ? loadDatasets(inputs, options) : loadDataset(fallback, options)
}

export function firstInput(args: CliArgs): string | undefined {
  return stringFlag(args, 'inputs')?.split(',').map(value => value.trim()).find(Boolean)
}

function usesProjectDates(args: CliArgs): boolean {
  if (stringFlag(args, 'project-config')) return true
  const path = stringFlag(args, 'context')
  if (!path) return false
  try {
    const raw = readJson<{ ok?: boolean; value?: { evidence?: Array<{ recipe?: { project?: unknown } }> }; evidence?: Array<{ recipe?: { project?: unknown } }> }>(path)
    return (raw.ok ? raw.value?.evidence : raw.evidence)?.some(item => Boolean(item.recipe?.project)) ?? false
  } catch { return false }
}
