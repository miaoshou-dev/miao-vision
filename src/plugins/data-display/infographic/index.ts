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
  FlowLinear
} from './structures'

// Structure types
export type { TreeNode, TreeLayout, NodeLayout } from './structures/hierarchy-tree'
export type { SwotData, SwotItem, SwotQuadrant } from './structures/compare-swot'
export type { SectorItem, SectorLayout } from './structures/list-sector'
export type { SnakeItem, SnakeItemLayout } from './structures/sequence-snake'
export type { CycleItem, CycleRadialProps } from './structures/cycle-radial'
export type { QuadrantData, QuadrantItem, CompareQuadrantProps } from './structures/compare-quadrant'
export type { FlowStep, FlowLinearProps } from './structures/flow-linear'

// Items
export {
  IconArrowNode,
  BadgeCard,
  ValueCard,
  CircularProgress,
  ImageCard,
  StatCard
} from './items'

// Icons
export { Icon, MDI_PATHS, getIconPath, hasIcon, getIconNames, ICON_CATEGORIES } from './icons'

// Theme (re-export all)
export * from './theme'

// Templates
export * from './templates'
