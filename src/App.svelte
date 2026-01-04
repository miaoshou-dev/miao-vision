<script lang="ts">
  import { onMount } from 'svelte'
  import { SQLWorkspace } from './components/sql-workspace'
  import MarkdownEditor from './components/MarkdownEditor.svelte'
  import ReportToolbar from './components/ReportToolbar.svelte'
  import ReportRenderer from './components/ReportRenderer.svelte'
  import { databaseStore } from '@app/stores/database.svelte'
  import { connectionStore } from '@app/stores/connection.svelte'
  import { reportStore } from '@app/stores/report.svelte'
  import { chartStore } from '@app/stores/chart.svelte'
  import ConnectionsPage from './components/connections/ConnectionsPage.svelte'
  import { getInputStore } from '@app/stores/report-inputs'
  import type { InputStore } from '@app/stores/report-inputs'
  import { initializeMosaic } from '@core/database'
  import { reportExecutionService } from '@core/engine/report-execution.service'
  import { htmlExportService, shareService, staticSiteExporter, exportToMVR, parseMVR, MVR_EXTENSION } from '@core/export'
  import { exportToPDF } from '@/lib/export'
  import type { Report } from './types/report'
  import VersionHistory from './components/report/VersionHistory.svelte'
  import VersionCompare from './components/report/VersionCompare.svelte'
  import { versionStore } from '@app/stores/version.svelte'
  import PageTreeSidebar from './components/report/PageTreeSidebar.svelte'
  import AddPageDialog from './components/report/AddPageDialog.svelte'
  import StreamingDemo from './components/StreamingDemo.svelte'
  import HybridGNodeDemo from './components/HybridGNodeDemo.svelte'
  import WeatherStreamingDemo from './components/WeatherStreamingDemo.svelte'
  import CrossFilterDemo from './components/CrossFilterDemo.svelte'
  import DrilldownModal from './components/DrilldownModal.svelte'
  import DrilldownDemo from './components/DrilldownDemo.svelte'
  import { drilldownStore } from '@app/stores/drilldown.svelte'
  import { drilldownService } from '@core/engine/drilldown/drilldown-service'
  import AIGenerateDialog from './components/AIGenerateDialog.svelte'
  import { ReportGeneratorWizard } from './components/ai-report'
  import type { DataSourceInfo, ReportPlan } from '@core/ai'

  // Svelte 5 Runes mode
  let appTitle = $state('Miao Vision')
  let subtitle = $state('Local-First Analytics')
  let activeTab = $state<'workspace' | 'connections' | 'report' | 'streaming' | 'gnode' | 'weather' | 'crossfilter' | 'drilldown'>('workspace')

  // Report tab state
  let markdownEditor = $state<MarkdownEditor | null>(null)
  let isExecutingReport = $state(false)
  let isSavingReport = $state(false)
  let isExportingReport = $state(false)
  let isExportingPDF = $state(false)
  let isSharing = $state(false)
  let isExportingStaticSite = $state(false)
  let isExportingMVR = $state(false)
  let isImportingMVR = $state(false)
  let currentInputStore = $state<InputStore | null>(null)

  // Multi-page report state
  let showAddPageDialog = $state(false)

  // Sidebar new report menu state
  let showSidebarNewMenu = $state(false)

  // Version control state
  let showVersionHistory = $state(false)
  let showVersionCompare = $state(false)

  // AI generate dialog state
  let showAIGenerateDialog = $state(false)

  // AI Report Generator wizard state
  let showReportGenerator = $state(false)
  let availableDataSources = $state<DataSourceInfo[]>([])

  onMount(async () => {
    // Initialize database on mount
    try {
      await databaseStore.initialize()
      await initializeMosaic()
      console.log('Application initialized')

      // CRITICAL: Clear all block statuses on page load
      // DuckDB is in-memory, so tables don't persist across page refreshes
      // But localStorage saves block statuses, causing stale references
      if (reportStore.state.currentReport && reportStore.state.currentReport.blocks) {
        console.log('🧹 Clearing block statuses on app initialization...')
        reportStore.state.currentReport.blocks.forEach(block => {
          block.status = 'pending'
          block.chartConfig = undefined
          block.sqlResult = undefined
        })
        // Trigger reactivity
        reportStore.state.currentReport = { ...reportStore.state.currentReport }
        console.log('✅ Block statuses cleared - charts will show placeholder until Execute')
      }

      // Debug: Expose stores to window for debugging
      if (typeof window !== 'undefined') {
        (window as any).__DEBUG__ = {
          reportStore,
          databaseStore,
          chartStore
        }
        console.log('🔧 Debug tools available: window.__DEBUG__')
      }

      // Global keyboard shortcuts
      function handleGlobalKeydown(e: KeyboardEvent) {
        // Cmd+G (Mac) or Ctrl+G (Windows) - AI Generate
        if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
          e.preventDefault()
          if (activeTab === 'report' && reportStore.state.currentReport) {
            showAIGenerateDialog = true
          }
        }
      }

      window.addEventListener('keydown', handleGlobalKeydown)

      // Cleanup on unmount
      return () => {
        window.removeEventListener('keydown', handleGlobalKeydown)
      }
    } catch (error) {
      console.error('Failed to initialize application:', error)
    }
  })

  function setTab(tab: 'workspace' | 'connections' | 'report' | 'streaming' | 'gnode' | 'weather' | 'crossfilter' | 'drilldown') {
    activeTab = tab
  }

  // Report tab handlers
  function handleReportContentChange(content: string, reportId: string) {
    console.log('📝 handleReportContentChange called with reportId:', reportId)
    console.log('  current report id:', reportStore.state.currentReport?.id)

    const currentReport = reportStore.state.currentReport
    if (!currentReport) return

    // For multi-page reports, update the current page's content
    if (currentReport.type === 'multi-page') {
      const currentPage = reportStore.getCurrentPage()
      if (currentPage) {
        reportStore.updatePageContent(currentPage.id, content)
        console.log(`  Updated page ${currentPage.id} content`)
      }
    } else {
      // For single-page reports, update the report content
      reportStore.updateContent(content, reportId)
    }
  }

  // Sidebar new report menu handlers
  function handleCreateReportFromSidebar(type: 'single' | 'multi-page') {
    const defaultName = type === 'multi-page' ? 'Untitled Multi-Page Report' : 'New Report'
    const name = prompt('Enter report name:', defaultName)
    if (name) {
      const report = reportStore.createReport(name, undefined, type)
      handleSelectReport(report)
      setTab('report')
    }
    showSidebarNewMenu = false
  }

  function handleClickOutsideSidebarMenu(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('.sidebar-new-menu-container')) {
      showSidebarNewMenu = false
    }
  }

  // Multi-page report handlers
  function handleSelectPage(pageId: string) {
    reportStore.selectPage(pageId)
    console.log('📄 Selected page:', pageId)
  }

  function handleAddPage() {
    showAddPageDialog = true
  }

  function handleAddPageConfirm(title: string, slug: string, parentId?: string) {
    const newPage = reportStore.addPage(title, slug, parentId)
    if (newPage) {
      reportStore.selectPage(newPage.id)
      console.log('✅ Added and selected new page:', newPage.id)
    }
  }

  async function handleExecuteReport() {
    console.log('🚀 Execute button clicked!')

    if (!reportStore.state.currentReport) {
      console.error('No report to execute')
      alert('No report to execute')
      return
    }

    isExecutingReport = true

    try {
      const report = reportStore.state.currentReport

      // Get or create input store for this report
      const inputStore = getInputStore(report.id)
      currentInputStore = inputStore

      // Execute the report using the service
      const result = await reportExecutionService.executeReport(
        report,
        inputStore,
        (progress) => {
          reportStore.updateProgress(progress)
        },
        (updatedReport) => {
          // Update report state to trigger reactivity
          reportStore.state.currentReport = updatedReport
        }
      )

      if (result.success) {
        console.log('✅ Report executed successfully')

        // Store table mapping in report store
        if (result.tableMapping) {
          reportStore.state.tableMapping = result.tableMapping
        }

        // Save the updated report
        reportStore.saveReports()
      } else {
        console.error('❌ Report execution had errors:', result.errors)
        alert(`Report execution completed with ${result.failedBlocks} error(s)`)
      }
    } catch (error) {
      console.error('💥 Failed to execute report:', error)
      alert(`Failed to execute report: ${error instanceof Error ? error.message : error}`)
    } finally {
      isExecutingReport = false
    }
  }

  async function handleSaveReport() {
    if (!reportStore.state.currentReport || isSavingReport) {
      return
    }

    isSavingReport = true
    const report = reportStore.state.currentReport

    try {
      // Save to localStorage
      reportStore.saveReports()
      console.log('📝 Report saved to localStorage')

      // Create version snapshot
      const version = await versionStore.createVersion(
        report.id,
        report.content,
        'Manual save',
        false // not auto-save
      )

      if (version) {
        console.log(`✅ Created version ${version.version} for report ${report.id}`)
      }
    } catch (error) {
      console.error('❌ Failed to save/version report:', error)
    } finally {
      isSavingReport = false
    }
  }

  async function handleExportReport() {
    if (!reportStore.state.currentReport) {
      alert('No report to export')
      return
    }

    // Find the preview pane element
    const previewPane = document.querySelector('.preview-pane .report-renderer')
    if (!previewPane) {
      alert('Report preview not found. Please execute the report first.')
      return
    }

    isExportingReport = true

    try {
      await htmlExportService.export(previewPane as HTMLElement, {
        title: reportStore.state.currentReport.name,
        darkTheme: true,
        includeTimestamp: true
      })
      console.log('✅ Report exported successfully')
    } catch (error) {
      console.error('❌ Export failed:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      isExportingReport = false
    }
  }

  async function handleExportPDF() {
    if (!reportStore.state.currentReport) {
      alert('No report to export')
      return
    }

    // Find the preview pane element
    const previewPane = document.querySelector('.preview-pane .report-renderer')
    if (!previewPane) {
      alert('Report preview not found. Please execute the report first.')
      return
    }

    isExportingPDF = true

    try {
      await exportToPDF(previewPane as HTMLElement, {
        filename: reportStore.state.currentReport.name.replace(/\s+/g, '_'),
        format: 'a4',
        orientation: 'portrait'
      })
      console.log('✅ PDF exported successfully')
    } catch (error) {
      console.error('❌ PDF export failed:', error)
      alert(`PDF export failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      isExportingPDF = false
    }
  }

  async function handleShare() {
    if (!reportStore.state.currentReport) {
      alert('No report to share')
      return
    }

    const previewPane = document.querySelector('.preview-pane .report-renderer')
    if (!previewPane) {
      alert('Report preview not found. Please execute the report first.')
      return
    }

    isSharing = true

    try {
      const result = await shareService.share(
        previewPane as HTMLElement,
        reportStore.state.currentReport,
        {
          title: reportStore.state.currentReport.name,
          includeData: true,
          darkTheme: true
        }
      )

      if (result.success) {
        console.log('✅ Report shared successfully via', result.method)
        if (result.method === 'download') {
          alert('Report downloaded as shareable HTML file')
        }
      } else {
        console.warn('Share cancelled or failed:', result.error)
      }
    } catch (error) {
      console.error('❌ Share failed:', error)
      alert(`Share failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      isSharing = false
    }
  }

  async function handleExportStaticSite() {
    if (!reportStore.state.currentReport) {
      alert('No report to export')
      return
    }

    const previewPane = document.querySelector('.preview-pane .report-renderer')
    if (!previewPane) {
      alert('Report preview not found. Please execute the report first.')
      return
    }

    isExportingStaticSite = true

    try {
      await staticSiteExporter.downloadZip(
        previewPane as HTMLElement,
        reportStore.state.currentReport,
        {
          title: reportStore.state.currentReport.name,
          description: reportStore.state.currentReport.metadata?.description,
          darkTheme: true,
          separateDataFiles: true,
          includeSource: true,
          interactive: true  // Enable drilldown, sorting, filtering
        }
      )
      console.log('✅ Static site exported successfully')
    } catch (error) {
      console.error('❌ Static site export failed:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      isExportingStaticSite = false
    }
  }

  async function handleExportMVR() {
    if (!reportStore.state.currentReport) {
      alert('No report to export')
      return
    }

    isExportingMVR = true

    try {
      // Collect query results from executed blocks
      const queryResults = new Map<string, Record<string, unknown>[]>()
      const blocks = reportStore.state.currentReport.blocks || []

      for (const block of blocks) {
        const blockName = block.metadata?.name
        if (block.type === 'sql' && blockName && block.sqlResult?.rows) {
          queryResults.set(blockName, block.sqlResult.rows)
        }
      }

      // Export to MVR format
      const mvrContent = await exportToMVR(
        reportStore.state.currentReport,
        queryResults,
        {
          includeSql: true,
          includeData: true,
          compressData: false,
          includeColumnMeta: true
        }
      )

      // Download the file
      const blob = new Blob([mvrContent], { type: 'text/markdown' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${reportStore.state.currentReport.name}${MVR_EXTENSION}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      console.log('✅ MVR export successful')
    } catch (error) {
      console.error('❌ MVR export failed:', error)
      alert(`Export failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      isExportingMVR = false
    }
  }

  async function handleImportMVR() {
    isImportingMVR = true

    try {
      // Create file input
      const input = document.createElement('input')
      input.type = 'file'
      input.accept = MVR_EXTENSION

      const file = await new Promise<File | null>((resolve) => {
        input.onchange = () => {
          resolve(input.files?.[0] || null)
        }
        input.click()
      })

      if (!file) {
        isImportingMVR = false
        return
      }

      // Read file content
      const content = await file.text()

      // Parse MVR content
      const parseResult = parseMVR(content)

      if (!parseResult.success || !parseResult.report) {
        throw new Error(parseResult.errors?.join(', ') || 'Failed to parse MVR file')
      }

      // Import report using the store's importMarkdown function
      const report = reportStore.importMarkdown(
        parseResult.report.content,
        parseResult.report.metadata.name
      )

      // Get input store for the new report
      currentInputStore = getInputStore(report.id)

      // Load embedded data into DuckDB tables
      if (parseResult.report.data.length > 0) {
        const db = databaseStore.state.db
        if (db) {
          for (const dataBlock of parseResult.report.data) {
            if (dataBlock.data.length > 0) {
              const tableName = `mvr_${dataBlock.name}`
              try {
                // Create table from first row structure
                const columns = Object.keys(dataBlock.data[0])
                const columnDefs = columns.map(col => {
                  const value = dataBlock.data[0][col]
                  let sqlType = 'VARCHAR'
                  if (typeof value === 'number') {
                    sqlType = Number.isInteger(value) ? 'INTEGER' : 'DOUBLE'
                  } else if (typeof value === 'boolean') {
                    sqlType = 'BOOLEAN'
                  }
                  return `"${col}" ${sqlType}`
                }).join(', ')

                await db.run(`DROP TABLE IF EXISTS "${tableName}"`)
                await db.run(`CREATE TABLE "${tableName}" (${columnDefs})`)

                // Insert data
                for (const row of dataBlock.data) {
                  const values = columns.map(col => {
                    const v = row[col]
                    if (v === null || v === undefined) return 'NULL'
                    if (typeof v === 'number') return String(v)
                    if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
                    return `'${String(v).replace(/'/g, "''")}'`
                  }).join(', ')
                  await db.run(`INSERT INTO "${tableName}" VALUES (${values})`)
                }

                console.log(`✅ Created table: ${tableName} with ${dataBlock.data.length} rows`)
              } catch (err) {
                console.warn(`⚠️ Failed to create table ${tableName}:`, err)
              }
            }
          }
        }
      }

      console.log('✅ MVR import successful:', report.name)
      alert(`Imported report: ${report.name}`)
    } catch (error) {
      console.error('❌ MVR import failed:', error)
      alert(`Import failed: ${error instanceof Error ? error.message : error}`)
    } finally {
      isImportingMVR = false
    }
  }

  function handleVersionHistory() {
    console.log('📜 Opening version history')
    showVersionHistory = true
  }

  function handleVersionCompare() {
    console.log('⇄ Opening version compare')
    showVersionCompare = true
  }

  function handleAIGenerate() {
    console.log('✨ Opening AI generate dialog')
    showAIGenerateDialog = true
  }

  function handleAIInsert(content: string) {
    if (markdownEditor) {
      markdownEditor.insertText(content)
    }
  }

  // AI Report Generator handlers
  async function handleOpenReportGenerator() {
    console.log('🤖 Opening AI Report Generator')

    // Gather available data sources
    const sources: DataSourceInfo[] = []

    // 1. Get data from executed SQL blocks in current report
    const report = reportStore.state.currentReport
    if (report?.blocks) {
      for (let i = 0; i < report.blocks.length; i++) {
        const block = report.blocks[i]
        const sqlResult = block.sqlResult

        if (block.type === 'sql' && sqlResult) {
          const rows = sqlResult.data || []
          const columns = sqlResult.columns || (rows.length > 0 ? Object.keys(rows[0]) : [])
          const name = block.metadata?.name || `query_${i + 1}`

          if (Array.isArray(rows) && rows.length > 0) {
            sources.push({
              name,
              columns: columns.map((col: string) => ({
                name: col,
                type: inferColumnTypeForReport(rows[0]?.[col])
              })),
              rowCount: rows.length,
              sample: rows.slice(0, 5)
            })
          }
        }
      }
    }

    // 2. Get tables from DuckDB
    try {
      const db = databaseStore.getDuckDB()
      if (db) {
        const tablesResult = await db.query('SELECT table_name FROM information_schema.tables WHERE table_schema = \'main\'')
        const tables = tablesResult.toArray().map((row: { table_name: string }) => row.table_name)

        for (const tableName of tables) {
          // Skip if already in sources (from SQL blocks)
          if (sources.some(s => s.name === tableName)) continue

          // Get table info
          const columnsResult = await db.query(`DESCRIBE "${tableName}"`)
          const columns = columnsResult.toArray().map((row: { column_name: string; column_type: string }) => ({
            name: row.column_name,
            type: row.column_type
          }))

          const countResult = await db.query(`SELECT COUNT(*) as cnt FROM "${tableName}"`)
          const rowCount = Number(countResult.toArray()[0]?.cnt || 0)

          const sampleResult = await db.query(`SELECT * FROM "${tableName}" LIMIT 5`)
          const sample = sampleResult.toArray()

          sources.push({
            name: tableName,
            columns,
            rowCount,
            sample
          })
        }
      }
    } catch (error) {
      console.warn('Failed to get DuckDB tables:', error)
    }

    availableDataSources = sources
    showReportGenerator = true
  }

  function inferColumnTypeForReport(value: unknown): string {
    if (value === null || value === undefined) return 'unknown'
    if (typeof value === 'number') return 'number'
    if (typeof value === 'boolean') return 'boolean'
    if (typeof value === 'string') {
      if (/^\d{4}-\d{2}-\d{2}/.test(value)) return 'date'
      return 'string'
    }
    return 'unknown'
  }

  function handleReportGeneratorComplete(markdown: string, plan: ReportPlan, dataSources: DataSourceInfo[]) {
    console.log('📊 AI Report generated:', plan.title)

    // Add data source info to markdown front matter
    const dataSourceNames = dataSources.map(d => d.name)
    const frontMatter = `---
title: ${plan.title}
dataSources: [${dataSourceNames.join(', ')}]
---

`
    const markdownWithMeta = frontMatter + markdown

    // Create a new report with the generated content
    const report = reportStore.createReport(plan.title, markdownWithMeta)
    handleSelectReport(report)
    setTab('report')
    showReportGenerator = false
  }

  function handleReportGeneratorCancel() {
    showReportGenerator = false
  }

  function handleSelectReport(report: Report) {
    console.log('Selected report:', report.id)

    // Note: loadReport() is called BEFORE this function by ReportList
    // So currentReport is already set to the new (cloned) report

    // Get input store for the selected report
    currentInputStore = getInputStore(report.id)

    // CRITICAL: Reset all block statuses and clear chartConfigs on the CURRENT report
    // (which was already cloned by loadReport)
    // This prevents rendering charts with stale data when tables don't exist
    // (DuckDB is in-memory, so tables are cleared on page refresh)
    const currentReport = reportStore.state.currentReport
    if (currentReport && currentReport.blocks && currentReport.blocks.length > 0) {
      currentReport.blocks.forEach(block => {
        block.status = 'pending'
        delete block.chartConfig
        delete block.sqlResult
      })
      console.log('🧹 Cleared block statuses and configs (tables may not exist)')
    }

    // Clear execution state for this report (force fresh execution)
    reportExecutionService.clearExecutionState(report.id)

    console.log('🔄 Switched to new report - reactive execution disabled until first Execute')
  }

  // Debug: Log when currentReport changes (for debugging editor issues)
  $effect(() => {
    const report = reportStore.state.currentReport
    console.log('🟢 App.svelte $effect: currentReport changed')
    console.log('  report id:', report?.id || '(none)')
    console.log('  report name:', report?.name || '(none)')
    console.log('  report content length:', report?.content?.length || 0)
    console.log('  report content preview:', report?.content?.substring(0, 100) || '(empty)')
  })

  // Reactive execution: Re-execute affected SQL blocks when inputs change
  $effect(() => {
    if (!currentInputStore || !reportStore.state.currentReport) return

    console.log('🔄 Setting up reactive execution for report:', reportStore.state.currentReport.id)

    // Setup reactive execution using the service
    const unsubscribe = reportExecutionService.setupReactiveExecution(
      reportStore.state.currentReport,
      currentInputStore,
      (updatedReport) => {
        // Update report state to trigger reactivity
        reportStore.state.currentReport = updatedReport
      }
    )

    return () => {
      unsubscribe()
    }
  })

  // Wire up drilldown modal handler
  $effect(() => {
    drilldownService.onDrilldown('app-modal-handler', (event) => {
      if (event.config.action.type === 'modal') {
        const action = event.config.action as { type: 'modal'; titleTemplate?: string; displayColumns?: string[] }
        // Interpolate title template with row data
        let title = action.titleTemplate || 'Details'
        title = title.replace(/\{(\w+)\}/g, (_, key) => {
          const value = event.context.rowData[key]
          return value !== undefined ? String(value) : `{${key}}`
        })

        drilldownStore.showModal(title, event.context.rowData, {
          displayColumns: action.displayColumns,
          sourceComponent: event.context.sourceComponent,
          blockId: event.context.blockId
        })
      }
    })

    return () => {
      drilldownService.offDrilldown('app-modal-handler')
    }
  })
</script>

<svelte:window onclick={handleClickOutsideSidebarMenu} />

<main>
  <!-- Sidebar Navigation -->
  <aside class="sidebar">
    <div class="sidebar-header">
      <h1 class="sidebar-logo">{appTitle}</h1>
      <p class="sidebar-subtitle">{subtitle}</p>
    </div>

    <nav class="sidebar-nav">
      <button
        class="nav-item"
        class:active={activeTab === 'workspace'}
        onclick={() => setTab('workspace')}
      >
        <span class="nav-label">Workspace</span>
      </button>

      <button
        class="nav-item"
        class:active={activeTab === 'connections'}
        onclick={() => setTab('connections')}
      >
        <span class="nav-label">Connections</span>
        {#if connectionStore.state.connections.some(c => c.status === 'connected')}
          <span class="connection-indicator"></span>
        {/if}
      </button>

      <button
        class="nav-item"
        class:active={activeTab === 'streaming'}
        onclick={() => setTab('streaming')}
      >
        <span class="nav-label">🔴 Streaming</span>
      </button>

      <button
        class="nav-item"
        class:active={activeTab === 'gnode'}
        onclick={() => setTab('gnode')}
      >
        <span class="nav-label">⚡ Hybrid GNode</span>
      </button>

      <button
        class="nav-item"
        class:active={activeTab === 'weather'}
        onclick={() => setTab('weather')}
      >
        <span class="nav-label">🌡️ Weather</span>
      </button>

      <button
        class="nav-item"
        class:active={activeTab === 'crossfilter'}
        onclick={() => setTab('crossfilter')}
      >
        <span class="nav-label">🔗 CrossFilter</span>
      </button>

      <button
        class="nav-item"
        class:active={activeTab === 'drilldown'}
        onclick={() => setTab('drilldown')}
      >
        <span class="nav-label">🔍 Drilldown</span>
      </button>

      <div class="nav-section">
        <div class="nav-section-header">
          <span class="nav-section-title">Reports</span>
          <div class="sidebar-new-menu-container">
            <button
              class="btn-new-report"
              onclick={() => showSidebarNewMenu = !showSidebarNewMenu}
              disabled={!databaseStore.state.initialized}
              title="Create New Report"
            >
              +
            </button>
            {#if showSidebarNewMenu}
              <div class="sidebar-new-menu">
                <button
                  class="sidebar-menu-item"
                  onclick={() => handleCreateReportFromSidebar('single')}
                >
                  <span class="menu-icon">📄</span>
                  <span>Single Page</span>
                </button>
                <button
                  class="sidebar-menu-item"
                  onclick={() => handleCreateReportFromSidebar('multi-page')}
                >
                  <span class="menu-icon">📚</span>
                  <span>Multi-Page</span>
                </button>
                <div class="sidebar-menu-divider"></div>
                <button
                  class="sidebar-menu-item ai-report"
                  onclick={() => {
                    showSidebarNewMenu = false
                    handleOpenReportGenerator()
                  }}
                >
                  <span class="menu-icon">✨</span>
                  <span>AI Report</span>
                </button>
              </div>
            {/if}
          </div>
        </div>

        <div class="report-list" role="listbox" aria-label="Reports">
          {#each reportStore.state.reports as report}
            <div
              class="report-item"
              class:active={activeTab === 'report' && reportStore.state.currentReport?.id === report.id}
              role="option"
              aria-selected={activeTab === 'report' && reportStore.state.currentReport?.id === report.id}
            >
              <button
                type="button"
                class="report-select-btn"
                onclick={() => {
                  // IMPORTANT: Must call loadReport first to clone the report
                  reportStore.loadReport(report.id)
                  handleSelectReport(report)
                  setTab('report')
                }}
              >
                <span class="report-name">{report.name}</span>
              </button>
              <button
                type="button"
                class="btn-delete-report"
                onclick={() => {
                  if (confirm('Delete this report?')) {
                    reportStore.deleteReport(report.id)
                  }
                }}
                title="Delete"
                aria-label="Delete report"
              >
                ×
              </button>
            </div>
          {/each}
        </div>
      </div>
    </nav>

    <div class="sidebar-footer">
      {#if databaseStore.state.loading}
        <span class="status-badge loading">Loading</span>
      {:else if databaseStore.state.initialized}
        <span class="status-badge ready">Ready</span>
      {:else}
        <span class="status-badge error">Error</span>
      {/if}
    </div>
  </aside>

  <!-- Main Content Area -->
  <div class="main-wrapper">
    <header class="top-header">
      <h2 class="page-title">
        {#if activeTab === 'workspace'}Data Workspace
        {:else if activeTab === 'connections'}Connections
        {:else if activeTab === 'report'}Markdown Reports
        {/if}
      </h2>
    </header>

    <div class="content" class:content-report={activeTab === 'report'} class:content-workspace={activeTab === 'workspace'}>
      {#if databaseStore.state.error}
        <div class="error-banner">
          <strong>Error:</strong> {databaseStore.state.error}
        </div>
      {/if}

      {#if activeTab === 'workspace'}
        <div class="page-container workspace-page">
          <SQLWorkspace />
        </div>
      {:else if activeTab === 'connections'}
        <div class="page-container connections-page">
          <ConnectionsPage />
        </div>
      {:else if activeTab === 'streaming'}
        <div class="page-container streaming-page">
          <StreamingDemo />
        </div>
      {:else if activeTab === 'gnode'}
        <div class="page-container gnode-page">
          <HybridGNodeDemo />
        </div>
      {:else if activeTab === 'weather'}
        <div class="page-container weather-page">
          <WeatherStreamingDemo />
        </div>
      {:else if activeTab === 'crossfilter'}
        <div class="page-container crossfilter-page">
          <CrossFilterDemo />
        </div>
      {:else if activeTab === 'drilldown'}
        <div class="page-container drilldown-page">
          <DrilldownDemo />
        </div>
      {:else if activeTab === 'report'}
        <div class="page-container report-layout">
          <div class="report-container">
            {#if reportStore.state.currentReport}
              <ReportToolbar
                bind:editor={markdownEditor}
                onExecute={handleExecuteReport}
                onSave={handleSaveReport}
                onExport={handleExportReport}
                onExportPDF={handleExportPDF}
                onShare={handleShare}
                onExportStaticSite={handleExportStaticSite}
                onExportMVR={handleExportMVR}
                onImportMVR={handleImportMVR}
                onAIGenerate={handleAIGenerate}
                onVersionHistory={handleVersionHistory}
                onVersionCompare={handleVersionCompare}
                isExecuting={isExecutingReport}
                isSaving={isSavingReport}
                isExporting={isExportingReport}
                isExportingPDF={isExportingPDF}
                isSharing={isSharing}
                isExportingStaticSite={isExportingStaticSite}
                isExportingMVR={isExportingMVR}
                isImportingMVR={isImportingMVR}
              />

              <div class="report-workspace" class:multi-page={reportStore.state.currentReport.type === 'multi-page'}>
                <!-- Multi-page: Show page tree sidebar -->
                {#if reportStore.state.currentReport.type === 'multi-page'}
                  <PageTreeSidebar
                    pages={reportStore.state.currentReport.pages || []}
                    currentPageId={reportStore.state.currentReport.currentPageId}
                    onSelectPage={handleSelectPage}
                    onAddPage={handleAddPage}
                  />
                {/if}

                <div class="editor-pane">
                  <div class="pane-header">
                    <h3>📝 Editor</h3>
                    {#if reportStore.state.currentReport.type === 'multi-page'}
                      {@const currentPage = reportStore.getCurrentPage()}
                      {#if currentPage}
                        <span class="current-page-title">— {currentPage.title}</span>
                      {/if}
                    {/if}
                  </div>
                  {#key reportStore.state.currentReport.type === 'multi-page' ? reportStore.getCurrentPage()?.id : reportStore.state.currentReport.id}
                    <MarkdownEditor
                      bind:this={markdownEditor}
                      value={reportStore.state.currentReport.type === 'multi-page'
                        ? (reportStore.getCurrentPage()?.content || '')
                        : reportStore.state.currentReport.content}
                      reportId={reportStore.state.currentReport.id}
                      onChange={handleReportContentChange}
                      onAIGenerate={handleAIGenerate}
                      height="calc(100vh - 300px)"
                    />
                  {/key}
                </div>

                <div class="preview-pane">
                  <div class="pane-header">
                    <h3>👁️ Preview</h3>
                  </div>
                  {#if reportStore.state.currentReport.type === 'multi-page'}
                    {@const currentPage = reportStore.getCurrentPage()}
                    {@const previewReport = {
                      ...reportStore.state.currentReport,
                      content: currentPage?.content || ''
                    }}
                    <ReportRenderer
                      report={previewReport}
                      inputStore={currentInputStore}
                      tableMapping={reportStore.state.tableMapping}
                    />
                  {:else}
                    <ReportRenderer
                      report={reportStore.state.currentReport}
                      inputStore={currentInputStore}
                      tableMapping={reportStore.state.tableMapping}
                    />
                  {/if}
                </div>
              </div>
            {:else}
              <div class="empty-state-large">
                <div class="icon">📝</div>
                <h3>No Report Selected</h3>
                <p>Create a new report or select one from the list to get started.</p>
                <button
                  class="btn-nav"
                  onclick={() => reportStore.createReport('New Report')}
                >
                  Create Report →
                </button>
              </div>
            {/if}
          </div>

          <!-- Version Control Modals -->
          {#if reportStore.state.currentReport}
            <VersionHistory
              reportId={reportStore.state.currentReport.id}
              bind:show={showVersionHistory}
            />

            <VersionCompare
              reportId={reportStore.state.currentReport.id}
              bind:show={showVersionCompare}
            />

            <!-- Multi-page Report: Add Page Dialog -->
            {#if reportStore.state.currentReport.type === 'multi-page'}
              <AddPageDialog
                show={showAddPageDialog}
                pages={reportStore.state.currentReport.pages || []}
                onClose={() => showAddPageDialog = false}
                onConfirm={handleAddPageConfirm}
              />
            {/if}
          {/if}
        </div>
      {/if}
    </div>
  </div>
</main>

<!-- Global Drilldown Modal -->
<DrilldownModal />

<!-- AI Generate Dialog -->
<AIGenerateDialog
  visible={showAIGenerateDialog}
  onClose={() => showAIGenerateDialog = false}
  onInsert={handleAIInsert}
/>

<!-- AI Report Generator Wizard -->
{#if showReportGenerator}
  <ReportGeneratorWizard
    availableSources={availableDataSources}
    onComplete={handleReportGeneratorComplete}
    onCancel={handleReportGeneratorCancel}
  />
{/if}

<style>
  /* ========================================
   * Main Layout - Sidebar + Content
   * ======================================== */

  main {
    display: flex;
    min-height: 100vh;
    background-color: #030712;
    margin: 0;
    padding: 0;
  }

  /* ========================================
   * Sidebar Styles
   * ======================================== */

  .sidebar {
    width: 16rem; /* 256px */
    height: 100vh;
    position: fixed;
    left: 0;
    top: 0;
    background-color: #111827;
    border-right: 1px solid #1F2937;
    display: flex;
    flex-direction: column;
    z-index: 40;
  }

  .sidebar-header {
    padding: 2rem 1.5rem 1.5rem;
    border-bottom: 1px solid #1F2937;
  }

  .sidebar-logo {
    margin: 0;
    font-size: 1.375rem;
    font-weight: 700;
    letter-spacing: -0.02em;
    /* Gemini gradient text */
    background: linear-gradient(90deg, #4285F4 0%, #A855F7 50%, #EC4899 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }

  .sidebar-subtitle {
    margin: 0.5rem 0 0 0;
    color: #6B7280;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .sidebar-nav {
    flex: 1;
    padding: 1.5rem 0;
    overflow-y: auto;
  }

  .nav-item {
    width: 100%;
    display: flex;
    align-items: center;
    padding: 0.75rem 1.5rem;
    background: none;
    border: none;
    border-left: 3px solid transparent;
    color: #9CA3AF;
    font-size: 0.9375rem;
    font-weight: 500;
    text-align: left;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .nav-item:hover:not(:disabled) {
    background-color: #1F2937;
    color: #F3F4F6;
    transform: translateX(2px);
  }

  .nav-item:focus-visible {
    outline: 2px solid #4285F4;
    outline-offset: -2px;
  }

  .nav-item.active {
    background-color: rgba(66, 133, 244, 0.1);
    border-left-color: #4285F4;
    color: #F3F4F6;
    font-weight: 600;
  }

  .nav-item:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .nav-label {
    flex: 1;
  }

  .connection-indicator {
    width: 8px;
    height: 8px;
    background-color: #22C55E;
    border-radius: 50%;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  /* Nav Section (for Reports) */
  .nav-section {
    margin-top: 1.5rem;
    padding-top: 1.5rem;
    border-top: 1px solid #1F2937;
  }

  .nav-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem 0.75rem;
  }

  .nav-section-title {
    font-size: 0.6875rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    color: #6B7280;
  }

  .btn-new-report {
    width: 1.5rem;
    height: 1.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.375rem;
    color: #9CA3AF;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .btn-new-report:hover:not(:disabled) {
    background-color: #374151;
    color: #F3F4F6;
    border-color: #4285F4;
    transform: scale(1.05);
  }

  .btn-new-report:focus-visible {
    outline: 2px solid #4285F4;
    outline-offset: 2px;
  }

  .btn-new-report:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .sidebar-new-menu-container {
    position: relative;
  }

  .sidebar-new-menu {
    position: absolute;
    top: calc(100% + 0.5rem);
    right: 0;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 0.5rem;
    box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
    z-index: 1000;
    min-width: 160px;
    animation: slideDown 0.2s ease-out;
  }

  @keyframes slideDown {
    from {
      opacity: 0;
      transform: translateY(-0.5rem);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  .sidebar-menu-item {
    width: 100%;
    padding: 0.625rem 0.875rem;
    background: transparent;
    border: none;
    color: #F3F4F6;
    font-size: 0.8125rem;
    text-align: left;
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 0.625rem;
    transition: all 0.2s;
  }

  .sidebar-menu-item:first-child {
    border-radius: 0.5rem 0.5rem 0 0;
  }

  .sidebar-menu-item:last-child {
    border-radius: 0 0 0.5rem 0.5rem;
  }

  .sidebar-menu-item:hover {
    background: linear-gradient(135deg, rgba(66, 133, 244, 0.1) 0%, rgba(236, 72, 153, 0.1) 100%);
  }

  .sidebar-menu-item .menu-icon {
    font-size: 1rem;
  }

  .sidebar-menu-divider {
    height: 1px;
    background: #374151;
    margin: 4px 0;
  }

  .sidebar-menu-item.ai-report {
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.1) 0%, rgba(167, 139, 250, 0.1) 100%);
  }

  .sidebar-menu-item.ai-report:hover {
    background: linear-gradient(135deg, rgba(96, 165, 250, 0.2) 0%, rgba(167, 139, 250, 0.2) 100%);
  }

  .report-list {
    max-height: 300px;
    overflow-y: auto;
    scrollbar-width: thin;
    scrollbar-color: #374151 transparent;
  }

  .report-list::-webkit-scrollbar {
    width: 6px;
  }

  .report-list::-webkit-scrollbar-track {
    background: transparent;
  }

  .report-list::-webkit-scrollbar-thumb {
    background-color: #374151;
    border-radius: 3px;
    transition: background-color 0.2s ease;
  }

  .report-list::-webkit-scrollbar-thumb:hover {
    background-color: #4B5563;
  }

  .report-item {
    width: 100%;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 1.5rem 0 0;
    background: none;
    border: none;
    border-left: 3px solid transparent;
    color: #9CA3AF;
    font-size: 0.875rem;
    text-align: left;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    gap: 0.5rem;
  }

  .report-select-btn {
    flex: 1;
    display: flex;
    align-items: center;
    padding: 0.5rem 0 0.5rem 1.5rem;
    background: none;
    border: none;
    color: inherit;
    font-size: inherit;
    text-align: left;
    cursor: pointer;
  }

  .report-item:hover:not(.active) {
    background-color: #1F2937;
    color: #F3F4F6;
    transform: translateX(2px);
  }

  .report-item:focus-visible {
    outline: 2px solid #4285F4;
    outline-offset: -2px;
  }

  .report-item.active {
    background-color: rgba(66, 133, 244, 0.1);
    border-left-color: #4285F4;
    color: #F3F4F6;
    font-weight: 600;
  }

  .report-name {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .btn-delete-report {
    width: 1.25rem;
    height: 1.25rem;
    display: none;
    align-items: center;
    justify-content: center;
    padding: 0;
    background: none;
    border: none;
    border-radius: 0.25rem;
    color: #6B7280;
    font-size: 1.25rem;
    cursor: pointer;
    line-height: 1;
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .report-item:hover .btn-delete-report {
    display: flex;
    animation: fadeIn 0.15s ease-out;
  }

  @keyframes fadeIn {
    from {
      opacity: 0;
      transform: scale(0.8);
    }
    to {
      opacity: 1;
      transform: scale(1);
    }
  }

  .btn-delete-report:hover {
    background-color: rgba(239, 68, 68, 0.1);
    color: #F87171;
    transform: scale(1.1);
  }

  .btn-delete-report:focus-visible {
    outline: 2px solid #EF4444;
    outline-offset: 2px;
  }

  .sidebar-footer {
    padding: 1rem 1.5rem;
    border-top: 1px solid #1F2937;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.625rem;
    border-radius: 0.375rem;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.025em;
  }

  .status-badge.ready {
    background-color: rgba(34, 197, 94, 0.1);
    color: #4ADE80;
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .status-badge.loading {
    background-color: rgba(245, 158, 11, 0.1);
    color: #FBBF24;
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  .status-badge.error {
    background-color: rgba(239, 68, 68, 0.1);
    color: #F87171;
    border: 1px solid rgba(239, 68, 68, 0.2);
  }

  /* ========================================
   * Main Wrapper (Content Area)
   * ======================================== */

  .main-wrapper {
    flex: 1;
    margin-left: 16rem; /* Match sidebar width */
    margin-top: 0;
    margin-bottom: 0;
    margin-right: 0;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .top-header {
    margin: 0;
    padding: 1.5rem 2rem 1rem;
    background-color: #030712;
    border-bottom: 1px solid #1F2937;
  }

  .page-title {
    margin: 0;
    font-size: 1.625rem;
    font-weight: 600;
    letter-spacing: -0.015em;
    color: #F3F4F6;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    background-color: #030712;
    position: relative;
  }

  .content-report {
    position: relative;
    overflow: hidden;
  }

  .content-workspace {
    overflow: hidden;
  }

  .page-container {
    max-width: 80rem; /* 1280px */
    margin: 0 auto;
    padding: 2rem;
  }

  .page-container.workspace-page {
    max-width: none;
    padding: 0;
    height: 100%;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
  }

  .page-container.connections-page {
    max-width: none;
    padding: 0;
    background-color: #030712;
    min-height: calc(100vh - 120px);
  }

  .error-banner {
    padding: 1rem 1.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 12px;
    color: #FCA5A5;
    margin-bottom: 1.5rem;
  }

  /* ========================================
   * Empty States
   * ======================================== */

  .empty-state-large {
    text-align: center;
    padding: 4rem 2rem;
  }

  .empty-state-large .icon {
    font-size: 3rem;
    margin-bottom: 1rem;
    opacity: 0.2;
  }

  .empty-state-large h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.25rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .empty-state-large p {
    margin: 0 0 1.5rem 0;
    color: #9CA3AF;
    font-size: 0.875rem;
  }

  .btn-nav {
    padding: 0.625rem 1.5rem;
    background: linear-gradient(135deg, #4285F4 0%, #8B5CF6 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-weight: 500;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .btn-nav:hover {
    background: linear-gradient(135deg, #3B78E7 0%, #7C4FDB 100%);
    box-shadow: 0 2px 8px rgba(66, 133, 244, 0.3);
  }

  /* ========================================
   * Report Layout
   * ======================================== */

  .report-layout {
    max-width: none;
    padding: 0;
    margin: 0;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    flex-direction: column;
  }

  .report-container {
    display: flex;
    flex-direction: column;
    flex: 1;
    overflow: hidden;
  }

  .report-workspace {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0;
    flex: 1;
    overflow: hidden;
  }

  /* Multi-page layout: sidebar + editor + preview */
  .report-workspace.multi-page {
    grid-template-columns: 250px 1fr 1fr;
  }

  .editor-pane,
  .preview-pane {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .editor-pane {
    border-right: 1px solid #1F2937;
    background-color: #111827;
  }

  .pane-header {
    padding: 0.75rem 1rem;
    background-color: #0F172A;
    border-bottom: 1px solid #1F2937;
    flex-shrink: 0;
  }

  .pane-header h3 {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .current-page-title {
    margin-left: 0.5rem;
    font-size: 0.8125rem;
    font-weight: 400;
    color: #60A5FA;
    text-transform: none;
  }

  .preview-pane {
    overflow-y: auto;
    background-color: #030712;
  }

  /* ========================================
   * Responsive Design
   * ======================================== */

  /* Tablet and below (1024px) */
  @media (max-width: 1024px) {
    .sidebar {
      position: fixed;
      z-index: 50;
      transform: translateX(-100%);
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 2px 0 8px rgba(0, 0, 0, 0.3);
    }

    .main-wrapper {
      margin-left: 0;
    }

    .top-header {
      padding: 1rem 1.5rem 0.75rem;
    }

    .page-title {
      font-size: 1.375rem;
    }

    .report-workspace {
      grid-template-columns: 1fr;
    }

    .editor-pane {
      border-right: none;
      border-bottom: 1px solid #1F2937;
      min-height: 400px;
    }

    .preview-pane {
      min-height: 400px;
    }
  }

  /* Mobile (768px) */
  @media (max-width: 768px) {
    .top-header {
      padding: 0.75rem 1rem 0.5rem;
    }

    .page-title {
      font-size: 1.25rem;
    }

    .report-workspace {
      gap: 0;
    }

    .editor-pane,
    .preview-pane {
      min-height: 300px;
    }
  }

  /* Small Mobile (480px) */
  @media (max-width: 480px) {
    .top-header {
      padding: 0.5rem 0.75rem 0.375rem;
    }

    .page-title {
      font-size: 1.125rem;
    }

    .sidebar {
      width: 100%;
    }

    .nav-item,
    .report-item {
      padding: 0.625rem 1rem;
    }
  }
</style>
