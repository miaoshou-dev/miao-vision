<script lang="ts">
  /**
   * MarkdownInfographicPreview - Renders markdown with infographic code blocks
   *
   * Supports two code block types:
   * - ```infographic: Legacy format (direct structure rendering)
   * - ```infographic-section: New format (InfographicSection with heading/insight/footnote)
   */
  import { parse as parseYaml } from 'yaml'
  import {
    Infographic,
    ListRowHorizontal,
    ListGrid,
    FlowLinear,
    ListSector,
    BadgeCard,
    ValueCard,
    IconArrowNode
  } from '@plugins/data-display/infographic'
  import { InfographicSection } from '@plugins/data-display/infographic-section'
  import type { InfographicSectionData } from '@plugins/data-display/infographic-section'

  interface Props {
    markdown: string
  }

  let { markdown }: Props = $props()

  // Legacy infographic block config
  interface LegacyInfographicBlock {
    template: string
    theme: string
    palette: string
    width: number
    height: number
    data: Array<{
      label: string
      value?: string | number
      desc?: string
      icon?: string
      trend?: string
    }>
  }

  // Parsed section types
  interface ParsedSection {
    type: 'text' | 'infographic' | 'infographic-section'
    content: string
    config?: LegacyInfographicBlock
    sectionData?: InfographicSectionData
  }

  // Parse markdown into sections
  const sections = $derived.by(() => {
    const result: ParsedSection[] = []
    // Match both ```infographic and ```infographic-section
    const regex = /```(infographic-section|infographic)\n([\s\S]*?)```/g
    let lastIndex = 0
    let match

    while ((match = regex.exec(markdown)) !== null) {
      const blockType = match[1] // 'infographic' or 'infographic-section'
      const blockContent = match[2]

      // Add text before this block
      if (match.index > lastIndex) {
        const textContent = markdown.slice(lastIndex, match.index).trim()
        if (textContent) {
          result.push({ type: 'text', content: textContent })
        }
      }

      // Parse block
      try {
        if (blockType === 'infographic-section') {
          // New format: InfographicSection
          const parsed = parseYaml(blockContent)
          const sectionData: InfographicSectionData = {
            template: parsed.template || 'kpi-row-badge',
            items: parsed.items || [],
            theme: parsed.theme,
            palette: parsed.palette,
            width: parsed.width,
            height: parsed.height
          }

          // Map heading
          if (parsed.heading) {
            sectionData.heading = parsed.heading
          } else if (parsed.title) {
            sectionData.heading = {
              title: parsed.title,
              subtitle: parsed.subtitle
            }
          }

          // Map insight
          if (parsed.insight) {
            if (typeof parsed.insight === 'string') {
              sectionData.insight = { text: parsed.insight, highlight: parsed.highlight }
            } else {
              sectionData.insight = parsed.insight
            }
          }

          // Map footnote
          if (parsed.footnote) {
            if (typeof parsed.footnote === 'string') {
              sectionData.footnote = { text: parsed.footnote, source: parsed.source }
            } else {
              sectionData.footnote = parsed.footnote
            }
          }

          result.push({
            type: 'infographic-section',
            content: blockContent,
            sectionData
          })
        } else {
          // Legacy format: direct infographic
          const config = parseYaml(blockContent) as LegacyInfographicBlock
          result.push({
            type: 'infographic',
            content: blockContent,
            config
          })
        }
      } catch (e) {
        result.push({ type: 'text', content: `Error parsing: ${blockContent}` })
      }

      lastIndex = match.index + match[0].length
    }

    // Add remaining text
    if (lastIndex < markdown.length) {
      const textContent = markdown.slice(lastIndex).trim()
      if (textContent) {
        result.push({ type: 'text', content: textContent })
      }
    }

    return result
  })

  // Legacy: Map template to structure type
  function getStructureType(template: string): 'row' | 'grid' | 'flow' | 'sector' {
    if (template.includes('grid')) return 'grid'
    if (template.includes('flow') || template.includes('linear')) return 'flow'
    if (template.includes('sector') || template.includes('pie')) return 'sector'
    return 'row'
  }

  // Legacy: Get item type from template
  function getItemType(template: string): 'badge' | 'value' | 'icon' {
    if (template.includes('badge')) return 'badge'
    if (template.includes('value')) return 'value'
    return 'icon'
  }
</script>

<div class="markdown-infographic-preview">
  {#each sections as section}
    {#if section.type === 'text'}
      <div class="text-section">
        {@html section.content
          .replace(/^# (.+)$/gm, '<h1>$1</h1>')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
          .replace(/^---$/gm, '<hr/>')
          .replace(/\n\n/g, '</p><p>')
          .replace(/^\*(.+)\*$/gm, '<em>$1</em>')
        }
      </div>

    {:else if section.type === 'infographic-section' && section.sectionData}
      <!-- New format: InfographicSection component -->
      <InfographicSection data={section.sectionData} />

    {:else if section.type === 'infographic' && section.config}
      <!-- Legacy format: direct rendering -->
      {@const config = section.config}
      {@const structureType = getStructureType(config.template)}
      {@const itemType = getItemType(config.template)}
      {@const padding = 24}
      {@const contentWidth = (config.width || 800) - padding * 2}
      {@const contentHeight = (config.height || 200) - padding * 2}

      <div class="infographic-wrapper">
        <Infographic
          width={config.width || 800}
          height={config.height || 200}
          theme={config.theme || 'dark-vibrant'}
          {padding}
        >
          {#if structureType === 'flow'}
            <FlowLinear
              steps={config.data.map((d, idx) => ({
                id: `step-${idx}`,
                label: d.label,
                desc: d.desc || ''
              }))}
              width={contentWidth}
              height={contentHeight}
              palette={config.palette}
            >
              {#snippet item({ step, themeColors, width, height, gradientId })}
                {#if step}
                  <IconArrowNode
                    label={step.label || ''}
                    desc={step.desc || ''}
                    {themeColors}
                    {width}
                    {height}
                    {gradientId}
                  />
                {/if}
              {/snippet}
            </FlowLinear>
          {:else if structureType === 'sector'}
            <ListSector
              items={config.data.map((d, idx) => ({
                id: `item-${idx}`,
                label: d.label,
                value: typeof d.value === 'number' ? d.value : parseFloat(String(d.value)) || 0
              }))}
              width={contentWidth}
              height={contentHeight}
              palette={config.palette}
              showLabels={true}
            />
          {:else if structureType === 'grid'}
            <ListGrid
              items={config.data}
              width={contentWidth}
              height={contentHeight}
              columns={Math.min(4, config.data.length)}
              palette={config.palette}
            >
              {#snippet item({ data, themeColors, width, height, gradientId })}
                {#if data}
                  <BadgeCard
                    label={data.label || ''}
                    value={String(data.value ?? '')}
                    desc={data.desc || ''}
                    {themeColors}
                    {width}
                    {height}
                    {gradientId}
                  />
                {/if}
              {/snippet}
            </ListGrid>
          {:else}
            <!-- Default: row layout -->
            <ListRowHorizontal
              items={config.data}
              width={contentWidth}
              height={contentHeight}
              showArrows={false}
              palette={config.palette}
            >
              {#snippet item({ data, themeColors, width, height, gradientId })}
                {#if data}
                  {#if itemType === 'badge'}
                    <BadgeCard
                      label={data.label || ''}
                      value={String(data.value ?? '')}
                      desc={data.desc || ''}
                      {themeColors}
                      {width}
                      {height}
                      {gradientId}
                    />
                  {:else if itemType === 'value'}
                    <ValueCard
                      label={data.label || ''}
                      value={String(data.value ?? data.label ?? '')}
                      desc={data.desc || ''}
                      {themeColors}
                      {width}
                      {height}
                      {gradientId}
                    />
                  {:else}
                    <IconArrowNode
                      label={data.label || ''}
                      desc={data.desc || ''}
                      {themeColors}
                      {width}
                      {height}
                      {gradientId}
                    />
                  {/if}
                {/if}
              {/snippet}
            </ListRowHorizontal>
          {/if}
        </Infographic>
      </div>
    {/if}
  {/each}
</div>

<style>
  .markdown-infographic-preview {
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
  }

  .text-section {
    color: #e0e0e0;
    font-size: 0.9rem;
    line-height: 1.6;
  }

  .text-section :global(h1) {
    font-size: 1.5rem;
    font-weight: 600;
    margin: 0 0 0.5rem;
    color: #f3f4f6;
  }

  .text-section :global(h2) {
    font-size: 1.25rem;
    font-weight: 600;
    margin: 1rem 0 0.5rem;
    color: #e5e7eb;
  }

  .text-section :global(h3) {
    font-size: 1rem;
    font-weight: 600;
    margin: 0.75rem 0 0.25rem;
    color: #d1d5db;
  }

  .text-section :global(blockquote) {
    border-left: 3px solid #60a5fa;
    padding-left: 1rem;
    margin: 0.5rem 0;
    color: #9ca3af;
    font-style: italic;
  }

  .text-section :global(hr) {
    border: none;
    border-top: 1px solid #374151;
    margin: 1rem 0;
  }

  .infographic-wrapper {
    display: flex;
    justify-content: center;
    background: #0a0a0a;
    border-radius: 8px;
    padding: 0.5rem;
  }
</style>
