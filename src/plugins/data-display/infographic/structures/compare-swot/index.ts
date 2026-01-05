/**
 * CompareSwot Structure Module
 *
 * SWOT (Strengths, Weaknesses, Opportunities, Threats) analysis diagram.
 * Renders a 2x2 grid with customizable quadrant colors and items.
 *
 * @module plugins/data-display/infographic/structures/compare-swot
 *
 * @example
 * ```svelte
 * <CompareSwot
 *   data={{
 *     strengths: [{ id: 's1', label: 'Strong brand' }],
 *     weaknesses: [{ id: 'w1', label: 'Limited resources' }],
 *     opportunities: [{ id: 'o1', label: 'Market expansion' }],
 *     threats: [{ id: 't1', label: 'Competition' }]
 *   }}
 *   width={800}
 *   height={600}
 * />
 * ```
 */

export { default as CompareSwot } from './CompareSwot.svelte'
export * from './types'
export * from './layout'
