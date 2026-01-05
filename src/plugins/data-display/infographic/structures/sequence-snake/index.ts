/**
 * SequenceSnake Structure Module
 *
 * Snake/serpentine sequence layout where items flow in alternating directions.
 * Creates a continuous path through all items.
 *
 * @module plugins/data-display/infographic/structures/sequence-snake
 *
 * @example
 * ```svelte
 * <SequenceSnake
 *   items={[
 *     { id: '1', label: 'Research', desc: 'Market analysis' },
 *     { id: '2', label: 'Design', desc: 'UI/UX mockups' },
 *     { id: '3', label: 'Develop', desc: 'Implementation' },
 *     { id: '4', label: 'Test', desc: 'QA validation' },
 *     { id: '5', label: 'Deploy', desc: 'Production release' },
 *     { id: '6', label: 'Monitor', desc: 'Performance tracking' }
 *   ]}
 *   itemsPerRow={3}
 *   showConnections={true}
 *   showNumbers={true}
 * />
 * ```
 */

export { default as SequenceSnake } from './SequenceSnake.svelte'
export * from './types'
export * from './layout'
