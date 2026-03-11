/**
 * Infographic Template Data
 *
 * Static registry of all template definitions, keyed by TemplateCategory.
 */
import type { TemplateCategory, TemplateDefinition } from '@/types/infographic-template'

export const INFOGRAPHIC_TEMPLATES: Record<TemplateCategory, TemplateDefinition[]> = {
  // KPI/Metrics display - best for 1-4 items
  kpi: [
    {
      id: 'list-row-badge-card',
      name: 'Horizontal Badge Cards',
      category: 'kpi',
      structure: 'ListRowHorizontal',
      item: 'BadgeCard',
      optimalRows: [2, 4],
      requiredFields: ['label', 'value'],
      optionalFields: ['icon', 'description', 'trend'],
      description: 'Horizontal row of badge cards, ideal for KPI overview'
    },
    {
      id: 'list-row-value-card',
      name: 'Horizontal Value Cards',
      category: 'kpi',
      structure: 'ListRowHorizontal',
      item: 'ValueCard',
      optimalRows: [2, 5],
      requiredFields: ['label', 'value'],
      optionalFields: ['format', 'color'],
      description: 'Simple value cards in horizontal layout'
    },
    {
      id: 'list-grid-badge-card',
      name: 'Grid Badge Cards',
      category: 'kpi',
      structure: 'ListGrid',
      item: 'BadgeCard',
      optimalRows: [4, 8],
      requiredFields: ['label', 'value'],
      optionalFields: ['icon', 'description'],
      description: '2x2 or 2x4 grid of badge cards for multiple KPIs'
    },
    {
      id: 'list-grid-circular-progress',
      name: 'Grid Circular Progress',
      category: 'kpi',
      structure: 'ListGrid',
      item: 'CircularProgress',
      optimalRows: [2, 6],
      requiredFields: ['label', 'value', 'max'],
      optionalFields: ['icon', 'color'],
      description: 'Grid of circular progress indicators'
    }
  ],

  // Ranking/Comparison - best for 3-10 items
  ranking: [
    {
      id: 'list-pyramid-badge-card',
      name: 'Pyramid Ranking',
      category: 'ranking',
      structure: 'ListPyramid',
      item: 'BadgeCard',
      optimalRows: [3, 7],
      requiredFields: ['label', 'value'],
      optionalFields: ['rank', 'icon'],
      description: 'Pyramid layout showing hierarchy or ranking'
    },
    {
      id: 'list-zigzag-icon-arrow',
      name: 'Zigzag Arrow Flow',
      category: 'ranking',
      structure: 'ListZigzag',
      item: 'IconArrowNode',
      optimalRows: [3, 6],
      requiredFields: ['label'],
      optionalFields: ['icon', 'value'],
      description: 'Zigzag layout with arrow connections'
    }
  ],

  // Flow/Process - best for sequential data
  flow: [
    {
      id: 'list-row-horizontal-icon-arrow',
      name: 'Horizontal Icon Arrow Flow',
      category: 'flow',
      structure: 'ListRowHorizontal',
      item: 'IconArrowNode',
      optimalRows: [3, 6],
      requiredFields: ['label'],
      optionalFields: ['icon', 'description', 'color'],
      description: 'Horizontal process flow with icon nodes and arrows'
    },
    {
      id: 'sequence-timeline-badge-card',
      name: 'Timeline Flow',
      category: 'flow',
      structure: 'SequenceTimeline',
      item: 'BadgeCard',
      optimalRows: [3, 8],
      requiredFields: ['label', 'date'],
      optionalFields: ['description', 'icon', 'status'],
      description: 'Horizontal timeline showing chronological events'
    },
    {
      id: 'list-zigzag-badge-card',
      name: 'Zigzag Process',
      category: 'flow',
      structure: 'ListZigzag',
      item: 'BadgeCard',
      optimalRows: [4, 8],
      requiredFields: ['label', 'step'],
      optionalFields: ['description', 'icon'],
      description: 'Zigzag path showing process steps'
    },
    {
      id: 'flow-linear-numbered',
      name: 'Linear Numbered Flow',
      category: 'flow',
      structure: 'FlowLinear',
      item: 'default',
      optimalRows: [3, 6],
      requiredFields: ['label'],
      optionalFields: ['description', 'icon'],
      description: 'Linear process flow with numbered steps'
    },
    {
      id: 'cycle-radial-process',
      name: 'Circular Cycle Process',
      category: 'flow',
      structure: 'CycleRadial',
      item: 'default',
      optimalRows: [3, 6],
      requiredFields: ['label'],
      optionalFields: ['description', 'icon'],
      description: 'Circular cycle diagram for PDCA or repeating processes'
    },
    {
      id: 'sequence-snake-flow',
      name: 'Snake Pattern Flow',
      category: 'flow',
      structure: 'SequenceSnake',
      item: 'default',
      optimalRows: [4, 10],
      requiredFields: ['label'],
      optionalFields: ['description', 'icon'],
      description: 'Snake/serpentine layout for longer process flows'
    },
    {
      id: 'sequence-roadmap-horizontal',
      name: 'Project Roadmap',
      category: 'flow',
      structure: 'SequenceRoadmap',
      item: 'default',
      optimalRows: [3, 8],
      requiredFields: ['label'],
      optionalFields: ['description', 'icon', 'status', 'date'],
      description: 'Horizontal roadmap with milestone markers for project planning'
    },
    {
      id: 'sequence-stairs-progression',
      name: 'Stair-Step Progression',
      category: 'flow',
      structure: 'SequenceStairs',
      item: 'default',
      optimalRows: [3, 6],
      requiredFields: ['label'],
      optionalFields: ['description', 'icon', 'value'],
      description: 'Ascending stair steps showing progression or growth stages'
    },
    {
      id: 'sequence-ascending-bars',
      name: 'Ascending Bar Flow',
      category: 'flow',
      structure: 'SequenceAscending',
      item: 'default',
      optimalRows: [3, 7],
      requiredFields: ['label'],
      optionalFields: ['description', 'icon', 'value'],
      description: 'Ascending bars with arrows showing growth or escalation'
    }
  ],

  // Hierarchy - best for tree/org structures
  hierarchy: [
    {
      id: 'list-pyramid-value-card',
      name: 'Hierarchy Pyramid',
      category: 'hierarchy',
      structure: 'ListPyramid',
      item: 'ValueCard',
      optimalRows: [3, 6],
      requiredFields: ['label', 'level'],
      optionalFields: ['value', 'description'],
      description: 'Pyramid showing organizational hierarchy'
    },
    {
      id: 'hierarchy-tree-org',
      name: 'Organization Tree',
      category: 'hierarchy',
      structure: 'HierarchyTree',
      item: 'default',
      optimalRows: [3, 15],
      requiredFields: ['id', 'label'],
      optionalFields: ['children', 'desc', 'icon'],
      description: 'Tree structure for organization charts'
    },
    {
      id: 'mind-map-radial',
      name: 'Radial Mind Map',
      category: 'hierarchy',
      structure: 'MindMap',
      item: 'MindMapNode',
      optimalRows: [3, 20],
      requiredFields: ['id', 'label'],
      optionalFields: ['children', 'desc', 'icon'],
      description: 'Radial mind map for brainstorming and idea organization'
    }
  ],

  // Comparison - best for A vs B or multiple options
  comparison: [
    {
      id: 'list-row-horizontal-comparison',
      name: 'Side-by-Side Comparison',
      category: 'comparison',
      structure: 'ListRowHorizontal',
      item: 'ValueCard',
      optimalRows: [2, 3],
      requiredFields: ['label', 'value'],
      optionalFields: ['description', 'highlight'],
      description: 'Horizontal comparison of options'
    },
    {
      id: 'compare-binary-vs',
      name: 'VS Comparison',
      category: 'comparison',
      structure: 'CompareBinary',
      item: 'default',
      optimalRows: [2, 2],
      requiredFields: ['title', 'items'],
      optionalFields: ['subtitle', 'icon', 'color'],
      description: 'Left vs Right binary comparison with item lists'
    },
    {
      id: 'compare-quadrant-matrix',
      name: 'Quadrant Matrix',
      category: 'comparison',
      structure: 'CompareQuadrant',
      item: 'default',
      optimalRows: [4, 12],
      requiredFields: ['label'],
      optionalFields: ['color'],
      description: '2x2 matrix for Eisenhower, BCG, or risk analysis'
    },
    {
      id: 'compare-swot-analysis',
      name: 'SWOT Analysis',
      category: 'comparison',
      structure: 'CompareSwot',
      item: 'default',
      optimalRows: [4, 16],
      requiredFields: ['id', 'label'],
      optionalFields: ['color'],
      description: 'SWOT analysis with strengths, weaknesses, opportunities, threats'
    }
  ],

  // Distribution - best for proportional data
  distribution: [
    {
      id: 'list-pyramid-distribution',
      name: 'Distribution Pyramid',
      category: 'distribution',
      structure: 'ListPyramid',
      item: 'BadgeCard',
      optimalRows: [3, 5],
      requiredFields: ['label', 'percentage'],
      optionalFields: ['value', 'color'],
      description: 'Pyramid showing distribution proportions'
    },
    {
      id: 'list-sector-pie',
      name: 'Sector/Pie Chart',
      category: 'distribution',
      structure: 'ListSector',
      item: 'default',
      optimalRows: [2, 8],
      requiredFields: ['label', 'value'],
      optionalFields: ['color'],
      description: 'Pie/donut chart for proportional data'
    }
  ],

  // Relation - for networks and connections
  relation: [
    {
      id: 'relation-network-circular',
      name: 'Network Graph',
      category: 'relation',
      structure: 'RelationNetwork',
      item: 'NetworkNode',
      optimalRows: [3, 12],
      requiredFields: ['id', 'label'],
      optionalFields: ['icon', 'group', 'color'],
      description: 'Network graph showing node relationships'
    },
    {
      id: 'relation-venn-diagram',
      name: 'Venn Diagram',
      category: 'relation',
      structure: 'RelationVenn',
      item: 'default',
      optimalRows: [2, 3],
      requiredFields: ['id', 'label'],
      optionalFields: ['desc', 'items', 'color'],
      description: 'Venn diagram showing set relationships and overlaps'
    },
    {
      id: 'relation-circle-connections',
      name: 'Circle Connections',
      category: 'relation',
      structure: 'RelationCircle',
      item: 'default',
      optimalRows: [4, 10],
      requiredFields: ['id', 'label'],
      optionalFields: ['desc', 'icon', 'color'],
      description: 'Nodes arranged in circle with connections'
    }
  ],

  // Statistical charts - for data visualization
  statistical: [
    {
      id: 'chart-bar-horizontal',
      name: 'Horizontal Bar Chart',
      category: 'statistical',
      structure: 'ChartBar',
      item: 'default',
      optimalRows: [3, 12],
      requiredFields: ['label', 'value'],
      optionalFields: ['desc', 'icon', 'color'],
      description: 'Horizontal bar chart for comparing values across categories'
    },
    {
      id: 'chart-bar-vertical',
      name: 'Vertical Bar Chart',
      category: 'statistical',
      structure: 'ChartBar',
      item: 'default',
      optimalRows: [3, 10],
      requiredFields: ['label', 'value'],
      optionalFields: ['desc', 'color'],
      description: 'Vertical bar chart for value comparison'
    },
    {
      id: 'chart-line-trend',
      name: 'Trend Line Chart',
      category: 'statistical',
      structure: 'ChartLine',
      item: 'default',
      optimalRows: [5, 30],
      requiredFields: ['label', 'value'],
      optionalFields: ['series'],
      description: 'Line chart for showing trends over time'
    },
    {
      id: 'chart-line-multi-series',
      name: 'Multi-Series Line Chart',
      category: 'statistical',
      structure: 'ChartLine',
      item: 'default',
      optimalRows: [5, 30],
      requiredFields: ['label', 'value', 'series'],
      optionalFields: ['color'],
      description: 'Multiple line series for comparing trends'
    },
    {
      id: 'chart-funnel-conversion',
      name: 'Conversion Funnel',
      category: 'statistical',
      structure: 'ChartFunnel',
      item: 'default',
      optimalRows: [3, 8],
      requiredFields: ['label', 'value'],
      optionalFields: ['desc', 'color'],
      description: 'Funnel chart for conversion/pipeline visualization'
    },
    {
      id: 'compare-table-features',
      name: 'Feature Comparison Table',
      category: 'comparison',
      structure: 'CompareTable',
      item: 'default',
      optimalRows: [5, 20],
      requiredFields: ['label', 'columns'],
      optionalFields: ['icon'],
      description: 'Table format for detailed feature comparison'
    }
  ]
}
