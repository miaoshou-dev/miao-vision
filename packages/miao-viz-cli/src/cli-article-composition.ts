import { agentError } from './errors'
import type { CompositionRenderIssue } from './infographic/compositions/index'

export function compositionSelectionRequired(issue: CompositionRenderIssue): ReturnType<typeof agentError> {
  return agentError(
    issue.code === 'COMPOSITION_USER_CHOICE_REQUIRED' ? 'COMPOSITION_SELECTION_REQUIRED' : issue.code,
    `${issue.message} Miao Vision will not automatically fall back; choose a composition option and rerun.`,
    {
      requestedComposition: issue.requestedType,
      recommendedComposition: issue.recommendedType ?? issue.choices[0]?.type,
      selectedComposition: issue.requestedType,
      issueCode: issue.code,
      ...(typeof issue.confidence === 'number' ? { confidence: issue.confidence } : {}),
      rationale: issue.rationale ?? issue.choices[0]?.reason,
      choices: issue.choices,
      repairHints: issue.repairHints ?? []
    }
  )
}
