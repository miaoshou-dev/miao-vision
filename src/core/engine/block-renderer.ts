/**
 * Block Renderer
 *
 * Unified renderer for all block types in reports
 * Handles mounting blocks to DOM placeholders
 */

import type { Report, ReportBlock, ParsedCodeBlock } from '@/types/report'
import type { IInputStore } from '@/types/interfaces'
import { get } from 'svelte/store'
import { componentRegistry } from '@core/registry'
import { placeholderFactory } from '@core/registry'

/**
 * Render context for blocks
 */
export interface BlockRenderContext {
  report: Report
  parsedBlocks: ParsedCodeBlock[]
  inputStore: IInputStore | null
  chartElements: HTMLElement[]
  tableMapping?: Map<string, string>
}

/**
 * Block Renderer
 * Handles mounting all types of blocks to the DOM
 */
export class BlockRenderer {
  /**
   * Mount all blocks to their placeholders
   */
  async mountBlocks(
    container: HTMLElement,
    context: BlockRenderContext
  ): Promise<void> {
    console.log('📌 BlockRenderer: Mounting blocks to placeholders...')

    // Remove old chart DOM elements
    if (context.chartElements.length > 0) {
      console.log(`  Removing ${context.chartElements.length} old chart elements from DOM...`)
      context.chartElements.forEach(el => {
        if (el.parentNode) {
          el.parentNode.removeChild(el)
        }
      })
      context.chartElements.length = 0
      console.log('  ✅ Chart elements removed')
    }

    // Find all placeholders in the rendered content
    const markdownContent = container.querySelector('.markdown-content')
    const placeholders = markdownContent?.querySelectorAll('.block-placeholder') || []

    console.log(`Found ${placeholders.length} placeholders to process`)

    for (const placeholder of Array.from(placeholders)) {
      const blockId = placeholder.getAttribute('data-block-id')
      const blockType = placeholder.getAttribute('data-block-type')

      if (!blockId || !blockType) {
        console.log('  ⚠️ Placeholder missing blockId or blockType, skipping')
        continue
      }

      console.log(`\n🔧 Processing ${blockType} block: ${blockId}`)

      // Find corresponding block in report.blocks
      const block = context.report.blocks.find(b => b.id === blockId)

      // Special case: SQL result tables (not using ComponentRegistry)
      if (blockType === 'sql') {
        this.mountSQLBlock(placeholder, block)
        continue
      }

      // Get component registration from ComponentRegistry
      const registration = componentRegistry.get(blockType)

      if (!registration) {
        // Block type not registered - show placeholder
        this.handleUnregisteredBlock(placeholder, block, blockId, blockType)
        continue
      }

      // Mount component using ComponentRegistry
      await this.mountComponent(
        placeholder,
        blockId,
        blockType,
        registration,
        block,
        context
      )
    }
  }

  /**
   * Mount SQL result table
   */
  private mountSQLBlock(placeholder: Element, block: ReportBlock | undefined): void {
    if (!block) return

    if (block.sqlResult) {
      const tableHTML = this.generateSQLResultHTML(block)
      placeholder.outerHTML = tableHTML
      console.log(`  ✅ SQL table mounted with ${block.sqlResult.rowCount} rows`)
    } else if (block.status === 'executing') {
      // Show skeleton loading state
      const skeletonHTML = this.generateSkeletonHTML(block.metadata?.name || 'Query')
      placeholder.outerHTML = skeletonHTML
    } else {
      console.log(`  SQL block has no result yet`)
    }
  }

  /**
   * Generate skeleton loading HTML
   */
  private generateSkeletonHTML(name: string): string {
    const skeletonRows = Array(5).fill(null).map(() => `
      <tr>
        <td><div class="skeleton-cell"></div></td>
        <td><div class="skeleton-cell"></div></td>
        <td><div class="skeleton-cell"></div></td>
        <td><div class="skeleton-cell"></div></td>
      </tr>
    `).join('')

    return `
      <div class="sql-result-block loading" id="skeleton-${Date.now()}">
        <div class="sql-result-header">
          <span class="header-left">
            <span class="loading-spinner"></span>
            <span class="block-label">${name}</span>
            <span class="row-count">Loading...</span>
          </span>
        </div>
        <div class="result-table-wrapper">
          <div class="table-scroll">
            <table class="result-table skeleton-table">
              <thead>
                <tr>
                  <th><div class="skeleton-header"></div></th>
                  <th><div class="skeleton-header"></div></th>
                  <th><div class="skeleton-header"></div></th>
                  <th><div class="skeleton-header"></div></th>
                </tr>
              </thead>
              <tbody>
                ${skeletonRows}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `
  }

  /**
   * Handle unregistered block types
   */
  private handleUnregisteredBlock(
    placeholder: Element,
    block: ReportBlock | undefined,
    blockId: string,
    blockType: string
  ): void {
    if (!block) {
      console.log(`  Block ${blockId} not found and type "${blockType}" not registered`)
      if (placeholder instanceof HTMLElement) {
        placeholder.innerHTML = placeholderFactory.pendingHTML(blockType)
      }
    } else if (block.error) {
      placeholder.outerHTML = placeholderFactory.errorHTML(block.error, blockType)
    }
  }

  /**
   * Mount a component using ComponentRegistry
   */
  private async mountComponent(
    placeholder: Element,
    blockId: string,
    blockType: string,
    registration: any,
    block: ReportBlock | undefined,
    context: BlockRenderContext
  ): Promise<void> {
    // Find the parsed block from markdown
    const parsedBlock = context.parsedBlocks.find(cb => cb.id === blockId)

    if (!parsedBlock) {
      console.log(`  Parsed block not found for ${blockId}`)
      if (placeholder instanceof HTMLElement) {
        placeholder.innerHTML = placeholderFactory.pendingHTML(blockType)
      }
      return
    }

    // Check if chart needs to be executed first
    const chartTypes = ['chart', 'histogram', 'line', 'area', 'bar', 'scatter', 'pie']
    if (chartTypes.includes(blockType) && block) {
      if (block.status !== 'success') {
        console.log(`  ⏸️ Chart not executed yet (status: ${block.status})`)
        this.mountChartPlaceholder(placeholder)
        return
      }
    }

    try {
      // Create render context
      const renderContext = {
        blocks: context.report.blocks,
        inputs: context.inputStore ? get(context.inputStore) : {},
        metadata: context.report.metadata,
        inputStore: context.inputStore,
        tableMapping: context.tableMapping || new Map()
      }

      console.log(`  Calling parser for ${blockType}...`)
      // Parse block into component props.
      const props = registration.parser(parsedBlock, renderContext)

      // Handle case where parser returns null (data dependencies not available)
      if (!props) {
        console.log(`  ⏸️ ${blockType} data not available yet (parser returned null)`)
        this.mountComponentPlaceholder(placeholder, blockType)
        return
      }

      console.log(`  Creating container and calling renderer...`)
      // Create container
      const containerElement = document.createElement('div')
      if (chartTypes.includes(blockType)) {
        containerElement.className = 'chart-block'
        containerElement.id = `chart-${blockId}`
      }

      // Render component
      await registration.renderer(containerElement, props, renderContext)

      // Track chart containers for cleanup
      if (chartTypes.includes(blockType)) {
        context.chartElements.push(containerElement)
      }

      // Replace placeholder with rendered component
      placeholder.replaceWith(containerElement)
      console.log(`  ✅ ${blockType} mounted successfully`)
    } catch (err) {
      console.error(`  ❌ Failed to mount ${blockType}:`, err)
      if (placeholder instanceof HTMLElement) {
        placeholder.outerHTML = placeholderFactory.errorHTML(
          err instanceof Error ? err.message : 'Failed to render',
          blockType
        )
      }
    }
  }

  /**
   * Mount chart placeholder for unexecuted charts
   */
  private mountChartPlaceholder(placeholder: Element): void {
    const chartContainer = document.createElement('div')
    chartContainer.className = 'chart-block'
    chartContainer.innerHTML = placeholderFactory.chartHTML()
    placeholder.replaceWith(chartContainer)
  }

  /**
   * Mount component placeholder for components whose data isn't available
   */
  private mountComponentPlaceholder(placeholder: Element, componentType: string): void {
    const container = document.createElement('div')
    container.innerHTML = placeholderFactory.pendingHTML(componentType)
    placeholder.replaceWith(container)
  }

  /**
   * Generate HTML for SQL result table with collapsible wrapper
   */
  private generateSQLResultHTML(block: ReportBlock): string {
    if (!block.sqlResult) return ''

    const { columns, data, rowCount } = block.sqlResult
    const blockId = `result-${block.id}`
    const blockName = block.metadata?.name || 'Query Result'

    // Empty state
    if (rowCount === 0) {
      return `
        <div class="sql-result-block" id="${blockId}">
          <button class="sql-result-header" onclick="this.parentElement.classList.toggle('collapsed')" type="button">
            <span class="header-left">
              <span class="collapse-icon">▶</span>
              <span class="block-label">${blockName}</span>
              <span class="row-count">0 rows</span>
            </span>
            <span class="header-right">
              ${block.executionTime ? `<span class="execution-time">${block.executionTime.toFixed(1)}ms</span>` : ''}
            </span>
          </button>
          <div class="result-table-wrapper">
            <div class="empty-state">
              <svg class="empty-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <path d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/>
              </svg>
              <p class="empty-title">No results</p>
              <p class="empty-description">The query returned no data</p>
            </div>
          </div>
        </div>
      `
    }

    const displayRows = data.slice(0, 100)
    const showingAll = rowCount <= 100

    const headerRow = columns.map(col => `<th><span class="th-content">${col}</span></th>`).join('')
    const bodyRows = displayRows.map((row, idx) => {
      const cells = columns.map(col => {
        const value = row[col]
        if (value === null || value === undefined) {
          return `<td class="null-cell">—</td>`
        }
        // Right-align numbers
        const isNumber = typeof value === 'number'
        const formattedValue = isNumber ? value.toLocaleString() : String(value)
        return `<td${isNumber ? ' class="number-cell"' : ''}>${this.escapeHtml(formattedValue)}</td>`
      }).join('')
      return `<tr data-row="${idx}">${cells}</tr>`
    }).join('')

    // Toolbar with copy and density buttons
    const toolbar = `
      <div class="result-toolbar">
        <div class="toolbar-group">
          <button class="toolbar-btn density-btn" onclick="const block=this.closest('.sql-result-block');const modes=['compact','normal','relaxed'];const current=modes.find(m=>block.classList.contains(m))||'normal';const next=modes[(modes.indexOf(current)+1)%3];modes.forEach(m=>block.classList.remove(m));block.classList.add(next);this.querySelector('.density-label').textContent=next.charAt(0).toUpperCase()+next.slice(1)" title="Toggle row density">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
            <span class="density-label">Normal</span>
          </button>
        </div>
        <div class="toolbar-group">
          <button class="toolbar-btn" onclick="navigator.clipboard.writeText(this.closest('.sql-result-block').querySelector('table').innerText).then(() => { this.classList.add('copied'); setTimeout(() => this.classList.remove('copied'), 1500) })" title="Copy to clipboard">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/>
            </svg>
            <span class="btn-label">Copy</span>
            <span class="btn-copied">Copied!</span>
          </button>
        </div>
      </div>
    `

    // Footer with pagination info
    const footerContent = showingAll
      ? `<span class="page-info">${rowCount.toLocaleString()} row${rowCount !== 1 ? 's' : ''}</span>`
      : `<span class="page-info">Showing 1-100 of ${rowCount.toLocaleString()} rows</span>`

    return `
      <div class="sql-result-block collapsed" id="${blockId}">
        <button class="sql-result-header" onclick="this.parentElement.classList.toggle('collapsed')" type="button">
          <span class="header-left">
            <span class="collapse-icon">▶</span>
            <span class="block-label">${blockName}</span>
            <span class="row-count">${rowCount.toLocaleString()} rows</span>
          </span>
          <span class="header-right">
            ${block.executionTime ? `<span class="execution-time">${block.executionTime.toFixed(1)}ms</span>` : ''}
            <span class="columns-count">${columns.length} cols</span>
          </span>
        </button>
        <div class="result-table-wrapper">
          ${toolbar}
          <div class="table-scroll">
            <table class="result-table">
              <thead>
                <tr>${headerRow}</tr>
              </thead>
              <tbody>
                ${bodyRows}
              </tbody>
            </table>
          </div>
          <div class="table-footer">
            ${footerContent}
          </div>
        </div>
      </div>
    `
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(str: string): string {
    const htmlEscapes: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }
    return str.replace(/[&<>"']/g, char => htmlEscapes[char])
  }
}

/**
 * Singleton instance
 */
export const blockRenderer = new BlockRenderer()
