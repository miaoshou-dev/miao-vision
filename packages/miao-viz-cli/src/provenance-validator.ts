import { executeClaimCheck } from './claim-check'
import { resolveEvidencePath } from './directive-resolver'
import { VERIFY_ISSUE_CODES, type VerifyIssueCode } from './error-codes'
import { collectProvenanceObjects, type ProvenanceObject, type ProvenanceObjectKind } from './provenance-normalize'
import type { AnalyzeContext, AnalyzeEvidence } from './context-schema'
import type { AgentInsightCheck, AgentReportSpec } from './types'
import type { VerifyIssue } from './spec-validator-intelligence'
import type { DeckClaimCheck } from './deck-types'

export interface ProvenanceCoverageBucket {
  eligible: number
  covered: number
}

export interface ProvenanceCoverage {
  objectCoverage: number
  claimCheckCoverage: number
  eligibleObjects: number
  coveredObjects: number
  requiredClaimChecks: number
  passedClaimChecks: number
  invalidReferences: number
  failedClaimChecks: number
  empty: boolean
  byType: Record<ProvenanceObjectKind, ProvenanceCoverageBucket>
}

export interface ProvenanceValidation {
  coverage: ProvenanceCoverage
  issues: VerifyIssue[]
}

export function validateProvenance(spec: AgentReportSpec, context: AnalyzeContext): ProvenanceValidation {
  const objects = collectProvenanceObjects(spec)
  const issues: VerifyIssue[] = []
  const covered = new Set<string>()
  let requiredClaimChecks = 0
  let passedClaimChecks = 0
  let failedClaimChecks = 0
  let invalidReferences = 0

  for (const object of objects) {
    const objectIssues: VerifyIssue[] = []
    const provenance = object.provenance
    if (provenance.exemption) {
      if (!validExemption(object)) objectIssues.push(provenanceIssue(
        VERIFY_ISSUE_CODES.PROVENANCE_EXEMPTION_INVALID, object,
        `Exemption '${provenance.exemption}' is not valid for this analytical object.`,
        'Remove the exemption and bind this object to evidence.'
      ))
      else covered.add(object.path)
      issues.push(...objectIssues)
      continue
    }
    if (!provenance.evidence.length || !provenance.derivedFrom.length) {
      objectIssues.push(provenanceIssue(
        VERIFY_ISSUE_CODES.PROVENANCE_REQUIRED, object,
        'Analytical objects require both evidence ids and derivedFrom paths.',
        'Add provenance with an existing evidence id and exact $evidence path.',
        { candidates: candidatePaths(object, context.evidence) }
      ))
    }
    for (const evidenceId of provenance.evidence) {
      if (!context.evidence.some(item => item.id === evidenceId)) {
        invalidReferences++
        objectIssues.push(provenanceIssue(
          VERIFY_ISSUE_CODES.PROVENANCE_EVIDENCE_NOT_FOUND, object,
          `Evidence '${evidenceId}' does not exist in context.evidence.`,
          `Choose one of: ${context.evidence.map(item => item.id).join(', ') || '(none)'}.`,
          { evidenceId }
        ))
      }
    }
    for (const path of provenance.derivedFrom) {
      const parsed = exactPath(path)
      if (!parsed || !resolveEvidencePath(context.evidence, parsed.id, parsed.path).found) {
        invalidReferences++
        objectIssues.push(provenanceIssue(
          VERIFY_ISSUE_CODES.PROVENANCE_PATH_NOT_FOUND, object,
          `Evidence path '${path}' cannot be resolved.`,
          'Use a complete $evidence:<id>.<path> from context.evidence.',
          { derivedFrom: path, evidenceId: parsed?.id }
        ))
      } else if (!provenance.evidence.includes(parsed.id)) {
        invalidReferences++
        objectIssues.push(provenanceIssue(
          VERIFY_ISSUE_CODES.PROVENANCE_PATH_INCOMPATIBLE, object,
          `Evidence path '${path}' points to '${parsed.id}', which is not declared in provenance.evidence.`,
          `Add '${parsed.id}' to provenance.evidence or use a path from the declared evidence.`,
          { derivedFrom: path, evidenceId: parsed.id }
        ))
      }
    }
    const stateRecipe = context.evidence.find(item => provenance.evidence.includes(item.id) && item.recipe?.project?.view === 'states')?.recipe?.project
    const chart = object.kind === 'chart' ? spec.charts.find((_, index) => `charts[${index}]` === object.path) : undefined
    if (stateRecipe && chart && (chart.type !== 'bar' || chart.encoding?.x?.field !== stateRecipe.config.fields.status || chart.encoding?.y?.field !== stateRecipe.config.fields.task_id || chart.encoding?.y?.aggregate !== 'count')) {
      objectIssues.push(provenanceIssue(VERIFY_ISSUE_CODES.PROVENANCE_PATH_INCOMPATIBLE, object, 'Project state counts require status grouping and a task-ID count.', 'Use the project-status block.'))
    }
    const compatibility = compatibleWithEvidence(object, context.evidence)
    if (!compatibility.ok) {
      objectIssues.push(provenanceIssue(
        VERIFY_ISSUE_CODES.PROVENANCE_PATH_INCOMPATIBLE, object,
        compatibility.message!,
        'Bind the object to an evidence recipe that uses the same fields and aggregation.'
      ))
    }
    const check = provenance.check
    if (object.requiredCheck) {
      requiredClaimChecks++
      if (check !== object.requiredCheck || !provenance.claimArgs) {
        objectIssues.push(provenanceIssue(
          VERIFY_ISSUE_CODES.PROVENANCE_CHECK_REQUIRED, object,
          `This object requires '${object.requiredCheck}' with claimArgs.`,
          `Add check: ${object.requiredCheck} and the evidence-backed claimArgs.`
        ))
      } else if (runCheck(check, provenance.claimArgs, context.evidence)) {
        passedClaimChecks++
      } else {
        failedClaimChecks++
        objectIssues.push(provenanceIssue(
          VERIFY_ISSUE_CODES.PROVENANCE_CHECK_FAILED, object,
          `Claim check '${check}' did not match evidence.`,
          'Correct the displayed claim, expected value, or evidence recipe.'
        ))
      }
    } else if (check) {
      if (!provenance.claimArgs || !runCheck(check, provenance.claimArgs, context.evidence)) {
        failedClaimChecks++
        objectIssues.push(provenanceIssue(
          VERIFY_ISSUE_CODES.PROVENANCE_CHECK_FAILED, object,
          `Optional claim check '${check}' is incomplete or failed.`,
          'Remove the optional check or provide valid evidence-backed claimArgs.'
        ))
      }
    }
    if (objectIssues.length === 0) covered.add(object.path)
    issues.push(...dedupeIssues(objectIssues))
  }

  const byType = coverageByType(objects, covered)
  const eligibleObjects = objects.length
  const coveredObjects = covered.size
  const coverage: ProvenanceCoverage = {
    objectCoverage: eligibleObjects ? coveredObjects / eligibleObjects : 1,
    claimCheckCoverage: requiredClaimChecks ? passedClaimChecks / requiredClaimChecks : 1,
    eligibleObjects, coveredObjects, requiredClaimChecks, passedClaimChecks,
    invalidReferences, failedClaimChecks, empty: eligibleObjects === 0, byType
  }
  if (coverage.objectCoverage < 1 || coverage.claimCheckCoverage < 1) {
    issues.push({
      code: VERIFY_ISSUE_CODES.PROVENANCE_COVERAGE_INCOMPLETE,
      message: `Provenance coverage is incomplete: ${coveredObjects}/${eligibleObjects} objects, ${passedClaimChecks}/${requiredClaimChecks} required checks.`,
      severity: 'error',
      payload: { coverage }
    })
  }
  return { coverage, issues }
}

function runCheck(check: AgentInsightCheck, args: NonNullable<ProvenanceObject['provenance']['claimArgs']>, evidence: AnalyzeEvidence[]): boolean {
  if (check === 'sample_size') return Boolean(args.value && resolveRef(args.value, evidence) !== undefined)
  return executeClaimCheck(check as DeckClaimCheck, args, evidence).ok
}

function resolveRef(raw: string, evidence: AnalyzeEvidence[]): unknown {
  const parsed = exactPath(raw)
  return parsed ? resolveEvidencePath(evidence, parsed.id, parsed.path).value : undefined
}

function compatibleWithEvidence(object: ProvenanceObject, evidence: AnalyzeEvidence[]): { ok: boolean; message?: string } {
  if (!object.fields.length || !object.provenance.evidence.length) return { ok: true }
  if (object.aggregate) {
    const aggregateMatch = object.provenance.evidence.some(id => {
      const recipe = evidence.find(candidate => candidate.id === id)?.recipe
      if (!recipe) return false
      const groupBy = recipe.groupBy ?? []
      if (groupBy.length !== object.aggregate!.groupBy.length ||
        !object.aggregate!.groupBy.every(field => groupBy.includes(field))) return false
      return object.aggregate!.measures.every(measure => recipe.measures?.some(candidate =>
        candidate.field === measure.field &&
        candidate.operation === measure.operation &&
        candidate.alias === measure.alias
      ))
    })
    if (!aggregateMatch) {
      return {
        ok: false,
        message: 'Chart aggregate fields, operations, aliases, or grouping do not match the referenced evidence recipe.'
      }
    }
  }
  const recipeFields = new Set<string>()
  const resultFields = new Set<string>()
  for (const id of object.provenance.evidence) {
    const item = evidence.find(candidate => candidate.id === id)
    if (item?.recipe?.project) Object.values(item.recipe.project.config.fields).forEach(field => recipeFields.add(field))
    for (const field of item?.recipe?.groupBy ?? []) recipeFields.add(field)
    for (const measure of item?.recipe?.measures ?? []) {
      recipeFields.add(measure.field)
      resultFields.add(measure.alias)
    }
    Object.keys(item?.values ?? {}).forEach(field => resultFields.add(field))
    for (const row of item?.rows ?? []) Object.keys(row).forEach(field => resultFields.add(field))
  }
  const compatible = object.fields.every(field => recipeFields.has(field) || resultFields.has(field))
  return compatible ? { ok: true } : {
    ok: false,
    message: `Object fields (${object.fields.join(', ')}) do not match the referenced evidence recipe or result fields.`
  }
}

function candidatePaths(object: ProvenanceObject, evidence: AnalyzeEvidence[]): string[] {
  const candidates: string[] = []
  for (const item of evidence) {
    const valueKeys = Object.keys(item.values ?? {})
    for (const field of object.fields) {
      if (valueKeys.includes(field)) candidates.push(`$evidence:${item.id}.values.${field}`)
    }
    if (item.rows?.length) {
      const rowKeys = new Set(item.rows.flatMap(row => Object.keys(row)))
      const matches = object.fields.filter(field => rowKeys.has(field))
      if (matches.length && (object.kind === 'chart' || object.kind === 'reference' || object.kind === 'annotation')) {
        candidates.push(`$evidence:${item.id}.rows`)
      }
    }
  }
  return Array.from(new Set(candidates))
}

function validExemption(object: ProvenanceObject): boolean {
  return object.kind !== 'kpi' && object.fields.length === 0 && !object.requiredCheck
}

function exactPath(raw: string): { id: string; path: string } | null {
  const match = raw.match(/^\$evidence:([\w-]+)\.([\w.[\]]+)$/)
  return match ? { id: match[1], path: match[2] } : null
}

function provenanceIssue(
  code: VerifyIssueCode,
  object: ProvenanceObject,
  message: string,
  repairHint: string,
  extra: Record<string, unknown> = {}
): VerifyIssue {
  return {
    code,
    message: `${code}: ${object.path} (${object.label}) — ${message}`,
    severity: 'error',
    chartId: object.kind === 'chart' || object.kind === 'kpi' ? object.id : undefined,
    payload: { objectType: object.kind, objectId: object.id, path: object.path, repairHint, legacy: object.legacy, ...extra }
  }
}

function coverageByType(objects: ProvenanceObject[], covered: Set<string>): Record<ProvenanceObjectKind, ProvenanceCoverageBucket> {
  const result = Object.fromEntries(
    (['kpi', 'chart', 'insight', 'annotation', 'reference'] as const).map(kind => [kind, { eligible: 0, covered: 0 }])
  ) as Record<ProvenanceObjectKind, ProvenanceCoverageBucket>
  for (const object of objects) {
    result[object.kind].eligible++
    if (covered.has(object.path)) result[object.kind].covered++
  }
  return result
}

function dedupeIssues(issues: VerifyIssue[]): VerifyIssue[] {
  const seen = new Set<string>()
  return issues.filter(issue => {
    const key = `${issue.code}:${issue.payload?.path ?? ''}:${issue.evidenceId ?? ''}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}
