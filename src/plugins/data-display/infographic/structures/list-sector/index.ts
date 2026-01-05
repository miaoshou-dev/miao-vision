/**
 * ListSector Structure Module
 *
 * Radial sector (pie/donut) layout for displaying items.
 * Supports proportional sizing, customizable angles, and inner radius.
 *
 * @module plugins/data-display/infographic/structures/list-sector
 *
 * @example
 * ```svelte
 * <ListSector
 *   items={[
 *     { id: '1', label: 'Sales', value: 45 },
 *     { id: '2', label: 'Marketing', value: 30 },
 *     { id: '3', label: 'R&D', value: 25 }
 *   ]}
 *   innerRadius={0.5}
 *   showCenter={true}
 *   centerLabel="Budget"
 *   centerValue="$1.2M"
 * />
 * ```
 */

export { default as ListSector } from './ListSector.svelte'
export * from './types'
export * from './layout'
