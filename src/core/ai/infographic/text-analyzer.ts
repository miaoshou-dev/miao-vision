/**
 * TextAnalyzer - Regex-based text pattern detection
 *
 * Pure logic with no external dependencies beyond TemplateCategory.
 * Lives in core/ so SemanticAnalyzer can use it as fallback without
 * importing from plugins/.
 *
 * @module core/ai/infographic/text-analyzer
 */

import type { TemplateCategory } from '@/types/infographic-template'

/**
 * Detected text pattern
 */
export interface TextPattern {
  /** Pattern type matching template categories */
  type: TemplateCategory | 'unknown'
  /** Confidence score (0-1) */
  confidence: number
  /** Start position in text */
  start: number
  /** End position in text */
  end: number
  /** Matched text segment */
  text: string
  /** Pattern-specific metadata */
  metadata?: Record<string, unknown>
}

/**
 * Text analysis result
 */
export interface TextAnalysisResult {
  /** Original text */
  originalText: string
  /** Detected patterns */
  patterns: TextPattern[]
  /** Primary detected category */
  primaryCategory: TemplateCategory | 'unknown'
  /** Confidence in primary category */
  primaryConfidence: number
  /** Detected item count (for sizing) */
  estimatedItemCount: number
  /** Has numeric data */
  hasNumericData: boolean
  /** Has percentage data */
  hasPercentageData: boolean
  /** Has date/time data */
  hasTemporalData: boolean
}

/**
 * Pattern detection rules
 */
interface PatternRule {
  category: TemplateCategory
  patterns: RegExp[]
  keywords: string[]
  weight: number
}

/**
 * Pattern detection rules for each category
 */
const PATTERN_RULES: PatternRule[] = [
  {
    category: 'flow',
    patterns: [
      /(?:step\s*\d+|phase\s*\d+|stage\s*\d+)/gi,
      /(?:first|second|third|then|next|finally|after|before)/gi,
      /(?:\d+\.\s+\w+.*?(?:\n|$)){2,}/gi,
      /(?:→|->|=>|➔|➜)/g,
      /(?:process|workflow|procedure|pipeline)/gi
    ],
    keywords: ['step', 'phase', 'stage', 'process', 'flow', 'workflow', 'first', 'then', 'next', 'finally', 'procedure'],
    weight: 1.2
  },
  {
    category: 'comparison',
    patterns: [
      /(?:vs\.?|versus|compared\s+to|against)/gi,
      /(?:pros?\s+(?:and|&)\s+cons?)/gi,
      /(?:advantages?\s+(?:and|&)\s+disadvantages?)/gi,
      /(?:before\s+(?:and|&)\s+after)/gi,
      /(?:option\s*[a-z]\s+(?:vs\.?|or)\s+option\s*[a-z])/gi
    ],
    keywords: ['vs', 'versus', 'compare', 'comparison', 'pros', 'cons', 'advantage', 'disadvantage', 'difference', 'between'],
    weight: 1.3
  },
  {
    category: 'hierarchy',
    patterns: [
      /(?:parent|child|sub-?|under|above|below)/gi,
      /(?:level\s*\d+|tier\s*\d+)/gi,
      /(?:organization|structure|tree)/gi,
      /(?:├|└|│|─)/g,
      /(?:\s{2,}[-•]\s+\w+)/gm
    ],
    keywords: ['hierarchy', 'organization', 'structure', 'tree', 'level', 'tier', 'parent', 'child', 'branch'],
    weight: 1.1
  },
  {
    category: 'relation',
    patterns: [
      /(?:connected\s+to|related\s+to|linked\s+to)/gi,
      /(?:depends\s+on|requires|needs)/gi,
      /(?:network|graph|nodes?|edges?)/gi,
      /(?:interact(?:s|ion)?|collaborate)/gi
    ],
    keywords: ['connect', 'relation', 'link', 'network', 'depend', 'interact', 'collaborate', 'node', 'edge'],
    weight: 1.0
  },
  {
    category: 'kpi',
    patterns: [
      /(?:\$[\d,.]+[kmb]?|\d+%|\d+\s*(?:million|billion|thousand))/gi,
      /(?:revenue|sales|growth|profit|loss|roi|kpi)/gi,
      /(?:metric|measure|indicator|performance)/gi,
      /(?:↑|↓|▲|▼|\+\d+%?|-\d+%?)/g
    ],
    keywords: ['kpi', 'metric', 'revenue', 'sales', 'growth', 'profit', 'performance', 'indicator', 'measure'],
    weight: 1.4
  },
  {
    category: 'ranking',
    patterns: [
      /(?:#\d+|rank(?:ed|ing)?|top\s*\d+)/gi,
      /(?:1st|2nd|3rd|\d+th)/gi,
      /(?:best|worst|highest|lowest)/gi,
      /(?:leaderboard|ranking|standings)/gi
    ],
    keywords: ['rank', 'ranking', 'top', 'best', 'worst', 'highest', 'lowest', 'leaderboard', 'position'],
    weight: 1.2
  },
  {
    category: 'distribution',
    patterns: [
      /(?:\d+%\s+\w+)/gi,
      /(?:share|portion|segment|slice)/gi,
      /(?:breakdown|distribution|allocation)/gi,
      /(?:pie|chart|donut)/gi
    ],
    keywords: ['distribution', 'share', 'portion', 'segment', 'breakdown', 'allocation', 'percentage'],
    weight: 1.1
  },
  {
    category: 'statistical',
    patterns: [
      /(?:chart|graph|plot)/gi,
      /(?:bar\s+chart|line\s+chart|funnel)/gi,
      /(?:trend|time\s+series|over\s+time)/gi,
      /(?:conversion|pipeline|stages?)/gi,
      /(?:Q[1-4]|quarter|monthly|yearly|daily)/gi
    ],
    keywords: ['chart', 'graph', 'bar', 'line', 'funnel', 'trend', 'conversion', 'pipeline', 'over time'],
    weight: 1.0
  }
]

/**
 * List detection patterns
 */
const LIST_PATTERNS = [
  /(?:^|\n)\s*[-•*]\s+.+/gm,           // Bullet points
  /(?:^|\n)\s*\d+[.)]\s+.+/gm,         // Numbered lists
  /(?:^|\n)\s*[a-z][.)]\s+.+/gmi,      // Letter lists
  /(?:^|\n)\s*(?:✓|✗|☐|☑|→)\s+.+/gm   // Checkbox/arrow lists
]

/**
 * Numeric data patterns
 */
const NUMERIC_PATTERNS = [
  /\$[\d,.]+/g,                        // Currency
  /\d+(?:\.\d+)?%/g,                   // Percentages
  /\d{1,3}(?:,\d{3})+/g,               // Large numbers
  /\d+(?:\.\d+)?\s*(?:k|m|b|K|M|B)/g   // Abbreviated numbers
]

/**
 * Temporal data patterns
 */
const TEMPORAL_PATTERNS = [
  /\d{4}[-/]\d{2}[-/]\d{2}/g,          // Date formats
  /(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,4}/gi,
  /Q[1-4]\s*\d{4}/gi,                  // Quarters
  /(?:week|month|year|day)\s*\d+/gi
]

/**
 * Analyze text to detect structural patterns
 */
export function analyzeText(text: string): TextAnalysisResult {
  const patterns: TextPattern[] = []
  const categoryScores: Map<TemplateCategory, number> = new Map()

  // Initialize scores
  const categories: TemplateCategory[] = ['kpi', 'ranking', 'flow', 'hierarchy', 'comparison', 'distribution', 'relation', 'statistical']
  categories.forEach(cat => categoryScores.set(cat, 0))

  // Detect patterns for each category
  for (const rule of PATTERN_RULES) {
    let totalMatches = 0

    // Check regex patterns
    for (const pattern of rule.patterns) {
      const matches = text.match(pattern)
      if (matches) {
        totalMatches += matches.length
        matches.forEach(match => {
          const index = text.indexOf(match)
          patterns.push({
            type: rule.category,
            confidence: 0.7,
            start: index,
            end: index + match.length,
            text: match
          })
        })
      }
    }

    // Check keywords
    const lowerText = text.toLowerCase()
    for (const keyword of rule.keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi')
      const matches = lowerText.match(regex)
      if (matches) {
        totalMatches += matches.length * 0.5
      }
    }

    // Update category score
    const currentScore = categoryScores.get(rule.category) || 0
    categoryScores.set(rule.category, currentScore + totalMatches * rule.weight)
  }

  // Detect list items for item count estimation
  let itemCount = 0
  for (const listPattern of LIST_PATTERNS) {
    const matches = text.match(listPattern)
    if (matches) {
      itemCount = Math.max(itemCount, matches.length)
    }
  }

  // Detect numeric data
  let hasNumericData = false
  for (const numPattern of NUMERIC_PATTERNS) {
    if (numPattern.test(text)) {
      hasNumericData = true
      break
    }
  }

  // Detect percentage data
  const hasPercentageData = /\d+(?:\.\d+)?%/.test(text)

  // Detect temporal data
  let hasTemporalData = false
  for (const tempPattern of TEMPORAL_PATTERNS) {
    if (tempPattern.test(text)) {
      hasTemporalData = true
      break
    }
  }

  // Determine primary category
  let primaryCategory: TemplateCategory | 'unknown' = 'unknown'
  let maxScore = 0

  categoryScores.forEach((score, category) => {
    if (score > maxScore) {
      maxScore = score
      primaryCategory = category
    }
  })

  // Calculate confidence (normalize to 0-1)
  const totalScore = Array.from(categoryScores.values()).reduce((a, b) => a + b, 0)
  const primaryConfidence = totalScore > 0 ? Math.min(maxScore / totalScore, 0.95) : 0

  // If no strong signal, check for simple list
  if (maxScore < 2 && itemCount >= 3) {
    primaryCategory = 'kpi' // Default to KPI for simple lists
    patterns.push({
      type: 'kpi',
      confidence: 0.5,
      start: 0,
      end: text.length,
      text: 'Detected as simple list'
    })
  }

  return {
    originalText: text,
    patterns,
    primaryCategory,
    primaryConfidence: maxScore > 0 ? primaryConfidence : 0.3,
    estimatedItemCount: Math.max(itemCount, 3),
    hasNumericData,
    hasPercentageData,
    hasTemporalData
  }
}

/**
 * Quick category detection (lightweight version)
 */
export function detectCategory(text: string): TemplateCategory | 'unknown' {
  return analyzeText(text).primaryCategory
}

/**
 * Check if text is suitable for infographic conversion
 */
export function isSuitableForInfographic(text: string): boolean {
  if (text.length < 20) return false
  if (text.length > 5000) return false
  const result = analyzeText(text)
  return result.primaryConfidence > 0.3 || result.estimatedItemCount >= 3
}
