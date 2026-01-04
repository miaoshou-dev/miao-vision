<script lang="ts">
  import { unified } from 'unified'
  import remarkParse from 'remark-parse'
  import remarkRehype from 'remark-rehype'
  import rehypeStringify from 'rehype-stringify'

  interface Props {
    markdown: string
    isStreaming?: boolean
  }

  let { markdown, isStreaming = false }: Props = $props()

  let previewElement: HTMLDivElement | null = null
  let html = $state('')

  // Convert markdown to HTML
  async function parseMarkdown(content: string): Promise<string> {
    try {
      const result = await unified()
        .use(remarkParse)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeStringify, { allowDangerousHtml: true })
        .process(content)

      return String(result)
    } catch {
      return `<pre>${content}</pre>`
    }
  }

  // Update HTML when markdown changes
  $effect(() => {
    if (markdown) {
      parseMarkdown(markdown).then((result) => {
        html = result
      })
    } else {
      html = ''
    }
  })

  // Auto-scroll to bottom when streaming
  $effect(() => {
    if (isStreaming && previewElement && html) {
      previewElement.scrollTop = previewElement.scrollHeight
    }
  })
</script>

<div class="streaming-preview" class:streaming={isStreaming}>
  <div class="preview-header">
    <span class="preview-label">Preview</span>
    {#if isStreaming}
      <span class="streaming-indicator">
        <span class="dot"></span>
        Live
      </span>
    {/if}
  </div>
  <div class="preview-content" bind:this={previewElement}>
    {#if html}
      <!-- eslint-disable-next-line svelte/no-at-html-tags -->
      {@html html}
    {:else}
      <p class="empty-hint">Generating content...</p>
    {/if}
  </div>
</div>

<style>
  .streaming-preview {
    display: flex;
    flex-direction: column;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 8px;
    overflow: hidden;
  }

  .streaming-preview.streaming {
    border-color: #60a5fa;
  }

  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 12px;
    background: #252525;
    border-bottom: 1px solid #333;
  }

  .preview-label {
    font-size: 12px;
    font-weight: 600;
    color: #9ca3af;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .streaming-indicator {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    color: #60a5fa;
    font-weight: 500;
  }

  .dot {
    width: 6px;
    height: 6px;
    background: #60a5fa;
    border-radius: 50%;
    animation: pulse 1s ease-in-out infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.4; }
  }

  .preview-content {
    padding: 16px;
    max-height: 300px;
    overflow-y: auto;
    scroll-behavior: smooth;
  }

  .empty-hint {
    margin: 0;
    color: #6b7280;
    font-size: 13px;
    font-style: italic;
  }

  /* Markdown content styles */
  .preview-content :global(h1) {
    margin: 0 0 16px;
    font-size: 20px;
    font-weight: 600;
    color: #e0e0e0;
    border-bottom: 1px solid #333;
    padding-bottom: 8px;
  }

  .preview-content :global(h2) {
    margin: 16px 0 12px;
    font-size: 16px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .preview-content :global(h3) {
    margin: 12px 0 8px;
    font-size: 14px;
    font-weight: 600;
    color: #d0d0d0;
  }

  .preview-content :global(p) {
    margin: 0 0 12px;
    font-size: 13px;
    line-height: 1.6;
    color: #b0b0b0;
  }

  .preview-content :global(ul),
  .preview-content :global(ol) {
    margin: 0 0 12px;
    padding-left: 24px;
    color: #b0b0b0;
    font-size: 13px;
  }

  .preview-content :global(li) {
    margin: 4px 0;
    line-height: 1.5;
  }

  .preview-content :global(strong) {
    color: #e0e0e0;
    font-weight: 600;
  }

  .preview-content :global(em) {
    font-style: italic;
    color: #9ca3af;
  }

  .preview-content :global(code) {
    background: #2a2a2a;
    padding: 2px 6px;
    border-radius: 4px;
    font-size: 12px;
    font-family: 'JetBrains Mono', monospace;
    color: #60a5fa;
  }

  .preview-content :global(pre) {
    background: #2a2a2a;
    padding: 12px;
    border-radius: 6px;
    overflow-x: auto;
    margin: 0 0 12px;
  }

  .preview-content :global(pre code) {
    background: none;
    padding: 0;
    font-size: 12px;
    color: #9ca3af;
  }

  .preview-content :global(hr) {
    border: none;
    border-top: 1px solid #333;
    margin: 16px 0;
  }

  .preview-content :global(blockquote) {
    margin: 0 0 12px;
    padding: 8px 16px;
    border-left: 3px solid #60a5fa;
    background: rgba(96, 165, 250, 0.1);
    color: #9ca3af;
    font-size: 13px;
  }

  .preview-content :global(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 0 0 12px;
    font-size: 12px;
  }

  .preview-content :global(th),
  .preview-content :global(td) {
    padding: 8px 12px;
    border: 1px solid #333;
    text-align: left;
    color: #b0b0b0;
  }

  .preview-content :global(th) {
    background: #2a2a2a;
    font-weight: 600;
    color: #e0e0e0;
  }
</style>
