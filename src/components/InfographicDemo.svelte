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
    ListRowVertical,
    ListGrid,
    ListPyramid,
    SequenceTimeline,
    HierarchyTree,
    CompareSwot,
    ListSector,
    SequenceSnake,
    CycleRadial,
    CompareQuadrant,
    FlowLinear,
    MindMap,
    RelationNetwork,
    CompareBinary,
    SequenceRoadmap,
    SequenceStairs,
    SequenceAscending,
    RelationVenn,
    RelationCircle,
    ChartBar,
    ChartLine,
    ChartFunnel,
    CompareTable,
    IconArrowNode,
    BadgeCard,
    ValueCard,
    CircularProgress,
    ImageCard,
    StatCard,
    MindMapNode,
    NetworkNode,
    NumberBadge,
    getDarkPresetNames,
    getLightPresetNames,
    PALETTES,
    getPaletteNames,
    createPatternDef,
    patternDefToSVG
  } from '@plugins/data-display/infographic'
  import {
    createDivider,
    createBadge,
    createFrame,
    createCallout,
    createHighlight
  } from '@plugins/data-display/infographic/utils'
  import type {
    TreeNode,
    SwotData,
    SectorItem,
    SnakeItem,
    CycleItem,
    QuadrantData,
    FlowStep,
    MindMapNodeData,
    NetworkNodeData,
    NetworkEdgeData,
    CompareSideData,
    MilestoneData,
    StairStepData,
    AscendingStepData,
    VennSetData,
    VennOverlapData,
    CircleNodeData,
    CircleConnectionData,
    BarDataItem,
    LineSeriesData,
    FunnelStageData,
    TableColumn,
    TableRow
  } from '@plugins/data-display/infographic'

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
    { label: 'ZGC', value: '2ms', rank: 1, desc: '97.8% throughput' },
    { label: 'G1GC', value: '12ms', rank: 2, desc: '98.5% throughput' },
    { label: 'Shenandoah', value: '3ms', rank: 3, desc: '97.2% throughput' },
    { label: 'ParallelGC', value: '85ms', rank: 4, desc: '99.1% throughput' }
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

  // CycleRadial - PDCA cycle
  const pdcaCycle: CycleItem[] = [
    { id: 'plan', label: 'Plan', desc: 'Define goals' },
    { id: 'do', label: 'Do', desc: 'Execute' },
    { id: 'check', label: 'Check', desc: 'Evaluate' },
    { id: 'act', label: 'Act', desc: 'Improve' }
  ]

  // CompareQuadrant - Eisenhower matrix
  const eisenhowerMatrix: QuadrantData = {
    topLeft: [
      { id: 'u1', label: 'Crisis handling' },
      { id: 'u2', label: 'Deadlines' }
    ],
    topRight: [
      { id: 'i1', label: 'Planning' },
      { id: 'i2', label: 'Learning' },
      { id: 'i3', label: 'Relationships' }
    ],
    bottomLeft: [
      { id: 'd1', label: 'Interruptions' },
      { id: 'd2', label: 'Some meetings' }
    ],
    bottomRight: [
      { id: 'e1', label: 'Time wasters' },
      { id: 'e2', label: 'Busy work' }
    ]
  }

  // FlowLinear - Simple workflow
  const approvalFlow: FlowStep[] = [
    { id: 's1', label: 'Submit', desc: 'Create request' },
    { id: 's2', label: 'Review', desc: 'Manager review' },
    { id: 's3', label: 'Approve', desc: 'Final decision' },
    { id: 's4', label: 'Complete', desc: 'Process done' }
  ]

  // MindMap - Radial mind map data
  const mindMapData: MindMapNodeData = {
    id: 'root',
    label: 'Product Strategy',
    children: [
      {
        id: 'market',
        label: 'Market',
        children: [
          { id: 'b2b', label: 'B2B' },
          { id: 'b2c', label: 'B2C' },
          { id: 'saas', label: 'SaaS' }
        ]
      },
      {
        id: 'tech',
        label: 'Technology',
        children: [
          { id: 'ai', label: 'AI/ML' },
          { id: 'cloud', label: 'Cloud' }
        ]
      },
      {
        id: 'growth',
        label: 'Growth',
        children: [
          { id: 'organic', label: 'Organic' },
          { id: 'paid', label: 'Paid Ads' }
        ]
      },
      {
        id: 'team',
        label: 'Team',
        children: [
          { id: 'eng', label: 'Engineering' },
          { id: 'design', label: 'Design' }
        ]
      }
    ]
  }

  // RelationNetwork - Network graph data
  const networkNodes: NetworkNodeData[] = [
    { id: 'api', label: 'API Gateway', group: 'core' },
    { id: 'auth', label: 'Auth Service', group: 'core' },
    { id: 'user', label: 'User Service', group: 'service' },
    { id: 'order', label: 'Order Service', group: 'service' },
    { id: 'db', label: 'Database', group: 'data' },
    { id: 'cache', label: 'Redis Cache', group: 'data' }
  ]

  const networkEdges: NetworkEdgeData[] = [
    { source: 'api', target: 'auth' },
    { source: 'api', target: 'user' },
    { source: 'api', target: 'order' },
    { source: 'user', target: 'db' },
    { source: 'order', target: 'db' },
    { source: 'user', target: 'cache' },
    { source: 'order', target: 'cache' }
  ]

  // CompareBinary - VS comparison data
  const compareLeft: CompareSideData = {
    title: 'React',
    subtitle: 'Library',
    icon: 'react',
    items: [
      { text: 'Virtual DOM diffing' },
      { text: 'JSX syntax' },
      { text: 'Large ecosystem' },
      { text: 'One-way data flow' }
    ]
  }

  const compareRight: CompareSideData = {
    title: 'Svelte',
    subtitle: 'Compiler',
    icon: 'language-html5',
    items: [
      { text: 'No virtual DOM' },
      { text: 'Reactive by default' },
      { text: 'Smaller bundle size' },
      { text: 'Less boilerplate' }
    ]
  }

  // SequenceRoadmap - Project milestones
  const roadmapMilestones: MilestoneData[] = [
    { id: 'm1', title: 'MVP', desc: 'Core features', status: 'completed' },
    { id: 'm2', title: 'Beta', desc: 'User testing', status: 'completed' },
    { id: 'm3', title: 'Launch', desc: 'Public release', status: 'current' },
    { id: 'm4', title: 'Scale', desc: 'Growth phase', status: 'upcoming' },
    { id: 'm5', title: 'Expand', desc: 'New markets', status: 'upcoming' }
  ]

  // SequenceStairs - Growth stages
  const stairsSteps: StairStepData[] = [
    { id: 'st1', label: 'Seed', value: '$100K' },
    { id: 'st2', label: 'Series A', value: '$2M' },
    { id: 'st3', label: 'Series B', value: '$15M' },
    { id: 'st4', label: 'Series C', value: '$50M' },
    { id: 'st5', label: 'IPO', value: '$500M' }
  ]

  // SequenceAscending - Escalation levels
  const ascendingSteps: AscendingStepData[] = [
    { id: 'a1', label: 'Basic', desc: 'Entry tier' },
    { id: 'a2', label: 'Standard', desc: 'Most popular' },
    { id: 'a3', label: 'Premium', desc: 'Advanced features' },
    { id: 'a4', label: 'Enterprise', desc: 'Full access' }
  ]

  // RelationVenn - Venn diagram data
  const vennSets: VennSetData[] = [
    { id: 'design', label: 'Design', items: ['Figma', 'Sketch', 'Adobe XD'] },
    { id: 'dev', label: 'Development', items: ['React', 'Vue', 'Svelte'] },
    { id: 'data', label: 'Data', items: ['SQL', 'Python', 'R'] }
  ]

  const vennOverlaps: VennOverlapData[] = [
    { sets: ['design', 'dev'], label: 'UI/UX', items: ['CSS', 'HTML'] },
    { sets: ['dev', 'data'], label: 'Backend', items: ['APIs', 'DB'] },
    { sets: ['design', 'data'], label: 'DataViz', items: ['Charts'] },
    { sets: ['design', 'dev', 'data'], label: 'Full Stack' }
  ]

  // RelationCircle - Circular relationship data
  const circleNodes: CircleNodeData[] = [
    { id: 'pm', label: 'PM', desc: 'Product', icon: 'account' },
    { id: 'design', label: 'Design', desc: 'UX/UI', icon: 'palette' },
    { id: 'frontend', label: 'Frontend', desc: 'React', icon: 'react' },
    { id: 'backend', label: 'Backend', desc: 'Node.js', icon: 'nodejs' },
    { id: 'qa', label: 'QA', desc: 'Testing', icon: 'test-tube' },
    { id: 'devops', label: 'DevOps', desc: 'CI/CD', icon: 'cloud' }
  ]

  const circleConnections: CircleConnectionData[] = [
    { from: 'pm', to: 'design' },
    { from: 'design', to: 'frontend' },
    { from: 'frontend', to: 'backend' },
    { from: 'backend', to: 'devops' },
    { from: 'devops', to: 'qa' },
    { from: 'qa', to: 'pm' }
  ]

  // =====================================================
  // Phase 4: Chart Components Demo Data
  // =====================================================

  // ChartBar data
  const barChartData: BarDataItem[] = [
    { label: 'January', value: 4500 },
    { label: 'February', value: 5200 },
    { label: 'March', value: 4800 },
    { label: 'April', value: 6100 },
    { label: 'May', value: 5800 }
  ]

  // ChartLine data
  const lineSeriesData: LineSeriesData[] = [
    {
      name: 'Revenue',
      points: [
        { label: 'Q1', value: 12500 },
        { label: 'Q2', value: 15800 },
        { label: 'Q3', value: 14200 },
        { label: 'Q4', value: 18500 }
      ],
      showArea: true
    },
    {
      name: 'Expenses',
      points: [
        { label: 'Q1', value: 8500 },
        { label: 'Q2', value: 9200 },
        { label: 'Q3', value: 10100 },
        { label: 'Q4', value: 11000 }
      ],
      color: '#ef4444',
      lineStyle: 'dashed'
    }
  ]

  // ChartFunnel data
  const funnelData: FunnelStageData[] = [
    { label: 'Visitors', value: 10000 },
    { label: 'Leads', value: 5500 },
    { label: 'Qualified', value: 2800 },
    { label: 'Proposals', value: 1200 },
    { label: 'Customers', value: 450 }
  ]

  // CompareTable data
  const tableColumns: TableColumn[] = [
    { id: 'basic', header: 'Basic', icon: 'account' },
    { id: 'pro', header: 'Pro', color: '#6366f1' },
    { id: 'enterprise', header: 'Enterprise', color: '#22c55e' }
  ]

  const tableRows: TableRow[] = [
    { label: 'Users', values: { basic: '1', pro: '10', enterprise: 'Unlimited' } },
    { label: 'Storage', values: { basic: '5GB', pro: '100GB', enterprise: '1TB' } },
    { label: 'API Access', values: { basic: false, pro: true, enterprise: true } },
    { label: 'Support', values: { basic: 'Email', pro: '24/7', enterprise: 'Dedicated' } },
    { label: 'Analytics', values: { basic: false, pro: true, enterprise: true }, highlight: true }
  ]

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
    <button class:active={activeDemo === 'jvm'} onclick={() => activeDemo = 'jvm'}>
      JVM Performance
    </button>
    <button class:active={activeDemo === 'article'} onclick={() => activeDemo = 'article'}>
      Q4 Report
    </button>
    <button class:active={activeDemo === 'components'} onclick={() => activeDemo = 'components'}>
      Components
    </button>
    <button class:active={activeDemo === 'charts'} onclick={() => activeDemo = 'charts'}>
      Charts & Utils
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
            <Infographic theme={selectedTheme} width={500} height={320} padding={16}>
              <ListPyramid
                items={gcComparison}
                width={468}
                height={288}
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
            <Infographic theme={selectedTheme} width={500} height={320} padding={16}>
              <ListPyramid
                items={rankingItems}
                width={468}
                height={288}
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
    <h2 class="section-title">Structure Components (21)</h2>

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
        <Infographic theme={selectedTheme} width={500} height={320} padding={16}>
          <ListPyramid
            items={rankingItems}
            width={468}
            height={288}
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
        <Infographic theme={selectedTheme} width={700} height={380} padding={16}>
          <HierarchyTree
            root={orgChart}
            width={668}
            height={348}
            orientation="vertical"
            nodeWidth={100}
            nodeHeight={50}
            levelGap={50}
            siblingGap={15}
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

    <section class="demo-section">
      <h3>10. CycleRadial</h3>
      <p class="component-desc">Circular cycle diagram for PDCA, life cycles, and process loops</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={350} height={350} padding={16}>
          <CycleRadial
            items={pdcaCycle}
            width={318}
            height={318}
            showArrows={true}
            showCenter={true}
            centerLabel="PDCA"
            centerDesc="Cycle"
            nodeSize={70}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>11. CompareQuadrant</h3>
      <p class="component-desc">2x2 matrix for Eisenhower, BCG, or risk matrices</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={500} height={400} padding={16}>
          <CompareQuadrant
            data={eisenhowerMatrix}
            width={468}
            height={368}
            showAxes={true}
            showQuadrantColors={true}
            axisLabels={{
              xLeft: 'Not Urgent',
              xRight: 'Urgent',
              yTop: 'Important',
              yBottom: 'Not Important'
            }}
            quadrantLabels={{
              topLeft: 'Do First',
              topRight: 'Schedule',
              bottomLeft: 'Delegate',
              bottomRight: 'Eliminate'
            }}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>12. FlowLinear</h3>
      <p class="component-desc">Linear process flow with numbered steps and arrows</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={800} height={120} padding={16}>
          <FlowLinear
            steps={approvalFlow}
            width={768}
            height={88}
            direction="horizontal"
            showNumbers={true}
            showArrows={true}
            arrowStyle="chevron"
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>13. ListRowVertical</h3>
      <p class="component-desc">Vertical stack layout with optional arrows</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={200} height={350} padding={16}>
          <ListRowVertical
            items={[
              { label: 'Step 1', value: 'Initialize' },
              { label: 'Step 2', value: 'Process' },
              { label: 'Step 3', value: 'Validate' },
              { label: 'Step 4', value: 'Complete' }
            ]}
            width={168}
            height={318}
            showArrows={true}
            arrowDirection="down"
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>14. MindMap</h3>
      <p class="component-desc">Radial mind map for brainstorming and idea organization</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={600} height={450} padding={16}>
          <MindMap
            root={mindMapData}
            width={568}
            height={418}
            direction="radial"
            nodeSize={60}
            levelGap={100}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>15. RelationNetwork</h3>
      <p class="component-desc">Network graph showing node relationships and connections</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={500} height={400} padding={16}>
          <RelationNetwork
            nodes={networkNodes}
            edges={networkEdges}
            width={468}
            height={368}
            layout="circular"
            nodeSize={50}
            showEdgeLabels={false}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>16. CompareBinary</h3>
      <p class="component-desc">Left vs Right binary comparison with item lists</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={700} height={320} padding={16}>
          <CompareBinary
            left={compareLeft}
            right={compareRight}
            width={668}
            height={288}
            showVsDivider={true}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>17. SequenceRoadmap</h3>
      <p class="component-desc">Horizontal roadmap with milestone markers for project planning</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={800} height={180} padding={16}>
          <SequenceRoadmap
            milestones={roadmapMilestones}
            width={768}
            height={148}
            showLine={true}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>18. SequenceStairs</h3>
      <p class="component-desc">Ascending stair steps showing progression or growth stages</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={700} height={300} padding={16}>
          <SequenceStairs
            steps={stairsSteps}
            width={668}
            height={268}
            direction="up"
            showNumbers={true}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>19. SequenceAscending</h3>
      <p class="component-desc">Ascending bars with arrows showing growth or escalation</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={700} height={280} padding={16}>
          <SequenceAscending
            steps={ascendingSteps}
            width={668}
            height={248}
            showArrows={true}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>20. RelationVenn</h3>
      <p class="component-desc">Venn diagram showing set relationships and overlaps</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={500} height={400} padding={16}>
          <RelationVenn
            sets={vennSets}
            overlaps={vennOverlaps}
            width={468}
            height={368}
            opacity={0.5}
            showLabels={true}
            showItems={true}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h3>21. RelationCircle</h3>
      <p class="component-desc">Nodes arranged in circle with connections</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={500} height={450} padding={16}>
          <RelationCircle
            nodes={circleNodes}
            connections={circleConnections}
            width={468}
            height={418}
            nodeSize={45}
            showCenter={true}
            centerLabel="Team"
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <!-- Item Components -->
    <h2 class="section-title">Item Components (9)</h2>

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

    <!-- 7. MindMapNode -->
    <section class="demo-section">
      <h3>7. MindMapNode</h3>
      <p class="component-desc">Node for mind map structures with icon, label, and description</p>
      <div class="items-row">
        <Infographic theme={selectedTheme} width={120} height={90} padding={12}>
          <MindMapNode
            label="Root"
            isRoot={true}
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
            width={96}
            height={66}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={100} height={80} padding={12}>
          <MindMapNode
            label="Branch A"
            icon="lightbulb"
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
            width={76}
            height={56}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={100} height={80} padding={12}>
          <MindMapNode
            label="Branch B"
            icon="cog"
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
            width={76}
            height={56}
          />
        </Infographic>
      </div>
    </section>

    <!-- 8. NetworkNode -->
    <section class="demo-section">
      <h3>8. NetworkNode</h3>
      <p class="component-desc">Circular node for network graphs with icon and label</p>
      <div class="items-row">
        <Infographic theme={selectedTheme} width={100} height={100} padding={12}>
          <NetworkNode
            label="API"
            icon="cloud"
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
            width={76}
            height={76}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={100} height={100} padding={12}>
          <NetworkNode
            label="DB"
            icon="database"
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
            width={76}
            height={76}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={100} height={100} padding={12}>
          <NetworkNode
            label="Cache"
            icon="memory"
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
            width={76}
            height={76}
          />
        </Infographic>
      </div>
    </section>

    <!-- 9. NumberBadge -->
    <section class="demo-section">
      <h3>9. NumberBadge</h3>
      <p class="component-desc">Circular or rounded badge displaying a number (step, rank, count)</p>
      <div class="items-row">
        <Infographic theme={selectedTheme} width={60} height={70} padding={12}>
          <NumberBadge
            number={1}
            size={36}
            variant="filled"
            shape="circle"
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
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={60} height={70} padding={12}>
          <NumberBadge
            number={2}
            size={36}
            variant="outline"
            shape="circle"
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
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={60} height={70} padding={12}>
          <NumberBadge
            number={3}
            size={36}
            variant="subtle"
            shape="rounded"
            themeColors={{
              colorPrimary: '#f59e0b',
              colorPrimaryBg: 'rgba(245, 158, 11, 0.2)',
              colorPrimaryText: '#fff',
              colorText: '#fff',
              colorTextSecondary: '#a0a0b0',
              colorWhite: '#fff',
              colorBg: '#1a1a2e',
              colorBgElevated: '#2a2a4a',
              isDarkMode: true
            }}
          />
        </Infographic>
        <Infographic theme={selectedTheme} width={60} height={70} padding={12}>
          <NumberBadge
            number={99}
            size={36}
            variant="filled"
            shape="square"
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
          />
        </Infographic>
      </div>
    </section>

  {:else if activeDemo === 'charts'}
    <!-- ============================================== -->
    <!-- Charts & Utilities (Phase 4 & 5) -->
    <!-- ============================================== -->

    <h2 class="section-title">Chart Components (Phase 4)</h2>

    <!-- ChartBar -->
    <section class="demo-section">
      <h3>22. ChartBar</h3>
      <p class="component-desc">Bar chart with horizontal or vertical orientation, grid lines, and value labels</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={600} height={350} padding={16}>
          <ChartBar
            items={barChartData}
            width={568}
            height={318}
            orientation="horizontal"
            showValues={true}
            showGrid={true}
            cornerRadius={4}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h4>ChartBar (Vertical)</h4>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={600} height={350} padding={16}>
          <ChartBar
            items={barChartData}
            width={568}
            height={318}
            orientation="vertical"
            showValues={true}
            showGrid={true}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <!-- ChartLine -->
    <section class="demo-section">
      <h3>23. ChartLine</h3>
      <p class="component-desc">Line chart with multiple series, smooth curves, area fills, and legends</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={650} height={400} padding={16}>
          <ChartLine
            series={lineSeriesData}
            width={618}
            height={368}
            showPoints={true}
            showGrid={true}
            curveType="smooth"
            lineWidth={2}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <!-- ChartFunnel -->
    <section class="demo-section">
      <h3>24. ChartFunnel</h3>
      <p class="component-desc">Funnel chart for conversion visualization with tapered or stepped shapes</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={550} height={400} padding={16}>
          <ChartFunnel
            stages={funnelData}
            width={518}
            height={368}
            shape="tapered"
            showValues={true}
            showPercentages={true}
            showConversionRates={true}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <section class="demo-section">
      <h4>ChartFunnel (Stepped)</h4>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={550} height={400} padding={16}>
          <ChartFunnel
            stages={funnelData}
            width={518}
            height={368}
            shape="stepped"
            showValues={true}
            showPercentages={true}
            palette={selectedPalette}
          />
        </Infographic>
      </div>
    </section>

    <!-- CompareTable -->
    <section class="demo-section">
      <h3>25. CompareTable</h3>
      <p class="component-desc">Comparison table with checkmarks, values, and striped rows for pricing/feature comparisons</p>
      <div class="infographic-wrapper">
        <Infographic theme={selectedTheme} width={700} height={320} padding={16}>
          <CompareTable
            columns={tableColumns}
            rows={tableRows}
            width={668}
            striped={true}
            showBorders={true}
            headerStyle="filled"
          />
        </Infographic>
      </div>
    </section>

    <!-- Pattern Fill Demo (Phase 5) -->
    <h2 class="section-title">Pattern Fill System (Phase 5)</h2>

    <section class="demo-section">
      <h3>SVG Pattern Fills</h3>
      <p class="component-desc">Various pattern textures for decorative fills</p>
      <div class="infographic-wrapper">
        <svg width="700" height="200" viewBox="0 0 700 200">
          <defs>
            {@html patternDefToSVG(createPatternDef('diagonalLines', '#6366f1', { spacing: 8 }))}
            {@html patternDefToSVG(createPatternDef('dots', '#22c55e', { spacing: 10 }, 'dots-pattern'))}
            {@html patternDefToSVG(createPatternDef('crosshatch', '#f59e0b', { spacing: 10 }, 'cross-pattern'))}
            {@html patternDefToSVG(createPatternDef('waves', '#ec4899', { spacing: 12 }, 'waves-pattern'))}
            {@html patternDefToSVG(createPatternDef('grid', '#3b82f6', { spacing: 12, strokeWidth: 0.5 }, 'grid-pattern'))}
            {@html patternDefToSVG(createPatternDef('hexagons', '#8b5cf6', { spacing: 16 }, 'hex-pattern'))}
          </defs>

          <g>
            <rect x="20" y="20" width="100" height="80" rx="8" fill="url(#diagonalLines-pattern)" />
            <text x="70" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Diagonal</text>

            <rect x="130" y="20" width="100" height="80" rx="8" fill="url(#dots-pattern)" />
            <text x="180" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Dots</text>

            <rect x="240" y="20" width="100" height="80" rx="8" fill="url(#cross-pattern)" />
            <text x="290" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Crosshatch</text>

            <rect x="350" y="20" width="100" height="80" rx="8" fill="url(#waves-pattern)" />
            <text x="400" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Waves</text>

            <rect x="460" y="20" width="100" height="80" rx="8" fill="url(#grid-pattern)" />
            <text x="510" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Grid</text>

            <rect x="570" y="20" width="100" height="80" rx="8" fill="url(#hex-pattern)" />
            <text x="620" y="120" text-anchor="middle" fill="#a0a0b0" font-size="11">Hexagons</text>
          </g>
        </svg>
      </div>
    </section>

    <!-- Decorative Elements Demo -->
    <h2 class="section-title">Decorative Elements (Phase 5)</h2>

    <section class="demo-section">
      <h3>Dividers, Badges, & Annotations</h3>
      <p class="component-desc">Various decorative elements for enhancing infographics</p>
      <div class="infographic-wrapper">
        <svg width="700" height="280" viewBox="0 0 700 280">
          <!-- Dividers -->
          <text x="20" y="25" fill="#a0a0b0" font-size="12" font-weight="600">Dividers</text>
          {@html createDivider(20, 45, { style: 'solid', color: '#6366f1', length: 120 })}
          <text x="150" y="50" fill="#666" font-size="10">solid</text>

          {@html createDivider(180, 45, { style: 'dashed', color: '#22c55e', length: 120 })}
          <text x="310" y="50" fill="#666" font-size="10">dashed</text>

          {@html createDivider(340, 45, { style: 'gradient', color: '#f59e0b', length: 120 })}
          <text x="470" y="50" fill="#666" font-size="10">gradient</text>

          {@html createDivider(500, 45, { style: 'ornament', color: '#ec4899', length: 120, strokeWidth: 2 })}
          <text x="630" y="50" fill="#666" font-size="10">ornament</text>

          <!-- Badges -->
          <text x="20" y="95" fill="#a0a0b0" font-size="12" font-weight="600">Badges</text>
          {@html createBadge(70, 130, '1', { shape: 'circle', color: '#6366f1', size: 32 })}
          {@html createBadge(130, 130, 'A', { shape: 'hexagon', color: '#22c55e', size: 32 })}
          {@html createBadge(190, 130, '!', { shape: 'diamond', color: '#f59e0b', size: 32 })}
          {@html createBadge(260, 130, 'Pro', { shape: 'pill', color: '#ec4899', size: 28 })}
          {@html createBadge(350, 130, 'NEW', { shape: 'ribbon', color: '#3b82f6', size: 28 })}
          {@html createBadge(450, 130, '*', { shape: 'star', color: '#8b5cf6', size: 34 })}

          <!-- Frames & Callouts -->
          <text x="20" y="185" fill="#a0a0b0" font-size="12" font-weight="600">Frames & Callouts</text>
          {@html createFrame(20, 200, 150, 60, { color: '#6366f1', strokeWidth: 2, cornerRadius: 8, style: 'solid' })}
          {@html createFrame(190, 200, 150, 60, { color: '#22c55e', strokeWidth: 1, style: 'dashed' })}
          {@html createCallout(360, 200, 130, 50, 'bottom', { color: '#1a1a2e', borderColor: '#f59e0b', borderWidth: 2, cornerRadius: 8 })}
          <text x="425" y="230" text-anchor="middle" fill="#f59e0b" font-size="11">Callout</text>

          <!-- Highlights -->
          {@html createHighlight(510, 205, 80, 20, { color: '#fef08a', opacity: 0.4, style: 'fill' })}
          <text x="550" y="220" text-anchor="middle" fill="#888" font-size="11">highlight</text>
          {@html createHighlight(600, 205, 80, 20, { color: '#6366f1', opacity: 0.6, style: 'underline' })}
          <text x="640" y="220" text-anchor="middle" fill="#888" font-size="11">underline</text>
        </svg>
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
