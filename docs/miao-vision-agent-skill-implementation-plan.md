# Miao Vision Agent Skill Implementation Plan

This plan breaks the Agent Skill PRD into executable engineering tasks. The sequence is designed to keep the existing web app stable while adding a headless visualization path.

## Milestone 0: Baseline Audit

Goal: Confirm current reusable surfaces and identify code paths that must be shared by web app and agent mode.

Tasks:

- [ ] Audit chart/plugin registration flow.
  - Files: `src/bootstrap/index.ts`, `src/bootstrap/init-runtime.ts`, `src/bootstrap/init-plugins.ts`
  - Output: list of initialization steps needed by headless runtime.

- [ ] Audit current VizSpec/catalog flow.
  - Files: `src/core/catalog/viz-catalog.ts`, `src/core/viz/types.ts`, `src/core/viz/providers/svelte-provider.ts`
  - Output: supported chart type map, duplicated mapping logic, schema gaps.

- [ ] Audit export capabilities.
  - Files: `src/lib/export/`
  - Output: what can be reused for HTML, SVG, PNG, PDF.

Acceptance:

- Existing app behavior is understood and no implementation begins before reusable runtime boundaries are identified.

## Milestone 1: Shared Runtime Initialization

Goal: Extract app-independent initialization so CLI/headless rendering can reuse the plugin registry.

Tasks:

- [ ] Add `src/bootstrap/init-runtime.ts`.
  - Export `initializeMiaoRuntime()`.
  - Register services, chart plugins, component plugins, catalog, and VizCatalog.

- [ ] Refactor `src/bootstrap/index.ts`.
  - Keep `initializeApp()` as the web app entry.
  - Call `initializeMiaoRuntime()` from `initializeApp()`.
  - Preserve existing logging behavior or move app-specific logs to `initializeApp()`.

- [ ] Add focused tests for idempotent runtime initialization.
  - Runtime initialization should not double-register components or break repeated CLI invocations in one process.

Acceptance:

- `npm run check` passes.
- Existing app still starts with `npm run dev`.
- Runtime can be initialized without mounting `App.svelte`.

## Milestone 2: Agent Data Loader and Profiler

Goal: Let agents inspect local files before generating chart specs.

Tasks:

- [ ] Add `src/agent/data-loader.ts`.
  - Support CSV.
  - Support TSV.
  - Support XLSX.
  - Support JSON arrays.
  - Return normalized row objects.

- [ ] Add `src/agent/data-profiler.ts`.
  - Infer field types: string, number, boolean, date, unknown.
  - Compute row count.
  - Compute null rate.
  - Compute numeric min/max.
  - Compute samples for categorical/date fields.
  - Compute approximate distinct count.

- [ ] Add `src/agent/types.ts`.
  - Define `DataProfile`, `ColumnProfile`, `LoadedDataset`, and related types.

- [ ] Add tests with small fixture files.
  - CSV fixture.
  - TSV fixture.
  - XLSX fixture.
  - JSON fixture.

Acceptance:

- Data profiler returns compact JSON suitable for agent context.
- Malformed file errors are structured and actionable.
- No browser APIs are required for profiling.

## Milestone 3: CLI Skeleton

Goal: Provide a stable command surface for agent and direct user usage.

Tasks:

- [ ] Add `src/agent/cli.ts`.
  - Parse commands: `profile`, `render`, `validate`, `catalog`.
  - Print JSON for machine-readable commands.
  - Return non-zero exit codes for failures.

- [ ] Add package script for local testing.
  - Example: `npm run miao-viz -- profile ./test_data/sample.csv`

- [ ] Add bin entry when packaging is ready.
  - Example package bin: `"miao-viz": "./dist/agent/cli.js"`

- [ ] Add structured error helpers.
  - Include `ok`, `code`, `message`, and contextual fields.

Acceptance:

- `miao-viz profile <file>` works through the local npm script.
- Errors are valid JSON where possible.

## Milestone 4: VizSpec Report Schema and Validation

Goal: Give agents a stable intermediate format and catch mistakes before rendering.

Tasks:

- [ ] Define `src/agent/render-job.ts`.
  - Single chart job.
  - Multi-chart report job.
  - Output format options.
  - Report metadata.

- [ ] Define `src/agent/spec-schema.ts`.
  - Use Zod schemas for chart spec and report spec.
  - Keep compatible with existing `VizSpec` where possible.

- [ ] Add `src/agent/spec-validator.ts`.
  - Validate supported chart types.
  - Validate field references against `DataProfile`.
  - Validate required encodings per chart type.
  - Validate output format.

- [ ] Add `miao-viz validate`.
  - Inputs: `--spec`, `--profile`.
  - Output: structured JSON.

- [ ] Add `miao-viz catalog`.
  - Output supported chart types and encoding requirements.
  - Reuse component registry and catalog metadata where possible.

Acceptance:

- Missing fields return `FIELD_NOT_FOUND` with available fields.
- Unsupported charts return `UNSUPPORTED_CHART_TYPE` with supported types.
- Valid specs pass without rendering.

## Milestone 5: Static HTML Renderer

Goal: Generate self-contained HTML as the default agent artifact.

Tasks:

- [ ] Add `src/agent/html-export.ts`.
  - Generate full HTML document.
  - Inline CSS.
  - Include chart sections.
  - Embed VizSpec/report spec as JSON.
  - Embed data profile summary as JSON.

- [ ] Add pure SVG export path for MVP chart types.
  - Start with charts that already render to SVG.
  - Confirm chart components produce extractable SVG.

- [ ] Add report layout styles.
  - Desktop-readable layout.
  - Responsive single-column fallback.
  - No external CSS dependency.

- [ ] Add HTML snapshot tests.
  - Verify title, chart blocks, embedded spec, and SVG presence.

Acceptance:

- `miao-viz render --format html` creates an HTML file.
- The HTML opens through `file://` without a dev server.
- Output contains visible SVG for supported chart types.

## Milestone 6: Headless Browser Rendering

Goal: Support Svelte component rendering reliably for charts that require DOM.

Tasks:

- [ ] Add `src/agent-renderer/AgentRenderApp.svelte`.
  - Load render job JSON.
  - Initialize Miao runtime.
  - Mount chart components through existing registry/provider.
  - Mark render completion in DOM.

- [ ] Add `src/agent-renderer/main.ts`.
  - Dedicated entry for render page.

- [ ] Add Vite configuration or route for agent renderer.
  - Keep separate from normal app entry.

- [ ] Add Playwright orchestration in CLI render path.
  - Open render page.
  - Wait for completion marker.
  - Extract SVG/HTML.
  - Capture PNG when requested.

- [ ] Add timeout and diagnostic output.
  - On failure, include browser console errors and spec summary.

Acceptance:

- Svelte chart components render in headless mode.
- CLI can extract SVG from rendered DOM.
- CLI can create PNG when requested.

## Milestone 7: Prompt-to-Spec Workflow

Goal: Support natural language requests while keeping the rendering engine deterministic.

Tasks:

- [ ] Decide first implementation boundary:
  - Option A: Agent generates spec, CLI only validates/renders.
  - Option B: CLI accepts `--prompt` and delegates to configured LLM.

- [ ] MVP recommendation: implement Option A first.
  - Skill generates spec from profile and user prompt.
  - CLI handles deterministic validation/rendering.

- [ ] Add examples for natural language to spec conversion.
  - Sales trend.
  - Region ranking.
  - Category share.
  - BigValue KPI.
  - Multi-chart report.

- [ ] Keep `--prompt` reserved or implement as a convenience wrapper later.

Acceptance:

- Agent can generate spec using profile plus skill references.
- CLI remains usable without any LLM credentials.

## Milestone 8: Codex Skill Packaging

Goal: Provide a thin Codex skill that teaches agents how to use Miao Vision.

Tasks:

- [ ] Add `skills/miao-vision/SKILL.md`.
  - Trigger conditions.
  - Required workflow.
  - Default output: HTML.
  - Retry behavior on structured errors.

- [ ] Add `skills/miao-vision/references/vizspec.md`.
  - Chart types.
  - Encoding requirements.
  - Transform patterns.
  - Output format rules.

- [ ] Add `skills/miao-vision/references/examples.md`.
  - User request examples.
  - Data profile snippets.
  - Expected specs.
  - Expected commands.

- [ ] Add `skills/miao-vision/scripts/miao-viz.mjs` if a wrapper is needed.
  - Keep it thin.
  - Prefer calling the project CLI directly.

- [ ] Validate skill behavior on realistic prompts.

Acceptance:

- Skill instructions are concise and do not duplicate implementation docs.
- Agent can complete a local file to HTML report workflow using the skill.

## Milestone 8.5: Article-to-Infographic Skill Workflow

Goal: Let agents turn article URLs or Markdown files into infographic artifacts through the same CLI/skill product path.

Tasks:

- [ ] Add `src/agent/article-infographic.ts`.
  - Input: local Markdown/text file.
  - Output: markdown/json/uispec/html artifact.
  - Reuse `src/core/ai/agents/infographic/*`.
  - Avoid Svelte/browser dependencies.

- [ ] Add `miao-viz article`.
  - Example:
    ```bash
    miao-viz article /tmp/miao-vision/article.md \
      --style editorial \
      --format html \
      --output /tmp/miao-vision/article-infographic.html
    ```
  - First supported formats: `markdown`, `json`, `uispec`.
  - Add `html` after static infographic renderer is available.

- [ ] Update the skill workflow.
  - For URL input, the agent fetches or opens the page.
  - The agent extracts title, metadata, headings, body, lists, tables, and useful quotes.
  - The agent writes normalized Markdown to `/tmp/miao-vision/article.md`.
  - The agent calls `miao-viz article`.

- [ ] Preserve existing Web demo code as preview/debug.
  - Keep `ArticleToInfographicDemo` as a Web surface.
  - Refactor it later to call the same `src/agent/article-infographic.ts` adapter.
  - Do not move Svelte UI components into the CLI package.

Acceptance:

- An agent can convert a Markdown file into an infographic artifact through `miao-viz article`.
- An agent can convert a URL into an infographic by first normalizing it to local Markdown.
- CLI has no mandatory browser or URL-fetching dependency for the first release.

## Milestone 9: Optional Export Formats

Goal: Add additional artifact types after HTML is stable.

Tasks:

- [ ] Add SVG output.
  - One chart: write direct SVG.
  - Multi-chart report: write one SVG per chart or package as HTML only.

- [ ] Add PNG output.
  - Use Playwright screenshot.
  - Support full report screenshot and per-chart screenshot.

- [ ] Add PDF output.
  - Convert generated HTML to PDF.
  - Preserve layout and chart readability.

Acceptance:

- `--format html,png` produces both artifacts.
- PNG screenshots are nonblank.
- PDF is readable when enabled.

## Milestone 10: Documentation and Release Readiness

Goal: Make the agent mode usable by future contributors and users.

Tasks:

- [ ] Add implementation notes to project docs.
- [ ] Add CLI usage examples.
- [ ] Add troubleshooting for renderer timeouts, missing fields, and unsupported charts.
- [ ] Add fixture-based smoke tests.
- [ ] Run:
  - `npm run check`
  - `npm run test:run`
  - `npm run build`
  - `npm run check:size`

Acceptance:

- New feature is documented.
- Existing app remains stable.
- Agent workflow has repeatable smoke tests.

## Suggested First Sprint

Sprint goal: get a useful non-rendering foundation in place.

Tasks:

- [ ] Milestone 1: Shared Runtime Initialization
- [ ] Milestone 2: Data Loader and Profiler
- [ ] Milestone 3: CLI Skeleton with `profile`
- [ ] Basic fixtures and tests

Expected result:

```bash
npm run miao-viz -- profile ./test_data/sales.csv
```

returns a compact data profile JSON that an agent can use.

## Suggested Second Sprint

Sprint goal: get first HTML artifact.

Tasks:

- [ ] Milestone 4: Spec Schema and Validation
- [ ] Milestone 5: Static HTML Renderer
- [ ] Render one or more MVP SVG chart types

Expected result:

```bash
npm run miao-viz -- render \
  --input ./test_data/sales.csv \
  --spec ./test_data/sales-dashboard.yaml \
  --format html \
  --output ./outputs/sales-dashboard.html
```

creates a self-contained HTML report.

## Suggested Third Sprint

Sprint goal: make it practical for real agent usage.

Tasks:

- [ ] Milestone 6: Headless Browser Rendering
- [ ] Milestone 8: Codex Skill Packaging
- [ ] Milestone 8.5: Article-to-Infographic Skill Workflow
- [ ] Add realistic examples

Expected result:

An agent can follow the skill workflow from local data file to generated HTML report, or from article URL/Markdown to infographic artifact.
