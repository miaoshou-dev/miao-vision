import { parseEvidenceRefs, resolveEvidencePath } from './directive-resolver'
import type { AnalyzeContext } from './context-schema'
import type { DeckSpec, SlideSpec } from './deck-types'
import { executeClaimCheck, type ClaimCheckResult } from './claim-check'
import { DECK_KNOWLEDGE_RULES } from './knowledge-rules'

export type DeckValidationSeverity = 'warning' | 'error'

export interface DeckKnowledgeIssue {
  code: string
  severity: DeckValidationSeverity
  path: string
  message: string
  hint: string
  details?: ClaimCheckResult
}

const HEADLINE_RISKS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /\b(drive|drives|drove|cause|causes|caused|lead to)\b|驱动|因为|导致/i, label: 'causal language' },
  { pattern: /\b(will|forecast|predict|predicted)\b|预计|将会/i, label: 'predictive language' },
  { pattern: /\b(significant|proof|proves)\b|显著|证明/i, label: 'statistical language' },
  { pattern: /\b(good|bad|strong|weak)\b|优秀|较差|强劲|疲弱/i, label: 'evaluative language' }
]

function severity(strict: boolean, strictError = true): DeckValidationSeverity {
  return strict && strictError ? 'error' : 'warning'
}

function issue(
  code: string,
  level: DeckValidationSeverity,
  path: string,
  message: string,
  hint: string
): DeckKnowledgeIssue {
  return { code, severity: level, path, message, hint }
}

export function collectDeckKnowledgeIssues(
  spec: DeckSpec,
  context: AnalyzeContext,
  strict = false
): DeckKnowledgeIssue[] {
  const issues: DeckKnowledgeIssue[] = []
  const evidenceIds = new Set(context.evidence.map(evidence => evidence.id))
  const warningCodes = new Set(context.sampleWarnings.map(warning => warning.code))
  const coveredWarnings = new Set<string>()

  spec.caveats?.forEach((caveat, caveatIndex) => {
    collectWarningRefs(caveat.warningRefs, `caveats[${caveatIndex}].warningRefs`, warningCodes, coveredWarnings, issues)
  })

  spec.slides.forEach((slide, slideIndex) => {
    const base = `slides[${slideIndex}]`
    const issueStart = issues.length
    collectWarningRefs(slide.warningRefs ?? [], `${base}.warningRefs`, warningCodes, coveredWarnings, issues)
    validateEvidenceIds(slide, base, evidenceIds, issues)
    validateDerivedPaths(slide, base, context, issues)
    validateClaim(slide, base, context, strict, issues)
    validateRecommendation(slide, base, strict, issues)
    validateDensity(slide, base, strict, issues)
    collectHeadlineWarnings(slide, base, issues)
    applyEscape(slide, issueStart, issues)
  })

  for (const warning of context.sampleWarnings) {
    if (!coveredWarnings.has(warning.code)) {
      issues.push(issue(
        'DECK_MISSING_CAVEAT',
        severity(strict),
        'caveats',
        `Analyze warning '${warning.code}' is not covered by a deck or slide warningRefs entry.`,
        `Add '${warning.code}' to warningRefs and provide a specific caveat.`
      ))
    }
  }

  return issues
}

function applyEscape(slide: SlideSpec, start: number, issues: DeckKnowledgeIssue[]): void {
  if (!slide.escape?.acknowledged) return
  const escapable = new Set(Object.values(DECK_KNOWLEDGE_RULES).filter(rule => rule.escapePolicy === 'acknowledged-caveat').map(rule => rule.code))
  const retained = issues.slice(start).filter(item => !escapable.has(item.code))
  issues.splice(start, issues.length - start, ...retained)
}

function collectWarningRefs(
  refs: string[],
  path: string,
  warningCodes: Set<string>,
  covered: Set<string>,
  issues: DeckKnowledgeIssue[]
): void {
  refs.forEach((ref, index) => {
    if (warningCodes.has(ref)) {
      covered.add(ref)
      return
    }
    issues.push(issue(
      'DECK_WARNING_REF_NOT_FOUND',
      'error',
      `${path}[${index}]`,
      `Warning reference '${ref}' does not exist in context.sampleWarnings.`,
      'Use a warning code returned by data analyze.'
    ))
  })
}

function validateEvidenceIds(
  slide: SlideSpec,
  base: string,
  evidenceIds: Set<string>,
  issues: DeckKnowledgeIssue[]
): void {
  const refs = [
    ...(slide.evidence ?? []).map((id, index) => ({ id, path: `${base}.evidence[${index}]` })),
    ...(slide.recommendation?.evidence ?? []).map((id, index) => ({ id, path: `${base}.recommendation.evidence[${index}]` }))
  ]
  for (const ref of refs) {
    if (evidenceIds.has(ref.id)) continue
    issues.push(issue(
      'DECK_SLIDE_EVIDENCE_NOT_FOUND',
      'error',
      ref.path,
      `Evidence id '${ref.id}' does not exist in context.evidence.`,
      'Use an evidence id returned by data analyze.'
    ))
  }
}

function validateDerivedPaths(
  slide: SlideSpec,
  base: string,
  context: AnalyzeContext,
  issues: DeckKnowledgeIssue[]
): void {
  const values = [
    ...(slide.derivedFrom ?? []).map((value, index) => ({ value, path: `${base}.derivedFrom[${index}]` })),
    ...(slide.recommendation?.derivedFrom ?? []).map((value, index) => ({
      value,
      path: `${base}.recommendation.derivedFrom[${index}]`
    }))
  ]
  for (const item of values) {
    const refs = parseEvidenceRefs(item.value)
    if (refs.length === 0) {
      issues.push(issue(
        'DECK_CLAIM_EVIDENCE_PATH_NOT_FOUND',
        'error',
        item.path,
        `Derived value '${item.value}' is not a valid $evidence path.`,
        'Use a path such as $evidence:total.values.revenue.'
      ))
      continue
    }
    for (const ref of refs) {
      if (resolveEvidencePath(context.evidence, ref.id, ref.path).found) continue
      issues.push(issue(
        'DECK_CLAIM_EVIDENCE_PATH_NOT_FOUND',
        'error',
        item.path,
        `Evidence path '$evidence:${ref.id}.${ref.path}' cannot be resolved.`,
        'Use an existing evidence id, row, and value path from context.json.'
      ))
    }
  }
}

function validateClaim(
  slide: SlideSpec,
  base: string,
  context: AnalyzeContext,
  strict: boolean,
  issues: DeckKnowledgeIssue[]
): void {
  const claimText = [slide.title, slide.claim].filter(Boolean).join(' ')
  const hasNumericClaim = /(?:\d|%|百分之|排名|增长|下降|increase|decrease|rank)/i.test(claimText)
  const grounded = Boolean(slide.claimType && slide.evidence?.length && slide.derivedFrom?.length && slide.check)

  if (hasNumericClaim && !grounded) {
    issues.push(issue(
      'DECK_NUMERIC_CLAIM_UNGROUNDED',
      severity(strict),
      `${base}.claim`,
      'The slide contains a numeric, ranking, or change claim without complete grounding metadata.',
      'Add claimType, evidence, derivedFrom, and check.'
    ))
  }

  if (slide.claimType === 'trend') {
    const time = context.fields.find(field => field.role === 'time')
    if (!time || (time.timePeriods ?? 0) < 3) {
      issues.push(issue(
        'DECK_TREND_REQUIRES_TIME_PERIODS',
        severity(strict),
        `${base}.claimType`,
        `Trend claims require at least 3 time periods; found ${time?.timePeriods ?? 0}.`,
        'Use a delta claim for two periods or remove the trend language.'
      ))
    }
  }

  if (slide.claimType === 'evaluative' && !hasBenchmarkEvidence(slide)) {
    issues.push(issue(
      'DECK_EVALUATIVE_CLAIM_NEEDS_BENCHMARK',
      severity(strict),
      `${base}.claimType`,
      'Evaluative claims require benchmark, target, or historical baseline evidence.',
      'Reference benchmark/target evidence or rewrite the claim descriptively.'
    ))
  }

  if (slide.check && !['evidence_ref_exists', 'caveat_present'].includes(slide.check)) {
    if (slide.claimArgs) {
      const result = executeClaimCheck(slide.check, slide.claimArgs, context.evidence)
      if (!result.ok) {
        issues.push({
          ...issue('DECK_CLAIM_CHECK_FAILED', severity(strict), `${base}.claimArgs`, result.message ?? `Claim check '${slide.check}' did not match its evidence.`, 'Correct the claim, expected value, or evidence paths.'),
          details: result
        })
      }
    }
  }

  if (slide.claimType === 'causal') {
    issues.push(issue(
      'DECK_CAUSAL_CLAIM_UNSUPPORTED',
      severity(strict),
      `${base}.claimType`,
      'Causal claims are unsupported in the first Deck Knowledge Pack release.',
      'Rewrite as an observed association or an analytical next step.'
    ))
  }

  if (slide.claimType === 'predictive') {
    issues.push(issue(
      'DECK_PREDICTIVE_CLAIM_UNSUPPORTED',
      severity(strict),
      `${base}.claimType`,
      'Predictive claims are unsupported in the first Deck Knowledge Pack release.',
      'Remove the forecast or provide it outside the generated factual deck.'
    ))
  }
}

function hasBenchmarkEvidence(slide: SlideSpec): boolean {
  return Boolean(slide.claimArgs?.value && slide.claimArgs?.benchmark)
}

function validateRecommendation(
  slide: SlideSpec,
  base: string,
  strict: boolean,
  issues: DeckKnowledgeIssue[]
): void {
  const recommendation = slide.recommendation
  if (!recommendation || recommendation.kind !== 'operational-recommendation') return
  if (recommendation.evidence?.length && recommendation.derivedFrom?.length) return
  issues.push(issue(
    'DECK_RECOMMENDATION_UNGROUNDED',
    severity(strict),
    `${base}.recommendation`,
    'Operational recommendations require evidence and derivedFrom paths.',
    'Add supporting evidence paths or change the kind to analytical-next-step.'
  ))
}

function validateDensity(
  slide: SlideSpec,
  base: string,
  strict: boolean,
  issues: DeckKnowledgeIssue[]
): void {
  const claimCount = Number(Boolean(slide.claim)) + Number(Boolean(slide.recommendation))
  if (claimCount <= 1 && (slide.metrics?.length ?? 0) <= 4 && (slide.charts?.length ?? 0) <= 1) return
  issues.push(issue(
    'DECK_SLIDE_OVERLOADED',
    severity(strict),
    base,
    'The slide exceeds the limit of one claim, four metrics, or one chart.',
    'Remove content, combine related metrics, or split the slide.'
  ))
}

function collectHeadlineWarnings(
  slide: SlideSpec,
  base: string,
  issues: DeckKnowledgeIssue[]
): void {
  for (const field of ['title', 'claim'] as const) {
    const text = slide[field]
    if (!text) continue
    for (const risk of HEADLINE_RISKS) {
      if (!risk.pattern.test(text)) continue
      issues.push(issue(
        'DECK_HEADLINE_LANGUAGE_RISK',
        'warning',
        `${base}.${field}`,
        `Headline contains ${risk.label}: '${text}'.`,
        'Confirm structured support or use more conservative language.'
      ))
    }
  }
}

export function deckKnowledgeErrors(issues: DeckKnowledgeIssue[]): DeckKnowledgeIssue[] {
  return issues.filter(item => item.severity === 'error')
}
