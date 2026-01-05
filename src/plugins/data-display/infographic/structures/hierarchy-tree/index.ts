/**
 * HierarchyTree Structure Module
 *
 * Renders tree/organization chart layouts with customizable orientation.
 * Supports vertical (top-down) and horizontal (left-right) layouts.
 *
 * @module plugins/data-display/infographic/structures/hierarchy-tree
 *
 * @example
 * ```svelte
 * <HierarchyTree
 *   root={orgData}
 *   orientation="vertical"
 *   palette="vibrant"
 * >
 *   {#snippet item({ node, themeColors, width, height })}
 *     <BadgeCard label={node.label} ... />
 *   {/snippet}
 * </HierarchyTree>
 * ```
 */

export { default as HierarchyTree } from './HierarchyTree.svelte'
export * from './types'
export * from './layout'
