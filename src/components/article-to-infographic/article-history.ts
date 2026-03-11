/**
 * Article history — persists up to MAX_ITEMS recent custom articles to localStorage.
 */

const STORAGE_KEY = 'miaoshou:article-history'
const MAX_ITEMS = 5

export interface ArticleHistoryItem {
  id: string
  /** First non-empty line, truncated to 40 chars */
  title: string
  /** First 80 chars of content for preview */
  preview: string
  content: string
  savedAt: number
}

function deriveTitle(content: string): string {
  const first = content.split('\n').find(l => l.trim().length > 0) ?? ''
  const clean = first.replace(/^#+\s*/, '').trim()
  return clean.length > 40 ? clean.slice(0, 40) + '…' : clean || 'Untitled'
}

export function loadHistory(): ArticleHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as ArticleHistoryItem[]) : []
  } catch {
    return []
  }
}

export function saveArticle(content: string): ArticleHistoryItem[] {
  const trimmed = content.trim()
  if (!trimmed) return loadHistory()

  const items = loadHistory()

  // Deduplicate by content (move to front if already exists)
  const deduped = items.filter(i => i.content !== trimmed)

  const newItem: ArticleHistoryItem = {
    id: `art-${Date.now()}`,
    title: deriveTitle(trimmed),
    preview: trimmed.slice(0, 80).replace(/\n/g, ' '),
    content: trimmed,
    savedAt: Date.now()
  }

  const updated = [newItem, ...deduped].slice(0, MAX_ITEMS)

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // Storage quota exceeded — ignore
  }

  return updated
}

export function removeArticle(id: string): ArticleHistoryItem[] {
  const updated = loadHistory().filter(i => i.id !== id)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
  } catch {
    // ignore
  }
  return updated
}
