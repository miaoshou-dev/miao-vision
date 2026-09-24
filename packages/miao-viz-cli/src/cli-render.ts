import { join } from 'node:path'
import { readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { agentError, isAgentError } from './errors'
import { profileDataset } from './data-profiler'
import { validateReportSpec } from './spec-validator'
import { parseAnalyzeContext } from './context-schema'
import { renderChartSvg } from './svg-renderer'
import { collectArtifactSizeWarnings } from './artifact-budget'
import { resolveChartEvidence } from './chart-evidence'
import { runArticle } from './cli-article'
import { runDeckRender } from './cli-deck'
import { formatOutputPath, writeOutput, fail, printJson, readSpec, readJson, normalizeSpec, parseFormats, requiredFlag, stringFlag, numberFlag } from './cli-utils'
import { firstInput, loadCliDataset } from './cli-dataset'
import { resolveDirectives } from './directive-resolver'
import { mapInsightText } from './insight-utils'
import { validateProvenance } from './provenance-validator'
import type { CliArgs } from './cli-utils'
import type { AgentReportSpec, DataProfile } from './types'
import { exportHtmlToPdf } from './pdf-export'
import { exportHtmlToPng } from './png-export'
import { renderReportHtmlWithTrust } from './trusted-html-render'
import { deliverReportArtifact } from './report-delivery'
import { publishStageOnce, reviewPublisherFromArgs, stage, type ReviewPublisher } from './review/review-publisher'
import { summarizeDataQuality } from './review/review-data-quality'
import { summarizeDelivery } from './review/review-delivery'
import type { DeliveryManifest } from './artifact-delivery'
import { fingerprintArtifactData } from './artifact-data-fingerprint'
import { fingerprintArtifactSpec } from './artifact-spec-fingerprint'
import { hashValue } from './report-project-storage'

export async function runRenderGroup(args: CliArgs): Promise<void> {
  switch (args.subcommand) {
    case 'report':
      printJson(await runWithReview(args, 'report', publisher => runRender(args, publisher)))
      return
    case 'deck':
      printJson(await runWithReview(args, 'deck', () => runDeckRender(args)))
      return
    case 'article':
      printJson(await runWithReview(args, 'article', () => runArticle(args)))
      return
    default:
      printJson(fail(agentError('UNKNOWN_SUBCOMMAND',
        `Unknown render subcommand: ${args.subcommand ?? '(none)'}. Available: report, deck, article`,
        { subcommand: args.subcommand, available: ['report', 'deck', 'article'] }
      )))
  }
}

async function runWithReview(args: CliArgs, kind: 'report' | 'deck' | 'article', execute: (publisher?: ReviewPublisher) => Promise<unknown>): Promise<unknown> {
  const publisher = reviewPublisherFromArgs(args, kind, `${kind} artifact`)
  if (!publisher) return execute()
  await publishStageOnce(publisher, stage('input_resolved', 'completed', 'Input and render options resolved.'))
  const result = await execute(publisher)
  if (isAgentError(result)) {
    await publisher.publish({ type: 'run.issue', severity: 'error', code: result.code, message: result.message })
    await publisher.publish({ type: 'run.completed', status: 'failed', message: result.message })
    return result
  }
  const success = Boolean(result && typeof result === 'object' && (result as { ok?: unknown }).ok === true)
  if (!success) {
    await publisher.publish({ type: 'run.issue', severity: 'error', code: 'RENDER_FAILED', message: 'Render did not return a successful result.' })
    await publisher.publish({ type: 'run.completed', status: 'failed' })
    return result
  }
  if (kind !== 'report') await publishStageOnce(publisher, stage('rendered', 'completed', 'Artifact rendered.'))
  const value = (result as { value?: Record<string, unknown> }).value ?? {}
  const delivery = value.delivery as (DeliveryManifest & { status?: string }) | undefined
  const coverage = value.coverage as { objectCoverage?: number; claimCheckCoverage?: number; eligibleObjects?: number; coveredObjects?: number; requiredClaimChecks?: number; passedClaimChecks?: number; invalidReferences?: number; failedClaimChecks?: number; empty?: boolean } | undefined
  const fingerprints = value.fingerprints as { specHash: string; dataFingerprint: string } | undefined ?? fallbackFingerprints(args, kind)
  const composition = value.composition as Extract<import('./review/review-events').ReviewEvent, { type: 'artifact.updated' }>['composition'] ?? {
    ...(stringFlag(args, 'theme') ? { theme: stringFlag(args, 'theme') } : {}), charts: [], insights: [], evidence: []
  }
  const sourceSpecPath = stringFlag(args, 'spec')
  if (composition && sourceSpecPath) composition.sourceSpecPath = sourceSpecPath
  if (kind === 'deck' && composition && !composition.title) {
    const specPath = stringFlag(args, 'spec')
    if (specPath) {
      try {
        const title = readSpec(specPath)?.title
        if (typeof title === 'string' && title.trim()) composition.title = { id: 'title', path: 'title', title: title.slice(0, 500) }
      } catch { /* A missing spec must not interrupt review publishing. */ }
    }
  }
  if (kind === 'deck' && composition && sourceSpecPath) {
    try {
      const deckSpec = readSpec(sourceSpecPath) as { slides?: Array<{ title?: string; claim?: string; charts?: Array<{ id?: string; type: string; title?: string; [key: string]: unknown }>; [key: string]: unknown }> }
      if (Array.isArray(deckSpec.slides)) composition.slides = deckSpec.slides.map((slide, slideIndex) => ({
        id: `slide-${slideIndex + 1}`, hash: hashValue(slide), path: `slides[${slideIndex}]`, slideIndex,
        ...(typeof slide.title === 'string' ? { title: slide.title.slice(0, 500) } : {}),
        ...(typeof slide.claim === 'string' ? { claim: slide.claim.slice(0, 1000) } : {}),
        charts: (slide.charts ?? []).map((chart, chartIndex) => ({
          id: chart.id ?? `slide-${slideIndex}-chart`, type: chart.type, hash: hashValue(chart),
          path: `slides[${slideIndex}].charts[${chartIndex}]`, chartIndex,
          ...(typeof chart.title === 'string' ? { title: chart.title.slice(0, 500) } : {})
        }))
      }))
    } catch { /* The rendered artifact remains reviewable without slide metadata. */ }
  }
  const evidenceItems = value.evidenceItems as Extract<import('./review/review-events').ReviewEvent, { type: 'artifact.updated' }>['evidenceItems']
  if (delivery?.artifacts?.primary?.path) {
    const completeCoverage = coverage && Object.values(coverage).every(value => value !== undefined)
      ? coverage as { objectCoverage: number; claimCheckCoverage: number; eligibleObjects: number; coveredObjects: number; requiredClaimChecks: number; passedClaimChecks: number; invalidReferences: number; failedClaimChecks: number; empty: boolean }
      : undefined
    const dataQuality = summarizeDataQuality(value.profile as DataProfile | undefined)
    await publisher.publish({ type: 'artifact.updated', kind, primaryPath: delivery.artifacts.primary.path, ...(delivery.artifacts.preview?.path ? { previewPath: delivery.artifacts.preview.path } : {}), verified: delivery.verification?.verified === true, deliveryStatus: (delivery.status as 'ready' | 'needs_review' | 'restricted' | 'failed' | 'missing') ?? 'needs_review', ...(completeCoverage ? { coverage: completeCoverage } : {}), evidence: { metricCount: delivery.summary?.metrics?.length ?? 0, highlightCount: delivery.summary?.highlights?.length ?? 0, missingCount: completeCoverage ? completeCoverage.invalidReferences + completeCoverage.failedClaimChecks : 0 }, ...(dataQuality ? { dataQuality } : {}), delivery: summarizeDelivery(delivery), ...(fingerprints ? { fingerprints } : {}), ...(composition ? { composition } : {}), ...(evidenceItems ? { evidenceItems } : {}) })
  }
  await publishStageOnce(publisher, stage('delivery_verified', 'completed', 'Delivery manifest available.'))
  const warning = Array.isArray((result as { warnings?: unknown }).warnings) && ((result as { warnings: unknown[] }).warnings.length > 0)
  await publisher.publish({ type: 'run.completed', status: warning ? 'warning' : 'ready' })
  return result
}

function fallbackFingerprints(args: CliArgs, kind: 'report' | 'deck' | 'article'): { specHash: string; dataFingerprint: string } | undefined {
  const specPath = kind === 'article'
    ? stringFlag(args, 'spec-input') ?? stringFlag(args, 'bundle-input') ?? args.positional[0]
    : stringFlag(args, 'spec')
  const dataPath = kind === 'article' ? args.positional[0] ?? specPath : stringFlag(args, 'input') ?? firstInput(args)
  if (!specPath || !dataPath) return undefined
  try {
    return { specHash: fileHash(specPath), dataFingerprint: fileHash(dataPath) }
  } catch {
    return undefined
  }
}

function fileHash(path: string): string {
  return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function provenanceEvidenceIds(provenance: AgentReportSpec['charts'][number]['provenance']): string[] {
  if (typeof provenance === 'string') return [provenance]
  return provenance?.evidence ?? []
}

export function getReportPngExportOptions(spec: AgentReportSpec, args: CliArgs): {
  width?: number; height?: number; scale?: number; timeout?: number; keepTemp: boolean; selector?: string
} {
  const isPoster = spec.layout?.preset === 'poster'
  return {
    width: isPoster ? spec.poster?.canvas?.width ?? 1080 : numberFlag(args, 'viewport-width'),
    height: isPoster ? spec.poster?.canvas?.height ?? 1350 : numberFlag(args, 'viewport-height'),
    scale: numberFlag(args, 'scale'),
    timeout: numberFlag(args, 'png-timeout'),
    keepTemp: args.flags['keep-temp'] === true,
    selector: isPoster ? '.mv-poster' : undefined
  }
}

async function runRender(args: CliArgs, publisher?: ReviewPublisher): Promise<unknown> {
  const input = stringFlag(args, 'input') ?? firstInput(args) ?? agentError('MISSING_FLAG', 'Missing --input <file> or --inputs <a,b,...>.')
  const specPath = requiredFlag(args, 'spec')
  if (isAgentError(input)) return fail(input)
  if (isAgentError(specPath)) return fail(specPath)

  const formats = parseFormats(stringFlag(args, 'format'))
  if (isAgentError(formats)) return fail(formats)
  const outputDir = stringFlag(args, 'output-dir')
  const output = stringFlag(args, 'output')
  if (formats.length > 1 && !outputDir) return fail(agentError('MISSING_FLAG', 'Multiple formats require --output-dir <directory>.'))
  if (formats.length === 1 && !output) return fail(agentError('MISSING_FLAG', 'Missing required flag --output.'))

  const dataset = loadCliDataset(args, input)
  if (isAgentError(dataset)) return fail(dataset)

  const profile = profileDataset(dataset.value)
  await publishStageOnce(publisher, stage('profiled', 'completed', 'Input data profiled.'))
  const spec = readSpec(specPath)
  const normalized = normalizeSpec(spec)
  if (isAgentError(normalized)) return fail(normalized)

  const contextPath = stringFlag(args, 'context')
  let renderContext: ReturnType<typeof parseAnalyzeContext> = null
  if (contextPath) {
    const raw = readJson<unknown>(contextPath)
    const unwrapped = (raw as { ok?: unknown; value?: unknown }).ok === true ? (raw as { value: unknown }).value : raw
    renderContext = parseAnalyzeContext(unwrapped)
    if (!renderContext) return fail(agentError('INVALID_CONTEXT', 'context.json format is invalid.', { contextPath }))
    await publishStageOnce(publisher, stage('analyzed', 'completed', 'Analyze context loaded.'))
  } else {
    await publishStageOnce(publisher, stage('analyzed', 'skipped', 'No analyze context supplied.'))
  }
  await publishStageOnce(publisher, stage('spec_instantiated', 'completed', 'Report spec resolved.'))

  const resolvedSpec = renderContext ? resolveChartEvidence(normalized, renderContext) : normalized
  const validation = validateReportSpec(resolvedSpec, profile, formats, renderContext ?? undefined)
  if (isAgentError(validation)) return fail(validation)
  await publishStageOnce(publisher, stage('validated', 'completed', 'Report spec validated.'))

  if (renderContext && validation.value.insights && validation.value.insights.length > 0) {
    validation.value.insights = validation.value.insights.map(insight =>
      mapInsightText(insight, text => resolveDirectives(text, renderContext!.evidence))
    )
  }

  const themeFlag = stringFlag(args, 'theme') as 'standard-white' | 'magazine' | 'standard-dark' | 'minimal' | 'nyt' | 'bloomberg' | 'tableau' | undefined
  const interactive = args.flags['no-interactive'] !== true
  const renderProvenance = renderContext ? validateProvenance(validation.value, renderContext) : undefined

  const written: string[] = []
  const warnings: string[] = []
  const provenanceVerified = renderProvenance ? renderProvenance.issues.length === 0 : undefined
  const rendered = renderReportHtmlWithTrust(validation.value, profile, dataset.value.rows, {
    interactive,
    context: renderContext ?? undefined,
    evidenceVerified: provenanceVerified,
    coverage: renderProvenance?.coverage,
    theme: themeFlag
  })
  await publishStageOnce(publisher, stage('rendered', 'completed', 'Artifact rendered.'))
  const html = rendered.html
  const finalTrust = rendered.trust
  const hardBudgetIssue = finalTrust.shareSafety.checks.find(check => check.id === 'artifact_budget')?.issues.find(issue => issue.severity === 'error')
  if (interactive && validation.value.interactions?.dataPolicy && hardBudgetIssue) {
    return fail(agentError(hardBudgetIssue.code, hardBudgetIssue.message, { path: hardBudgetIssue.path, shareSafety: finalTrust.shareSafety }))
  }
  if (interactive && args.flags['trusted'] === true && !finalTrust.shareSafe) {
    const firstIssue = finalTrust.shareSafety.checks.flatMap(check => check.issues)[0]
    return fail(agentError(firstIssue?.code ?? 'INTERACTION_NOT_SHARE_SAFE', firstIssue?.message ?? 'Interactive artifact is not share-safe.', {
      shareSafety: finalTrust.shareSafety
    }))
  }
  for (const format of formats) {
    if (format === 'html') {
      const htmlPath = outputDir ? join(outputDir, 'report.html') : formatOutputPath(output!, 'html', false)
      warnings.push(...collectArtifactSizeWarnings(html, interactive))
      writeOutput(htmlPath, html)
      written.push(htmlPath)
    } else if (format === 'pdf') {
      const pdfPath = outputDir ? join(outputDir, 'report.pdf') : formatOutputPath(output!, 'pdf', false)
      const result = await exportHtmlToPdf(html, pdfPath, {
        mode: validation.value.layout?.preset === 'poster' ? 'poster' : 'report',
        pageSize: stringFlag(args, 'page-size') as 'A4' | 'Letter' | undefined,
        orientation: stringFlag(args, 'orientation') as 'portrait' | 'landscape' | undefined,
        margin: stringFlag(args, 'margin'),
        timeout: numberFlag(args, 'pdf-timeout'),
        keepTemp: args.flags['keep-temp'] === true
      })
      if (!result.ok) return fail(result)
      written.push(pdfPath)
      warnings.push(...result.value.warnings.map(issue => issue.message))
    } else if (format === 'png') {
      const pngPath = outputDir ? join(outputDir, 'report.png') : formatOutputPath(output!, 'png', false)
      const result = await exportHtmlToPng(html, pngPath, {
        ...getReportPngExportOptions(validation.value, args)
      })
      if (!result.ok) return fail(result)
      written.push(pngPath)
    } else if (format === 'svg') {
      const svgPath = outputDir ? join(outputDir, 'report.svg') : formatOutputPath(output!, 'svg', false)
      if (validation.value.charts.length !== 1) {
        return fail(agentError('SVG_REQUIRES_SINGLE_CHART', 'SVG output currently supports a single chart spec.'))
      }
      writeOutput(svgPath, renderChartSvg(validation.value.charts[0], dataset.value.rows))
      written.push(svgPath)
    } else {
      return fail(agentError('OUTPUT_FORMAT_NOT_IMPLEMENTED', `Output format '${format}' is not implemented yet.`, {
        implementedFormats: ['html', 'svg', 'png', 'pdf']
      }))
    }
  }

  if (interactive) {
    warnings.push(...finalTrust.shareSafety.checks.flatMap(check => check.issues.map(issue => `${issue.code}: ${issue.message}`)))
  }

  const primaryPath = formats.includes('html') ? written.find(path => path.endsWith('.html'))! : written[0]
  const verified = renderProvenance ? renderProvenance.issues.length === 0 : false
  const delivered = await deliverReportArtifact({
    kind: 'report', html, spec: validation.value, context: renderContext, outputs: written, primaryPath,
    verified, coverage: renderProvenance?.coverage, shareSafe: interactive ? finalTrust.shareSafe : undefined,
    shareStatus: interactive ? finalTrust.shareSafety.status : undefined,
    contentWarnings: warnings.filter(warning => !warning.startsWith('PNG_')),
    previewName: outputDir ? 'report.preview.png' : undefined,
    previewWidth: numberFlag(args, 'viewport-width'), previewHeight: numberFlag(args, 'viewport-height'), previewTimeout: numberFlag(args, 'png-timeout')
  })
  if (delivered.previewWarning) warnings.push(delivered.previewWarning)

  return {
    ok: true,
    value: {
      output: written,
      profile,
      interactive: formats.includes('html') ? interactive : false,
      coverage: renderProvenance?.coverage,
      verified,
      shareSafe: interactive ? finalTrust.shareSafe : undefined,
      shareSafety: interactive ? finalTrust.shareSafety : undefined,
      exposureManifest: interactive ? finalTrust.manifest : undefined,
      delivery: delivered.delivery,
      fingerprints: {
        specHash: fingerprintArtifactSpec('report', validation.value),
        dataFingerprint: fingerprintArtifactData(dataset.value)
      },
      composition: {
        ...(validation.value.theme ? { theme: validation.value.theme } : {}),
        title: { id: 'title' as const, path: 'title' as const, title: (validation.value.title || 'Miao Vision Report').slice(0, 500) },
        charts: validation.value.charts.map((chart, index) => ({ id: chart.id ?? `chart-${index + 1}`, type: chart.type, hash: hashValue(chart), path: `charts[${index}]`, ...(chart.title ? { title: chart.title } : {}), evidenceIds: provenanceEvidenceIds(chart.provenance) })),
        insights: (validation.value.insights ?? []).map((insight, index) => ({ id: `insight-${index + 1}`, hash: hashValue(insight), path: `insights[${index}]`, title: typeof insight === 'string' ? insight : insight.text, evidenceIds: typeof insight === 'string' ? [] : insight.evidence ?? provenanceEvidenceIds(insight.provenance) })),
        evidence: (renderContext?.evidence ?? []).map((item, index) => ({ id: item.id, hash: hashValue(item), path: `context.evidence[${index}]` }))
      },
      evidenceItems: (renderContext?.evidence ?? []).map(item => ({
        id: item.id, query: item.query,
        ...(renderContext?.metricCandidates?.find(candidate => candidate.id === item.id)?.caveat ? { caveat: renderContext.metricCandidates.find(candidate => candidate.id === item.id)!.caveat } : {})
      }))
    },
    ...(warnings.length ? { warnings } : {})
  }
}
