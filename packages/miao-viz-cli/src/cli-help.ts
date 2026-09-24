const COMMAND_HELP: Record<string, string> = {
  'artifact.plan': `Usage: miao-viz artifact plan --brief <file> --context <file> [options]

Plan a tabular outcome as a report or presentation without generating a spec or rendering.

Options:
  --brief <file>     Draft Outcome Brief JSON
  --context <file>   Full or compact Analyze Context JSON
  --memory <file>    Optional project Outcome Memory JSON; the CLI does not search implicitly
  --output <file>    Write the plan result to this path (default: stdout)
  --compact          Return the compact Agent-facing plan
  --summary          Return user-facing guidance without protocol internals
`,
  'artifact.memory': `Usage: miao-viz artifact memory <action> --memory <file> [options]

Inspect or explicitly update project-local Outcome Memory.

Actions:
  inspect                      Read and validate the current Memory
  update --proposal <file>     Merge a validated preference proposal
  forget [--field <path>]      Forget one field, or clear all preferences

Options:
  --memory <file>              Explicit Outcome Memory JSON path
  --proposal <file>            Outcome Memory Proposal JSON for update
  --field <path>               Persistable preference field to forget
  --confirm                    Required for update and forget
`,
  'artifact.instantiate': `Usage: miao-viz artifact instantiate --plan <file> --context <file> [options]

Instantiate a V2 Artifact Plan as a ReportSpec or DeckSpec without validating, rendering, or delivering it.

Options:
  --plan <file>       Full or compact Artifact Plan V2 JSON
  --context <file>    Full or compact Analyze Context JSON used to create the plan
  --confirm-plan      Confirm a plan whose nextAction is confirm
  --output <file>     Write the generated Spec as YAML (default: structured stdout)
`,
  'artifact.validate': `Usage: miao-viz artifact validate --plan <file> --context <file> --input <file> --spec <file> [options]

Verify that a planned ReportSpec or DeckSpec is compatible with its Plan, Analyze Context, and local data.
This command does not repair, render, deliver, publish, or call an LLM.

Options:
  --plan <file>       Full or compact Artifact Plan V2 JSON
  --context <file>    Full or compact Analyze Context JSON used to create the plan
  --input <file>      Local tabular data to validate against the Spec
  --spec <file>       ReportSpec or DeckSpec YAML/JSON
  --output <file>     Write Artifact Verification JSON (default: structured stdout)
  --compact           Omit diagnostic messages without changing verification status
  --summary           Return user-facing guidance without protocol internals
`,
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
  --inputs <a,b,...>            Append schema-compatible local files
  --field-map <json>            Map source field names to canonical field names
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
  --strict            With --verify, treat verify warnings as hard errors; hard-fails blockedChart violations and trusted-policy errors when dataPolicy is present
  --trusted           Require --strict, --verify, --context, and an explicit dataPolicy
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
  'spec.scene': `Usage:
  miao-viz spec scene list
  miao-viz spec scene inspect <scene-id>
  miao-viz spec scene instantiate <scene-id> --context <context.json> [--output <file>]

List, inspect, or instantiate business report scenes. Scenes compile to existing report templates and blocks.
`,
  'spec.summary': `Usage:
  miao-viz spec summary instantiate --spec <file> --context <context.json> [--output <file>]

Derive an executive-summary spec from a verified report without introducing new evidence.
`,
  'spec.diff': `Usage:
  miao-viz spec diff --before <file> --after <file> --context <context.json>

Return JSON Pointer changes, affected charts/insights/evidence, recompute requirements, and edit risks.
`,
  'spec.inspect': `Usage: miao-viz spec inspect --input <file> --spec <file> --context <context.json> --output <file>

Inspect chart transform pipelines and evidence usage for debugging.
`,
  'spec.interaction': `Usage: miao-viz spec interaction instantiate <filter|filter-and-detail> --context <context.json> [--output <file>]

Instantiate a deterministic interaction fragment from catalog.interactions. The command does not run a second planner.
`,
  'render.report': `Usage: miao-viz render report --input <file> --spec <file> --output <file> [options]

Render a vizspec to HTML or SVG.

Options:
  --input <file>    Path to data file
  --spec <file>     Path to vizspec YAML/JSON
  --output <file>   Output file path
  --format <fmt>    Output format: html, svg, png, pdf (default: html)
  --theme <name>    Theme: standard-white, magazine, standard-dark, minimal, nyt, bloomberg, tableau
  --context <file>  Path to context.json (output of "analyze") — resolves $evidence: directives in insights[]
  --interactive     Explicitly enable the interactive runtime (HTML default)
  --no-interactive  Disable the runtime and force static HTML output
  --trusted         Refuse to write the artifact unless shareSafe is true
  --sheet <name>    Sheet name (Excel only)
  --limit <n>       Max rows to read
  --inputs <a,b,...> Append schema-compatible files before rendering
  --field-map <json> Apply source-to-canonical field names before validation
  --viewport-width <px>  PNG viewport width (default: 1440)
  --viewport-height <px> PNG viewport height (default: 900)
  --scale <n>       PNG device scale factor (default: 1)
  --png-timeout <ms> PNG render timeout (default: 30000)
  --review-url <url>  Publish review events to a running local Review Viewer
  --review-run-id <id>  Stable run id used by the Review Viewer
`,
  'render.deck': `Usage: miao-viz render deck --spec <file> --output <file> [options]

Render a deck spec to HTML or PDF slides. Narrative decks need no data input;
data, hybrid, and legacy decks require --input.

Options:
  --input <file>    Data file (required for data, hybrid, and legacy decks)
  --spec <file>     Path to deck spec YAML/JSON
  --output <file>   Output file path
  --theme <name>    Theme: standard-white, magazine, standard-dark, minimal, nyt, bloomberg, tableau
  --context <file>  DeckContext or legacy AnalyzeContext used for validation
  --verify          Request deck knowledge verification
  --strict          Treat high-risk deck knowledge warnings as errors; requires --context
  --sheet <name>    Sheet name (Excel only)
  --limit <n>       Max rows to read
`,
  'deck.validate': `Usage: miao-viz deck validate --spec <file> --context <file> [options]

Validate a DeckSpec against DeckContext or legacy AnalyzeContext.

Options:
  --spec <file>     Path to deck spec YAML/JSON
  --context <file>  Path from "deck analyze" or legacy "data analyze"
  --verify          Verify claim grounding, evidence paths, and caveat coverage
  --strict          Treat high-risk deck knowledge warnings as errors
`,
  'deck.analyze': `Usage: miao-viz deck analyze <file> [--data <file>] --intent <text> [--output <context.json>]

Analyze a local Markdown or text document into a deterministic DeckContext.
Use --data to add structured evidence for a Hybrid Deck.
Remote images are recorded but never downloaded.
`,
  'deck.instantiate': `Usage: miao-viz deck instantiate <executive-brief|business-review|topic-explainer|project-update|proposal> --context <file> [--output <file>]

Instantiate a deterministic DeckSpec from DeckContext or legacy AnalyzeContext.
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
  'review.serve': `Usage: miao-viz review serve [options]

Start the local Review Viewer server. The server binds to 127.0.0.1 and stays
alive until SIGINT or SIGTERM.

Options:
  --port <n>              Port to bind (default: 43179; use 0 for an available port)
  --artifact-root <dir>  Root directory allowed for artifact access (default: cwd)
`,
  'review.mcp': `Usage: miao-viz review mcp

Start the stdio MCP server and the local Review Viewer on port 43179. The MCP server exposes
open_miao_vision_viewer and run_miao_viz.
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
  'report.init': `Usage: miao-viz report init <project> --input <file> --spec <file> --context <file> --period <id> [options]

Create a reusable local report project. Use --dry-run to preview without writing.

Options:
  --dry-run       Preview contract, evidence plan, hashes, and risks
  --profile <file>  Validate and save a YAML or JSON client outcome profile
  --copy-input    Copy the source file into the first run
  --sheet <name>  Excel sheet name
`,
  'report.update': `Usage: miao-viz report update <project> --input <file> --period <id>

Replay the saved evidence plan and report spec with new compatible data.
`,
  'report.info': `Usage: miao-viz report info <project>

Inspect project health, contract, evidence count, hashes, and latest run.
`,
  'report.history': `Usage: miao-viz report history <project>

List recurring report runs newest first.
`,
  'report.clean': `Usage: miao-viz report clean <project> --keep <n> [--confirm]

Preview old runs by default. Use --confirm to delete, excluding the latest run.
`,
}

const GROUP_HELP: Record<string, string> = {
  diagnose: `
Usage: miao-viz diagnose [options]

Check the local CLI, Node.js, host plugin, input file, output directory, and optional PDF dependency.
The result is JSON-safe and never includes file contents, secrets, or environment values.

Options:
  --host <id>          codex, claude-code, openclaw, or cli
  --input <file>       Input file readability check
  --output <directory> Output directory writeability check
  --pdf                Check the PDF export dependency
`,
  artifact: `
Usage: miao-viz artifact <command> [options]

Plan visual outcomes in optional Shadow Mode.

Commands:
  plan      Plan a tabular report or presentation without generating it
  instantiate Generate a Spec from a confirmed executable plan
  validate  Verify a planned Spec against its Context and local data
  memory    Inspect or explicitly update project-local Outcome Memory
`,
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
  scene     List, inspect, or instantiate business report scenes
  summary   Derive an evidence-preserving executive summary
  diff      Inspect the impact of a minimal spec edit
  inspect   Inspect chart transforms and evidence usage
`,
  report: `
Usage: miao-viz report <command> [options]

Create and replay local recurring report projects.

Commands:
  init      Create a project from a verified report
  update    Replay it with a new period input
  info      Inspect project health
  history   List run history
  clean     Preview or remove old runs safely
`,
  deck: `
Usage: miao-viz deck <command> [options]

Plan and validate browser deck specs.

Commands:
  analyze   Analyze Markdown or text into DeckContext
  instantiate  Instantiate a deterministic DeckSpec
  validate  Validate a DeckSpec against DeckContext or AnalyzeContext
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
  miao-viz diagnose [--input <file>] [--output <directory>] [--host codex|claude-code|openclaw|cli]

Groups:
  artifact Plan tabular visual outcomes in optional Shadow Mode
  data    Inspect and query data files
  spec    Author, validate, and debug visualization specs
  deck    Plan and validate browser deck specs
  render  Generate HTML output (reports, decks, infographics)

Run "miao-viz <group> --help" for group-specific commands.
Run "miao-viz <group> <command> --help" for command-specific options.
`)
}
