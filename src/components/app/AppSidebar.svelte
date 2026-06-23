<script lang="ts">
  import { databaseStore } from '@app/stores/database.svelte'
  import { reportStore } from '@app/stores/report.svelte'
  import type { Report } from '@/types/report'

  type TabType = 'report' | 'infographic' | 'article-ai'

  interface Props {
    appTitle: string
    subtitle: string
    activeTab: TabType
    onTabChange: (tab: TabType) => void
    onSelectReport: (report: Report) => void
    onCreateReport: (type: 'single' | 'multi-page') => void
    onDeleteReport: (reportId: string) => void
    onOpenReportGenerator: () => void
  }

  let {
    appTitle,
    subtitle,
    activeTab,
    onTabChange,
    onSelectReport,
    onCreateReport,
    onDeleteReport,
    onOpenReportGenerator
  }: Props = $props()

  let showSidebarNewMenu = $state(false)

  function handleClickOutsideMenu(event: MouseEvent) {
    const target = event.target as HTMLElement
    if (!target.closest('.sidebar-new-menu-container')) {
      showSidebarNewMenu = false
    }
  }

  function handleCreateReportFromSidebar(type: 'single' | 'multi-page') {
    onCreateReport(type)
    showSidebarNewMenu = false
  }
</script>

<svelte:window onclick={handleClickOutsideMenu} />

<aside class="sidebar">
  <div class="sidebar-header">
    <h1 class="sidebar-logo">{appTitle}</h1>
    <p class="sidebar-subtitle">{subtitle}</p>
  </div>

  <nav class="sidebar-nav">
    <button
      class="nav-item"
      class:active={activeTab === 'article-ai'}
      onclick={() => onTabChange('article-ai')}
    >
      <span class="nav-label">AI Infographic</span>
    </button>

    <button
      class="nav-item"
      class:active={activeTab === 'infographic'}
      onclick={() => onTabChange('infographic')}
    >
      <span class="nav-label">Chart Gallery</span>
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
                  onOpenReportGenerator()
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
                reportStore.loadReport(report.id)
                onSelectReport(report)
                onTabChange('report')
              }}
            >
              <span class="report-name">{report.name}</span>
            </button>
            <button
              type="button"
              class="btn-delete-report"
              onclick={() => {
                if (confirm('Delete this report?')) {
                  onDeleteReport(report.id)
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

<style>
  .sidebar {
    width: 240px;
    min-width: 240px;
    height: 100vh;
    background: #111827;
    border-right: 1px solid #374151;
    display: flex;
    flex-direction: column;
  }

  .sidebar-header {
    padding: 1.5rem;
    border-bottom: 1px solid #374151;
  }

  .sidebar-logo {
    font-size: 1.25rem;
    font-weight: 700;
    color: #F9FAFB;
    margin: 0;
  }

  .sidebar-subtitle {
    font-size: 0.75rem;
    color: #9CA3AF;
    margin: 0.25rem 0 0 0;
  }

  .sidebar-nav {
    flex: 1;
    overflow-y: auto;
    padding: 1rem;
  }

  .nav-item {
    display: flex;
    align-items: center;
    width: 100%;
    padding: 0.75rem 1rem;
    margin-bottom: 0.25rem;
    background: transparent;
    border: none;
    border-radius: 6px;
    color: #D1D5DB;
    font-size: 0.875rem;
    cursor: pointer;
    transition: all 0.2s;
    text-align: left;
  }

  .nav-item:hover {
    background: #1F2937;
    color: #F9FAFB;
  }

  .nav-item.active {
    background: #3B82F6;
    color: white;
  }

  .nav-label {
    flex: 1;
  }

  .nav-section {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid #374151;
  }

  .nav-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 0.5rem;
    margin-bottom: 0.5rem;
  }

  .nav-section-title {
    font-size: 0.75rem;
    font-weight: 600;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .sidebar-new-menu-container {
    position: relative;
  }

  .btn-new-report {
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #374151;
    border: none;
    border-radius: 4px;
    color: #D1D5DB;
    font-size: 1rem;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-new-report:hover:not(:disabled) {
    background: #4B5563;
    color: white;
  }

  .btn-new-report:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .sidebar-new-menu {
    position: absolute;
    top: 100%;
    right: 0;
    margin-top: 0.25rem;
    background: #1F2937;
    border: 1px solid #374151;
    border-radius: 8px;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
    z-index: 50;
    min-width: 160px;
    overflow: hidden;
  }

  .sidebar-menu-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.75rem 1rem;
    background: transparent;
    border: none;
    color: #D1D5DB;
    font-size: 0.875rem;
    cursor: pointer;
    transition: background 0.2s;
    text-align: left;
  }

  .sidebar-menu-item:hover {
    background: #374151;
    color: white;
  }

  .sidebar-menu-item.ai-report {
    color: #A78BFA;
  }

  .sidebar-menu-item.ai-report:hover {
    background: #4C1D95;
    color: white;
  }

  .menu-icon {
    font-size: 1rem;
  }

  .sidebar-menu-divider {
    height: 1px;
    background: #374151;
    margin: 0.25rem 0;
  }

  .report-list {
    max-height: 300px;
    overflow-y: auto;
  }

  .report-item {
    display: flex;
    align-items: center;
    border-radius: 6px;
    transition: background 0.2s;
  }

  .report-item:hover {
    background: #1F2937;
  }

  .report-item.active {
    background: #1E3A5F;
  }

  .report-select-btn {
    flex: 1;
    padding: 0.5rem 0.75rem;
    background: transparent;
    border: none;
    color: #D1D5DB;
    font-size: 0.875rem;
    cursor: pointer;
    text-align: left;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .report-item.active .report-select-btn {
    color: white;
  }

  .btn-delete-report {
    padding: 0.25rem 0.5rem;
    background: transparent;
    border: none;
    color: #6B7280;
    font-size: 1rem;
    cursor: pointer;
    opacity: 0;
    transition: all 0.2s;
  }

  .report-item:hover .btn-delete-report {
    opacity: 1;
  }

  .btn-delete-report:hover {
    color: #EF4444;
  }

  .sidebar-footer {
    padding: 1rem;
    border-top: 1px solid #374151;
  }

  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }

  .status-badge.loading {
    background: #FEF3C7;
    color: #92400E;
  }

  .status-badge.ready {
    background: #D1FAE5;
    color: #065F46;
  }

  .status-badge.error {
    background: #FEE2E2;
    color: #991B1B;
  }
</style>
