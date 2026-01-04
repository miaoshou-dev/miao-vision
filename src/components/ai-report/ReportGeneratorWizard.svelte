<script lang="ts">
  import {
    type DataSourceInfo,
    type ReportStyle,
    type ReportPlan,
    type SectionProgress,
    ReportPlanner,
    ReportGenerator,
    createDeepSeekProvider
  } from '@core/ai'
  import DataSourceSelector from './DataSourceSelector.svelte'
  import PromptInput from './PromptInput.svelte'
  import GenerationProgress from './GenerationProgress.svelte'

  interface Props {
    availableSources: DataSourceInfo[]
    onComplete: (markdown: string, plan: ReportPlan) => void
    onCancel: () => void
  }

  let { availableSources, onComplete, onCancel }: Props = $props()

  // Wizard state
  type WizardStep = 'select-data' | 'configure' | 'generate'
  let currentStep = $state<WizardStep>('select-data')

  // Data selection
  let selectedSources = $state<DataSourceInfo[]>([])

  // Configuration
  let userPrompt = $state('')
  let reportStyle = $state<ReportStyle>('professional')

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

  function initializeServices() {
    // Get API key from localStorage or environment
    const apiKey = localStorage.getItem('deepseek_api_key') || ''

    if (!apiKey) {
      generationError = 'Please configure DeepSeek API Key in settings first'
      generationPhase = 'error'
      return false
    }

    const provider = createDeepSeekProvider({ apiKey })
    planner = new ReportPlanner(provider)
    generator = new ReportGenerator(provider)
    return true
  }

  function canProceed(): boolean {
    switch (currentStep) {
      case 'select-data':
        return selectedSources.length > 0
      case 'configure':
        return userPrompt.trim().length > 0
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
        currentStep = 'generate'
        startGeneration()
        break
      case 'generate':
        if (finalMarkdown && currentPlan) {
          onComplete(finalMarkdown, currentPlan)
        }
        break
    }
  }

  function prevStep() {
    switch (currentStep) {
      case 'configure':
        currentStep = 'select-data'
        break
      case 'generate':
        // Reset generation state
        generationPhase = 'planning'
        currentPlan = null
        currentSection = null
        generationError = null
        previewMarkdown = ''
        finalMarkdown = ''
        currentStep = 'configure'
        break
    }
  }

  async function startGeneration() {
    if (!initializeServices() || !planner || !generator) {
      return
    }

    generationPhase = 'planning'
    generationError = null

    try {
      // Step 1: Plan the report
      const planResult = await planner.plan(selectedSources, userPrompt, {
        style: reportStyle,
        language: 'zh'
      })

      if (!planResult.success || !planResult.plan) {
        generationError = planResult.error || 'Failed to create report plan'
        generationPhase = 'error'
        return
      }

      currentPlan = planResult.plan
      generationPhase = 'generating'

      // Step 2: Generate report content with streaming
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
      case 'generate':
        return 3
    }
  }
</script>

<div class="wizard-overlay">
  <div class="wizard-container">
    <div class="wizard-header">
      <h2>Generate AI Report</h2>
      <button class="close-btn" onclick={onCancel} aria-label="Close">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
        </svg>
      </button>
    </div>

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
      <div class="step" class:active={currentStep === 'generate'}>
        <span class="step-number">3</span>
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
      {:else if currentStep === 'generate'}
        <GenerationProgress
          phase={generationPhase}
          plan={currentPlan}
          {currentSection}
          error={generationError}
          {previewMarkdown}
        />
      {/if}
    </div>

    <div class="wizard-footer">
      <button
        class="btn btn-secondary"
        onclick={currentStep === 'select-data' ? onCancel : prevStep}
      >
        {currentStep === 'select-data' ? 'Cancel' : 'Back'}
      </button>

      <button
        class="btn btn-primary"
        onclick={nextStep}
        disabled={!canProceed() || (currentStep === 'generate' && generationPhase !== 'complete' && generationPhase !== 'error')}
      >
        {#if currentStep === 'generate'}
          {generationPhase === 'complete' ? 'Use Report' : generationPhase === 'error' ? 'Retry' : 'Generating...'}
        {:else}
          Next
        {/if}
      </button>
    </div>
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
