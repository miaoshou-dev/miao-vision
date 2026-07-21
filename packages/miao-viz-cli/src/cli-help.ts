const COMMAND_HELP: Record<string, string> = {
  'data.analyze': `Usage: miao-viz data analyze <file> [options]

Compile a scoped evidence pack and catalog for LLM report generation.
Outputs context.json: intent, fields, evidence, catalog (blockedCharts), sampleWarnings, promptRules.

Options:
  --intent <text>               Natural language description of the report goal
  --output <file>               Write context.json to this path (default: stdout)
  --compact                     Output compact context for agent consumption
  --verbose                     Keep full context output explicitly for debugging
  --extra-query <expr>          Custom query: "groupby=col;measure=sum(x) as y;filter=col>=val"
  --correct-assumption <expr>   Override an assumption: "primary_measure=orders", "primary_dimension=region", or "time_field=date"
  --sheet <name>                Sheet name (Excel only)
  --limit <n>                   Max rows to read
`,
  'data.profile': `Usage: miao-viz data profile <file> [options]

Profile a data file and output column statistics.

Options:
  --summary             Return only file, row count, and column names+types
  --columns col1,col2   Deep-profile only the specified columns
  --reliable-only       Suppress statistics where sample size is too small
  --sheet <name>        Sheet name (Excel only)
  --limit <n>           Max rows to read
`,
  'spec.validate': `Usage: miao-viz spec validate --spec <file> --profile <file> [options]

Validate a vizspec against a data profile.
Hard errors block rendering. Warnings should be fixed before rendering.

Options:
  --spec <file>       Path to vizspec YAML/JSON
  --profile <file>    Path to profile JSON (output of "profile")
  --context <file>    Path to context.json (output of "analyze") for catalog compliance and
                      $evidence path checks
  --strict            With --verify, treat verify warnings as hard errors; also hard-fails blockedChart violations
  --verify            Also check for forbidden words and missing sampleWarning caveats
  --patch-hints       Attach machine-readable JSON Patch hints to fixable errors
`,
  'spec.catalog': `Usage: miao-viz spec catalog [--for-llm]

List all available chart types and article infographic templates.

Options:
  --for-llm     Output machine-readable format for agent consumption
`,
  'spec.block': `Usage: miao-viz spec block instantiate <block-id> --context <context.json> [--output <file>]

Instantiate a report block using full or compact analyze context.
`,
  'spec.template': `Usage:
  miao-viz spec template list
  miao-viz spec template inspect <template-id>
  miao-viz spec template instantiate <template-id> --context <context.json> [--output <file>]

List, inspect, or instantiate report templates using full or compact analyze context.
`,
  'spec.inspect': `Usage: miao-viz spec inspect --input <file> --spec <file> --context <context.json> --output <file>

Inspect chart transform pipelines and evidence usage for debugging.
`,
  'render.report': `Usage: miao-viz render report --input <file> --spec <file> --output <file> [options]

Render a vizspec to HTML or SVG.

Options:
  --input <file>    Path to data file
  --spec <file>     Path to vizspec YAML/JSON
  --output <file>   Output file path
  --format <fmt>    Output format: html, svg (default: html)
  --theme <name>    Theme: standard-white, magazine, standard-dark, minimal, nyt, bloomberg, tableau
  --context <file>  Path to context.json (output of "analyze") — resolves $evidence: directives in insights[]
  --interactive     Explicitly enable the interactive runtime (HTML default)
  --no-interactive  Disable the runtime and force static HTML output
  --sheet <name>    Sheet name (Excel only)
  --limit <n>       Max rows to read
`,
  'render.deck': `Usage: miao-viz render deck --input <file> --spec <file> --output <file> [options]

Render a deck spec to HTML slides.

Options:
  --input <file>    Path to data file
  --spec <file>     Path to deck spec YAML/JSON
  --output <file>   Output file path
  --theme <name>    Theme: standard-white, magazine, standard-dark, minimal, nyt, bloomberg, tableau
  --context <file>  AnalyzeContext used for claim, evidence, and caveat checks
  --verify          Request deck knowledge verification
  --strict          Treat high-risk deck knowledge warnings as errors; requires --context
  --sheet <name>    Sheet name (Excel only)
  --limit <n>       Max rows to read
`,
  'deck.validate': `Usage: miao-viz deck validate --spec <file> --context <file> [options]

Validate a DeckSpec against AnalyzeContext evidence and quality warnings.

Options:
  --spec <file>     Path to deck spec YAML/JSON
  --context <file>  Path to context.json from "miao-viz data analyze"
  --verify          Verify claim grounding, evidence paths, and caveat coverage
  --strict          Treat high-risk deck knowledge warnings as errors
`,
  'deck.instantiate': `Usage: miao-viz deck instantiate <executive-brief|business-review> --context <file> [--output <file>]

Instantiate a deterministic DeckSpec from AnalyzeContext knowledge candidates.
`,
  'render.article': `Usage:
  miao-viz render article <file> --output <file> [options]
  miao-viz render article --spec-input <spec.json> --output <file> [options]
  miao-viz render article --bundle-input <bundle.json> --output <file> [options]
  miao-viz render article analyze <file> [--output <context.json>]
  miao-viz render article catalog [--for-llm]

Convert a local article into a static infographic artifact, render a
pre-built InfographicSpec JSON, render an atomic multi-chart bundle, or
analyze an article for LLM-driven spec generation.

Subcommands:
  analyze               Extract article structure (headings, sections,
                        paragraphs, terms) for LLM consumption
  catalog               List article infographic structures/templates

Options:
  --output <file>         Output file path (required for render, optional for analyze)
  --format <fmt>          Output format: html, json, markdown, png, pdf (default: html)
  --style <name>          Style: editorial, executive, minimal (default: editorial; ignored with --spec-input)
  --spec-input <file>     Path to a pre-built InfographicSpec JSON file
  --bundle-input <file>   Path to an InfographicBundleSpec JSON file with numbered atomic chart blocks
  --strict-visuals        Fail if visual density is below recommended thresholds

Use --bundle-input for multi-chart article pages where each figure has a
stable id such as fig-01-market-timeline. Use --spec-input for one complete
single-composition infographic.

Note: png and pdf export requires Playwright. Install with:
  npm install --save-dev @playwright/test && npx playwright install chromium
`,
  'data.query': `Usage: miao-viz data query <file> [options]

Run an aggregation query against a data file.

Options:
  --groupby <cols>    Comma-separated columns (multi-column: "region,month")
  --measure <exprs>   Aggregate: "sum(sales) as total, count(*) as cnt"
  --filter <expr>     Filter: "col=val", "col>=val", "col<=val", "col>val", "col<val"
  --orderby <col dir> e.g. "total_sales desc"
  --limit <n>         Max rows to return
  --sheet <name>      Sheet name (Excel only)
`,
}

const GROUP_HELP: Record<string, string> = {
  data: `
Usage: miao-viz data <command> [options]

Inspect and query your data files.

Commands:
  profile   Profile a data file — column types, distributions, stats
  query     Run an aggregation query to get real computed values
  analyze   Pre-compute evidence pack + catalog for AI agent consumption
`,
  spec: `
Usage: miao-viz spec <command> [options]

Author, validate, and debug visualization specs.

Commands:
  validate  Validate a vizspec against a data profile
  catalog   List all available chart types and infographic templates
  block     Instantiate report blocks from analyze context
  template  List, inspect, or instantiate report templates
  inspect   Inspect chart transforms and evidence usage
`,
  deck: `
Usage: miao-viz deck <command> [options]

Plan and validate browser deck specs.

Commands:
  validate  Validate a DeckSpec against AnalyzeContext
`,
  render: `
Usage: miao-viz render <command> [options]

Generate HTML output artifacts.

Commands:
  report    Render a vizspec to HTML or SVG
  deck      Render a deck spec to HTML slides
  article   Convert a local article to an infographic artifact
`,
}

export function printHelp(groupOrCommand?: string): void {
  // Try group help
  if (groupOrCommand && GROUP_HELP[groupOrCommand]) {
    process.stdout.write(GROUP_HELP[groupOrCommand])
    return
  }

  // Try new-style command help (e.g. "data.profile")
  if (groupOrCommand && COMMAND_HELP[groupOrCommand]) {
    process.stdout.write(COMMAND_HELP[groupOrCommand])
    return
  }

  // Top-level help
  process.stdout.write(`miao-viz — local data visualization CLI

Usage:
  miao-viz <group> <command> [options]
  miao-viz --version

Groups:
  data    Inspect and query data files
  spec    Author, validate, and debug visualization specs
  deck    Plan and validate browser deck specs
  render  Generate HTML output (reports, decks, infographics)

Run "miao-viz <group> --help" for group-specific commands.
Run "miao-viz <group> <command> --help" for command-specific options.
`)
}
