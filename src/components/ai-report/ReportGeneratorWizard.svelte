<script lang="ts">
  import {
    type DataSourceInfo,
    type ReportStyle,
    type ReportPlan,
    type SectionProgress,
    ReportPlanner,
    ReportGenerator
  } from '@core/ai'
  import { aiConfigStore } from '@app/stores/ai-config.svelte'
  import DataSourceSelector from './DataSourceSelector.svelte'
  import PromptInput from './PromptInput.svelte'
  import PlanPreview from './PlanPreview.svelte'
  import GenerationProgress from './GenerationProgress.svelte'
  import SettingsPanel from './SettingsPanel.svelte'

  interface Props {
    availableSources: DataSourceInfo[]
    onComplete: (markdown: string, plan: ReportPlan, dataSources: DataSourceInfo[]) => void
    onCancel: () => void
  }

  let { availableSources, onComplete, onCancel }: Props = $props()

  // Wizard state
  type WizardStep = 'select-data' | 'configure' | 'preview' | 'generate'
  let currentStep = $state<WizardStep>('select-data')

  // Planning state
  let isPlanningInProgress = $state(false)
  let planningError = $state<string | null>(null)

  // Data selection
  let selectedSources = $state<DataSourceInfo[]>([])

  // Configuration
  let userPrompt = $state('')
  let reportStyle = $state<ReportStyle>('professional')

  // Settings state
  let showSettings = $state(false)

  // Generation state
  type GenerationPhase = 'planning' | 'generating' | 'complete' | 'error'
  let generationPhase = $state<GenerationPhase>('planning')
  let currentPlan = $state<ReportPlan | null>(null)
  let currentSection = $state<SectionProgress | null>(null)
  let generationError = $state<string | null>(null)
  let previewMarkdown = $state('')
  let finalMarkdown = $state('')

  // AI services
  let planner: ReportPlanner | null = null
  let generator: ReportGenerator | null = null

  function initializeServices(): boolean {
    if (!aiConfigStore.isConfigured()) {
      showSettings = true
      return false
    }

    const provider = aiConfigStore.getProvider()
    planner = new ReportPlanner(provider)
    generator = new ReportGenerator(provider)
    return true
  }

  function handleSaveApiKey(apiKey: string) {
    aiConfigStore.setApiKey(apiKey)
    showSettings = false
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case 'select-data':
        return selectedSources.length > 0
      case 'configure':
        return userPrompt.trim().length > 0
      case 'preview':
        return currentPlan !== null && !isPlanningInProgress
      case 'generate':
        return generationPhase === 'complete'
    }
  }

  function nextStep() {
    switch (currentStep) {
      case 'select-data':
        currentStep = 'configure'
        break
      case 'configure':
        currentStep = 'preview'
        startPlanning()
        break
      case 'preview':
        currentStep = 'generate'
        startGeneration()
        break
      case 'generate':
        if (finalMarkdown && currentPlan) {
          onComplete(finalMarkdown, currentPlan, selectedSources)
        }
        break
    }
  }

  function prevStep() {
    switch (currentStep) {
      case 'configure':
        currentStep = 'select-data'
        break
      case 'preview':
        // Reset planning state
        currentPlan = null
        planningError = null
        isPlanningInProgress = false
        currentStep = 'configure'
        break
      case 'generate':
        // Reset generation state
        generationPhase = 'planning'
        currentSection = null
        generationError = null
        previewMarkdown = ''
        finalMarkdown = ''
        currentStep = 'preview'
        break
    }
  }

  async function startPlanning() {
    if (!initializeServices() || !planner) {
      return
    }

    isPlanningInProgress = true
    planningError = null
    currentPlan = null

    try {
      const planResult = await planner.plan(selectedSources, userPrompt, {
        style: reportStyle,
        language: 'zh'
      })

      if (!planResult.success || !planResult.plan) {
        planningError = planResult.error || 'Failed to create report plan'
        return
      }

      currentPlan = planResult.plan
    } catch (error) {
      planningError = error instanceof Error ? error.message : 'Unknown error occurred'
    } finally {
      isPlanningInProgress = false
    }
  }

  function handleRemoveSection(index: number) {
    if (currentPlan && currentPlan.sections.length > 1) {
      currentPlan = {
        ...currentPlan,
        sections: currentPlan.sections.filter((_, i) => i !== index)
      }
    }
  }

  function handleReorderSection(fromIndex: number, toIndex: number) {
    if (!currentPlan) return
    const sections = [...currentPlan.sections]
    const [removed] = sections.splice(fromIndex, 1)
    sections.splice(toIndex, 0, removed)
    currentPlan = { ...currentPlan, sections }
  }

  async function startGeneration() {
    if (!initializeServices() || !generator || !currentPlan) {
      return
    }

    generationPhase = 'generating'
    generationError = null

    try {
      // Generate report content with streaming
      for await (const progress of generator.generateStream(currentPlan, selectedSources, {
        style: reportStyle,
        language: 'zh'
      })) {
        currentSection = progress
        previewMarkdown = progress.markdown
      }

      // Get final result
      const result = await generator.generate(currentPlan, selectedSources, {
        style: reportStyle,
        language: 'zh'
      })

      if (result.success && result.markdown) {
        finalMarkdown = result.markdown
        generationPhase = 'complete'
      } else {
        generationError = result.error || 'Failed to generate report'
        generationPhase = 'error'
      }
    } catch (error) {
      generationError = error instanceof Error ? error.message : 'Unknown error occurred'
      generationPhase = 'error'
    }
  }

  function getStepNumber(step: WizardStep): number {
    switch (step) {
      case 'select-data':
        return 1
      case 'configure':
        return 2
      case 'preview':
        return 3
      case 'generate':
        return 4
    }
  }
</script>

<div class="wizard-overlay">
  <div class="wizard-container">
    <div class="wizard-header">
      <h2>Generate AI Report</h2>
      <div class="header-actions">
        <button
          class="settings-btn"
          onclick={() => showSettings = !showSettings}
          title="API Settings"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
          </svg>
        </button>
        <button class="close-btn" onclick={onCancel} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
          </svg>
        </button>
      </div>
    </div>

    {#if showSettings}
      <SettingsPanel
        apiKey={aiConfigStore.state.configs.deepseek.apiKey || ''}
        onSave={handleSaveApiKey}
        onCancel={() => showSettings = false}
      />
    {:else}
      <div class="wizard-steps">
      <div class="step" class:active={currentStep === 'select-data'} class:complete={getStepNumber(currentStep) > 1}>
        <span class="step-number">1</span>
        <span class="step-label">Select Data</span>
      </div>
      <div class="step-connector" class:complete={getStepNumber(currentStep) > 1}></div>
      <div class="step" class:active={currentStep === 'configure'} class:complete={getStepNumber(currentStep) > 2}>
        <span class="step-number">2</span>
        <span class="step-label">Configure</span>
      </div>
      <div class="step-connector" class:complete={getStepNumber(currentStep) > 2}></div>
      <div class="step" class:active={currentStep === 'preview'} class:complete={getStepNumber(currentStep) > 3}>
        <span class="step-number">3</span>
        <span class="step-label">Preview</span>
      </div>
      <div class="step-connector" class:complete={getStepNumber(currentStep) > 3}></div>
      <div class="step" class:active={currentStep === 'generate'}>
        <span class="step-number">4</span>
        <span class="step-label">Generate</span>
      </div>
    </div>

    <div class="wizard-content">
      {#if currentStep === 'select-data'}
        <DataSourceSelector
          {availableSources}
          {selectedSources}
          onSelectionChange={(sources) => selectedSources = sources}
        />
      {:else if currentStep === 'configure'}
        <PromptInput
          prompt={userPrompt}
          style={reportStyle}
          onPromptChange={(p) => userPrompt = p}
          onStyleChange={(s) => reportStyle = s}
        />
      {:else if currentStep === 'preview'}
        <PlanPreview
          plan={currentPlan}
          isLoading={isPlanningInProgress}
          error={planningError}
          onRemoveSection={handleRemoveSection}
          onReorderSection={handleReorderSection}
          onRetry={startPlanning}
        />
      {:else if currentStep === 'generate'}
        <GenerationProgress
          phase={generationPhase}
          plan={currentPlan}
          {currentSection}
          error={generationError}
          {previewMarkdown}
          onRetry={startGeneration}
        />
      {/if}
    </div>

    <div class="wizard-footer">
        <button
          class="btn btn-secondary"
          onclick={currentStep === 'select-data' ? onCancel : prevStep}
          disabled={currentStep === 'generate' && generationPhase === 'generating'}
        >
          {currentStep === 'select-data' ? 'Cancel' : 'Back'}
        </button>

        <button
          class="btn btn-primary"
          onclick={nextStep}
          disabled={!canProceed() || (currentStep === 'preview' && isPlanningInProgress) || (currentStep === 'generate' && generationPhase !== 'complete' && generationPhase !== 'error')}
        >
          {#if currentStep === 'preview'}
            {isPlanningInProgress ? 'Creating Plan...' : 'Generate Report'}
          {:else if currentStep === 'generate'}
            {generationPhase === 'complete' ? 'Use Report' : generationPhase === 'error' ? 'Retry' : 'Generating...'}
          {:else}
            Next
          {/if}
        </button>
      </div>
    {/if}
  </div>
</div>

<style>
  .wizard-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 24px;
  }

  .wizard-container {
    width: 100%;
    max-width: 640px;
    max-height: 90vh;
    background: #252525;
    border-radius: 12px;
    display: flex;
    flex-direction: column;
    box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
  }

  .wizard-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #333;
  }

  .wizard-header h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .close-btn {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 4px;
    border-radius: 4px;
    transition: all 0.2s;
  }

  .close-btn:hover {
    color: #e0e0e0;
    background: #333;
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .settings-btn {
    background: none;
    border: none;
    color: #9ca3af;
    cursor: pointer;
    padding: 6px;
    border-radius: 4px;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .settings-btn:hover {
    color: #60a5fa;
    background: rgba(96, 165, 250, 0.1);
  }

  .wizard-steps {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px 24px;
    gap: 8px;
    border-bottom: 1px solid #333;
  }

  .step {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 6px;
    transition: all 0.2s;
  }

  .step-number {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    background: #333;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
  }

  .step-label {
    font-size: 13px;
    color: #6b7280;
  }

  .step.active .step-number {
    background: #60a5fa;
    color: white;
  }

  .step.active .step-label {
    color: #e0e0e0;
  }

  .step.complete .step-number {
    background: #22c55e;
    color: white;
  }

  .step.complete .step-label {
    color: #9ca3af;
  }

  .step-connector {
    width: 40px;
    height: 2px;
    background: #333;
    transition: background 0.2s;
  }

  .step-connector.complete {
    background: #22c55e;
  }

  .wizard-content {
    flex: 1;
    overflow-y: auto;
    padding: 24px;
    min-height: 300px;
  }

  .wizard-footer {
    display: flex;
    justify-content: space-between;
    padding: 16px 24px;
    border-top: 1px solid #333;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-secondary {
    background: #333;
    color: #e0e0e0;
  }

  .btn-secondary:hover {
    background: #404040;
  }

  .btn-primary {
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
