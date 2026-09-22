import type { AgentPosterSpec, AgentResult } from '../types'
import { agentError } from '../errors'

export interface GeoMapResolution {
  compositionId: 'geo-ranking-story'
  status: 'fallback' | 'blocked'
  reasonCode: 'GEO_MAP_RESOURCE_UNAVAILABLE' | 'GEO_MAP_NOT_REGISTERED'
  warnings: string[]
}

/**
 * Geo ranking is the stable local-first capability. A map resource is only
 * considered usable once a deterministic local GeoJSON/TopoJSON pipeline is
 * registered; remote fetching is intentionally never attempted.
 */
export function resolveGeoPosterCapability(poster: AgentPosterSpec): AgentResult<GeoMapResolution> {
  if (!poster.geo?.resourcePath) {
    return {
      ok: true,
      value: {
        compositionId: 'geo-ranking-story',
        status: 'fallback',
        reasonCode: 'GEO_MAP_RESOURCE_UNAVAILABLE',
        warnings: ['No local GeoJSON/TopoJSON resource was supplied; using deterministic geographic ranking.']
      }
    }
  }
  return agentError('GEO_MAP_NOT_REGISTERED', 'Local map resources are not yet registered for poster rendering.', {
    path: 'poster.geo.resourcePath',
    resourcePath: poster.geo.resourcePath,
    fallback: 'geo-ranking-story',
    repairHint: 'Omit poster.geo.resourcePath to use geo-ranking-story, or register a local map adapter.'
  })
}
