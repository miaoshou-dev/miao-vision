<script lang="ts">
  import MarkdownEditor from '../MarkdownEditor.svelte'
  import ReportToolbar from '../ReportToolbar.svelte'
  import ReportRenderer from '../ReportRenderer.svelte'
  import PageTreeSidebar from '../report/PageTreeSidebar.svelte'
  import AddPageDialog from '../report/AddPageDialog.svelte'
  import VersionHistory from '../report/VersionHistory.svelte'
  import VersionCompare from '../report/VersionCompare.svelte'
  import { reportStore } from '@app/stores/report.svelte'
  import type { InputStore } from '@app/stores/report-inputs'

  interface Props {
    currentInputStore: InputStore | null
    tableMapping: Record<string, string> | undefined
    isExecuting: boolean
    isSaving: boolean
    isExporting: boolean
    isExportingPDF: boolean
    isSharing: boolean
    isExportingStaticSite: boolean
    isExportingMVR: boolean
    isImportingMVR: boolean
    onExecute: () => void
    onSave: () => void
    onExport: () => void
    onExportPDF: () => void
    onShare: () => void
    onExportStaticSite: () => void
    onExportMVR: () => void
    onImportMVR: () => void
    onAIGenerate: () => void
    onContentChange: (content: string, reportId: string) => void
  }

  let {
    currentInputStore,
    tableMapping,
    isExecuting,
    isSaving,
    isExporting,
    isExportingPDF,
    isSharing,
    isExportingStaticSite,
    isExportingMVR,
    isImportingMVR,
    onExecute,
    onSave,
    onExport,
    onExportPDF,
    onShare,
    onExportStaticSite,
    onExportMVR,
    onImportMVR,
    onAIGenerate,
    onContentChange
  }: Props = $props()

  // Local state
  let markdownEditor = $state<MarkdownEditor | null>(null)
  let showAddPageDialog = $state(false)
  let showVersionHistory = $state(false)
  let showVersionCompare = $state(false)

  // Handlers
  function handleSelectPage(pageId: string) {
    reportStore.selectPage(pageId)
  }

  function handleAddPage() {
    showAddPageDialog = true
  }

  function handleAddPageConfirm(title: string, slug: string, parentId?: string) {
    const newPage = reportStore.addPage(title, slug, parentId)
    if (newPage) {
      reportStore.selectPage(newPage.id)
    }
  }

  function handleVersionHistory() {
    showVersionHistory = true
  }

  function handleVersionCompare() {
    showVersionCompare = true
  }

  // Derived state
  let currentReport = $derived(reportStore.state.currentReport)
  let currentPage = $derived(reportStore.getCurrentPage())
  let isMultiPage = $derived(currentReport?.type === 'multi-page')

  let editorContent = $derived(
    isMultiPage ? (currentPage?.content || '') : (currentReport?.content || '')
  )

  let previewReport = $derived(
    isMultiPage && currentReport
      ? { ...currentReport, content: currentPage?.content || '' }
      : currentReport
  )
</script>

<div class="report-container">
  {#if currentReport}
    <ReportToolbar
      bind:editor={markdownEditor}
      onExecute={onExecute}
      onSave={onSave}
      onExport={onExport}
      onExportPDF={onExportPDF}
      onShare={onShare}
      onExportStaticSite={onExportStaticSite}
      onExportMVR={onExportMVR}
      onImportMVR={onImportMVR}
      onAIGenerate={onAIGenerate}
      onVersionHistory={handleVersionHistory}
      onVersionCompare={handleVersionCompare}
      isExecuting={isExecuting}
      isSaving={isSaving}
      isExporting={isExporting}
      isExportingPDF={isExportingPDF}
      isSharing={isSharing}
      isExportingStaticSite={isExportingStaticSite}
      isExportingMVR={isExportingMVR}
      isImportingMVR={isImportingMVR}
    />

    <div class="report-workspace" class:multi-page={isMultiPage}>
      <!-- Multi-page: Show page tree sidebar -->
      {#if isMultiPage}
        <PageTreeSidebar
          pages={currentReport.pages || []}
          currentPageId={currentReport.currentPageId}
          onSelectPage={handleSelectPage}
          onAddPage={handleAddPage}
        />
      {/if}

      <div class="editor-pane">
        <div class="pane-header">
          <h3>📝 Editor</h3>
          {#if isMultiPage && currentPage}
            <span class="current-page-title">— {currentPage.title}</span>
          {/if}
        </div>
        {#key isMultiPage ? currentPage?.id : currentReport.id}
          <MarkdownEditor
            bind:this={markdownEditor}
            value={editorContent}
            reportId={currentReport.id}
            onChange={onContentChange}
            onAIGenerate={onAIGenerate}
            height="calc(100vh - 300px)"
          />
        {/key}
      </div>

      <div class="preview-pane">
        <div class="pane-header">
          <h3>👁️ Preview</h3>
        </div>
        {#if previewReport}
          <ReportRenderer
            report={previewReport}
            inputStore={currentInputStore}
            tableMapping={tableMapping}
          />
        {/if}
      </div>
    </div>

    <!-- Version Control Modals -->
    <VersionHistory
      reportId={currentReport.id}
      bind:show={showVersionHistory}
    />

    <VersionCompare
      reportId={currentReport.id}
      bind:show={showVersionCompare}
    />

    <!-- Multi-page Report: Add Page Dialog -->
    {#if isMultiPage}
      <AddPageDialog
        show={showAddPageDialog}
        pages={currentReport.pages || []}
        onClose={() => showAddPageDialog = false}
        onConfirm={handleAddPageConfirm}
      />
    {/if}
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

<style>
  .report-container {
    flex: 1;
    display: flex;
    flex-direction: column;
    height: 100%;
    overflow: hidden;
  }

  .report-workspace {
    flex: 1;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    padding: 1rem;
    overflow: hidden;
  }

  .report-workspace.multi-page {
    grid-template-columns: 200px 1fr 1fr;
  }

  .editor-pane,
  .preview-pane {
    display: flex;
    flex-direction: column;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    overflow: hidden;
  }

  .pane-header {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    background: #111827;
    border-bottom: 1px solid #374151;
  }

  .pane-header h3 {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .current-page-title {
    font-size: 0.75rem;
    color: #9CA3AF;
  }

  .empty-state-large {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 100%;
    text-align: center;
    color: #9CA3AF;
  }

  .empty-state-large .icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .empty-state-large h3 {
    margin: 0 0 0.5rem 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #F3F4F6;
  }

  .empty-state-large p {
    margin: 0 0 1.5rem 0;
    font-size: 0.875rem;
  }

  .btn-nav {
    padding: 0.75rem 1.5rem;
    background: linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%);
    border: none;
    border-radius: 8px;
    color: white;
    font-size: 0.875rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-nav:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
  }

  @media (max-width: 1024px) {
    .report-workspace {
      grid-template-columns: 1fr;
      grid-template-rows: 1fr 1fr;
    }

    .report-workspace.multi-page {
      grid-template-columns: 1fr;
      grid-template-rows: auto 1fr 1fr;
    }
  }
</style>
