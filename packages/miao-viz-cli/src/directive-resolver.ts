import type { AnalyzeEvidence } from './context-schema'

export interface EvidenceRef {
  id: string
  path: string
  raw: string
}

// Matches $evidence:<id>.<path> where path is dot/bracket notation
const EVIDENCE_RE = /\$evidence:([\w-]+)\.([\w.[\]]+)/g

export function parseEvidenceRefs(text: string): EvidenceRef[] {
  const refs: EvidenceRef[] = []
  const re = new RegExp(EVIDENCE_RE.source, 'g')
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const { path } = splitTrailingPunctuation(m[2])
    refs.push({ id: m[1], path, raw: m[0] })
  }
  return refs
}

function getNestedValue(obj: unknown, path: string): unknown {
  const parts = path.replace(/\[(\d+|last)\]/g, '.$1').split('.').filter(Boolean)
  let cur: unknown = obj
  for (const part of parts) {
    if (cur === null || cur === undefined) return undefined
    if (Array.isArray(cur) && part === 'last') {
      cur = cur[cur.length - 1]
    } else {
      cur = (cur as Record<string, unknown>)[part]
    }
  }
  return cur
}

export function resolveEvidencePath(
  evidence: AnalyzeEvidence[],
  id: string,
  path: string
): { found: boolean; value: unknown } {
  const item = evidence.find(e => e.id === id)
  if (!item) return { found: false, value: undefined }

  // Try values (single-row summary): $evidence:total.values.total_sales → values.total_sales
  if (item.values) {
    const stripped = path.replace(/^values\./, '')
    const val = getNestedValue(item.values, stripped)
    if (val !== undefined) return { found: true, value: val }
  }

  // Try rows (multi-row): $evidence:by_dim.rows[0].region → rows[0].region
  if (item.rows) {
    const stripped = path.replace(/^rows\.?/, '')
    const val = getNestedValue(item.rows, stripped)
    if (val !== undefined) return { found: true, value: val }
  }

  return { found: false, value: undefined }
}

// Interpolate all $evidence directives in a string; unknown paths become [?id.path]
export function resolveDirectives(text: string, evidence: AnalyzeEvidence[]): string {
  return text.replace(new RegExp(EVIDENCE_RE.source, 'g'), (_, id: string, path: string) => {
    const split = splitTrailingPunctuation(path)
    const { found, value } = resolveEvidencePath(evidence, id, split.path)
    return `${found ? String(value) : `[?${id}.${split.path}]`}${split.trailing}`
  })
}

function splitTrailingPunctuation(path: string): { path: string; trailing: string } {
  const match = path.match(/^(.+?)(\.+)$/)
  if (!match) return { path, trailing: '' }
  return { path: match[1], trailing: match[2] }
}
