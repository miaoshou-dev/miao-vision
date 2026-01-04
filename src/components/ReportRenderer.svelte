<script lang="ts">
  import { tick } from 'svelte'
  import type { Report } from '@/types/report'
  import type { ParsedCodeBlock } from '@/types/report'
  import { parseMarkdown } from '@core/markdown/parser'
  import { blockRenderer } from '@core/engine/block-renderer'
  import type { InputStore } from '@app/stores/report-inputs'
  import MissingDataSources from './MissingDataSources.svelte'

  interface Props {
    report: Report | null
    inputStore?: InputStore | null
    tableMapping?: Map<string, string>
  }

  let { report, inputStore = null, tableMapping }: Props = $props()

  let renderedHTML = $state<string>('')
  let error = $state<string | null>(null)
  let contentContainer = $state<HTMLDivElement | null>(null)
  let chartElements: HTMLElement[] = []
  let isRendering = false  // Prevent concurrent rendering
  let parsedCodeBlocks: ParsedCodeBlock[] = []  // Store parsed code blocks for BigValue
  let lastRenderedReportId = $state<string | null>(null)  // Track report ID for change detection
  let missingDataSources = $state<string[]>([])  // Track missing data sources

  // Re-render when report changes or when blocks are updated
  // Wait for contentContainer to be bound before rendering
  $effect(() => {
    if (report && contentContainer) {
      // Track both report and report.blocks to trigger re-render on data changes
      const blocksCount = report.blocks?.length || 0
      const blocksWithResults = report.blocks?.filter(b => b.sqlResult).length || 0
      const blocksWithChartConfig = report.blocks?.filter(b => b.chartConfig).length || 0
      const chartConfigsHash = report.blocks
        ?.filter(b => b.chartConfig)
        .map(b => `${b.id}:${b.chartConfig?.data?.table}`)
        .join(',') || ''
      // Track tableMapping changes to re-render when data sources become available
      const tableMappingSize = tableMapping?.size || 0

      console.log(`🔄 ReportRenderer $effect triggered`)
      console.log(`  Blocks: ${blocksCount}, SQL results: ${blocksWithResults}, Chart configs: ${blocksWithChartConfig}`)
      console.log(`  Chart configs hash: ${chartConfigsHash}`)
      console.log(`  tableMapping size: ${tableMappingSize}`)
      console.log(`  Calling renderReport()...`)

      renderReport()
    } else {
      console.log('$effect: waiting...', {
        hasReport: !!report,
        hasContainer: !!contentContainer
      })
    }
  })

  async function renderReport() {
    if (!report) {
      console.log('renderReport: No report to render')
      return
    }

    // Prevent concurrent rendering
    if (isRendering) {
      console.log('⏸️ renderReport: Already rendering, skipping...')
      return
    }

    // Detect report switch and clear state if needed
    const reportChanged = lastRenderedReportId !== null && lastRenderedReportId !== report.id
    if (reportChanged) {
      console.log(`🔄 Report switched: ${lastRenderedReportId} → ${report.id}`)
      console.log('  Clearing previous render state...')
      renderedHTML = ''
      parsedCodeBlocks = []
      chartElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
      chartElements = []
      if (contentContainer) {
        const markdownContent = contentContainer.querySelector('.markdown-content')
        if (markdownContent) {
          markdownContent.innerHTML = ''
        }
      }
      console.log('  ✅ Previous state cleared')
    }
    lastRenderedReportId = report.id

    // Check for missing data sources
    const requiredSources = report.metadata?.dataSources || []
    if (requiredSources.length > 0 && tableMapping) {
      const availableTables = new Set(tableMapping.keys())
      const missing = requiredSources.filter(src => !availableTables.has(src))
      missingDataSources = missing
      if (missing.length > 0) {
        console.log('⚠️ Missing data sources:', missing)
      }
    } else {
      missingDataSources = []
    }

    isRendering = true
    console.log('📄 renderReport() called for report:', report.id)
    console.log('  Report blocks count:', report.blocks.length)
    console.log('  Report content length:', report.content.length)

    try {
      error = null

      // Use processed content (after conditional processing) if available
      const contentToRender = report.metadata?._processedContent || report.content

      // Parse markdown with variable interpolation
      console.log('  Parsing markdown...')
      const parsed = await parseMarkdown(contentToRender, {
        interpolate: true,
        context: {
          ...report.metadata,
          // Add any computed values here
        }
      })

      // Store HTML and code blocks for markdown content
      renderedHTML = parsed.html
      parsedCodeBlocks = parsed.codeBlocks  // Store for BigValue rendering
      console.log('  ✅ Markdown parsed')
      console.log('  HTML length:', renderedHTML.length)
      console.log('  Parsed code blocks:', parsedCodeBlocks.length)
      console.log('  Total blocks in report.blocks:', report.blocks.length)

      // Wait for DOM to update, then mount blocks to placeholders
      console.log('  Waiting for DOM update (tick)...')
      await tick()
      console.log('  ✅ DOM updated')

      // IMPORTANT: Directly set innerHTML instead of relying on {@html}
      // because Svelte's {@html} may sanitize or modify the content
      console.log('  contentContainer exists:', !!contentContainer)
      if (!contentContainer) {
        console.warn('  ⚠️ contentContainer is null, waiting for next tick...')
        await tick()
        console.log('  After tick, contentContainer exists:', !!contentContainer)
      }

      if (contentContainer) {
        const markdownContent = contentContainer.querySelector('.markdown-content')
        console.log('  markdownContent found:', !!markdownContent)

        if (markdownContent) {
          console.log('  Setting innerHTML directly...')
          markdownContent.innerHTML = renderedHTML
          console.log('  ✅ innerHTML set directly')
          console.log('  New innerHTML length:', markdownContent.innerHTML.length)

          // Wait for DOM update after setting innerHTML
          await tick()
          console.log('  ✅ DOM updated after innerHTML set')
        } else {
          console.error('  ❌ markdownContent element not found!')
        }
      } else {
        console.error('  ❌ contentContainer is still null!')
      }

      console.log('  Calling mountBlocksToPlaceholders()')
      await mountBlocksToPlaceholders()
      console.log('  ✅ mountBlocksToPlaceholders() completed')
    } catch (err) {
      console.error('❌ Failed to render report:', err)
      error = err instanceof Error ? err.message : 'Failed to render report'
    } finally {
      isRendering = false
      console.log('  ✅ renderReport() completed, isRendering reset')
    }
  }

  /**
   * Mount SQL results and components to placeholder divs
   * Uses unified BlockRenderer for all block types
   */
  async function mountBlocksToPlaceholders() {
    if (!contentContainer || !report) {
      console.log('mountBlocksToPlaceholders: No container or report')
      return
    }

    console.log('  tableMapping available:', tableMapping ? `${tableMapping.size} entries` : 'none')
    if (tableMapping && tableMapping.size > 0) {
      console.log('  tableMapping contents:', Object.fromEntries(tableMapping))
    }

    await blockRenderer.mountBlocks(contentContainer, {
      report,
      parsedBlocks: parsedCodeBlocks,
      inputStore,
      chartElements,
      tableMapping
    })
  }


  // Cleanup chart elements on unmount
  $effect(() => {
    return () => {
      // Only remove DOM elements on unmount, don't drop tables
      console.log('🧹 Unmounting: removing chart elements')
      chartElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
      chartElements = []
    }
  })
</script>

<div class="report-renderer">
  {#if error}
    <div class="error-banner">
      <strong>⚠ Rendering Error</strong>
      <p>{error}</p>
    </div>
  {/if}

  {#if !report}
    <div class="empty-state">
      <p>No report selected</p>
      <p class="hint">Create a new report or select one from the list</p>
    </div>
  {:else}
    {#if missingDataSources.length > 0}
      <MissingDataSources
        missingTables={missingDataSources}
        onDismiss={() => missingDataSources = []}
      />
    {/if}
    <div class="report-content" bind:this={contentContainer}>
      <!-- Render markdown content with embedded placeholders -->
      <!-- Note: HTML is set directly via JavaScript to avoid Svelte sanitization -->
      <div class="markdown-content"></div>
    </div>
  {/if}
</div>

<style>
  .report-renderer {
    width: 100%;
    height: 100%;
    overflow-y: auto;
    padding: 2rem;
    /* 滚动性能优化 */
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  /* 智能渲染优化已移除 */
  /* content-visibility 会影响 vgplot/Mosaic 的表查询时机 */
  /* 在不影响图表的情况下，其他滚动优化已经足够 */

  .error-banner {
    padding: 1.5rem;
    background-color: rgba(220, 38, 38, 0.1);
    border: 1px solid rgba(220, 38, 38, 0.3);
    border-radius: 8px;
    margin-bottom: 2rem;
  }

  .error-banner strong {
    display: block;
    font-size: 1.1rem;
    color: #fca5a5;
    margin-bottom: 0.5rem;
  }

  .error-banner p {
    margin: 0;
    opacity: 0.9;
  }

  .empty-state {
    text-align: center;
    padding: 4rem 2rem;
    opacity: 0.6;
    color: #D1D5DB;
  }

  .empty-state p {
    margin: 0.5rem 0;
    color: #D1D5DB;
  }

  .empty-state .hint {
    font-size: 0.9rem;
    opacity: 0.7;
  }

  .report-content {
    max-width: 900px;
    margin: 0 auto;
  }

  /* Markdown content styling */
  .markdown-content {
    line-height: 1.6;
    margin-bottom: 2rem;
    color: #F3F4F6;
  }

  .markdown-content :global(h1) {
    font-size: 2rem;
    margin: 2rem 0 1rem 0;
    border-bottom: 2px solid #374151;
    padding-bottom: 0.5rem;
    color: #F3F4F6;
  }

  .markdown-content :global(h2) {
    font-size: 1.5rem;
    margin: 1.5rem 0 0.75rem 0;
    color: #F3F4F6;
  }

  .markdown-content :global(h3) {
    font-size: 1.25rem;
    margin: 1.25rem 0 0.5rem 0;
    color: #F3F4F6;
  }

  .markdown-content :global(p) {
    margin: 0.75rem 0;
    color: #E5E7EB;
  }

  .markdown-content :global(ul),
  .markdown-content :global(ol) {
    margin: 0.75rem 0;
    padding-left: 2rem;
    color: #E5E7EB;
  }

  .markdown-content :global(code) {
    background-color: #1F2937;
    padding: 0.2rem 0.4rem;
    border-radius: 3px;
    font-family: 'Courier New', monospace;
    font-size: 0.9em;
    color: #F3F4F6;
  }

  .markdown-content :global(pre) {
    background-color: #111827;
    padding: 1rem;
    border-radius: 6px;
    overflow-x: auto;
    margin: 1rem 0;
  }

  .markdown-content :global(pre code) {
    background: none;
    padding: 0;
    color: #F3F4F6;
  }

  .markdown-content :global(blockquote) {
    border-left: 4px solid rgba(102, 126, 234, 0.5);
    padding-left: 1rem;
    margin: 1rem 0;
    opacity: 0.9;
    color: #D1D5DB;
  }

  /* Block placeholders (before mounting) */
  :global(.block-placeholder) {
    min-height: 80px;
    margin: 2rem 0;
    padding: 1.5rem;
    background-color: rgba(102, 126, 234, 0.05);
    border: 2px dashed rgba(102, 126, 234, 0.3);
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.95rem;
    color: rgba(255, 255, 255, 0.6);
  }

  :global(.block-placeholder span) {
    display: block;
    text-align: center;
  }

  /* These are fallbacks if innerHTML is not set */
  :global(.block-placeholder-sql:empty::before) {
    content: '📊 SQL query placeholder';
    color: rgba(255, 255, 255, 0.6);
  }

  :global(.block-placeholder-chart:empty::before) {
    content: '📈 Chart placeholder';
    color: rgba(255, 255, 255, 0.6);
  }

  /* SQL result blocks - Collapsible */
  :global(.sql-result-block) {
    margin: 1.5rem 0;
    border: 1px solid #374151;
    border-radius: 8px;
    overflow: hidden;
    background-color: #111827;
  }

  /* Collapsible header button */
  :global(.sql-result-header) {
    display: flex;
    justify-content: space-between;
    align-items: center;
    width: 100%;
    padding: 0.75rem 1rem;
    background-color: #1F2937;
    border: none;
    cursor: pointer;
    transition: background-color 0.15s ease;
  }

  :global(.sql-result-header:hover) {
    background-color: #374151;
  }

  :global(.sql-result-header:focus) {
    outline: none;
    box-shadow: inset 0 0 0 2px rgba(59, 130, 246, 0.5);
  }

  :global(.header-left),
  :global(.header-right) {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  :global(.collapse-icon) {
    font-size: 0.75rem;
    color: #9CA3AF;
    transition: transform 0.2s ease;
    display: inline-block;
  }

  /* Rotate icon when expanded */
  :global(.sql-result-block:not(.collapsed) .collapse-icon) {
    transform: rotate(90deg);
  }

  :global(.block-label) {
    font-weight: 500;
    font-size: 0.9rem;
    color: #F3F4F6;
  }

  :global(.row-count) {
    font-size: 0.8rem;
    color: #6B7280;
    font-weight: 400;
  }

  :global(.columns-count) {
    font-size: 0.8rem;
    color: #6B7280;
  }

  :global(.execution-time) {
    font-size: 0.8rem;
    color: #6B7280;
  }

  /* Hide table when collapsed */
  :global(.sql-result-block.collapsed .result-table-wrapper) {
    display: none;
  }

  :global(.block-error) {
    padding: 1rem;
    background-color: rgba(220, 38, 38, 0.1);
    color: #fca5a5;
    margin: 2rem 0;
    border-radius: 8px;
    border: 1px solid rgba(220, 38, 38, 0.3);
  }

  :global(.result-table-wrapper) {
    border-top: 1px solid #374151;
  }

  /* Toolbar */
  :global(.result-toolbar) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background-color: #1F2937;
    border-bottom: 1px solid #374151;
  }

  :global(.toolbar-group) {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  :global(.toolbar-btn) {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.375rem 0.625rem;
    font-size: 0.75rem;
    color: #9CA3AF;
    background-color: transparent;
    border: 1px solid #374151;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.15s ease;
  }

  :global(.toolbar-btn:hover) {
    color: #F3F4F6;
    background-color: #374151;
    border-color: #4B5563;
  }

  :global(.toolbar-btn svg) {
    width: 14px;
    height: 14px;
  }

  :global(.toolbar-btn .btn-copied) {
    display: none;
    color: #10B981;
  }

  :global(.toolbar-btn.copied .btn-label) {
    display: none;
  }

  :global(.toolbar-btn.copied .btn-copied) {
    display: inline;
  }

  :global(.toolbar-btn.copied) {
    border-color: #10B981;
    color: #10B981;
  }

  /* Table scroll container */
  :global(.table-scroll) {
    overflow-x: auto;
    max-height: 400px;
    overflow-y: auto;
  }

  :global(.result-table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.875rem;
  }

  :global(.result-table thead) {
    background-color: #1F2937;
    position: sticky;
    top: 0;
    z-index: 1;
  }

  :global(.result-table th) {
    padding: 0.625rem 0.75rem;
    text-align: left;
    font-weight: 500;
    font-size: 0.75rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: #9CA3AF;
    border-bottom: 1px solid #4B5563;
    white-space: nowrap;
    position: relative;
    min-width: 80px;
    resize: horizontal;
    overflow: hidden;
  }

  :global(.result-table th::-webkit-resizer) {
    background: transparent;
  }

  :global(.result-table th::after) {
    content: '';
    position: absolute;
    right: 0;
    top: 25%;
    height: 50%;
    width: 3px;
    background: #4B5563;
    opacity: 0;
    transition: opacity 0.15s;
    border-radius: 2px;
  }

  :global(.result-table th:hover::after) {
    opacity: 1;
  }

  :global(.result-table th .th-content) {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  :global(.result-table td) {
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid #2D3748;
    color: #E5E7EB;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    font-size: 0.8125rem;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* Number cells - right aligned */
  :global(.result-table td.number-cell) {
    text-align: right;
    font-variant-numeric: tabular-nums;
  }

  /* Null cells - muted style */
  :global(.result-table td.null-cell) {
    color: #4B5563;
    font-style: normal;
    text-align: center;
  }

  /* Zebra striping */
  :global(.result-table tbody tr:nth-child(even)) {
    background-color: rgba(255, 255, 255, 0.015);
  }

  :global(.result-table tbody tr:hover) {
    background-color: rgba(59, 130, 246, 0.06);
  }

  /* Row density modes */
  :global(.sql-result-block.compact .result-table th) {
    padding: 0.375rem 0.5rem;
    font-size: 0.6875rem;
  }

  :global(.sql-result-block.compact .result-table td) {
    padding: 0.25rem 0.5rem;
    font-size: 0.75rem;
  }

  :global(.sql-result-block.compact .table-scroll) {
    max-height: 500px;
  }

  :global(.sql-result-block.relaxed .result-table th) {
    padding: 0.875rem 1rem;
    font-size: 0.8125rem;
  }

  :global(.sql-result-block.relaxed .result-table td) {
    padding: 0.75rem 1rem;
    font-size: 0.875rem;
  }

  :global(.sql-result-block.relaxed .table-scroll) {
    max-height: 350px;
  }

  :global(.density-label) {
    min-width: 48px;
    text-align: left;
  }

  /* Footer */
  :global(.table-footer) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.625rem 0.75rem;
    font-size: 0.75rem;
    color: #6B7280;
    background-color: #1F2937;
    border-top: 1px solid #374151;
  }

  :global(.page-info) {
    font-variant-numeric: tabular-nums;
  }

  /* Empty state */
  :global(.empty-state) {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 3rem 2rem;
    text-align: center;
  }

  :global(.empty-icon) {
    width: 48px;
    height: 48px;
    color: #4B5563;
    margin-bottom: 1rem;
  }

  :global(.empty-title) {
    font-size: 0.9375rem;
    font-weight: 500;
    color: #9CA3AF;
    margin: 0 0 0.25rem 0;
  }

  :global(.empty-description) {
    font-size: 0.8125rem;
    color: #6B7280;
    margin: 0;
  }

  /* Skeleton loading */
  :global(.sql-result-block.loading .sql-result-header) {
    cursor: default;
  }

  :global(.loading-spinner) {
    width: 14px;
    height: 14px;
    border: 2px solid #374151;
    border-top-color: #60A5FA;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  :global(.skeleton-table) {
    pointer-events: none;
  }

  :global(.skeleton-header),
  :global(.skeleton-cell) {
    height: 14px;
    background: linear-gradient(90deg, #374151 25%, #4B5563 50%, #374151 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
  }

  :global(.skeleton-header) {
    width: 80px;
  }

  :global(.skeleton-cell) {
    width: 100%;
    max-width: 120px;
  }

  :global(.skeleton-table tbody tr:nth-child(1) .skeleton-cell) { width: 90%; }
  :global(.skeleton-table tbody tr:nth-child(2) .skeleton-cell) { width: 75%; }
  :global(.skeleton-table tbody tr:nth-child(3) .skeleton-cell) { width: 85%; }
  :global(.skeleton-table tbody tr:nth-child(4) .skeleton-cell) { width: 60%; }
  :global(.skeleton-table tbody tr:nth-child(5) .skeleton-cell) { width: 70%; }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Chart blocks */
  :global(.chart-block) {
    margin: 2rem 0;
    padding: 1.5rem;
    background-color: #1F2937;
    border-radius: 8px;
    border: 1px solid #4B5563;
  }

  /* BigValue cards */
  :global(.bigvalue-card) {
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    min-width: 200px;
    margin: 2rem auto;
    max-width: 400px;
  }

  :global(.bigvalue-title) {
    font-size: 0.875rem;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  :global(.bigvalue-value) {
    font-size: 3rem;
    font-weight: 600;
    color: #F3F4F6;
    line-height: 1.2;
    margin: 0.5rem 0;
  }

  :global(.bigvalue-comparison) {
    font-size: 0.875rem;
    margin-top: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    font-weight: 500;
  }

  :global(.trend-icon) {
    font-size: 1rem;
    font-weight: bold;
  }

  :global(.trend-percent) {
    font-weight: 600;
  }

  :global(.trend-label) {
    opacity: 0.8;
    margin-left: 0.25rem;
  }

  /* Responsive */
  @media (max-width: 768px) {
    .report-renderer {
      padding: 1rem;
    }

    .report-content {
      max-width: 100%;
    }
  }
</style>
