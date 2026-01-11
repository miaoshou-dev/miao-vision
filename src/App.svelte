<script lang="ts">
  import { onMount } from 'svelte'
  import { SQLWorkspace } from './components/sql-workspace'
  import { databaseStore } from '@app/stores/database.svelte'
  import { reportStore } from '@app/stores/report.svelte'
  import ConnectionsPage from './components/connections/ConnectionsPage.svelte'
  import type { InputStore } from '@app/stores/report-inputs'
  import { initializeMosaic } from '@core/database'
  import { reportExecutionService } from '@core/engine/report-execution.service'
  import type { Report } from './types/report'
  import { versionStore } from '@app/stores/version.svelte'

  // Demo pages
  import StreamingDemo from './components/StreamingDemo.svelte'
  import HybridGNodeDemo from './components/HybridGNodeDemo.svelte'
  import WeatherStreamingDemo from './components/WeatherStreamingDemo.svelte'
  import CrossFilterDemo from './components/CrossFilterDemo.svelte'
  import DrilldownDemo from './components/DrilldownDemo.svelte'
  import InfographicDemo from './components/InfographicDemo.svelte'

  // Modals
  import DrilldownModal from './components/DrilldownModal.svelte'
  import AIGenerateDialog from './components/AIGenerateDialog.svelte'
  import { drilldownStore } from '@app/stores/drilldown.svelte'
  import { drilldownService } from '@core/engine/drilldown/drilldown-service'

  // AI Report Generator
  import { ReportGeneratorWizard } from './components/ai-report'
  import type { DataSourceInfo, ReportPlan } from '@core/ai'

  // Refactored components
  import { AppSidebar, ReportPage } from './components/app'
  import {
    handleReportContentChange,
    handleSelectReport as selectReport,
    executeReport,
    type ReportHandlerContext
  } from './components/app/logic/report-handlers'
  import { gatherDataSources } from './components/app/logic/ai-report-sources'

  // Types
  type TabType = 'workspace' | 'connections' | 'report' | 'streaming' | 'gnode' | 'weather' | 'crossfilter' | 'drilldown' | 'infographic'

  // App state
  let appTitle = $state('Miao Vision')
  let subtitle = $state('Local-First Analytics')
  let activeTab = $state<TabType>('workspace')

  // Report state
  let isExecutingReport = $state(false)
  let isSavingReport = $state(false)
  let isExportingReport = $state(false)
  let isExportingPDF = $state(false)
  let isSharing = $state(false)
  let isExportingStaticSite = $state(false)
  let isExportingMVR = $state(false)
  let isImportingMVR = $state(false)
  let currentInputStore = $state<InputStore | null>(null)

  // Dialog state
  let showAIGenerateDialog = $state(false)
  let showReportGenerator = $state(false)
  let availableDataSources = $state<DataSourceInfo[]>([])

  // Handler context for pure functions
  const handlerContext: ReportHandlerContext = {
    setExecuting: (v) => isExecutingReport = v,
    setSaving: (v) => isSavingReport = v,
    setExporting: (v) => isExportingReport = v,
    setExportingPDF: (v) => isExportingPDF = v,
    setSharing: (v) => isSharing = v,
    setExportingStaticSite: (v) => isExportingStaticSite = v,
    setExportingMVR: (v) => isExportingMVR = v,
    setImportingMVR: (v) => isImportingMVR = v,
    setCurrentInputStore: (s) => currentInputStore = s
  }

  // Initialize app
  onMount(() => {
    const init = async () => {
      try {
        await databaseStore.initialize()
        await initializeMosaic()

        // Clear stale block statuses
        if (reportStore.state.currentReport?.blocks) {
          reportStore.state.currentReport.blocks.forEach(block => {
            block.status = 'pending'
            block.chartConfig = undefined
            block.sqlResult = undefined
          })
          reportStore.state.currentReport = { ...reportStore.state.currentReport }
        }
      } catch (error) {
        console.error('Failed to initialize:', error)
      }
    }
    init()

    // Global keyboard shortcuts
    const handleKeydown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'g') {
        e.preventDefault()
        if (activeTab === 'report' && reportStore.state.currentReport) {
          showAIGenerateDialog = true
        }
      }
    }
    window.addEventListener('keydown', handleKeydown)
    return () => window.removeEventListener('keydown', handleKeydown)
  })

  // Tab handlers
  function setTab(tab: TabType) {
    activeTab = tab
  }

  // Report handlers
  function handleSelectReport(report: Report) {
    selectReport(report, handlerContext)
  }

  function handleCreateReport(type: 'single' | 'multi-page') {
    const name = prompt('Enter report name:', type === 'multi-page' ? 'Untitled Multi-Page Report' : 'New Report')
    if (name) {
      const report = reportStore.createReport(name, undefined, type)
      handleSelectReport(report)
      setTab('report')
    }
  }

  async function handleExecuteReport() {
    await executeReport(handlerContext)
  }

  async function handleSaveReport() {
    if (!reportStore.state.currentReport || isSavingReport) return
    isSavingReport = true
    try {
      reportStore.saveReports()
      await versionStore.createVersion(
        reportStore.state.currentReport.id,
        reportStore.state.currentReport.content,
        'Manual save',
        false
      )
    } finally {
      isSavingReport = false
    }
  }

  // AI Report Generator
  async function handleOpenReportGenerator() {
    availableDataSources = await gatherDataSources()
    showReportGenerator = true
  }

  function handleReportGeneratorComplete(markdown: string, plan: ReportPlan, dataSources: DataSourceInfo[]) {
    const dataSourceNames = dataSources.map(d => d.name)
    const frontMatter = `---\ntitle: ${plan.title}\ndataSources: [${dataSourceNames.join(', ')}]\n---\n\n`
    const report = reportStore.createReport(plan.title, frontMatter + markdown)
    handleSelectReport(report)
    setTab('report')
    showReportGenerator = false
  }

  // Reactive execution
  $effect(() => {
    if (!currentInputStore || !reportStore.state.currentReport) return
    const unsubscribe = reportExecutionService.setupReactiveExecution(
      reportStore.state.currentReport,
      currentInputStore,
      (updatedReport) => { reportStore.state.currentReport = updatedReport }
    )
    return () => unsubscribe()
  })

  // Drilldown modal handler
  $effect(() => {
    drilldownService.onDrilldown('app-modal-handler', (event) => {
      if (event.config.action.type === 'modal') {
        const action = event.config.action as { type: 'modal'; titleTemplate?: string; displayColumns?: string[] }
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
    return () => drilldownService.offDrilldown('app-modal-handler')
  })
</script>

<main>
  <AppSidebar
    {appTitle}
    {subtitle}
    {activeTab}
    onTabChange={setTab}
    onSelectReport={handleSelectReport}
    onCreateReport={handleCreateReport}
    onDeleteReport={(id) => reportStore.deleteReport(id)}
    onOpenReportGenerator={handleOpenReportGenerator}
  />

  <div class="main-wrapper">
    <header class="top-header">
      <h2 class="page-title">
        {#if activeTab === 'workspace'}Data Workspace
        {:else if activeTab === 'connections'}Connections
        {:else if activeTab === 'report'}Markdown Reports
        {:else if activeTab === 'streaming'}Streaming Demo
        {:else if activeTab === 'gnode'}Hybrid GNode
        {:else if activeTab === 'weather'}Weather Demo
        {:else if activeTab === 'crossfilter'}CrossFilter Demo
        {:else if activeTab === 'drilldown'}Drilldown Demo
        {:else if activeTab === 'infographic'}Infographic Demo
        {/if}
      </h2>
    </header>

    <div class="content" class:content-report={activeTab === 'report'}>
      {#if databaseStore.state.error}
        <div class="error-banner">
          <strong>Error:</strong> {databaseStore.state.error}
        </div>
      {/if}

      {#if activeTab === 'workspace'}
        <div class="page-container workspace-page"><SQLWorkspace /></div>
      {:else if activeTab === 'connections'}
        <div class="page-container"><ConnectionsPage /></div>
      {:else if activeTab === 'streaming'}
        <div class="page-container"><StreamingDemo /></div>
      {:else if activeTab === 'gnode'}
        <div class="page-container"><HybridGNodeDemo /></div>
      {:else if activeTab === 'weather'}
        <div class="page-container"><WeatherStreamingDemo /></div>
      {:else if activeTab === 'crossfilter'}
        <div class="page-container"><CrossFilterDemo /></div>
      {:else if activeTab === 'drilldown'}
        <div class="page-container"><DrilldownDemo /></div>
      {:else if activeTab === 'infographic'}
        <div class="page-container"><InfographicDemo /></div>
      {:else if activeTab === 'report'}
        <div class="page-container report-layout">
          <ReportPage
            {currentInputStore}
            tableMapping={Object.fromEntries(reportStore.state.tableMapping)}
            isExecuting={isExecutingReport}
            isSaving={isSavingReport}
            isExporting={isExportingReport}
            isExportingPDF={isExportingPDF}
            {isSharing}
            {isExportingStaticSite}
            {isExportingMVR}
            {isImportingMVR}
            onExecute={handleExecuteReport}
            onSave={handleSaveReport}
            onExport={() => {}}
            onExportPDF={() => {}}
            onShare={() => {}}
            onExportStaticSite={() => {}}
            onExportMVR={() => {}}
            onImportMVR={() => {}}
            onAIGenerate={() => showAIGenerateDialog = true}
            onContentChange={handleReportContentChange}
          />
        </div>
      {/if}
    </div>
  </div>
</main>

<DrilldownModal />

<AIGenerateDialog
  visible={showAIGenerateDialog}
  onClose={() => showAIGenerateDialog = false}
  onInsert={() => {}}
/>

{#if showReportGenerator}
  <ReportGeneratorWizard
    availableSources={availableDataSources}
    onComplete={handleReportGeneratorComplete}
    onCancel={() => showReportGenerator = false}
    onImportData={() => { showReportGenerator = false; setTab('workspace') }}
    onLoadSampleData={() => {}}
  />
{/if}

<style>
  main {
    display: flex;
    min-height: 100vh;
    background-color: #030712;
  }

  .main-wrapper {
    flex: 1;
    margin-left: 240px;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }

  .top-header {
    padding: 1.5rem 2rem 1rem;
    background-color: #030712;
    border-bottom: 1px solid #1F2937;
  }

  .page-title {
    margin: 0;
    font-size: 1.625rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .content {
    flex: 1;
    overflow-y: auto;
    background-color: #030712;
  }

  .content-report {
    overflow: hidden;
  }

  .page-container {
    max-width: 80rem;
    margin: 0 auto;
    padding: 2rem;
  }

  .page-container.workspace-page {
    max-width: none;
    padding: 0;
    height: calc(100vh - 80px);
  }

  .page-container.report-layout {
    max-width: none;
    padding: 0;
    height: calc(100vh - 80px);
  }

  .error-banner {
    padding: 1rem 1.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 8px;
    color: #FCA5A5;
    margin: 1rem 2rem;
  }

  @media (max-width: 1024px) {
    .main-wrapper {
      margin-left: 0;
    }
  }
</style>
