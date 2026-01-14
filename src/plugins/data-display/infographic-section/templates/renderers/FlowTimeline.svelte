<script lang="ts">
  /**
   * FlowTimeline Template Renderer
   *
   * Renders process steps in a linear flow with arrows.
   * Best for: Process steps, timelines, workflows
   *
   * Structure: FlowLinear + IconArrowNode
   */
  import { FlowLinear, IconArrowNode } from '@plugins/data-display/infographic'
  import type { FlowStep } from '../../adapters/flow-adapter'

  interface Props {
    items: FlowStep[]
    width: number
    height: number
    palette?: string
  }

  let { items, width, height, palette }: Props = $props()

  // Convert FlowStep[] to FlowLinear's expected format
  const steps = $derived(
    items.map((item, index) => ({
      id: item.id || `step-${index}`,
      label: item.label,
      desc: item.desc,
      icon: item.icon
    }))
  )
</script>

<FlowLinear
  {steps}
  {width}
  {height}
  direction="horizontal"
  showNumbers={true}
  showArrows={true}
  arrowStyle="chevron"
  {palette}
>
  {#snippet item({ step, themeColors, width: stepWidth, height: stepHeight, gradientId })}
    {#if step}
      <IconArrowNode
        label={step.label || ''}
        desc={step.desc || ''}
        icon={step.icon}
        {themeColors}
        width={stepWidth}
        height={stepHeight}
        {gradientId}
      />
    {/if}
  {/snippet}
</FlowLinear>
