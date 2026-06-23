/**
 * UI Plugin
 *
 * General UI components for static reports.
 */

import type { ComponentRegistry } from '@core/registry'

// Component registrations
import { alertRegistration } from './alert'
import { accordionRegistration } from './accordion'
import { tooltipRegistration } from './tooltip'
import { detailsRegistration } from './details'
import { noteRegistration } from './note'

// Re-export registrations for direct import
export { alertRegistration, accordionRegistration, tooltipRegistration, detailsRegistration, noteRegistration }

// Re-export components
export { default as Alert } from './alert/Alert.svelte'
export type { AlertConfig, AlertData } from './alert/types'
export { default as Accordion } from './accordion/Accordion.svelte'
export type { AccordionConfig, AccordionData } from './accordion/types'
export { default as Tooltip } from './tooltip/Tooltip.svelte'
export type { TooltipConfig, TooltipData } from './tooltip/types'
export { default as Details } from './details/Details.svelte'
export type { DetailsConfig, DetailsData } from './details/types'
export { default as Note } from './note/Note.svelte'
export type { NoteConfig, NoteData, NoteType } from './note/types'

/**
 * Register all UI plugins with the component registry
 */
export function registerUIPlugins(registry: ComponentRegistry): void {
  console.log('🎨 Registering UI plugins...')

  registry.register(alertRegistration)
  registry.register(accordionRegistration)
  registry.register(tooltipRegistration)
  registry.register(detailsRegistration)
  registry.register(noteRegistration)

  console.log('✅ UI plugins registered: alert, accordion, tooltip, details, note')
}

/**
 * All UI plugin registrations
 */
export const uiPlugins = [
  alertRegistration,
  accordionRegistration,
  tooltipRegistration,
  detailsRegistration,
  noteRegistration
]
