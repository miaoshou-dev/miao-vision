import { unified } from 'unified'
import remarkParse from 'remark-parse'
import remarkRehype from 'remark-rehype'
import rehypeStringify from 'rehype-stringify'
import { rehypeBlockPlaceholder } from './rehype-block-placeholder'
import type { ReportMetadata, ParsedCodeBlock } from '@/types/report'

export interface CodeBlock {
  language: string
  value: string
  meta?: string
}

export interface ParsedMarkdown {
  html: string
  codeBlocks: ParsedCodeBlock[]
  metadata?: ReportMetadata
  bodyContent?: string
}

/**
 * Parse YAML front matter
 */
function parseFrontMatter(content: string): { metadata: ReportMetadata; body: string } {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/
  const match = content.match(frontMatterRegex)

  if (!match) {
    return {
      metadata: {},
      body: content
    }
  }

  const [, yamlContent, body] = match
  const metadata: ReportMetadata = {}

  // Simple YAML parser (handles basic key: value pairs)
  const lines = yamlContent.split('\n')
  for (const line of lines) {
    const colonIndex = line.indexOf(':')
    if (colonIndex > 0) {
      const key = line.substring(0, colonIndex).trim()
      const value = line.substring(colonIndex + 1).trim()

      if (value) {
        // Handle arrays
        if (value.startsWith('[') && value.endsWith(']')) {
          metadata[key as keyof ReportMetadata] = value
            .slice(1, -1)
            .split(',')
            .map(v => v.trim()) as any
        } else {
          metadata[key as keyof ReportMetadata] = value as any
        }
      }
    }
  }

  return { metadata, body }
}

/**
 * Extract code blocks from markdown AST
 */
function extractCodeBlocks(tree: any): ParsedCodeBlock[] {
  const codeBlocks: ParsedCodeBlock[] = []
  let blockCounter = 0

  function visit(node: any) {
    if (node.type === 'code') {
      const block: ParsedCodeBlock = {
        id: `block_${blockCounter++}`,
        language: node.lang || 'text',
        content: node.value,
        meta: node.meta
      }

      // Parse metadata for SQL blocks
      if (block.language === 'sql' && block.meta) {
        block.metadata = {
          name: block.meta,
          showResult: true
        }
      }

      // Parse chart block config
      if (block.language === 'chart') {
        try {
          const lines = block.content.split('\n')
          const config: any = {}

          for (const line of lines) {
            const colonIndex = line.indexOf(':')
            if (colonIndex > 0) {
              const key = line.substring(0, colonIndex).trim()
              const value = line.substring(colonIndex + 1).trim()
              config[key] = value
            }
          }

          block.metadata = config
        } catch (error) {
          console.error('Failed to parse chart config:', error)
        }
      }

      codeBlocks.push(block)
    }

    if (node.children) {
      node.children.forEach(visit)
    }
  }

  visit(tree)
  return codeBlocks
}

/**
 * Interpolate variables in text
 */
export function interpolateVariables(text: string, context: Record<string, any>): string {
  return text.replace(/\{(\w+)\}/g, (match, key) => {
    return context[key] !== undefined ? String(context[key]) : match
  })
}

/**
 * Parse markdown content and extract code blocks
 */
export async function parseMarkdown(
  content: string,
  options?: { interpolate?: boolean; context?: Record<string, any> }
): Promise<ParsedMarkdown> {
  try {
    // Parse front matter
    const { metadata, body } = parseFrontMatter(content)

    // Interpolate variables if requested
    let processedBody = body
    if (options?.interpolate && options?.context) {
      processedBody = interpolateVariables(body, {
        ...metadata,
        ...options.context
      })
    } else if (metadata) {
      // At least interpolate metadata variables
      processedBody = interpolateVariables(body, metadata)
    }

    // Parse markdown to AST
    const processor = unified().use(remarkParse)
    const ast = processor.parse(processedBody)

    // Extract code blocks
    const codeBlocks = extractCodeBlocks(ast)

    // Convert to HTML with block placeholders
    console.log('📄 Creating HTML processor with rehype-block-placeholder plugin')
    const blockIds = new Map<string, { id: string; language: string }>()

    const htmlProcessor = unified()
      .use(remarkParse)
      .use(remarkRehype)
      .use(rehypeBlockPlaceholder, { blockIds })
      .use(rehypeStringify)

    console.log('🔄 Processing markdown body to HTML...')
    const htmlResult = await htmlProcessor.process(processedBody)
    const html = String(htmlResult)

    console.log('✅ HTML processing complete')
    console.log('Blocks found in HTML processing:', Array.from(blockIds.values()))
    console.log('HTML length:', html.length)
    console.log('HTML preview (first 500 chars):', html.substring(0, 500))

    // Check if HTML contains placeholders
    const hasPlaceholders = html.includes('block-placeholder')
    const hasPreTags = html.includes('<pre>')
    console.log('HTML contains placeholders:', hasPlaceholders)
    console.log('HTML contains <pre> tags:', hasPreTags)

    if (!hasPlaceholders && blockIds.size > 0) {
      console.error('⚠️ WARNING: blockIds has entries but HTML has no placeholders!')
      console.error('This means rehype-block-placeholder did not work correctly')
    }

    return {
      html,
      codeBlocks,
      metadata,
      bodyContent: processedBody
    }
  } catch (error) {
    console.error('Failed to parse markdown:', error)
    throw error
  }
}

/**
 * Extract SQL queries from markdown
 */
export function extractSQLQueries(codeBlocks: CodeBlock[]): string[] {
  return codeBlocks
    .filter(block => block.language === 'sql')
    .map(block => block.value.trim())
}

/**
 * Extract SQL blocks with metadata
 */
export function extractSQLBlocks(codeBlocks: ParsedCodeBlock[]): ParsedCodeBlock[] {
  return codeBlocks.filter(block => block.language === 'sql')
}
