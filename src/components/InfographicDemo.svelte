<script lang="ts">
  /**
   * Infographic Demo Page
   *
   * Showcases the infographic system with various themes and layouts.
   * Demonstrates all Structure and Item components.
   */
  import {
    Infographic,
    ListRowHorizontal,
    ListGrid,
    ListPyramid,
    SequenceTimeline,
    HierarchyTree,
    CompareSwot,
    ListSector,
    SequenceSnake,
    IconArrowNode,
    BadgeCard,
    ValueCard,
    CircularProgress,
    ImageCard,
    StatCard,
    getDarkPresetNames,
    getLightPresetNames,
    PALETTES,
    getPaletteNames
  } from '@plugins/data-display/infographic'
  import type { TreeNode, SwotData, SectorItem, SnakeItem } from '@plugins/data-display/infographic'

  // =====================================================
  // Sample Data: Article → Infographic Conversion Example
  // =====================================================

  // Original Article: "Q4 2024 Company Performance Report"
  // Converted to infographic data structures

  // KPI Metrics (from article's executive summary)
  const kpiItems = [
    { label: 'Revenue', value: '$12.5M', icon: 'currency-usd' },
    { label: 'Users', value: '158K', icon: 'account-group' },
    { label: 'Growth', value: '+45%', icon: 'trending-up' },
    { label: 'NPS', value: '72', icon: 'star' }
  ]

  // Progress Metrics (from article's goals section)
  const progressItems = [
    { label: 'Sales Target', value: 85, max: 100, icon: 'chart-line' },
    { label: 'User Growth', value: 92, max: 100 },
    { label: 'Quality Score', value: 78, max: 100 },
    { label: 'Team OKR', value: 88, max: 100 }
  ]

  // Process Flow (from article's methodology section)
  const processItems = [
    { label: 'Research', icon: 'lightbulb', desc: 'Market analysis' },
    { label: 'Design', icon: 'cog', desc: 'Product design' },
    { label: 'Develop', icon: 'laptop', desc: 'Implementation' },
    { label: 'Test', icon: 'check-circle', desc: 'QA & testing' },
    { label: 'Launch', icon: 'rocket', desc: 'Deployment' }
  ]

  // Timeline Events (from article's milestones section)
  const timelineItems = [
    { label: 'Kickoff', date: 'Jan 2024', desc: 'Project started', status: 'completed' as const },
    { label: 'Alpha', date: 'Mar 2024', desc: 'First release', status: 'completed' as const },
    { label: 'Beta', date: 'Jun 2024', desc: 'Public beta', status: 'completed' as const },
    { label: 'Launch', date: 'Sep 2024', desc: 'GA release', status: 'current' as const },
    { label: 'Scale', date: 'Dec 2024', desc: 'Expansion', status: 'upcoming' as const }
  ]

  // Ranking Data (from article's top performers section)
  const rankingItems = [
    { label: 'Enterprise', value: '$5.2M', rank: 1 },
    { label: 'Pro Plan', value: '$4.1M', rank: 2 },
    { label: 'Starter', value: '$2.8M', rank: 3 },
    { label: 'Free Tier', value: '$0.4M', rank: 4 }
  ]

  // Team Structure (badge cards)
  const teamItems = [
    { label: 'Engineering', value: '45', icon: 'laptop', desc: 'Tech team' },
    { label: 'Product', value: '12', icon: 'cog', desc: 'PM team' },
    { label: 'Design', value: '8', icon: 'palette', desc: 'UX/UI' },
    { label: 'Sales', value: '25', icon: 'phone', desc: 'Revenue' }
  ]

  // =====================================================
  // JVM Performance Article Demo
  // =====================================================

  // Article content (original text)
  const jvmArticle = `
# JVM Performance Tuning Guide

## Executive Summary
After 3 months of optimization, our Java application achieved significant improvements:
- Response time reduced from 450ms to 85ms (81% improvement)
- GC pause time reduced from 120ms to 8ms
- Memory usage optimized from 8GB to 4.5GB
- Throughput increased by 156%

## Memory Tuning Progress
Our heap optimization went through 4 phases:
1. Initial State: 8GB heap, 45% utilization (January)
2. Analysis Phase: Identified memory leaks (February)
3. Optimization: Reduced to 6GB (March)
4. Fine-tuning: Achieved 4.5GB optimal (April)

## GC Algorithm Comparison
We tested different garbage collectors:
- G1GC: 12ms avg pause, 98.5% throughput
- ZGC: 2ms avg pause, 97.8% throughput
- Shenandoah: 3ms avg pause, 97.2% throughput
- ParallelGC: 85ms avg pause, 99.1% throughput

## Key Metrics
Current production status:
- CPU Usage: 65% average
- Memory: 72% utilized
- GC Overhead: 2.1%
- JIT Compilation: 95% hot methods compiled
`

  // JVM KPIs
  const jvmKpis = [
    { label: 'Response', value: '85ms', icon: 'speedometer' },
    { label: 'GC Pause', value: '8ms', icon: 'timer' },
    { label: 'Memory', value: '4.5GB', icon: 'memory' },
    { label: 'Throughput', value: '+156%', icon: 'trending-up' }
  ]

  // JVM Progress metrics
  const jvmProgress = [
    { label: 'CPU Usage', value: 65, max: 100 },
    { label: 'Memory Used', value: 72, max: 100 },
    { label: 'GC Overhead', value: 2.1, max: 10 },
    { label: 'JIT Compiled', value: 95, max: 100 }
  ]

  // Memory optimization phases
  const memoryPhases = [
    { label: '8GB', date: 'Jan 2024', desc: 'Initial state', status: 'completed' as const },
    { label: 'Analysis', date: 'Feb 2024', desc: 'Memory leaks', status: 'completed' as const },
    { label: '6GB', date: 'Mar 2024', desc: 'Optimized', status: 'completed' as const },
    { label: '4.5GB', date: 'Apr 2024', desc: 'Optimal', status: 'current' as const }
  ]

  // GC comparison
  const gcComparison = [
    { label: 'G1GC', value: '12ms', rank: 2, desc: '98.5% throughput' },
    { label: 'ZGC', value: '2ms', rank: 1, desc: '97.8% throughput' },
    { label: 'Shenandoah', value: '3ms', rank: 3, desc: '97.2% throughput' }
  ]

  // =====================================================
  // New Component Demo Data
  // =====================================================

  // HierarchyTree - Organization chart
  const orgChart: TreeNode = {
    id: 'ceo',
    label: 'CEO',
    desc: 'Leadership',
    children: [
      {
        id: 'cto',
        label: 'CTO',
        desc: 'Technology',
        children: [
          { id: 'dev-lead', label: 'Dev Lead' },
          { id: 'arch', label: 'Architect' }
        ]
      },
      {
        id: 'cfo',
        label: 'CFO',
        desc: 'Finance',
        children: [
          { id: 'acc', label: 'Accounting' }
        ]
      },
      {
        id: 'cmo',
        label: 'CMO',
        desc: 'Marketing'
      }
    ]
  }

  // CompareSwot - SWOT analysis data
  const swotData: SwotData = {
    strengths: [
      { id: 's1', label: 'Strong brand recognition' },
      { id: 's2', label: 'Innovative technology' },
      { id: 's3', label: 'Skilled workforce' }
    ],
    weaknesses: [
      { id: 'w1', label: 'Limited market presence' },
      { id: 'w2', label: 'High operational costs' }
    ],
    opportunities: [
      { id: 'o1', label: 'Emerging markets expansion' },
      { id: 'o2', label: 'AI integration' },
      { id: 'o3', label: 'Strategic partnerships' }
    ],
    threats: [
      { id: 't1', label: 'Intense competition' },
      { id: 't2', label: 'Regulatory changes' }
    ]
  }

  // ListSector - Pie/donut chart data
  const marketShare: SectorItem[] = [
    { id: 'p1', label: 'Enterprise', value: 45 },
    { id: 'p2', label: 'SMB', value: 30 },
    { id: 'p3', label: 'Startup', value: 15 },
    { id: 'p4', label: 'Individual', value: 10 }
  ]

  // SequenceSnake - Process flow with snake pattern
  const devProcess: SnakeItem[] = [
    { id: '1', label: 'Requirements', desc: 'Gather specs' },
    { id: '2', label: 'Design', desc: 'Architecture' },
    { id: '3', label: 'Develop', desc: 'Coding' },
    { id: '4', label: 'Test', desc: 'QA process' },
    { id: '5', label: 'Deploy', desc: 'Release' },
    { id: '6', label: 'Monitor', desc: 'Observe' }
  ]

  let selectedTheme = $state('dark-vibrant')
  let selectedPalette = $state('vibrant')
  let showArrows = $state(true)
  let activeDemo = $state<'jvm' | 'article' | 'components' | 'themes'>('jvm')

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
    <button class:active={activeDemo === 'jvm'} onclick={() => activeDemo = 'jvm'}>
      JVM Performance
    </button>
    <button class:active={activeDemo === 'article'} onclick={() => activeDemo = 'article'}>
      Q4 Report
    </button>
    <button class:active={activeDemo === 'components'} onclick={() => activeDemo = 'components'}>
      Components
    </button>
    <button class:active={activeDemo === 'themes'} onclick={() => activeDemo = 'themes'}>
      Themes
    </button>
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
    <!-- ============================================== -->
    <!-- JVM Performance Article Demo -->
    <!-- ============================================== -->
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

        <!-- JVM KPIs -->
        <section class="demo-section">
          <h4>Performance Improvements</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={700} height={140} padding={16}>
              <ListRowHorizontal
                items={jvmKpis}
                width={668}
                height={108}
                showArrows={false}
                palette={selectedPalette}
              >
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <ValueCard
                    label={data.label}
                    value={String(data.value ?? '')}
                    icon={data.icon}
                    {themeColors}
                    {width}
                    {height}
                    {gradientId}
                  />
                {/snippet}
              </ListRowHorizontal>
            </Infographic>
          </div>
        </section>

        <!-- Memory Optimization Timeline -->
        <section class="demo-section">
          <h4>Memory Optimization Journey</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={750} height={180} padding={16}>
              <SequenceTimeline
                items={memoryPhases}
                width={718}
                height={148}
                palette={selectedPalette}
                timelinePosition="middle"
              />
            </Infographic>
          </div>
        </section>

        <!-- Current System Metrics -->
        <section class="demo-section">
          <h4>Current System Metrics</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={620} height={340} padding={16}>
              <ListGrid
                items={jvmProgress}
                width={588}
                height={308}
                columns={2}
                gap={16}
                palette={selectedPalette}
              >
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <CircularProgress
                    label={data.label}
                    value={Number(data.value ?? 0)}
                    max={Number(data.max ?? 100)}
                    {themeColors}
                    {width}
                    {height}
                    {gradientId}
                  />
                {/snippet}
              </ListGrid>
            </Infographic>
          </div>
        </section>

        <!-- GC Algorithm Comparison -->
        <section class="demo-section">
          <h4>GC Algorithm Ranking</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={500} height={220} padding={16}>
              <ListPyramid
                items={gcComparison}
                width={468}
                height={188}
                direction="up"
                palette={selectedPalette}
              />
            </Infographic>
          </div>
        </section>
      </div>
    </div>

  {:else if activeDemo === 'article'}
    <!-- ============================================== -->
    <!-- Article → Infographic Conversion Demo -->
    <!-- ============================================== -->
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

        <!-- KPI Row using ValueCard -->
        <section class="demo-section">
          <h4>Key Metrics (ListRowHorizontal + ValueCard)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={700} height={140} padding={16}>
              <ListRowHorizontal
                items={kpiItems}
                width={668}
                height={108}
                showArrows={false}
                palette={selectedPalette}
              >
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <ValueCard
                    label={data.label}
                    value={String(data.value ?? '')}
                    icon={data.icon}
                    {themeColors}
                    {width}
                    {height}
                    {gradientId}
                  />
                {/snippet}
              </ListRowHorizontal>
            </Infographic>
          </div>
        </section>

        <!-- Progress Grid using CircularProgress -->
        <section class="demo-section">
          <h4>Goals Progress (ListGrid + CircularProgress)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={620} height={340} padding={16}>
              <ListGrid
                items={progressItems}
                width={588}
                height={308}
                columns={2}
                gap={16}
                palette={selectedPalette}
              >
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <CircularProgress
                    label={data.label}
                    value={Number(data.value ?? 0)}
                    max={Number(data.max ?? 100)}
                    icon={data.icon}
                    {themeColors}
                    {width}
                    {height}
                    {gradientId}
                  />
                {/snippet}
              </ListGrid>
            </Infographic>
          </div>
        </section>

        <!-- Process Flow -->
        <section class="demo-section">
          <h4>Process Flow (ListRowHorizontal + IconArrowNode)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={900} height={160} padding={16}>
              <ListRowHorizontal
                items={processItems}
                width={868}
                height={128}
                {showArrows}
                palette={selectedPalette}
              >
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <IconArrowNode
                    label={data.label}
                    desc={data.desc}
                    icon={data.icon}
                    {themeColors}
                    {width}
                    {height}
                    {gradientId}
                  />
                {/snippet}
              </ListRowHorizontal>
            </Infographic>
          </div>
        </section>

        <!-- Timeline -->
        <section class="demo-section">
          <h4>Project Timeline (SequenceTimeline)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={850} height={200} padding={16}>
              <SequenceTimeline
                items={timelineItems}
                width={818}
                height={168}
                palette={selectedPalette}
                timelinePosition="middle"
              />
            </Infographic>
          </div>
        </section>

        <!-- Revenue Pyramid -->
        <section class="demo-section">
          <h4>Revenue by Tier (ListPyramid)</h4>
          <div class="infographic-wrapper">
            <Infographic theme={selectedTheme} width={500} height={280} padding={16}>
              <ListPyramid
                items={rankingItems}
                width={468}
                height={248}
                direction="up"
                palette={selectedPalette}
              />
            </Infographic>
          </div>
        </section>
      </div>
    </div>

  {:else if activeDemo === 'components'}
    <!-- ============================================== -->
    <!-- All Components Showcase -->
    <!-- ============================================== -->

    <!-- Structures -->
    <h2 class="section-title">Structure Components (9)</h2>

    <section class="demo-section">
      <h3>1. ListRowHorizontal</h3>
      <p class="component-desc">Horizontal row layout with optional arrows between items</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={700} height={140} padding={16}>
          <ListRowHorizontal
            items={kpiItems}
            width={668}
            height={108}
            {showArrows}
            palette={selectedPalette}
          >
            {#snippet item({ data, themeColors, width, height, gradientId })}
              <IconArrowNode
                label={data.label}
                desc={data.value}
                icon={data.icon}
                {themeColors}
                {width}
                {height}
                {gradientId}
              />
            {/snippet}
          </ListRowHorizontal>
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>2. ListGrid</h3>
      <p class="component-desc">Grid layout with configurable columns (2xN default)</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={500} height={300} padding={16}>
          <ListGrid
            items={teamItems}
            width={468}
            height={268}
            columns={2}
            gap={12}
            palette={selectedPalette}
          >
            {#snippet item({ data, themeColors, width, height, gradientId })}
              <BadgeCard
                label={data.label}
                value={String(data.value ?? '')}
                desc={data.desc}
                icon={data.icon}
                {themeColors}
                {width}
                {height}
                {gradientId}
              />
            {/snippet}
          </ListGrid>
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>3. ListPyramid</h3>
      <p class="component-desc">True pyramid shape with trapezoid layers for hierarchy and ranking</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={450} height={280} padding={16}>
          <ListPyramid
            items={rankingItems}
            width={418}
            height={248}
            direction="up"
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>4. ListZigzag</h3>
      <p class="component-desc">Zigzag/alternating layout for process flows</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={800} height={180} padding={16}>
          <ListRowHorizontal
            items={processItems}
            width={768}
            height={148}
            {showArrows}
            palette={selectedPalette}
          >
            {#snippet item({ data, themeColors, width, height, gradientId })}
              <IconArrowNode
                label={data.label}
                desc={data.desc}
                icon={data.icon}
                {themeColors}
                {width}
                {height}
                {gradientId}
              />
            {/snippet}
          </ListRowHorizontal>
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>5. SequenceTimeline</h3>
      <p class="component-desc">Horizontal timeline with date markers and status</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={850} height={200} padding={16}>
          <SequenceTimeline
            items={timelineItems}
            width={818}
            height={168}
            palette={selectedPalette}
            timelinePosition="middle"
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>6. HierarchyTree</h3>
      <p class="component-desc">Tree/organization chart with vertical or horizontal orientation</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={700} height={300} padding={16}>
          <HierarchyTree
            root={orgChart}
            width={668}
            height={268}
            orientation="vertical"
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>7. CompareSwot</h3>
      <p class="component-desc">SWOT analysis diagram with 4 quadrants (Strengths, Weaknesses, Opportunities, Threats)</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={700} height={400} padding={16}>
          <CompareSwot
            data={swotData}
            width={668}
            height={368}
            showHeaders={true}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>8. ListSector</h3>
      <p class="component-desc">Radial sector (pie/donut) layout with proportional or equal sizing</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={400} height={400} padding={16}>
          <ListSector
            items={marketShare}
            width={368}
            height={368}
            innerRadius={0.4}
            showLabels={true}
            labelPosition="outside"
            palette={selectedPalette}
            showCenter={true}
            centerLabel="Market"
            centerValue="100%"
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>9. SequenceSnake</h3>
      <p class="component-desc">Snake/serpentine layout with alternating flow direction</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={600} height={280} padding={16}>
          <SequenceSnake
            items={devProcess}
            width={568}
            height={248}
            itemsPerRow={3}
            showConnections={true}
            showNumbers={true}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <!-- Item Components -->
    <h2 class="section-title">Item Components (6)</h2>

    <!-- 1. BadgeCard -->
    <section class="demo-section">
      <h3>1. BadgeCard</h3>
      <p class="component-desc">Card with colored badge header, icon, label, value and description</p>
      <div class="items-row">
        <Infographic theme={selectedTheme} width={180} height={140} padding={12}>
          <BadgeCard
            label="Revenue"
            value="$12.5M"
            desc="Q4 2024"
            icon="currency-usd"
            themeColors={{
              colorPrimary: '#6366f1',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={156}
            height={116}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={180} height={140} padding={12}>
          <BadgeCard
            label="Users"
            value="158K"
            desc="Active"
            icon="account-group"
            themeColors={{
              colorPrimary: '#8b5cf6',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={156}
            height={116}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={180} height={140} padding={12}>
          <BadgeCard
            label="Growth"
            value="+45%"
            desc="YoY"
            icon="trending-up"
            themeColors={{
              colorPrimary: '#22c55e',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={156}
            height={116}
          />
        </Infographic>
      </div>
    </section>

    <!-- 2. ValueCard -->
    <section class="demo-section">
      <h3>2. ValueCard</h3>
      <p class="component-desc">Compact card with icon, label, and prominent value display</p>
      <div class="items-row">
        <Infographic theme={selectedTheme} width={160} height={100} padding={12}>
          <ValueCard
            label="Orders"
            value="1,234"
            icon="cart"
            themeColors={{
              colorPrimary: '#f59e0b',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={136}
            height={76}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={160} height={100} padding={12}>
          <ValueCard
            label="Sessions"
            value="89.2K"
            icon="web"
            themeColors={{
              colorPrimary: '#3b82f6',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={136}
            height={76}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={160} height={100} padding={12}>
          <ValueCard
            label="Rating"
            value="4.8"
            icon="star"
            themeColors={{
              colorPrimary: '#ec4899',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={136}
            height={76}
          />
        </Infographic>
      </div>
    </section>

    <!-- 3. CircularProgress -->
    <section class="demo-section">
      <h3>3. CircularProgress</h3>
      <p class="component-desc">Circular progress indicator with percentage and label</p>
      <div class="items-row">
        <Infographic theme={selectedTheme} width={140} height={160} padding={12}>
          <CircularProgress
            label="CPU"
            value={65}
            max={100}
            themeColors={{
              colorPrimary: '#22c55e',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={116}
            height={136}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={140} height={160} padding={12}>
          <CircularProgress
            label="Memory"
            value={82}
            max={100}
            themeColors={{
              colorPrimary: '#f59e0b',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={116}
            height={136}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={140} height={160} padding={12}>
          <CircularProgress
            label="Disk"
            value={45}
            max={100}
            themeColors={{
              colorPrimary: '#3b82f6',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={116}
            height={136}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={140} height={160} padding={12}>
          <CircularProgress
            label="Network"
            value={91}
            max={100}
            themeColors={{
              colorPrimary: '#ef4444',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={116}
            height={136}
          />
        </Infographic>
      </div>
    </section>

    <!-- 4. IconArrowNode -->
    <section class="demo-section">
      <h3>4. IconArrowNode</h3>
      <p class="component-desc">Node with icon and description, ideal for process flows</p>
      <div class="items-row">
        <Infographic theme={selectedTheme} width={140} height={100} padding={12}>
          <IconArrowNode
            label="Research"
            desc="Analysis"
            icon="lightbulb"
            themeColors={{
              colorPrimary: '#6366f1',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={116}
            height={76}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={140} height={100} padding={12}>
          <IconArrowNode
            label="Design"
            desc="Mockups"
            icon="palette"
            themeColors={{
              colorPrimary: '#8b5cf6',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={116}
            height={76}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={140} height={100} padding={12}>
          <IconArrowNode
            label="Develop"
            desc="Coding"
            icon="laptop"
            themeColors={{
              colorPrimary: '#22c55e',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={116}
            height={76}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={140} height={100} padding={12}>
          <IconArrowNode
            label="Launch"
            desc="Deploy"
            icon="rocket"
            themeColors={{
              colorPrimary: '#ec4899',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={116}
            height={76}
          />
        </Infographic>
      </div>
    </section>

    <!-- 5. ImageCard -->
    <section class="demo-section">
      <h3>5. ImageCard</h3>
      <p class="component-desc">Card with image, supporting different label positions and overlays</p>
      <div class="items-row">
        <Infographic theme={selectedTheme} width={180} height={160} padding={12}>
          <ImageCard
            src="https://via.placeholder.com/150x100/6366f1/ffffff?text=Product"
            label="Product A"
            desc="Featured"
            themeColors={{
              colorPrimary: '#6366f1',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={156}
            height={136}
            labelPosition="bottom"
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={180} height={160} padding={12}>
          <ImageCard
            src="https://via.placeholder.com/150x100/22c55e/ffffff?text=Gallery"
            label="Photo"
            themeColors={{
              colorPrimary: '#22c55e',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={156}
            height={136}
            labelPosition="overlay-bottom"
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={180} height={160} padding={12}>
          <ImageCard
            src="https://via.placeholder.com/150x100/ec4899/ffffff?text=Banner"
            label="Banner"
            desc="Promo"
            themeColors={{
              colorPrimary: '#ec4899',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={156}
            height={136}
            labelPosition="top"
          />
        </Infographic>
      </div>
    </section>

    <!-- 6. StatCard -->
    <section class="demo-section">
      <h3>6. StatCard</h3>
      <p class="component-desc">KPI card with value, trend indicator, and comparison metrics</p>
      <div class="items-row">
        <Infographic theme={selectedTheme} width={200} height={110} padding={12}>
          <StatCard
            label="Revenue"
            value="$1.2M"
            trend={12.5}
            trendLabel="vs last month"
            themeColors={{
              colorPrimary: '#22c55e',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={176}
            height={86}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={200} height={110} padding={12}>
          <StatCard
            label="Users"
            value="45.2K"
            trend={-3.2}
            trendLabel="this week"
            themeColors={{
              colorPrimary: '#ef4444',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={176}
            height={86}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={200} height={110} padding={12}>
          <StatCard
            label="Conversion"
            value="3.8%"
            trend={0.5}
            trendLabel="vs average"
            icon="chart-line"
            themeColors={{
              colorPrimary: '#3b82f6',
              colorPrimaryBg: '#1a1a2e',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
            width={176}
            height={86}
          />
        </Infographic>
      </div>
    </section>

  {:else}
    <!-- ============================================== -->
    <!-- Themes & Palettes -->
    <!-- ============================================== -->

    <!-- Theme Preview -->
    <section class="demo-section">
      <h2>All Theme Presets</h2>
      <div class="theme-grid">
        {#each [...darkPresets, ...lightPresets] as preset}
          <div class="theme-preview" class:active={selectedTheme === preset} onclick={() => selectedTheme = preset}>
            <Infographic theme={preset} width={200} height={80} padding={12}>
              <ListRowHorizontal
                items={[
                  { label: 'A', icon: 'circle' },
                  { label: 'B', icon: 'square' },
                  { label: 'C', icon: 'triangle' }
                ]}
                width={176}
                height={56}
                showArrows={false}
                gap={8}
              >
                {#snippet item({ data, themeColors, width, height, gradientId })}
                  <rect
                    x="0"
                    y="0"
                    {width}
                    {height}
                    rx="6"
                    fill={gradientId ? `url(#${gradientId})` : themeColors.colorPrimary}
                  />
                {/snippet}
              </ListRowHorizontal>
            </Infographic>
            <span class="theme-name">{preset}</span>
          </div>
        {/each}
      </div>
    </section>

    <!-- Palette Preview -->
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

<style>
  .demo-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Inter', system-ui, sans-serif;
    background: #0f0f1a;
    min-height: 100vh;
  }

  .demo-header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .demo-header h1 {
    font-size: 2rem;
    font-weight: 700;
    background: linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    margin-bottom: 0.5rem;
  }

  .demo-header p {
    color: #888;
    margin-top: 0.5rem;
    font-size: 0.9rem;
  }

  /* Tab Navigation */
  .demo-tabs {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 1.5rem;
    padding: 0.25rem;
    background: rgba(255, 255, 255, 0.05);
    border-radius: 8px;
    width: fit-content;
  }

  .demo-tabs button {
    padding: 0.5rem 1rem;
    background: transparent;
    border: none;
    color: #888;
    font-size: 0.875rem;
    font-weight: 500;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .demo-tabs button:hover {
    color: #fff;
    background: rgba(255, 255, 255, 0.05);
  }

  .demo-tabs button.active {
    color: #fff;
    background: linear-gradient(135deg, #6366f1, #8b5cf6);
  }

  .controls {
    display: flex;
    gap: 1.5rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    margin-bottom: 1.5rem;
    flex-wrap: wrap;
    align-items: center;
  }

  .control-group {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .control-label {
    font-weight: 500;
    font-size: 0.8rem;
    color: #a0a0b0;
  }

  .control-group select {
    padding: 0.4rem 0.6rem;
    background: rgba(255, 255, 255, 0.1);
    border: 1px solid rgba(255, 255, 255, 0.2);
    border-radius: 6px;
    font-size: 0.8rem;
    color: #fff;
    cursor: pointer;
  }

  .control-group select:hover {
    background: rgba(255, 255, 255, 0.15);
  }

  .control-group select option {
    background: #1a1a2e;
    color: #fff;
  }

  .checkbox-group {
    gap: 0.5rem;
  }

  .checkbox-group input[type="checkbox"] {
    width: 16px;
    height: 16px;
    accent-color: #6366f1;
    cursor: pointer;
  }

  /* Article Demo Section */
  .article-demo {
    display: flex;
    gap: 2rem;
    align-items: flex-start;
    margin-bottom: 2rem;
  }

  .article-source {
    flex: 0 0 280px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 1rem;
    position: sticky;
    top: 1rem;
  }

  .article-source h3 {
    font-size: 0.9rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 0.75rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .article-content {
    font-size: 0.75rem;
    color: #a0a0b0;
    line-height: 1.6;
  }

  .article-content p {
    margin-bottom: 0.5rem;
  }

  .article-content strong {
    color: #d0d0d0;
  }

  .article-text pre {
    font-size: 0.7rem;
    line-height: 1.5;
    white-space: pre-wrap;
    word-wrap: break-word;
    font-family: 'JetBrains Mono', 'Fira Code', monospace;
    color: #b0b0c0;
    margin: 0;
    max-height: 500px;
    overflow-y: auto;
  }

  .arrow-indicator {
    font-size: 2rem;
    color: #6366f1;
    display: flex;
    align-items: center;
    padding-top: 100px;
  }

  .infographic-result {
    flex: 1;
  }

  .infographic-result h3 {
    font-size: 1rem;
    font-weight: 600;
    color: #fff;
    margin-bottom: 1rem;
  }

  .demo-section {
    margin-bottom: 1.5rem;
  }

  .demo-section h2 {
    font-size: 1.1rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    color: #e0e0e0;
  }

  .demo-section h3 {
    font-size: 0.95rem;
    font-weight: 600;
    margin-bottom: 0.5rem;
    color: #d0d0d0;
  }

  .demo-section h4 {
    font-size: 0.85rem;
    font-weight: 500;
    margin-bottom: 0.5rem;
    color: #b0b0b0;
  }

  .component-desc {
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 0.75rem;
  }

  .section-title {
    font-size: 1.25rem;
    font-weight: 700;
    color: #fff;
    margin: 2rem 0 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .infographic-wrapper {
    display: flex;
    justify-content: center;
    padding: 1rem;
    background: rgba(26, 26, 46, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    overflow-x: auto;
  }

  /* Items Row - horizontal display of multiple item variations */
  .items-row {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
    padding: 1rem;
    background: rgba(26, 26, 46, 0.5);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    align-items: flex-start;
  }

  /* Items Showcase */
  .items-showcase {
    display: flex;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .item-demo {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 10px;
    padding: 1rem;
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .item-demo h3 {
    margin-bottom: 0.75rem;
    font-size: 0.85rem;
  }

  /* Theme Grid */
  .theme-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 0.75rem;
  }

  .theme-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .theme-preview:hover {
    border-color: rgba(99, 102, 241, 0.3);
  }

  .theme-preview.active {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }

  .theme-name {
    font-size: 0.7rem;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Palette Grid */
  .palette-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
    gap: 0.75rem;
  }

  .palette-preview {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
    background: rgba(255, 255, 255, 0.03);
    border-radius: 8px;
    border: 2px solid transparent;
    cursor: pointer;
    transition: all 0.2s;
  }

  .palette-preview:hover {
    border-color: rgba(99, 102, 241, 0.3);
  }

  .palette-preview.active {
    border-color: #6366f1;
    background: rgba(99, 102, 241, 0.1);
  }

  .palette-colors {
    display: flex;
    border-radius: 4px;
    overflow: hidden;
  }

  .palette-swatch {
    width: 24px;
    height: 24px;
  }

  .palette-name {
    font-size: 0.7rem;
    color: #888;
    font-family: 'JetBrains Mono', monospace;
  }

  /* Responsive */
  @media (max-width: 900px) {
    .article-demo {
      flex-direction: column;
    }

    .article-source {
      flex: none;
      width: 100%;
      position: static;
    }

    .arrow-indicator {
      display: none;
    }
  }
</style>
