const COMMAND_HELP: Record<string, string> = {
  analyze: `Usage: miao-viz analyze <file> [options]

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
  profile: `Usage: miao-viz profile <file> [options]

Profile a data file and output column statistics.

Options:
  --summary             Return only file, row count, and column names+types
  --columns col1,col2   Deep-profile only the specified columns
  --reliable-only       Suppress statistics where sample size is too small
  --sheet <name>        Sheet name (Excel only)
  --limit <n>           Max rows to read
`,
  validate: `Usage: miao-viz validate --spec <file> --profile <file> [options]

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
  catalog: `Usage: miao-viz catalog

List all available chart types and their required fields.
`,
  block: `Usage: miao-viz block instantiate <block-id> --context <context.json> [--output <file>]

Instantiate a report block using full or compact analyze context.
`,
  template: `Usage:
  miao-viz template list
  miao-viz template inspect <template-id>
  miao-viz template instantiate <template-id> --context <context.json> [--output <file>]

List, inspect, or instantiate report templates using full or compact analyze context.
`,
  inspect: `Usage: miao-viz inspect --input <file> --spec <file> --context <context.json> --output <file>

Inspect chart transform pipelines and evidence usage for debugging.
`,
  render: `Usage: miao-viz render --input <file> --spec <file> --output <file> [options]

Render a vizspec to HTML or SVG.

Options:
  --input <file>    Path to data file
  --spec <file>     Path to vizspec YAML/JSON
  --output <file>   Output file path
  --format <fmt>    Output format: html, svg (default: html)
  --theme <name>    Theme: default, editorial, dark, minimal
  --context <file>  Path to context.json (output of "analyze") — resolves $evidence: directives in insights[]
  --interactive     Force interactive runtime for HTML output
  --no-interactive  Force static HTML output
  --sheet <name>    Sheet name (Excel only)
  --limit <n>       Max rows to read
`,
  deck: `Usage: miao-viz deck --input <file> --spec <file> --output <file> [options]

Render a deck spec to HTML slides.

Options:
  --input <file>    Path to data file
  --spec <file>     Path to deck spec YAML/JSON
  --output <file>   Output file path
  --theme <name>    Theme: default, editorial, dark, minimal
  --sheet <name>    Sheet name (Excel only)
  --limit <n>       Max rows to read
`,
  article: `Usage:
  miao-viz article <file> --output <file> [options]
  miao-viz article --spec-input <spec.json> --output <file> [options]

Convert a local article into a static infographic artifact, or render a
pre-built InfographicSpec JSON directly.

Options:
  --output <file>         Output file path (required)
  --format <fmt>          Output format: html, json, markdown, png, pdf (default: html)
  --style <name>          Style: editorial, executive, minimal (default: editorial; ignored with --spec-input)
  --spec-input <file>     Path to a pre-built InfographicSpec JSON file

Note: png and pdf export requires Playwright. Install with:
  npm install --save-dev @playwright/test && npx playwright install chromium
`,
  query: `Usage: miao-viz query <file> [options]

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

export function printHelp(command?: string): void {
  if (command && COMMAND_HELP[command]) {
    process.stdout.write(COMMAND_HELP[command])
    return
  }
  process.stdout.write(`miao-viz — local data visualization CLI

Usage:
  miao-viz <command> [options]

Commands:
  analyze   Compile evidence pack + catalog for LLM report generation (start here)
  profile   Profile a data file (CSV, Excel, JSON)
  query     Run an aggregation query to get real computed values
  validate  Validate a vizspec against a data profile
  catalog   List all available chart types
  block     Instantiate report blocks from analyze context
  template  List, inspect, or instantiate report templates
  inspect   Inspect chart transforms and evidence usage
  render    Render a vizspec to HTML or SVG
  deck      Render a deck spec to HTML slides
  article   Convert a local article to an infographic artifact

Run "miao-viz <command> --help" for command-specific options.
`)
}
