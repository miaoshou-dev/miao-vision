import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { copyMarkdown, downloadMarkdown } from './export-utils'

// ─── copyMarkdown ─────────────────────────────────────────────────────────────

describe('copyMarkdown', () => {
  beforeEach(() => {
    Object.defineProperty(navigator, 'clipboard', {
      value: { writeText: vi.fn().mockResolvedValue(undefined) },
      writable: true,
      configurable: true
    })
  })

  afterEach(() => vi.restoreAllMocks())

  it('calls clipboard.writeText with the provided markdown', async () => {
    const md = '# Hello\n\nWorld'
    await copyMarkdown(md)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(md)
  })

  it('returns true on success', async () => {
    expect(await copyMarkdown('text')).toBe(true)
  })

  it('returns false when clipboard API rejects', async () => {
    vi.mocked(navigator.clipboard.writeText).mockRejectedValueOnce(new Error('denied'))
    expect(await copyMarkdown('text')).toBe(false)
  })

  it('handles empty string', async () => {
    expect(await copyMarkdown('')).toBe(true)
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('')
  })
})

// ─── downloadMarkdown ─────────────────────────────────────────────────────────

describe('downloadMarkdown', () => {
  let appendSpy: ReturnType<typeof vi.spyOn>
  let removeSpy: ReturnType<typeof vi.spyOn>
  let clickSpy: ReturnType<typeof vi.fn>
  let createObjectURLSpy: ReturnType<typeof vi.spyOn>
  let revokeObjectURLSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    clickSpy = vi.fn()
    // Intercept <a> creation to capture attributes + click
    const realCreate = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      const el = realCreate(tag)
      if (tag === 'a') el.click = clickSpy
      return el
    })

    appendSpy = vi.spyOn(document.body, 'appendChild').mockImplementation((el) => el)
    removeSpy = vi.spyOn(document.body, 'removeChild').mockImplementation((el) => el)
    createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:fake-url')
    revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
  })

  afterEach(() => vi.restoreAllMocks())

  it('triggers a click on a generated anchor element', () => {
    downloadMarkdown('# Hello')
    expect(clickSpy).toHaveBeenCalledOnce()
  })

  it('appends then removes the anchor from the DOM', () => {
    downloadMarkdown('content')
    expect(appendSpy).toHaveBeenCalledOnce()
    expect(removeSpy).toHaveBeenCalledOnce()
  })

  it('uses default filename infographic.md', () => {
    // Verify createObjectURL was called (Blob was created successfully)
    downloadMarkdown('text')
    expect(createObjectURLSpy).toHaveBeenCalledOnce()
  })

  it('revokes the object URL after download', () => {
    downloadMarkdown('text')
    expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:fake-url')
  })

  it('creates a Blob with text/markdown MIME type', () => {
    let capturedBlob: Blob | null = null
    createObjectURLSpy.mockImplementation((blob: Blob) => {
      capturedBlob = blob
      return 'blob:url'
    })
    downloadMarkdown('# Test')
    expect(capturedBlob).not.toBeNull()
    expect(capturedBlob!.type).toBe('text/markdown')
  })
})

// ─── demo-article-parser ─────────────────────────────────────────────────────
// Also test the pure parser since it lives alongside export-utils

import { generateDemoMarkdown, generateCustomArticleMarkdown } from './demo-article-parser'

describe('generateDemoMarkdown', () => {
  it('returns demo template when not using custom and template exists', () => {
    const templates = { quarterly: '# Q4 Report\n\nContent' }
    expect(generateDemoMarkdown('quarterly', false, '', templates)).toBe(templates.quarterly)
  })

  it('falls through to custom parser when useCustom is true', () => {
    const templates = { quarterly: '# Q4 Report' }
    const result = generateDemoMarkdown('quarterly', true, '# My Article\n- Item: 100', templates)
    expect(result).toContain('My Article')
    expect(result).not.toBe(templates.quarterly)
  })

  it('falls through to custom parser when template key is missing', () => {
    const result = generateDemoMarkdown('unknown-key', false, '# Custom\n- Point 1', {})
    expect(result).toContain('Custom')
  })
})

describe('generateCustomArticleMarkdown', () => {
  it('extracts title from first # heading', () => {
    const result = generateCustomArticleMarkdown('# Revenue Report\n- Sales: $12M')
    expect(result).toContain('# Revenue Report')
  })

  it('falls back to "Custom Report" when no heading found', () => {
    const result = generateCustomArticleMarkdown('- Sales: $12M')
    expect(result).toContain('Custom Report')
  })

  it('extracts KPI items when values contain numbers', () => {
    const result = generateCustomArticleMarkdown('# Report\n- Revenue: $12M\n- Users: 158K')
    expect(result).toContain('kpi-row-badge')
    expect(result).toContain('Revenue')
  })

  it('extracts timeline items from numbered list', () => {
    const result = generateCustomArticleMarkdown(
      '# Steps\n1. Analyze data\n2. Build model\n3. Deploy service'
    )
    expect(result).toContain('flow-timeline')
  })

  it('extracts list items for bullet points without numeric values', () => {
    const result = generateCustomArticleMarkdown('# Report\n- First point\n- Second point\n- Third point')
    expect(result).toContain('grid-comparison')
  })

  it('returns a fallback section when nothing could be extracted', () => {
    const result = generateCustomArticleMarkdown('Some plain text without structure')
    expect(result).toContain('infographic-section')
  })

  it('wraps output with preamble and disclaimer', () => {
    const result = generateCustomArticleMarkdown('# Test\n- a: 1')
    expect(result).toContain('AI-generated infographic')
    expect(result).toContain('API key')
  })
})
