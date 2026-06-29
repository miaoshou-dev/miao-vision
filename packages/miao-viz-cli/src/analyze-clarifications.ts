import type { AnalyzeField, ClarificationQuestion } from './context-schema'

export function buildClarificationQuestions(fields: AnalyzeField[], intent = ''): ClarificationQuestion[] {
  const questions: ClarificationQuestion[] = []
  const measures = fields.filter(f => f.role === 'measure' || f.role === 'score')
  const dimensions = fields.filter(f => f.role === 'dimension' || f.role === 'status')
  const times = fields.filter(f => f.role === 'time')
  const precisionMode = /precise|accurate|decision|executive|老板|决策|精准/i.test(intent)

  if (measures.length === 0) {
    questions.push({
      id: 'primary_measure',
      question: 'Which field should be treated as the primary measure?',
      options: fields.map(f => f.name),
      blocking: true,
      appliesTo: 'measure'
    })
  } else if (measures.length > 1) {
    questions.push({
      id: 'primary_measure',
      question: `This dataset has multiple measures. Analyze ${measures.map(f => f.name).join(', ')}?`,
      options: measures.map(f => f.name),
      blocking: precisionMode,
      appliesTo: 'measure'
    })
  }

  if (dimensions.length > 1) {
    questions.push({
      id: 'primary_dimension',
      question: `Which dimension should drive the main comparison: ${dimensions.map(f => f.name).join(', ')}?`,
      options: dimensions.map(f => f.name),
      blocking: false,
      appliesTo: 'dimension'
    })
  }

  if (times.length > 1) {
    questions.push({
      id: 'time_field',
      question: `Which time field should drive trend views: ${times.map(f => f.name).join(', ')}?`,
      options: times.map(f => f.name),
      blocking: false,
      appliesTo: 'time'
    })
  }

  return questions
}
