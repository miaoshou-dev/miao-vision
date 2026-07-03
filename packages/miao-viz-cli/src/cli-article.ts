import { agentError, isAgentError } from './errors'
import { analyzeArticle } from './article-analyzer'
import { exportInfographicToFile } from './article-export'
import { renderInfographicBundleHtml } from './article-bundle-html'
import { loadInfographicBundleSpec, renderInfographicBundleMarkdown } from './article-bundle'
import { generateInfographicFromFile, loadInfographicSpec, parseArticleFormat, parseArticleStyle, renderInfographicMarkdown, strictInfographicSpecSchema } from './article-infographic'
import { renderInfographicHtml } from './article-html'
import { assessInfographicQuality } from './infographic-quality'
import { getCompositionRenderIssue } from './infographic/compositions/index'
import { compositionSelectionRequired } from './cli-article-composition'
import { requiredFlag, stringFlag, writeOutput, fail } from './cli-utils'
import type { CliArgs } from './cli-utils'

export async function runArticle(args: CliArgs): Promise<unknown> {
  const firstPos = args.positional[0]

  if (firstPos === 'analyze') {
    const file = args.positional[1]
    if (!file) {
      return fail(agentError('MISSING_INPUT', 'Usage: miao-viz article analyze <file> [--output <context.json>]'))
    }
    const result = analyzeArticle(file)
    if (isAgentError(result)) return fail(result)
    const outputPath = stringFlag(args, 'output')
    if (outputPath) {
      writeOutput(outputPath, `${JSON.stringify({ ok: true, value: result.value }, null, 2)}\n`)
      return { ok: true, value: { output: outputPath } }
    }
    return { ok: true, value: result.value }
  }

  const specInputPath = stringFlag(args, 'spec-input')
  const bundleInputPath = stringFlag(args, 'bundle-input')
  const strictVisuals = args.flags['strict-visuals'] === true

  if (specInputPath && bundleInputPath) {
    return fail(agentError('ARTICLE_INPUT_CONFLICT', 'Use either --spec-input or --bundle-input, not both.', {
      specInput: specInputPath,
      bundleInput: bundleInputPath
    }))
  }

  const output = requiredFlag(args, 'output')
  if (isAgentError(output)) return fail(output)

  const formatFlag = stringFlag(args, 'format')
  const format = parseArticleFormat(formatFlag)
  if (!format) {
    return fail(agentError('UNSUPPORTED_ARTICLE_FORMAT', `Unsupported article output format: ${formatFlag}`, {
      supportedFormats: ['html', 'json', 'markdown', 'png', 'pdf']
    }))
  }

  if (bundleInputPath) {
    const loaded = loadInfographicBundleSpec(bundleInputPath)
    if (isAgentError(loaded)) return fail(loaded)
    const bundle = loaded.value
    if (format === 'json') {
      writeOutput(output, `${JSON.stringify(bundle, null, 2)}\n`)
    } else if (format === 'markdown') {
      writeOutput(output, renderInfographicBundleMarkdown(bundle))
    } else if (format === 'png' || format === 'pdf') {
      const exported = await exportInfographicToFile(renderInfographicBundleHtml(bundle), format, output)
      if (isAgentError(exported)) return fail(exported)
    } else {
      writeOutput(output, renderInfographicBundleHtml(bundle))
    }
    return { ok: true, value: { output, format, style: bundle.style, blocks: bundle.blocks.map(block => block.id), warnings: [] } }
  }

  if (specInputPath) {
    const loaded = loadInfographicSpec(specInputPath)
    if (isAgentError(loaded)) return fail(loaded)
    const spec = loaded.value
    const quality = assessInfographicQuality(spec)
    const compositionIssue = getCompositionRenderIssue(spec)
    if (compositionIssue) return fail(compositionSelectionRequired(compositionIssue))
    if (strictVisuals) {
      const strictParsed = strictInfographicSpecSchema.safeParse(spec)
      if (!strictParsed.success) {
        return fail(agentError('STRICT_VISUALS_FAILED', 'Strict composition validation failed.', {
          issues: strictParsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
        }))
      }
      if (quality.warnings.length > 0) {
        return fail(agentError('STRICT_VISUALS_FAILED', 'Visual density check failed. Fix warnings or remove --strict-visuals.', {
          warnings: quality.warnings
        }))
      }
    }
    if (format === 'json') {
      writeOutput(output, `${JSON.stringify(spec, null, 2)}\n`)
    } else if (format === 'markdown') {
      writeOutput(output, renderInfographicMarkdown(spec))
    } else if (format === 'png' || format === 'pdf') {
      const html = renderInfographicHtml(spec)
      const exported = await exportInfographicToFile(html, format, output)
      if (isAgentError(exported)) return fail(exported)
    } else {
      writeOutput(output, renderInfographicHtml(spec))
    }
    return { ok: true, value: { output, format, style: spec.style, sections: spec.sections.map(s => s.type), warnings: quality.warnings } }
  }

  const file = args.positional[0]
  if (!file) {
    return fail(agentError('MISSING_INPUT', 'Usage: miao-viz article <file> --output <file> [--style editorial|executive|minimal] [--format html|json|markdown|png|pdf]\n       miao-viz article --spec-input <spec.json> --output <file> [--format html|json|markdown|png|pdf]\n       miao-viz article --bundle-input <bundle.json> --output <file> [--format html|json|markdown|png|pdf]'))
  }

  const styleFlag = stringFlag(args, 'style')
  const style = parseArticleStyle(styleFlag)
  if (!style) {
    return fail(agentError('UNSUPPORTED_ARTICLE_STYLE', `Unsupported article style: ${styleFlag}`, {
      supportedStyles: ['editorial', 'executive', 'minimal']
    }))
  }

  const generated = generateInfographicFromFile(file, style)
  if (isAgentError(generated)) return fail(generated)
  const compositionIssue = getCompositionRenderIssue(generated.value.spec)
  if (compositionIssue) return fail(compositionSelectionRequired(compositionIssue))

  if (format === 'json') {
    writeOutput(output, `${JSON.stringify(generated.value.spec, null, 2)}\n`)
  } else if (format === 'markdown') {
    writeOutput(output, generated.value.markdown)
  } else if (format === 'png' || format === 'pdf') {
    const html = renderInfographicHtml(generated.value.spec)
    const exported = await exportInfographicToFile(html, format, output)
    if (isAgentError(exported)) return fail(exported)
  } else {
    writeOutput(output, renderInfographicHtml(generated.value.spec))
  }

  const quality = assessInfographicQuality(generated.value.spec)
  if (strictVisuals) {
    const strictParsed = strictInfographicSpecSchema.safeParse(generated.value.spec)
    if (!strictParsed.success) {
      return fail(agentError('STRICT_VISUALS_FAILED', 'Strict composition validation failed.', {
        issues: strictParsed.error.issues.map(i => ({ path: i.path.join('.'), message: i.message }))
      }))
    }
    if (quality.warnings.length > 0) {
      return fail(agentError('STRICT_VISUALS_FAILED', 'Visual density check failed. Fix warnings or remove --strict-visuals.', {
        warnings: quality.warnings
      }))
    }
  }
  return {
    ok: true,
    value: {
      output,
      format,
      style,
      sections: generated.value.spec.sections.map(section => section.type),
      warnings: quality.warnings
    }
  }
}
