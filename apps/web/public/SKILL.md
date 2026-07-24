---
name: miao-vision
description: >
  Use Miao Vision to create article infographics from URLs, Markdown, or long-form
  text; self-contained HTML charts or reports from local CSV, TSV, XLSX, or JSON;
  browser-based data decks; chart recommendations; or Miao Vision spec validation.
  The agent fetches article URLs. Excludes text-only work, raster images, native
  PPTX, and live or remote-data dashboards.
---

# Miao Vision

Use Miao Vision as a local-first infographic and visualization workflow in agent environments that can run local shell commands.

## Scope Guard

Before reading workflow references, resolving the CLI, or requesting installation:

1. Confirm that the request requires an article infographic, an HTML chart or report from local structured data, a browser-based data deck, a chart recommendation, or Miao Vision spec validation.
2. Stop and use an appropriate alternative when the request is text-only, requires a raster image or native `.pptx`, depends on a live or remote data source, or otherwise exceeds the limitations below.

Ask one concise clarification question only when the required deliverable or file format is materially ambiguous.

## Limitations

- Produce self-contained HTML artifacts by default.
- Treat deck output as a browser-based HTML presentation, not native PowerPoint.
- Fetch article URLs in the agent workflow and normalize them to local Markdown or text.
- Require local CSV, TSV, XLSX, or JSON input for data-report rendering.
- Do not connect to remote databases, upload user data, or create live dashboards.
- Ground report metrics and findings in available evidence; do not invent them.
- Use catalog-supported charts and sections; do not improvise unsupported types.

## Route The Request

Read only the references required for the selected workflow.

| User intent | Required reference |
|---|---|
| Article URL, Markdown, or long-form text explicitly requested as an infographic | `references/article-infographic.md` and `references/composition-playbook.md` |
| Local CSV/TSV/XLSX/JSON requested as an HTML chart, report, visualization, or evidence-backed findings artifact | `references/data-report.md`, `references/report-intelligence.md`, `references/chart-selection.md`, and `references/anti-patterns.md` |
| Slides, presentation, deck, executive briefing, or meeting brief accepted as browser-based HTML | `references/browser-deck.md` |
| Chart recommendation for local structured data | `references/chart-selection.md` and, when needed, `references/anti-patterns.md` |
| Miao Vision report or deck spec validation | `references/vizspec.md` plus the relevant report or deck reference |

Ask whether browser-based HTML is acceptable when a request says only slides or presentation without naming a format. Ask whether a dashboard means a static HTML report or a live system when that distinction is unclear. If a request mixes report and presentation, prefer the explicitly named final deliverable. Ask no more than one concise question.

For non-trivial articles, use the atomic bundle path described in the article references. Use auto-extract only for quick drafts.

## CLI Bootstrap

Resolve the CLI only after the request passes the Scope Guard and its workflow is selected.

Prefer the skill-private CLI at `bin/miao-viz`. If it is absent, reuse a compatible `miao-viz` available on `PATH`. Compatibility is determined by required CLI capabilities rather than a duplicated version file.

Run `scripts/check-miao-viz.mjs`, resolving paths relative to this `SKILL.md`, to apply the resolution order. If neither executable exists, request approval for network access and writing inside the installed skill directory, then run the platform installer:

```bash
# macOS or Linux
./scripts/install-miao-viz.sh

# Windows PowerShell
./scripts/install-miao-viz.ps1
```

Verify a newly installed private CLI:

```bash
./bin/miao-viz --version
./bin/miao-viz spec catalog
```

Use the resolved executable consistently for the entire task. In reference examples, `miao-viz` means the resolved private or global executable. Do not download a private copy when a working global executable exists.

Run `miao-viz spec catalog --for-llm` when machine-readable chart and infographic-template rules are needed.

## Global Execution Rules

- Use `/tmp/miao-vision` as the default working directory for generated specs and artifacts.
- Keep all work local and do not upload user data.
- Do not call an LLM from the CLI. Let the agent reason and write specs; use the CLI to validate and render.
- Do not edit generated output as source.
- Validate data reports before rendering.
- Use `miao-viz render deck` for decks; DeckSpec validation runs inside that command.
- Use `miao-viz spec catalog --for-llm` for article structure selection when compact workflow context is insufficient.
- For recurring reports, replay the saved project with `report update`; do not redesign it or silently change field mappings.

## Recurring Reports

Treat weekly, monthly, quarterly, daily, previous-period, and "use the same format with a new file" requests as recurring-report intent.

- After the first report passes validation, preview `miao-viz report init <project> ... --dry-run`, then initialize after the project summary is accepted.
- Before an update, run `miao-viz report info <project>`, then `miao-viz report update <project> --input <file> --period <id>`.
- Do not rewrite the saved Spec, change Evidence ids, invent Evidence, or guess required-field mappings.
- Present structured contract mismatches for explicit repair or project-version upgrade.
- Use `report history` for prior runs and preview `report clean --keep <n>` before adding `--confirm`.
- PDF requires Playwright; recurring HTML updates remain available without it.

## Shared References

- Read `references/vizspec.md` before writing report or deck specs, or when chart or transform syntax is unclear.
- Read `references/examples.md` when a supported request is ambiguous or close to an existing example.
- Use CLI catalog output only when the selected workflow references do not explain a rule clearly enough.

## Source Of Truth

Treat `skills/miao-vision/` as the source skill. Refresh packaged or copied files through the repository build and pack flows rather than editing generated copies.
