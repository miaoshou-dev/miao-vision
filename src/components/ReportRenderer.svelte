<script lang="ts">
  /**
   * Report Renderer Component
   *
   * Renders markdown reports with embedded SQL results and charts.
   */
  import { tick } from 'svelte'
  import type { Report } from '@/types/report'
  import type { ParsedCodeBlock } from '@/types/report'
  import { parseMarkdown } from '@core/markdown/parser'
  import { blockRenderer } from '@core/engine/block-renderer'
  import type { InputStore } from '@app/stores/report-inputs'
  import MissingDataSources from './MissingDataSources.svelte'

  // Pure logic functions
  import {
    findMissingDataSources,
    hasReportChanged,
    getContentToRender,
    clearChartElements,
    calculateRenderStats,
    logRenderDebug
  } from './report/logic'

  interface Props {
    report: Report | null
    inputStore?: InputStore | null
    tableMapping?: Map<string, string>
  }

  let { report, inputStore = null, tableMapping }: Props = $props()

  // State
  let renderedHTML = $state<string>('')
  let error = $state<string | null>(null)
  let contentContainer = $state<HTMLDivElement | null>(null)
  let chartElements: HTMLElement[] = []
  let isRendering = false
  let parsedCodeBlocks: ParsedCodeBlock[] = []
  let lastRenderedReportId = $state<string | null>(null)
  let missingDataSources = $state<string[]>([])

  // Re-render when report or blocks change
  $effect(() => {
    if (report && contentContainer) {
      const stats = calculateRenderStats(report)
      const tableMappingSize = tableMapping?.size || 0
      logRenderDebug('ReportRenderer $effect', stats, tableMappingSize)
      renderReport()
    }
  })

  async function renderReport() {
    if (!report || isRendering) return

    // Detect report switch
    if (hasReportChanged(lastRenderedReportId, report.id)) {
      console.log(`🔄 Report switched: ${lastRenderedReportId} → ${report.id}`)
      resetRenderState()
    }
    lastRenderedReportId = report.id

    // Check for missing data sources
    missingDataSources = findMissingDataSources(report, tableMapping)
    if (missingDataSources.length > 0) {
      console.log('⚠️ Missing data sources:', missingDataSources)
    }

    isRendering = true
    console.log('📄 renderReport() called for report:', report.id)

    try {
      error = null

      // Parse markdown
      const contentToRender = getContentToRender(report)
      const parsed = await parseMarkdown(contentToRender, {
        interpolate: true,
        context: { ...report.metadata }
      })

      renderedHTML = parsed.html
      parsedCodeBlocks = parsed.codeBlocks
      console.log('  ✅ Markdown parsed, HTML length:', renderedHTML.length)

      await tick()

      // Set innerHTML directly
      if (contentContainer) {
        const markdownContent = contentContainer.querySelector('.markdown-content')
        if (markdownContent) {
          markdownContent.innerHTML = renderedHTML
          await tick()
        }
      }

      // Mount blocks
      await mountBlocksToPlaceholders()
    } catch (err) {
      console.error('❌ Failed to render report:', err)
      error = err instanceof Error ? err.message : 'Failed to render report'
    } finally {
      isRendering = false
    }
  }

  function resetRenderState() {
    renderedHTML = ''
    parsedCodeBlocks = []
    clearChartElements(chartElements)
    chartElements = []
    if (contentContainer) {
      const markdownContent = contentContainer.querySelector('.markdown-content')
      if (markdownContent) {
        markdownContent.innerHTML = ''
      }
    }
  }

  async function mountBlocksToPlaceholders() {
    if (!contentContainer || !report) return

    await blockRenderer.mountBlocks(contentContainer, {
      report,
      parsedBlocks: parsedCodeBlocks,
      inputStore,
      chartElements,
      tableMapping
    })
  }

  // Cleanup on unmount
  $effect(() => {
    return () => {
      clearChartElements(chartElements)
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
      <div class="markdown-content"></div>
    </div>
  {/if}
</div>

<style>
  @import './report/ReportRendererStyles.css';
</style>
