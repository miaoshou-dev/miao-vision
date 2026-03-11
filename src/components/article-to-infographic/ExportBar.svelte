<script lang="ts">
  /**
   * ExportBar - Copy / Download / PNG export toolbar for generated infographic
   */
  import { copyMarkdown, downloadMarkdown, exportPng } from './export-utils'

  interface Props {
    /** Markdown content for copy/download actions (null disables those buttons) */
    markdown: string | null | undefined
    /** Element to capture for PNG export */
    previewEl: HTMLElement | undefined
  }

  let { markdown, previewEl }: Props = $props()

  let copyState = $state<'idle' | 'copied'>('idle')
  let exportingPng = $state(false)

  async function handleCopyMarkdown() {
    if (!markdown) return
    const ok = await copyMarkdown(markdown)
    if (ok) {
      copyState = 'copied'
      setTimeout(() => { copyState = 'idle' }, 2000)
    }
  }

  function handleDownloadMarkdown() {
    if (!markdown) return
    downloadMarkdown(markdown)
  }

  async function handleExportPng() {
    if (!previewEl) return
    exportingPng = true
    try {
      await exportPng(previewEl)
    } finally {
      exportingPng = false
    }
  }
</script>

<div class="export-bar">
  <button class="export-btn" onclick={handleCopyMarkdown} disabled={!markdown} title="Copy Markdown">
    {#if copyState === 'copied'}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
      Copied!
    {:else}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="5" y="2" width="9" height="11" rx="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M2 5h3M2 5V13a1 1 0 001 1h7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
      Copy MD
    {/if}
  </button>
  <button class="export-btn" onclick={handleDownloadMarkdown} disabled={!markdown} title="Download Markdown">
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 12h12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
    .md
  </button>
  <button class="export-btn" onclick={handleExportPng} disabled={exportingPng || !previewEl} title="Download PNG">
    {#if exportingPng}
      <span class="export-spinner"></span>
      Exporting…
    {:else}
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="5.5" cy="7" r="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M1 11l4-3 3 3 2-2 5 4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
      PNG
    {/if}
  </button>
</div>

<style>
  .export-bar {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .export-btn {
    display: flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.35rem 0.7rem;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid #374151;
    border-radius: 6px;
    color: #9ca3af;
    font-size: 0.78rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.15s;
    white-space: nowrap;
  }

  .export-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.08);
    border-color: #4b5563;
    color: #e5e7eb;
  }

  .export-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .export-spinner {
    display: inline-block;
    width: 10px;
    height: 10px;
    border: 1.5px solid rgba(156, 163, 175, 0.3);
    border-top-color: #9ca3af;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
