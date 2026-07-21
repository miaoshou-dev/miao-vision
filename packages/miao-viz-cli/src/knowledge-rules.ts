export type KnowledgeRuleSeverity = 'error' | 'warning' | 'recommendation'
export type KnowledgeEscapePolicy = 'forbidden' | 'acknowledged-caveat'

export interface KnowledgeRule<TContext = unknown> {
  code: string
  severity: KnowledgeRuleSeverity
  appliesWhen: (context: TContext) => boolean
  reason: string
  repairHint: string
  escapePolicy: KnowledgeEscapePolicy
}

export const DECK_KNOWLEDGE_RULES = {
  claimCheckFailed: { code: 'DECK_CLAIM_CHECK_FAILED', severity: 'error', appliesWhen: () => true, reason: 'The structured claim does not match evidence.', repairHint: 'Correct the claim or evidence inputs.', escapePolicy: 'forbidden' },
  recommendationUngrounded: { code: 'DECK_RECOMMENDATION_UNGROUNDED', severity: 'recommendation', appliesWhen: () => true, reason: 'Operational recommendations need evidence.', repairHint: 'Add evidence or use an analytical next step.', escapePolicy: 'acknowledged-caveat' },
  headlineRisk: { code: 'DECK_HEADLINE_LANGUAGE_RISK', severity: 'warning', appliesWhen: () => true, reason: 'Headline language may exceed available evidence.', repairHint: 'Use conservative language.', escapePolicy: 'acknowledged-caveat' }
} satisfies Record<string, KnowledgeRule>
