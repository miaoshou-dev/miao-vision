<script lang="ts">
  /**
   * InfographicSection Component
   *
   * A rich infographic section with structured layout:
   * - Heading: Title and subtitle
   * - Insight: Contextual description with highlight
   * - Chart: Rendered via template system
   * - Footnote: Source attribution
   *
   * Uses template registry to dynamically select the appropriate
   * structure + item components for rendering.
   */
  import { Infographic } from '@plugins/data-display/infographic'
  import { getTemplate } from './templates/registry'
  import type { InfographicSectionData } from './types'

  interface Props {
    /** Section data configuration */
    data: InfographicSectionData
    /** Additional CSS class */
    class?: string
  }

  let { data, class: className = '' }: Props = $props()

  // Get template configuration
  const templateConfig = $derived(getTemplate(data.template))

  // Adapt items using template's adapter
  const adaptedItems = $derived(
    templateConfig?.adapter(data.items) ?? data.items
  )

  // Dimensions
  const width = $derived(data.width || 800)
  const chartHeight = $derived(data.height || templateConfig?.defaultHeight || 200)
  const padding = 24
  const contentWidth = $derived(width - padding * 2)
  const contentHeight = $derived(chartHeight - padding * 2)

  // Process insight text with highlight
  function processInsightText(text: string, highlight?: string): string {
    if (!highlight) return text
    return text.replace(
      new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'g'),
      '<strong>$1</strong>'
    )
  }
</script>

<section class="infographic-section {className}">
  <!-- Heading -->
  {#if data.heading}
    <header class="section-header">
      <h2 class="section-title">{data.heading.title}</h2>
      {#if data.heading.subtitle}
        <p class="section-subtitle">{data.heading.subtitle}</p>
      {/if}
    </header>
  {/if}

  <!-- Insight -->
  {#if data.insight}
    <div class="section-insight">
      <p>{@html processInsightText(data.insight.text, data.insight.highlight)}</p>
    </div>
  {/if}

  <!-- Chart -->
  <div class="section-chart">
    {#if templateConfig?.component}
      <Infographic
        {width}
        height={chartHeight}
        theme={data.theme || 'dark-vibrant'}
        {padding}
      >
        <svelte:component
          this={templateConfig.component}
          items={adaptedItems}
          width={contentWidth}
          height={contentHeight}
          palette={data.palette}
        />
      </Infographic>
    {:else}
      <!-- Fallback: Template not found or not yet implemented -->
      <div class="template-placeholder">
        <Infographic
          {width}
          height={chartHeight}
          theme={data.theme || 'dark-vibrant'}
          {padding}
        >
          <!-- Placeholder SVG -->
          <g>
            <rect
              x="0"
              y="0"
              width={contentWidth}
              height={contentHeight}
              fill="none"
              stroke="#374151"
              stroke-dasharray="4 2"
              rx="4"
            />
            <text
              x={contentWidth / 2}
              y={contentHeight / 2}
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#6b7280"
              font-size="14"
            >
              Template: {data.template}
            </text>
            <text
              x={contentWidth / 2}
              y={contentHeight / 2 + 20}
              text-anchor="middle"
              dominant-baseline="middle"
              fill="#4b5563"
              font-size="12"
            >
              {data.items.length} items
            </text>
          </g>
        </Infographic>
      </div>
    {/if}
  </div>

  <!-- Footnote -->
  {#if data.footnote}
    <footer class="section-footnote">
      <p class="footnote-text">{data.footnote.text}</p>
      {#if data.footnote.source}
        <cite class="footnote-source">Source: {data.footnote.source}</cite>
      {/if}
    </footer>
  {/if}
</section>

<style>
  .infographic-section {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    background: #111827;
    border-radius: 12px;
    padding: 1.25rem;
    border: 1px solid #1f2937;
  }

  /* Header */
  .section-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f3f4f6;
    margin: 0;
    line-height: 1.3;
  }

  .section-subtitle {
    font-size: 0.875rem;
    color: #9ca3af;
    margin: 0;
  }

  /* Insight */
  .section-insight {
    padding: 0.75rem 1rem;
    background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(139, 92, 246, 0.1));
    border-left: 3px solid #3b82f6;
    border-radius: 0 6px 6px 0;
  }

  .section-insight p {
    margin: 0;
    font-size: 0.9rem;
    color: #e5e7eb;
    line-height: 1.5;
  }

  .section-insight :global(strong) {
    color: #60a5fa;
    font-weight: 600;
  }

  /* Chart */
  .section-chart {
    display: flex;
    justify-content: center;
    background: #0a0a0a;
    border-radius: 8px;
    overflow: hidden;
  }

  .template-placeholder {
    width: 100%;
    display: flex;
    justify-content: center;
  }

  /* Footnote */
  .section-footnote {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid #1f2937;
  }

  .footnote-text {
    margin: 0;
    font-size: 0.75rem;
    color: #6b7280;
  }

  .footnote-source {
    font-size: 0.75rem;
    color: #4b5563;
    font-style: italic;
  }

  .footnote-source::before {
    content: '|';
    margin-right: 0.5rem;
    color: #374151;
  }
</style>
