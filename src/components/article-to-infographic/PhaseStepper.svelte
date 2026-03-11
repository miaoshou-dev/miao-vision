<script lang="ts">
  /**
   * PhaseStepper - Multi-step progress indicator for InfographicAgent phases
   */
  import type { InfographicProgress } from '@core/ai/agents/infographic'

  interface Props {
    agentProgress: InfographicProgress
  }

  let { agentProgress }: Props = $props()

  type StepStatus = 'pending' | 'active' | 'done'

  interface PhaseStep {
    label: string
    detail: string
    status: StepStatus
  }

  const phaseSteps = $derived.by<PhaseStep[]>(() => {
    const p = agentProgress
    if (p.phase === 'outlining') {
      return [
        { label: 'Analyzing Structure', detail: p.message, status: 'active' },
        { label: 'Generating Variants', detail: 'Waiting...', status: 'pending' }
      ]
    }
    if (p.phase === 'planning') {
      return [
        { label: 'Analyzing Structure', detail: 'Done', status: 'done' },
        { label: 'Planning Narrative', detail: p.message, status: 'active' },
        { label: 'Generating Content', detail: 'Waiting...', status: 'pending' }
      ]
    }
    if (p.phase === 'generating') {
      return [
        { label: 'Analyzing Structure', detail: 'Done', status: 'done' },
        { label: 'Generating Variants', detail: p.message, status: 'active' }
      ]
    }
    if (p.phase === 'complete') {
      return [
        { label: 'Analyzing Structure', detail: 'Done', status: 'done' },
        { label: 'Generating Variants', detail: 'Done', status: 'done' }
      ]
    }
    return []
  })
</script>

<div class="phase-stepper">
  <div class="stepper-track">
    {#each phaseSteps as step, i}
      {#if i > 0}
        <div class="stepper-connector" class:done={step.status === 'done' || phaseSteps[i - 1]?.status === 'done'}></div>
      {/if}
      <div class="stepper-step" class:active={step.status === 'active'} class:done={step.status === 'done'}>
        <div class="step-icon">
          {#if step.status === 'done'}
            <svg viewBox="0 0 16 16" width="14" height="14"><path d="M3 8l3.5 3.5L13 5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>
          {:else if step.status === 'active'}
            <div class="step-spinner"></div>
          {:else}
            <div class="step-dot"></div>
          {/if}
        </div>
        <div class="step-text">
          <span class="step-label">{step.label}</span>
          <span class="step-detail">{step.detail}</span>
        </div>
      </div>
    {/each}
  </div>
  <div class="stepper-progress-bar">
    <div class="stepper-progress-fill" style="width: {agentProgress.progress}%"></div>
  </div>
</div>

<style>
  .phase-stepper {
    padding: 1.25rem 1rem;
    background: #1f2937;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .stepper-track {
    display: flex;
    align-items: flex-start;
    gap: 0;
    margin-bottom: 1rem;
  }

  .stepper-connector {
    flex: 1;
    height: 2px;
    background: #374151;
    margin-top: 14px;
    transition: background 0.3s;
  }

  .stepper-connector.done {
    background: #3b82f6;
  }

  .stepper-step {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.4rem;
    min-width: 6rem;
  }

  .step-icon {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    border: 2px solid #374151;
    background: #111827;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.3s;
    flex-shrink: 0;
  }

  .stepper-step.active .step-icon {
    border-color: #3b82f6;
    background: rgba(59, 130, 246, 0.1);
  }

  .stepper-step.done .step-icon {
    border-color: #3b82f6;
    background: #3b82f6;
    color: white;
  }

  .step-spinner {
    width: 12px;
    height: 12px;
    border: 2px solid rgba(59, 130, 246, 0.3);
    border-top-color: #3b82f6;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .step-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #374151;
  }

  .step-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.15rem;
    text-align: center;
  }

  .step-label {
    font-size: 0.75rem;
    font-weight: 600;
    color: #9ca3af;
  }

  .stepper-step.active .step-label {
    color: #93c5fd;
  }

  .stepper-step.done .step-label {
    color: #6b7280;
  }

  .step-detail {
    font-size: 0.65rem;
    color: #4b5563;
    max-width: 8rem;
    line-height: 1.3;
  }

  .stepper-step.active .step-detail {
    color: #6b7280;
  }

  .stepper-progress-bar {
    height: 4px;
    background: #374151;
    border-radius: 2px;
    overflow: hidden;
  }

  .stepper-progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #3b82f6, #8b5cf6);
    transition: width 0.4s ease;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>
