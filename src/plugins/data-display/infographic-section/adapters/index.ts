/**
 * Data Adapters
 *
 * Adapters transform generic SectionItem[] to structure-specific formats.
 * Each structure component expects data in a specific shape.
 *
 * Adapter naming convention: adaptTo{Structure}
 * - adaptToRow: For ListRowHorizontal
 * - adaptToFlow: For FlowLinear
 * - adaptToSector: For ListSector
 * - adaptToGrid: For ListGrid
 */

// Will be implemented in Phase 4
export { adaptToRow } from './row-adapter'
export { adaptToFlow } from './flow-adapter'
export { adaptToSector } from './sector-adapter'
export { adaptToGrid } from './grid-adapter'
