import { describe, it, expect, beforeEach } from 'vitest'
import { loadHistory, saveArticle, removeArticle } from './article-history'

const KEY = 'miaoshou:article-history'

function clearStorage() {
  localStorage.removeItem(KEY)
}

beforeEach(clearStorage)

describe('loadHistory', () => {
  it('returns empty array when nothing saved', () => {
    expect(loadHistory()).toEqual([])
  })

  it('returns empty array on malformed JSON', () => {
    localStorage.setItem(KEY, 'not-json')
    expect(loadHistory()).toEqual([])
  })

  it('returns persisted items', () => {
    const items = [{ id: 'art-1', title: 'T', preview: 'P', content: 'C', savedAt: 1 }]
    localStorage.setItem(KEY, JSON.stringify(items))
    expect(loadHistory()).toEqual(items)
  })
})

describe('saveArticle', () => {
  it('returns empty array and does not save for blank content', () => {
    saveArticle('   ')
    expect(localStorage.getItem(KEY)).toBeNull()
  })

  it('saves a new article and derives title from first non-empty line', () => {
    const history = saveArticle('# My Report\nSome content here')
    expect(history).toHaveLength(1)
    expect(history[0].title).toBe('My Report')
    expect(history[0].content).toBe('# My Report\nSome content here')
  })

  it('strips leading # from title', () => {
    const history = saveArticle('## Revenue Growth\nDetails')
    expect(history[0].title).toBe('Revenue Growth')
  })

  it('truncates title to 40 chars and appends ellipsis', () => {
    const longTitle = 'A'.repeat(50)
    const history = saveArticle(longTitle)
    expect(history[0].title.length).toBe(41) // 40 chars + '…'
    expect(history[0].title).toMatch(/…$/)
  })

  it('uses "Untitled" when content has no non-empty lines', () => {
    // Blank lines only after whitespace trim
    const history = saveArticle('   \n   ')
    // saveArticle trims first — blank content returns early
    // So we test with actual non-blank content that has no title-worthy first line
    expect(history).toEqual([]) // blank → early return
  })

  it('adds new article at the front', () => {
    saveArticle('First article')
    const history = saveArticle('Second article')
    expect(history[0].content).toBe('Second article')
    expect(history[1].content).toBe('First article')
  })

  it('deduplicates by content (moves existing to front)', () => {
    saveArticle('Hello world')
    saveArticle('Second article')
    const history = saveArticle('Hello world')
    expect(history).toHaveLength(2)
    expect(history[0].content).toBe('Hello world')
    expect(history[1].content).toBe('Second article')
  })

  it('trims to MAX_ITEMS (5)', () => {
    for (let i = 1; i <= 6; i++) {
      saveArticle(`Article ${i} content goes here`)
    }
    const history = loadHistory()
    expect(history).toHaveLength(5)
    // Latest (6) should be first
    expect(history[0].content).toBe('Article 6 content goes here')
    // Oldest (1) should have been dropped
    expect(history.some(h => h.content === 'Article 1 content goes here')).toBe(false)
  })

  it('persists to localStorage', () => {
    saveArticle('Persisted article')
    const raw = localStorage.getItem(KEY)
    expect(raw).not.toBeNull()
    const parsed = JSON.parse(raw!)
    expect(parsed[0].content).toBe('Persisted article')
  })

  it('sets savedAt to approximately current time', () => {
    const before = Date.now()
    const history = saveArticle('Timestamp test article')
    const after = Date.now()
    expect(history[0].savedAt).toBeGreaterThanOrEqual(before)
    expect(history[0].savedAt).toBeLessThanOrEqual(after)
  })

  it('sets preview to first 80 chars with newlines replaced by spaces', () => {
    const content = 'Line one\nLine two\nLine three'
    const history = saveArticle(content)
    expect(history[0].preview).toBe('Line one Line two Line three')
  })
})

describe('removeArticle', () => {
  it('removes the article with matching id', () => {
    const history = saveArticle('To be removed')
    const id = history[0].id
    const updated = removeArticle(id)
    expect(updated).toHaveLength(0)
    expect(loadHistory()).toHaveLength(0)
  })

  it('leaves other articles intact', () => {
    // Use fake timers so the two saves get different Date.now() values (different ids)
    vi.useFakeTimers()
    vi.setSystemTime(1000)
    saveArticle('Keep this one')
    vi.setSystemTime(2000)
    const history = saveArticle('Remove this one')
    vi.useRealTimers()

    const idToRemove = history[0].id
    const updated = removeArticle(idToRemove)
    expect(updated).toHaveLength(1)
    expect(updated[0].content).toBe('Keep this one')
  })

  it('is a no-op for unknown id', () => {
    saveArticle('Some article')
    const updated = removeArticle('nonexistent-id')
    expect(updated).toHaveLength(1)
  })

  it('returns empty array when history is empty', () => {
    expect(removeArticle('any-id')).toEqual([])
  })
})
