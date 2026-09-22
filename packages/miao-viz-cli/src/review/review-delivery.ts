import { existsSync, statSync } from 'node:fs'
import type { DeliveryManifest } from '../artifact-delivery'

export interface ReviewDeliverySummary {
  format: string
  sizeBytes: number
  alternativeFormats: string[]
  hasPreview: boolean
  shareSafe?: boolean
}

export function summarizeDelivery(delivery: DeliveryManifest): ReviewDeliverySummary {
  const primaryPath = delivery.artifacts.primary.path
  return {
    format: delivery.artifacts.primary.format,
    sizeBytes: existsSync(primaryPath) ? statSync(primaryPath).size : 0,
    alternativeFormats: delivery.artifacts.alternatives.map(artifact => artifact.format).slice(0, 8),
    hasPreview: Boolean(delivery.artifacts.preview),
    ...(delivery.verification.shareSafe !== undefined ? { shareSafe: delivery.verification.shareSafe } : {})
  }
}
