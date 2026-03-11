<script lang="ts">
  /**
   * Infographic Demo Page
   *
   * Showcases the infographic system with various themes and layouts.
   * Demonstrates all Structure and Item components.
   */
  import './infographic-demo/infographic-demo.css'
  import {
    Infographic,
    ListRowHorizontal,
    ListPyramid,
    SequenceTimeline,
    ListGrid,
    ValueCard,
    CircularProgress,
    IconArrowNode,
    getDarkPresetNames,
    getLightPresetNames,
    PALETTES,
    getPaletteNames
  } from '@plugins/data-display/infographic'
  import StructuresTab from './infographic-demo/StructuresTab.svelte'
  import ItemsTab from './infographic-demo/ItemsTab.svelte'
  import ChartsTab from './infographic-demo/ChartsTab.svelte'
  import {
    kpiItems, jvmArticle, jvmKpis, jvmProgress, memoryPhases, gcComparison,
    progressItems, processItems, timelineItems, rankingItems
  } from './infographic-demo/infographic-demo-data'

  let selectedTheme = $state('dark-vibrant')
  let selectedPalette = $state('vibrant')
  let showArrows = $state(true)
  let activeDemo = $state<'jvm' | 'article' | 'components' | 'charts' | 'themes'>('jvm')

  const darkPresets = getDarkPresetNames()
  const lightPresets = getLightPresetNames()
  const paletteNames = getPaletteNames()
</script>

<div class="demo-container">
  <header class="demo-header">
    <h1>Infographic System Demo</h1>
    <p>Transform articles and data into beautiful visual infographics</p>
  </header>

  <!-- Tab Navigation -->
  <nav class="demo-tabs">
    <button class:active={activeDemo === 'jvm'} onclick={() => activeDemo = 'jvm'}>JVM Performance</button>
    <button class:active={activeDemo === 'article'} onclick={() => activeDemo = 'article'}>Q4 Report</button>
    <button class:active={activeDemo === 'components'} onclick={() => activeDemo = 'components'}>Components</button>
    <button class:active={activeDemo === 'charts'} onclick={() => activeDemo = 'charts'}>Charts & Utils</button>
    <button class:active={activeDemo === 'themes'} onclick={() => activeDemo = 'themes'}>Themes</button>
  </nav>

  <!-- Controls -->
  <section class="controls">
    <div class="control-group">
      <span class="control-label">Theme</span>
      <select bind:value={selectedTheme}>
        <optgroup label="Dark Themes">
          {#each darkPresets as preset}
            <option value={preset}>{preset}</option>
          {/each}
        </optgroup>
        <optgroup label="Light Themes">
          {#each lightPresets as preset}
            <option value={preset}>{preset}</option>
          {/each}
        </optgroup>
      </select>
    </div>
    <div class="control-group">
      <span class="control-label">Palette</span>
      <select bind:value={selectedPalette}>
        {#each paletteNames as palette}
          <option value={palette}>{palette}</option>
        {/each}
      </select>
    </div>
    <div class="control-group checkbox-group">
      <input type="checkbox" id="showArrows" bind:checked={showArrows} />
      <span class="control-label">Show Arrows</span>
    </div>
  </section>

  {#if activeDemo === 'jvm'}
    <div class="article-demo">
      <div class="article-source">
        <h3>Original Article</h3>
        <div class="article-content article-text">
          <pre>{jvmArticle}</pre>
        </div>
      </div>
      <div class="arrow-indicator">→</div>
      <div class="infographic-result">
        <h3>Infographic Preview</h3>
        <section class="demo-section">
          <h4>Performance Improvements</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={700} height={140} padding={16}>
              <ListRowHorizontal items={jvmKpis} width={668} height={108} showArrows={false} palette={selectedPalette}>
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <ValueCard label={data.label} value={String(data.value ?? '')} icon={data.icon} {themeColors} {width} {height} {gradientId} />
                {/snippet}
              </ListRowHorizontal>
            </Infographic>
          </div>
        </section>
        <section class="demo-section">
          <h4>Memory Optimization Journey</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={750} height={180} padding={16}>
              <SequenceTimeline items={memoryPhases} width={718} height={148} palette={selectedPalette} timelinePosition="middle" />
            </Infographic>
          </div>
        </section>
        <section class="demo-section">
          <h4>Current System Metrics</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={620} height={340} padding={16}>
              <ListGrid items={jvmProgress} width={588} height={308} columns={2} gap={16} palette={selectedPalette}>
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <CircularProgress label={data.label} value={Number(data.value ?? 0)} max={Number(data.max ?? 100)} {themeColors} {width} {height} {gradientId} />
                {/snippet}
              </ListGrid>
            </Infographic>
          </div>
        </section>
        <section class="demo-section">
          <h4>GC Algorithm Ranking</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={500} height={320} padding={16}>
              <ListPyramid items={gcComparison} width={468} height={288} direction="up" palette={selectedPalette} />
            </Infographic>
          </div>
        </section>
      </div>
    </div>

  {:else if activeDemo === 'article'}
    <div class="article-demo">
      <div class="article-source">
        <h3>Source Article: Q4 2024 Performance Report</h3>
        <div class="article-content">
          <p><strong>Executive Summary:</strong> Revenue reached $12.5M with 158K users, representing 45% growth and NPS of 72.</p>
          <p><strong>Goals Progress:</strong> Sales target at 85%, User growth at 92%, Quality score at 78%, Team OKR at 88%.</p>
          <p><strong>Process:</strong> Research → Design → Develop → Test → Launch</p>
          <p><strong>Timeline:</strong> Kickoff (Jan) → Alpha (Mar) → Beta (Jun) → Launch (Sep) → Scale (Dec)</p>
          <p><strong>Revenue by Tier:</strong> Enterprise $5.2M, Pro $4.1M, Starter $2.8M, Free $0.4M</p>
        </div>
      </div>
      <div class="arrow-indicator">→</div>
      <div class="infographic-result">
        <h3>Infographic Output</h3>
        <section class="demo-section">
          <h4>Key Metrics (ListRowHorizontal + ValueCard)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={700} height={140} padding={16}>
              <ListRowHorizontal items={kpiItems} width={668} height={108} showArrows={false} palette={selectedPalette}>
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <ValueCard label={data.label} value={String(data.value ?? '')} icon={data.icon} {themeColors} {width} {height} {gradientId} />
                {/snippet}
              </ListRowHorizontal>
            </Infographic>
          </div>
        </section>
        <section class="demo-section">
          <h4>Goals Progress (ListGrid + CircularProgress)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={620} height={340} padding={16}>
              <ListGrid items={progressItems} width={588} height={308} columns={2} gap={16} palette={selectedPalette}>
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <CircularProgress label={data.label} value={Number(data.value ?? 0)} max={Number(data.max ?? 100)} icon={data.icon} {themeColors} {width} {height} {gradientId} />
                {/snippet}
              </ListGrid>
            </Infographic>
          </div>
        </section>
        <section class="demo-section">
          <h4>Process Flow (ListRowHorizontal + IconArrowNode)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={900} height={160} padding={16}>
              <ListRowHorizontal items={processItems} width={868} height={128} {showArrows} palette={selectedPalette}>
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <IconArrowNode label={data.label} desc={data.desc} icon={data.icon} {themeColors} {width} {height} {gradientId} />
                {/snippet}
              </ListRowHorizontal>
            </Infographic>
          </div>
        </section>
        <section class="demo-section">
          <h4>Project Timeline (SequenceTimeline)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={850} height={200} padding={16}>
              <SequenceTimeline items={timelineItems} width={818} height={168} palette={selectedPalette} timelinePosition="middle" />
            </Infographic>
          </div>
        </section>
        <section class="demo-section">
          <h4>Revenue by Tier (ListPyramid)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={500} height={320} padding={16}>
              <ListPyramid items={rankingItems} width={468} height={288} direction="up" palette={selectedPalette} />
            </Infographic>
          </div>
        </section>
      </div>
    </div>

  {:else if activeDemo === 'components'}
    <StructuresTab {selectedTheme} {selectedPalette} {showArrows} />
    <ItemsTab {selectedTheme} />

  {:else if activeDemo === 'charts'}
    <ChartsTab {selectedTheme} {selectedPalette} />

  {:else}
    <!-- Themes & Palettes -->
    <section class="demo-section">
      <h2>All Theme Presets</h2>
      <div class="theme-grid">
        {#each [...darkPresets, ...lightPresets] as preset}
          <div class="theme-preview" class:active={selectedTheme === preset} onclick={() => selectedTheme = preset}>
            <Infographic theme={preset} width={200} height={80} padding={12}>
              <ListRowHorizontal
                items={[{ label: 'A', icon: 'circle' }, { label: 'B', icon: 'square' }, { label: 'C', icon: 'triangle' }]}
                width={176} height={56} showArrows={false} gap={8}
              >
                {#snippet item({ themeColors, width, height, gradientId })}
                  <rect x="0" y="0" {width} {height} rx="6" fill={gradientId ? `url(#${gradientId})` : themeColors.colorPrimary} />
                {/snippet}
              </ListRowHorizontal>
            </Infographic>
            <span class="theme-name">{preset}</span>
          </div>
        {/each}
      </div>
    </section>
    <section class="demo-section">
      <h2>Color Palettes</h2>
      <div class="palette-grid">
        {#each paletteNames as paletteName}
          {@const colors = PALETTES[paletteName] || []}
          <div class="palette-preview" class:active={selectedPalette === paletteName} onclick={() => selectedPalette = paletteName}>
            <div class="palette-colors">
              {#each colors.slice(0, 6) as color}
                <div class="palette-swatch" style:background-color={color}></div>
              {/each}
            </div>
            <span class="palette-name">{paletteName}</span>
          </div>
        {/each}
      </div>
    </section>
  {/if}
</div>
