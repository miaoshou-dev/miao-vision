/**
 * DataExtractor Service
 *
 * Extracts structured data from text for infographic generation.
 * Converts unstructured text into data formats suitable for each template type.
 */

import type { TemplateCategory } from '../templates'
import type { TextAnalysisResult } from './text-analyzer'

/**
 * Extracted item (generic)
 */
export interface ExtractedItem {
  id: string
  label: string
  value?: string | number
  desc?: string
  icon?: string
  color?: string
  children?: ExtractedItem[]
}

/**
 * Extracted comparison side
 */
export interface ExtractedComparison {
  left: {
    title: string
    items: string[]
  }
  right: {
    title: string
    items: string[]
  }
}

/**
 * Extracted flow/sequence
 */
export interface ExtractedFlow {
  steps: ExtractedItem[]
  isCircular: boolean
}

/**
 * Extracted hierarchy
 */
export interface ExtractedHierarchy {
  root: ExtractedItem
}

/**
 * Extracted relation
 */
export interface ExtractedRelation {
  nodes: ExtractedItem[]
  edges: { from: string; to: string; label?: string }[]
}

/**
 * Data extraction result
 */
export interface DataExtractionResult {
  /** Recommended category */
  category: TemplateCategory
  /** Extracted items (for list-based templates) */
  items?: ExtractedItem[]
  /** Extracted comparison data */
  comparison?: ExtractedComparison
  /** Extracted flow data */
  flow?: ExtractedFlow
  /** Extracted hierarchy data */
  hierarchy?: ExtractedHierarchy
  /** Extracted relation data */
  relation?: ExtractedRelation
  /** Suggested title */
  title?: string
  /** Extraction confidence */
  confidence: number
}

/**
 * Extract list items from text
 */
function extractListItems(text: string): ExtractedItem[] {
  const items: ExtractedItem[] = []
  const lines = text.split('\n')

  // Pattern for bullet/numbered lists
  const listPatterns = [
    /^\s*[-•*]\s+(.+)$/,           // Bullet points
    /^\s*(\d+)[.)]\s+(.+)$/,       // Numbered lists
    /^\s*([a-z])[.)]\s+(.+)$/i,    // Letter lists
    /^\s*(?:✓|✗|☐|☑|→)\s+(.+)$/   // Checkbox lists
  ]

  let index = 0
  for (const line of lines) {
    for (const pattern of listPatterns) {
      const match = line.match(pattern)
      if (match) {
        const content = match[match.length - 1].trim()
        // Try to extract value if present (e.g., "Revenue: $1M")
        const valueMatch = content.match(/^(.+?):\s*(.+)$/)

        if (valueMatch) {
          items.push({
            id: `item-${index++}`,
            label: valueMatch[1].trim(),
            value: valueMatch[2].trim()
          })
        } else {
          items.push({
            id: `item-${index++}`,
            label: content
          })
        }
        break
      }
    }
  }

  // If no list items found, try to split by sentences or phrases
  if (items.length === 0) {
    const sentences = text.split(/[.;]\s+/).filter(s => s.trim().length > 5)
    sentences.slice(0, 8).forEach((sentence, i) => {
      items.push({
        id: `item-${i}`,
        label: sentence.trim().slice(0, 50) + (sentence.length > 50 ? '...' : '')
      })
    })
  }

  return items
}

/**
 * Extract comparison data from text
 */
function extractComparison(text: string): ExtractedComparison | null {
  // Try to find comparison structure
  // Pattern: "X vs Y" or "X compared to Y"
  const vsMatch = text.match(/(.+?)\s+(?:vs\.?|versus|compared\s+to|against)\s+(.+)/i)

  if (vsMatch) {
    const leftTitle = vsMatch[1].trim().split(/\s+/).slice(-2).join(' ')
    const rightTitle = vsMatch[2].trim().split(/\s+/).slice(0, 2).join(' ')

    // Extract items for each side
    const leftItems: string[] = []
    const rightItems: string[] = []

    // Look for pros/cons or advantages/disadvantages
    const prosMatch = text.match(/pros?[:\s]+(.+?)(?:cons?|disadvantages?|$)/is)
    const consMatch = text.match(/cons?[:\s]+(.+?)(?:pros?|advantages?|$)/is)

    if (prosMatch) {
      leftItems.push(...extractBulletPoints(prosMatch[1]))
    }
    if (consMatch) {
      rightItems.push(...extractBulletPoints(consMatch[1]))
    }

    // If no pros/cons, split items evenly
    if (leftItems.length === 0 && rightItems.length === 0) {
      const allItems = extractListItems(text)
      const mid = Math.ceil(allItems.length / 2)
      allItems.slice(0, mid).forEach(item => leftItems.push(item.label))
      allItems.slice(mid).forEach(item => rightItems.push(item.label))
    }

    return {
      left: { title: leftTitle || 'Option A', items: leftItems },
      right: { title: rightTitle || 'Option B', items: rightItems }
    }
  }

  return null
}

/**
 * Extract bullet points from text segment
 */
function extractBulletPoints(text: string): string[] {
  const items: string[] = []
  const lines = text.split('\n')

  for (const line of lines) {
    const match = line.match(/^\s*[-•*]\s+(.+)$/)
    if (match) {
      items.push(match[1].trim())
    }
  }

  // If no bullet points, split by commas or semicolons
  if (items.length === 0) {
    const parts = text.split(/[,;]/).map(s => s.trim()).filter(s => s.length > 3 && s.length < 50)
    items.push(...parts.slice(0, 5))
  }

  return items
}

/**
 * Extract flow/sequence data from text
 */
function extractFlow(text: string): ExtractedFlow {
  const steps: ExtractedItem[] = []

  // Pattern for numbered steps
  const stepPattern = /(?:step\s*)?(\d+)[.:)]\s*(.+?)(?=(?:step\s*)?\d+[.:)]|$)/gi
  let match

  while ((match = stepPattern.exec(text)) !== null) {
    steps.push({
      id: `step-${match[1]}`,
      label: match[2].trim().slice(0, 30),
      desc: match[2].trim().length > 30 ? match[2].trim() : undefined
    })
  }

  // If no numbered steps, try ordinal words
  if (steps.length === 0) {
    const ordinals = ['first', 'second', 'third', 'fourth', 'fifth', 'then', 'next', 'finally']
    let index = 0

    for (const ordinal of ordinals) {
      const regex = new RegExp(`${ordinal}[,:]?\\s+(.+?)(?=[.!?]|$)`, 'i')
      const ordMatch = text.match(regex)
      if (ordMatch) {
        steps.push({
          id: `step-${index++}`,
          label: ordMatch[1].trim().slice(0, 30)
        })
      }
    }
  }

  // Fallback to list extraction
  if (steps.length === 0) {
    const items = extractListItems(text)
    items.forEach((item, i) => {
      steps.push({ ...item, id: `step-${i}` })
    })
  }

  // Check if circular (mentions cycle, loop, repeat)
  const isCircular = /\b(?:cycle|loop|repeat|circular|continuous)\b/i.test(text)

  return { steps, isCircular }
}

/**
 * Extract hierarchy data from text
 */
function extractHierarchy(text: string): ExtractedHierarchy {
  const root: ExtractedItem = {
    id: 'root',
    label: 'Root',
    children: []
  }

  // Try to find a title/root
  const titleMatch = text.match(/^#?\s*(.+?)(?:\n|$)/)
  if (titleMatch) {
    root.label = titleMatch[1].trim().slice(0, 30)
  }

  // Extract indented items as hierarchy
  const lines = text.split('\n')
  const stack: { item: ExtractedItem; indent: number }[] = [{ item: root, indent: -1 }]

  for (const line of lines) {
    const indentMatch = line.match(/^(\s*)[-•*]?\s*(.+)$/)
    if (indentMatch && indentMatch[2].trim()) {
      const indent = indentMatch[1].length
      const label = indentMatch[2].trim()

      if (label === root.label) continue // Skip root

      const newItem: ExtractedItem = {
        id: `node-${Math.random().toString(36).slice(2, 8)}`,
        label: label.slice(0, 30),
        children: []
      }

      // Find parent based on indentation
      while (stack.length > 1 && stack[stack.length - 1].indent >= indent) {
        stack.pop()
      }

      const parent = stack[stack.length - 1].item
      if (!parent.children) parent.children = []
      parent.children.push(newItem)

      stack.push({ item: newItem, indent })
    }
  }

  return { root }
}

/**
 * Extract relation/network data from text
 */
function extractRelation(text: string): ExtractedRelation {
  const nodes: ExtractedItem[] = []
  const edges: { from: string; to: string; label?: string }[] = []
  const nodeMap = new Map<string, string>()

  // Find entities (capitalized words or quoted strings)
  const entityPattern = /(?:"([^"]+)"|'([^']+)'|\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\b)/g
  let match

  while ((match = entityPattern.exec(text)) !== null) {
    const entity = (match[1] || match[2] || match[3]).trim()
    if (!nodeMap.has(entity.toLowerCase()) && entity.length > 2) {
      const id = `node-${nodes.length}`
      nodeMap.set(entity.toLowerCase(), id)
      nodes.push({
        id,
        label: entity.slice(0, 20)
      })
    }
  }

  // Find relationships
  const relationPatterns = [
    /(\w+)\s+(?:connects?|links?|relates?)\s+(?:to\s+)?(\w+)/gi,
    /(\w+)\s+(?:depends?\s+on|requires?|needs?)\s+(\w+)/gi,
    /(\w+)\s+(?:→|->|=>)\s+(\w+)/g
  ]

  for (const pattern of relationPatterns) {
    while ((match = pattern.exec(text)) !== null) {
      const from = nodeMap.get(match[1].toLowerCase())
      const to = nodeMap.get(match[2].toLowerCase())
      if (from && to) {
        edges.push({ from, to })
      }
    }
  }

  // If no explicit edges, connect sequentially
  if (edges.length === 0 && nodes.length > 1) {
    for (let i = 0; i < nodes.length - 1; i++) {
      edges.push({ from: nodes[i].id, to: nodes[i + 1].id })
    }
  }

  return { nodes: nodes.slice(0, 10), edges: edges.slice(0, 15) }
}

/**
 * Extract a suggested title from text
 */
function extractTitle(text: string): string | undefined {
  // Try markdown header
  const headerMatch = text.match(/^#\s+(.+)$/m)
  if (headerMatch) return headerMatch[1].trim().slice(0, 40)

  // Try first short sentence
  const firstSentence = text.match(/^(.{10,50})[.!?]/)
  if (firstSentence) return firstSentence[1].trim()

  return undefined
}

/**
 * Main extraction function
 */
export function extractData(text: string, analysis: TextAnalysisResult): DataExtractionResult {
  const category = analysis.primaryCategory === 'unknown' ? 'kpi' : analysis.primaryCategory

  const result: DataExtractionResult = {
    category,
    confidence: analysis.primaryConfidence,
    title: extractTitle(text)
  }

  // Extract data based on category
  switch (category) {
    case 'comparison':
      result.comparison = extractComparison(text) || undefined
      if (!result.comparison) {
        result.items = extractListItems(text)
      }
      break

    case 'flow':
      result.flow = extractFlow(text)
      break

    case 'hierarchy':
      result.hierarchy = extractHierarchy(text)
      break

    case 'relation':
      result.relation = extractRelation(text)
      break

    case 'distribution':
    case 'kpi':
    case 'ranking':
    default:
      result.items = extractListItems(text)
      break
  }

  return result
}

/**
 * Convert extraction result to template-specific data format
 */
export function toTemplateData(result: DataExtractionResult): Record<string, unknown> {
  switch (result.category) {
    case 'comparison':
      if (result.comparison) {
        return {
          left: {
            title: result.comparison.left.title,
            items: result.comparison.left.items.map((text, i) => ({ text, id: `l${i}` }))
          },
          right: {
            title: result.comparison.right.title,
            items: result.comparison.right.items.map((text, i) => ({ text, id: `r${i}` }))
          }
        }
      }
      break

    case 'flow':
      if (result.flow) {
        return {
          steps: result.flow.steps,
          isCircular: result.flow.isCircular
        }
      }
      break

    case 'hierarchy':
      if (result.hierarchy) {
        return { root: result.hierarchy.root }
      }
      break

    case 'relation':
      if (result.relation) {
        return {
          nodes: result.relation.nodes,
          edges: result.relation.edges
        }
      }
      break
  }

  // Default: return items
  return { items: result.items || [] }
}
