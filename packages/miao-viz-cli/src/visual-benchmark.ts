export interface GoldenDecisionCase {
  intent: string
  prompt: string
  preferred: string[]
  acceptable: string[]
  blocked: string[]
  requiredConditions: string[]
}

export interface VisualBenchmarkResult {
  cases: number
  weightedSelectionRate: number
  blockedSelectionRate: number
  nonBasicAdoptionRate: number
}

export function scoreVisualDecisions(cases: GoldenDecisionCase[], selected: string[]): VisualBenchmarkResult {
  let score = 0; let blocked = 0; let applicableNonBasic = 0; let selectedNonBasic = 0
  const basic = new Set(['bar.vertical', 'line.standard', 'bigvalue', 'table'])
  cases.forEach((testCase, index) => {
    const choice = selected[index] ?? ''
    if (testCase.preferred.includes(choice)) score += 1
    else if (testCase.acceptable.includes(choice)) score += 0.5
    if (testCase.blocked.includes(choice)) blocked += 1
    const hasNonBasic = [...testCase.preferred, ...testCase.acceptable].some(item => !basic.has(item))
    if (hasNonBasic) { applicableNonBasic += 1; if (choice && !basic.has(choice)) selectedNonBasic += 1 }
  })
  return {
    cases: cases.length,
    weightedSelectionRate: cases.length ? score / cases.length : 0,
    blockedSelectionRate: cases.length ? blocked / cases.length : 0,
    nonBasicAdoptionRate: applicableNonBasic ? selectedNonBasic / applicableNonBasic : 0
  }
}
