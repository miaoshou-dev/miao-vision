/**
 * Demo data for InfographicDemo
 * All sample data constants extracted to keep the main component small.
 */
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
// Q4 Report Article Demo
// =====================================================

export const kpiItems = [
  { label: 'Revenue', value: '$12.5M', icon: 'currency-usd' },
  { label: 'Users', value: '158K', icon: 'account-group' },
  { label: 'Growth', value: '+45%', icon: 'trending-up' },
  { label: 'NPS', value: '72', icon: 'star' }
]

export const progressItems = [
  { label: 'Sales Target', value: 85, max: 100, icon: 'chart-line' },
  { label: 'User Growth', value: 92, max: 100 },
  { label: 'Quality Score', value: 78, max: 100 },
  { label: 'Team OKR', value: 88, max: 100 }
]

export const processItems = [
  { label: 'Research', icon: 'lightbulb', desc: 'Market analysis' },
  { label: 'Design', icon: 'cog', desc: 'Product design' },
  { label: 'Develop', icon: 'laptop', desc: 'Implementation' },
  { label: 'Test', icon: 'check-circle', desc: 'QA & testing' },
  { label: 'Launch', icon: 'rocket', desc: 'Deployment' }
]

export const timelineItems = [
  { label: 'Kickoff', date: 'Jan 2024', desc: 'Project started', status: 'completed' as const },
  { label: 'Alpha', date: 'Mar 2024', desc: 'First release', status: 'completed' as const },
  { label: 'Beta', date: 'Jun 2024', desc: 'Public beta', status: 'completed' as const },
  { label: 'Launch', date: 'Sep 2024', desc: 'GA release', status: 'current' as const },
  { label: 'Scale', date: 'Dec 2024', desc: 'Expansion', status: 'upcoming' as const }
]

export const rankingItems = [
  { label: 'Enterprise', value: '$5.2M', rank: 1 },
  { label: 'Pro Plan', value: '$4.1M', rank: 2 },
  { label: 'Starter', value: '$2.8M', rank: 3 },
  { label: 'Free Tier', value: '$0.4M', rank: 4 }
]

export const teamItems = [
  { label: 'Engineering', value: '45', icon: 'laptop', desc: 'Tech team' },
  { label: 'Product', value: '12', icon: 'cog', desc: 'PM team' },
  { label: 'Design', value: '8', icon: 'palette', desc: 'UX/UI' },
  { label: 'Sales', value: '25', icon: 'phone', desc: 'Revenue' }
]

// =====================================================
// JVM Performance Article Demo
// =====================================================

export const jvmArticle = `
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

export const jvmKpis = [
  { label: 'Response', value: '85ms', icon: 'speedometer' },
  { label: 'GC Pause', value: '8ms', icon: 'timer' },
  { label: 'Memory', value: '4.5GB', icon: 'memory' },
  { label: 'Throughput', value: '+156%', icon: 'trending-up' }
]

export const jvmProgress = [
  { label: 'CPU Usage', value: 65, max: 100 },
  { label: 'Memory Used', value: 72, max: 100 },
  { label: 'GC Overhead', value: 2.1, max: 10 },
  { label: 'JIT Compiled', value: 95, max: 100 }
]

export const memoryPhases = [
  { label: '8GB', date: 'Jan 2024', desc: 'Initial state', status: 'completed' as const },
  { label: 'Analysis', date: 'Feb 2024', desc: 'Memory leaks', status: 'completed' as const },
  { label: '6GB', date: 'Mar 2024', desc: 'Optimized', status: 'completed' as const },
  { label: '4.5GB', date: 'Apr 2024', desc: 'Optimal', status: 'current' as const }
]

export const gcComparison = [
  { label: 'ZGC', value: '2ms', rank: 1, desc: '97.8% throughput' },
  { label: 'G1GC', value: '12ms', rank: 2, desc: '98.5% throughput' },
  { label: 'Shenandoah', value: '3ms', rank: 3, desc: '97.2% throughput' },
  { label: 'ParallelGC', value: '85ms', rank: 4, desc: '99.1% throughput' }
]

// =====================================================
// Structure Components Demo Data
// =====================================================

export const orgChart: TreeNode = {
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

export const swotData: SwotData = {
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

export const marketShare: SectorItem[] = [
  { id: 'p1', label: 'Enterprise', value: 45 },
  { id: 'p2', label: 'SMB', value: 30 },
  { id: 'p3', label: 'Startup', value: 15 },
  { id: 'p4', label: 'Individual', value: 10 }
]

export const devProcess: SnakeItem[] = [
  { id: '1', label: 'Requirements', desc: 'Gather specs' },
  { id: '2', label: 'Design', desc: 'Architecture' },
  { id: '3', label: 'Develop', desc: 'Coding' },
  { id: '4', label: 'Test', desc: 'QA process' },
  { id: '5', label: 'Deploy', desc: 'Release' },
  { id: '6', label: 'Monitor', desc: 'Observe' }
]

export const pdcaCycle: CycleItem[] = [
  { id: 'plan', label: 'Plan', desc: 'Define goals' },
  { id: 'do', label: 'Do', desc: 'Execute' },
  { id: 'check', label: 'Check', desc: 'Evaluate' },
  { id: 'act', label: 'Act', desc: 'Improve' }
]

export const eisenhowerMatrix: QuadrantData = {
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

export const approvalFlow: FlowStep[] = [
  { id: 's1', label: 'Submit', desc: 'Create request' },
  { id: 's2', label: 'Review', desc: 'Manager review' },
  { id: 's3', label: 'Approve', desc: 'Final decision' },
  { id: 's4', label: 'Complete', desc: 'Process done' }
]

export const mindMapData: MindMapNodeData = {
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

export const networkNodes: NetworkNodeData[] = [
  { id: 'api', label: 'API Gateway', group: 'core' },
  { id: 'auth', label: 'Auth Service', group: 'core' },
  { id: 'user', label: 'User Service', group: 'service' },
  { id: 'order', label: 'Order Service', group: 'service' },
  { id: 'db', label: 'Database', group: 'data' },
  { id: 'cache', label: 'Redis Cache', group: 'data' }
]

export const networkEdges: NetworkEdgeData[] = [
  { source: 'api', target: 'auth' },
  { source: 'api', target: 'user' },
  { source: 'api', target: 'order' },
  { source: 'user', target: 'db' },
  { source: 'order', target: 'db' },
  { source: 'user', target: 'cache' },
  { source: 'order', target: 'cache' }
]

export const compareLeft: CompareSideData = {
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

export const compareRight: CompareSideData = {
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

export const roadmapMilestones: MilestoneData[] = [
  { id: 'm1', title: 'MVP', desc: 'Core features', status: 'completed' },
  { id: 'm2', title: 'Beta', desc: 'User testing', status: 'completed' },
  { id: 'm3', title: 'Launch', desc: 'Public release', status: 'current' },
  { id: 'm4', title: 'Scale', desc: 'Growth phase', status: 'upcoming' },
  { id: 'm5', title: 'Expand', desc: 'New markets', status: 'upcoming' }
]

export const stairsSteps: StairStepData[] = [
  { id: 'st1', label: 'Seed', value: '$100K' },
  { id: 'st2', label: 'Series A', value: '$2M' },
  { id: 'st3', label: 'Series B', value: '$15M' },
  { id: 'st4', label: 'Series C', value: '$50M' },
  { id: 'st5', label: 'IPO', value: '$500M' }
]

export const ascendingSteps: AscendingStepData[] = [
  { id: 'a1', label: 'Basic', desc: 'Entry tier' },
  { id: 'a2', label: 'Standard', desc: 'Most popular' },
  { id: 'a3', label: 'Premium', desc: 'Advanced features' },
  { id: 'a4', label: 'Enterprise', desc: 'Full access' }
]

export const vennSets: VennSetData[] = [
  { id: 'design', label: 'Design', items: ['Figma', 'Sketch', 'Adobe XD'] },
  { id: 'dev', label: 'Development', items: ['React', 'Vue', 'Svelte'] },
  { id: 'data', label: 'Data', items: ['SQL', 'Python', 'R'] }
]

export const vennOverlaps: VennOverlapData[] = [
  { sets: ['design', 'dev'], label: 'UI/UX', items: ['CSS', 'HTML'] },
  { sets: ['dev', 'data'], label: 'Backend', items: ['APIs', 'DB'] },
  { sets: ['design', 'data'], label: 'DataViz', items: ['Charts'] },
  { sets: ['design', 'dev', 'data'], label: 'Full Stack' }
]

export const circleNodes: CircleNodeData[] = [
  { id: 'pm', label: 'PM', desc: 'Product', icon: 'account' },
  { id: 'design', label: 'Design', desc: 'UX/UI', icon: 'palette' },
  { id: 'frontend', label: 'Frontend', desc: 'React', icon: 'react' },
  { id: 'backend', label: 'Backend', desc: 'Node.js', icon: 'nodejs' },
  { id: 'qa', label: 'QA', desc: 'Testing', icon: 'test-tube' },
  { id: 'devops', label: 'DevOps', desc: 'CI/CD', icon: 'cloud' }
]

export const circleConnections: CircleConnectionData[] = [
  { from: 'pm', to: 'design' },
  { from: 'design', to: 'frontend' },
  { from: 'frontend', to: 'backend' },
  { from: 'backend', to: 'devops' },
  { from: 'devops', to: 'qa' },
  { from: 'qa', to: 'pm' }
]

// =====================================================
// Chart Components Demo Data
// =====================================================

export const barChartData: BarDataItem[] = [
  { label: 'January', value: 4500 },
  { label: 'February', value: 5200 },
  { label: 'March', value: 4800 },
  { label: 'April', value: 6100 },
  { label: 'May', value: 5800 }
]

export const lineSeriesData: LineSeriesData[] = [
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

export const funnelData: FunnelStageData[] = [
  { label: 'Visitors', value: 10000 },
  { label: 'Leads', value: 5500 },
  { label: 'Qualified', value: 2800 },
  { label: 'Proposals', value: 1200 },
  { label: 'Customers', value: 450 }
]

export const tableColumns: TableColumn[] = [
  { id: 'basic', header: 'Basic', icon: 'account' },
  { id: 'pro', header: 'Pro', color: '#6366f1' },
  { id: 'enterprise', header: 'Enterprise', color: '#22c55e' }
]

export const tableRows: TableRow[] = [
  { label: 'Users', values: { basic: '1', pro: '10', enterprise: 'Unlimited' } },
  { label: 'Storage', values: { basic: '5GB', pro: '100GB', enterprise: '1TB' } },
  { label: 'API Access', values: { basic: false, pro: true, enterprise: true } },
  { label: 'Support', values: { basic: 'Email', pro: '24/7', enterprise: 'Dedicated' } },
  { label: 'Analytics', values: { basic: false, pro: true, enterprise: true }, highlight: true }
]
