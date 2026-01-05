/**
 * Infographic Module
 *
 * A self-implemented infographic system inspired by AntV Infographic.
 * Provides:
 * - Theme system with color generation, palettes, and gradients
 * - Icon system with MDI icons
 * - Structure components for layouts
 * - Item components for individual elements
 *
 * @example
 * ```svelte
 * <script>
 *   import {
 *     Infographic,
 *     ListRowHorizontal,
 *     IconArrowNode
 *   } from '@plugins/data-display/infographic'
 *
 *   const items = [
 *     { label: 'Step 1', icon: 'lightbulb', desc: 'Ideation' },
 *     { label: 'Step 2', icon: 'cog', desc: 'Development' },
 *     { label: 'Step 3', icon: 'rocket', desc: 'Launch' }
 *   ]
 * </script>
 *
 * <Infographic theme="dark-vibrant" width={800} height={200}>
 *   <ListRowHorizontal {items} showArrows>
 *     {#snippet item({ data, themeColors, width, height, gradientId })}
 *       <IconArrowNode
 *         label={data.label}
 *         desc={data.desc}
 *         icon={data.icon}
 *         {themeColors}
 *         {width}
 *         {height}
 *         {gradientId}
 *       />
 *     {/snippet}
 *   </ListRowHorizontal>
 * </Infographic>
 * ```
 */

// Main container
export { default as Infographic } from './Infographic.svelte'

// Structures
export {
  ListRowHorizontal,
  ListRowVertical,
  ListZigzag,
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
  CompareTable
} from './structures'

// Structure types
export type { TreeNode, TreeLayout, NodeLayout } from './structures/hierarchy-tree'
export type { SwotData, SwotItem, SwotQuadrant } from './structures/compare-swot'
export type { SectorItem, SectorLayout } from './structures/list-sector'
export type { SnakeItem, SnakeItemLayout } from './structures/sequence-snake'
export type { CycleItem, CycleRadialProps } from './structures/cycle-radial'
export type { QuadrantData, QuadrantItem, CompareQuadrantProps } from './structures/compare-quadrant'
export type { FlowStep, FlowLinearProps } from './structures/flow-linear'
export type { MindMapNodeData, MindMapNodeLayout, MindMapProps } from './structures/mind-map'
export type { NetworkNodeData, NetworkEdgeData, NetworkNodeLayout, RelationNetworkProps } from './structures/relation-network'
export type { CompareSideData, CompareItem, CompareBinaryProps } from './structures/compare-binary'
export type { MilestoneData, MilestoneLayout, SequenceRoadmapProps } from './structures/sequence-roadmap'
export type { StairStepData, StairStepLayout, SequenceStairsProps } from './structures/sequence-stairs'
export type { AscendingStepData, AscendingStepLayout, SequenceAscendingProps } from './structures/sequence-ascending'
export type { VennSetData, VennOverlapData, VennCircleLayout, RelationVennProps } from './structures/relation-venn'
export type { CircleNodeData, CircleConnectionData, CircleNodeLayout, RelationCircleProps } from './structures/relation-circle'
export type { BarDataItem, BarLayout, ChartBarProps } from './structures/chart-bar'
export type { LineDataPoint, LineSeriesData, PointLayout, ChartLineProps } from './structures/chart-line'
export type { FunnelStageData, FunnelStageLayout, ChartFunnelProps } from './structures/chart-funnel'
export type { TableColumn, TableRow, CellLayout, CompareTableProps } from './structures/compare-table'

// Items
export {
  IconArrowNode,
  BadgeCard,
  ValueCard,
  CircularProgress,
  ImageCard,
  StatCard,
  MindMapNode,
  NetworkNode,
  NumberBadge
} from './items'

// Icons
export { Icon, MDI_PATHS, getIconPath, hasIcon, getIconNames, ICON_CATEGORIES } from './icons'

// Theme (re-export all)
export * from './theme'

// Templates
export * from './templates'

// AI Module (text-to-infographic conversion)
export * from './ai'

// Utils (SVG export, etc.)
export * from './utils'
