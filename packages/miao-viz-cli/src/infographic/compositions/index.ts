import type { InfographicSpec, InfographicStyle } from '../../article-infographic'
import type { CompositionRenderer } from './types'
import { renderArticleLinear } from './article-linear'
import { renderLifecycleCurve } from './lifecycle-curve'
import { countOrderedPhasePoints } from './helpers'
import { renderStrategyDashboard } from './strategy-dashboard'
import { renderExplainerMap } from './explainer-map'
import { renderComparisonMatrix } from './comparison-matrix'

const REGISTRY: Record<string, CompositionRenderer | undefined> = {}

registerComposition('article-linear', renderArticleLinear)
registerComposition('lifecycle-curve', renderLifecycleCurve)
registerComposition('strategy-dashboard', renderStrategyDashboard)
registerComposition('explainer-map', renderExplainerMap)
registerComposition('comparison-matrix', renderComparisonMatrix)

export interface CompositionChoice {
  type: string
  label: string
  reason: string
  requiresSpecChange: boolean
}

export interface CompositionRenderIssue {
  code: 'UNSUPPORTED_COMPOSITION' | 'COMPOSITION_DATA_INSUFFICIENT' | 'COMPOSITION_USER_CHOICE_REQUIRED'
  requestedType: string
  message: string
  recommendedType?: string
  confidence?: number
  rationale?: string
  repairHints?: string[]
  choices: CompositionChoice[]
}

export function registerComposition(type: string, renderer: CompositionRenderer): void {
  REGISTRY[type] = renderer
}

export function getCompositionRenderIssue(spec: InfographicSpec): CompositionRenderIssue | undefined {
  const type = spec.composition?.type ?? 'article-linear'
  const render = REGISTRY[type]

  if (spec.compositionDecision.needsUserChoice) {
    return {
      code: 'COMPOSITION_USER_CHOICE_REQUIRED',
      requestedType: type,
      message: `Composition selection for '${type}' requires user confirmation.`,
      recommendedType: spec.compositionDecision.recommended,
      confidence: spec.compositionDecision.confidence,
      rationale: spec.compositionDecision.rationale,
      repairHints: ['Ask the user to choose one of the proposed composition options, then regenerate the spec with needsUserChoice: false.'],
      choices: [
        {
          type: spec.compositionDecision.recommended,
          label: `Use ${spec.compositionDecision.recommended}`,
          reason: spec.compositionDecision.rationale,
          requiresSpecChange: true
        },
        ...spec.compositionDecision.alternatives.map(alt => ({
          type: alt.type,
          label: `Use ${alt.type}`,
          reason: alt.reason,
          requiresSpecChange: true
        }))
      ]
    }
  }

  if (!render) {
    return {
      code: 'UNSUPPORTED_COMPOSITION',
      requestedType: type,
      message: `Composition '${type}' is valid in the spec schema but does not have a renderer yet.`,
      repairHints: [`Select a registered composition renderer instead of '${type}'.`],
      choices: [
        {
          type: 'article-linear',
          label: 'Render with article-linear',
          reason: 'Use the existing section order and visuals without a page-level composition.',
          requiresSpecChange: true
        },
        {
          type,
          label: `Keep ${type}`,
          reason: `Wait for or implement a renderer for '${type}' before rendering.`,
          requiresSpecChange: false
        }
      ]
    }
  }

  if (type === 'lifecycle-curve') {
    const phaseCount = countOrderedPhasePoints(spec)
    if (phaseCount < 3) {
      return {
        code: 'COMPOSITION_DATA_INSUFFICIENT',
        requestedType: type,
        message: `lifecycle-curve requires at least 3 ordered numeric phase points, found ${phaseCount}.`,
        repairHints: ['Add a metric-bars visual with at least 3 ordered phase values.', 'Or select a different composition and regenerate the spec.'],
        choices: [
          {
            type: 'lifecycle-curve',
            label: 'Repair lifecycle-curve data',
            reason: 'Add at least 3 ordered phase points with numeric values, preferably in a metric-bars visual.',
            requiresSpecChange: true
          },
          {
            type: 'article-linear',
            label: 'Render with article-linear',
            reason: 'Use the current sections as a linear article infographic without lifecycle curve requirements.',
            requiresSpecChange: true
          }
        ]
      }
    }
  }

  if (type === 'strategy-dashboard' && !hasDashboardData(spec)) {
    return insufficient(type, 'strategy-dashboard requires KPI metrics plus actions or risks.', [
      'Add a kpi-strip or metric-bars visual.',
      'Add checklist, takeaways, or risk-matrix sections.'
    ])
  }

  if (type === 'explainer-map' && !hasExplainerData(spec)) {
    return insufficient(type, 'explainer-map requires a system, callout, or process visual.', [
      'Add a system-diagram, callout-diagram, or process-flow visual.',
      'Or choose article-linear for prose-first explanation.'
    ])
  }

  if (type === 'comparison-matrix' && !hasComparisonData(spec)) {
    return insufficient(type, 'comparison-matrix requires comparison items or a comparison visual.', [
      'Add a comparison section with at least 2 items.',
      'Add concept-contrast, tradeoff-matrix, or before-after visual data.'
    ])
  }

  return undefined
}

function insufficient(type: string, message: string, repairHints: string[]): CompositionRenderIssue {
  return {
    code: 'COMPOSITION_DATA_INSUFFICIENT',
    requestedType: type,
    message,
    repairHints,
    choices: [
      { type, label: `Repair ${type} data`, reason: repairHints[0], requiresSpecChange: true },
      { type: 'article-linear', label: 'Use article-linear', reason: 'Render as a prose-first infographic after explicitly selecting this composition.', requiresSpecChange: true }
    ]
  }
}

function hasDashboardData(spec: InfographicSpec): boolean {
  const hasMetrics = spec.sections.some(s => s.visual?.type === 'kpi-strip' || s.visual?.type === 'metric-bars' || s.items.some(i => i.value))
  const hasActions = spec.sections.some(s => ['checklist', 'takeaways', 'risk-matrix'].includes(s.type))
  return hasMetrics && hasActions
}

function hasExplainerData(spec: InfographicSpec): boolean {
  return spec.sections.some(s => ['system-diagram', 'callout-diagram', 'process-flow', 'relation-flow', 'hierarchy-tree'].includes(s.visual?.type ?? ''))
}

function hasComparisonData(spec: InfographicSpec): boolean {
  return spec.sections.some(s => ['concept-contrast', 'tradeoff-matrix', 'before-after', 'quadrant-priority'].includes(s.visual?.type ?? '')) ||
    spec.sections.some(s => s.type === 'comparison' && s.items.length >= 2)
}

export function renderInfographicComposition(spec: InfographicSpec, style: InfographicStyle): string {
  const type = spec.composition?.type ?? 'article-linear'
  const issue = getCompositionRenderIssue(spec)
  if (issue) throw new Error(issue.message)

  const render = REGISTRY[type]
  return render!(spec, style)
}
