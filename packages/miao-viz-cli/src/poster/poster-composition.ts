import type { PosterSlotRole, PosterSlotSpec } from '../types'

export interface PosterCompositionDefinition {
  id: string
  requiredRoles: PosterSlotRole[]
  slots: PosterSlotSpec[]
}

export const POSTER_COMPOSITION_REGISTRY: PosterCompositionDefinition[] = [
  {
    id: 'trend-story',
    requiredRoles: ['hero', 'insight', 'ranking', 'footer'],
    slots: [
      { id: 'hero', role: 'hero', block: 'hero' },
      { id: 'insight', role: 'insight', block: 'callout', calloutIndex: 0 },
      { id: 'trend', role: 'ranking', block: 'chart' },
      { id: 'footer', role: 'footer', block: 'footer' }
    ]
  },
  {
    id: 'timeline-story',
    requiredRoles: ['hero', 'insight', 'ranking', 'footer'],
    slots: [
      { id: 'hero', role: 'hero', block: 'hero' },
      { id: 'insight', role: 'insight', block: 'callout', calloutIndex: 0 },
      { id: 'timeline', role: 'ranking', block: 'chart' },
      { id: 'footer', role: 'footer', block: 'footer' }
    ]
  },
  {
    id: 'share-story',
    requiredRoles: ['hero', 'insight', 'ranking', 'footer'],
    slots: [
      { id: 'hero', role: 'hero', block: 'hero' },
      { id: 'insight', role: 'insight', block: 'callout', calloutIndex: 0 },
      { id: 'share', role: 'ranking', block: 'chart' },
      { id: 'footer', role: 'footer', block: 'footer' }
    ]
  },
  {
    id: 'ranked-story',
    requiredRoles: ['hero', 'insight', 'ranking', 'footer'],
    slots: [
      { id: 'hero', role: 'hero', block: 'hero' },
      { id: 'insight', role: 'insight', block: 'callout', calloutIndex: 0 },
      { id: 'ranking', role: 'ranking', block: 'chart' },
      { id: 'footer', role: 'footer', block: 'footer' }
    ]
  },
  {
    id: 'comparison-story',
    requiredRoles: ['hero', 'insight', 'ranking', 'footer'],
    slots: [
      { id: 'hero', role: 'hero', block: 'hero' },
      { id: 'insight', role: 'insight', block: 'callout', calloutIndex: 0 },
      { id: 'comparison', role: 'ranking', block: 'chart' },
      { id: 'footer', role: 'footer', block: 'footer' }
    ]
  },
  {
    id: 'flow-story',
    requiredRoles: ['hero', 'insight', 'ranking', 'footer'],
    slots: [
      { id: 'hero', role: 'hero', block: 'hero' },
      { id: 'insight', role: 'insight', block: 'callout', calloutIndex: 0 },
      { id: 'flow', role: 'ranking', block: 'chart' },
      { id: 'footer', role: 'footer', block: 'footer' }
    ]
  },
  {
    id: 'geo-ranking-story',
    requiredRoles: ['hero', 'insight', 'ranking', 'footer'],
    slots: [
      { id: 'hero', role: 'hero', block: 'hero' },
      { id: 'insight', role: 'insight', block: 'callout', calloutIndex: 0 },
      { id: 'geo-ranking', role: 'ranking', block: 'chart' },
      { id: 'footer', role: 'footer', block: 'footer' }
    ]
  }
]

export function getPosterComposition(id?: string): PosterCompositionDefinition {
  return POSTER_COMPOSITION_REGISTRY.find(item => item.id === id) ?? POSTER_COMPOSITION_REGISTRY[0]
}

export function normalizePosterSlots(slots: PosterSlotSpec[] | undefined, chartId: string, compositionId = 'ranked-story'): PosterSlotSpec[] {
  const defaults = getPosterComposition(compositionId).slots.map(slot => slot.id === 'ranking' ? { ...slot, chartId } : slot)
  if (!slots?.length) return defaults
  const byRole = new Map(slots.map(slot => [slot.role, slot]))
  const custom = slots.map(slot => slot.role === 'ranking' && !slot.chartId ? { ...slot, chartId } : slot)
  const missing = defaults.filter(slot => !byRole.has(slot.role))
  return [...custom, ...missing]
}
