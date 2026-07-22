export const STATIC_HTML_SOFT_BUDGET_BYTES = 1_500_000

export function collectArtifactSizeWarnings(content: string, interactive: boolean): string[] {
  if (interactive) return []
  const sizeBytes = Buffer.byteLength(content, 'utf8')
  return sizeBytes > STATIC_HTML_SOFT_BUDGET_BYTES
    ? [`LARGE_ARTIFACT_SIZE: static HTML is ${sizeBytes} bytes (>${STATIC_HTML_SOFT_BUDGET_BYTES} soft budget).`]
    : []
}
