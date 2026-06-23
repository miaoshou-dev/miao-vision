<script lang="ts">
  import { onMount } from 'svelte'
  import { databaseStore } from '@app/stores/database.svelte'
  import { reportStore } from '@app/stores/report.svelte'
  import type { InputStore } from '@app/stores/report-inputs'
  import { reportExecutionService } from '@core/engine/report-execution.service'
  import type { Report } from './types/report'
  import { versionStore } from '@app/stores/version.svelte'

  import InfographicDemo from './components/InfographicDemo.svelte'
  import ArticleToInfographicDemo from './components/ArticleToInfographicDemo.svelte'
  import LandingPage from './components/LandingPage.svelte'

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
  type TabType = 'landing' | 'report' | 'infographic' | 'article-ai'

  // App state
  let appTitle = $state('Miao Vision')
  let subtitle = $state('Local-First Analytics')
  let activeTab = $state<TabType>('landing')

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

        // Clear stale block statuses
        if (reportStore.state.currentReport?.blocks) {
          reportStore.state.currentReport.blocks.forEach(block => {
            block.status = 'pending'
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
</script>

<main>
  {#if activeTab !== 'landing'}
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
  {/if}

  <div class="main-wrapper">
    <div class="content" class:content-report={activeTab === 'report'} class:content-full={activeTab !== 'landing'}>
      {#if databaseStore.state.error}
        <div class="error-banner">
          <strong>Error:</strong> {databaseStore.state.error}
        </div>
      {/if}

      {#if activeTab === 'landing'}
        <div class="page-container landing-page"><LandingPage onNavigate={setTab} /></div>
      {:else if activeTab === 'infographic'}
        <div class="page-container"><InfographicDemo /></div>
      {:else if activeTab === 'article-ai'}
        <div class="page-container"><ArticleToInfographicDemo /></div>
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
            onContentChange={handleReportContentChange}
          />
        </div>
      {/if}
    </div>
  </div>
</main>

{#if showReportGenerator}
  <ReportGeneratorWizard
    availableSources={availableDataSources}
    onComplete={handleReportGeneratorComplete}
    onCancel={() => showReportGenerator = false}
    onImportData={() => { showReportGenerator = false; setTab('article-ai') }}
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
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    min-width: 0; /* Prevent flex item from overflowing */
  }

  .content {
    flex: 1;
    overflow-y: auto;
    background-color: #030712;
  }

  .content-report {
    overflow: hidden;
  }

  .content-full {
    height: 100vh;
  }

  .page-container {
    max-width: 80rem;
    margin: 0 auto;
    padding: 1.5rem;
    height: 100%;
  }

  .page-container.report-layout {
    max-width: none;
    padding: 0;
    height: 100vh;
  }

  .page-container.landing-page {
    max-width: none;
    padding: 0;
    height: 100vh;
    overflow-y: auto;
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
    /* Responsive adjustments for smaller screens */
  }
</style>
