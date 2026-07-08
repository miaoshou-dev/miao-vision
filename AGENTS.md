# AGENTS.md

This file provides guidance to Codex and other coding agents when working in this repository.

## Project Overview

Miao Vision is an AI-first, local-first static visualization system. The primary engine is the `miao-viz` CLI in `packages/miao-viz-cli`, which turns local files into shareable HTML artifacts.

Primary outputs:

- Data reports with KPI cards, charts, tables, and evidence-backed insights.
- Browser decks with keyboard navigation and print/PDF support.
- Article infographics from normalized local Markdown or text.

The web app is a lightweight landing, preview, packaging, and distribution surface. It is not the main SQL workspace, and it should not own report/deck/article generation logic.

## Current Repository Shape

```text
packages/miao-viz-cli/       Primary CLI implementation, specs, validation, and renderers
skills/miao-vision/          Source skill, references, and install docs
packages/shared/             Shared type packages
apps/web/                    Svelte landing/distribution app
docs/                        Product, architecture, and implementation plans
tests/                       E2E tests and helpers
test_data/                   CLI and renderer fixtures
videos/miaoshou-promo/       Standalone HyperFrames promo video project
```

Do not edit generated output as source. In particular, avoid source edits under `packages/miao-viz-cli/dist/` and `apps/web/dist/`.

## Development Commands

```bash
npm run dev                # Start the web app dev server
npm run build              # Build the web app and public skill copy
npm run build:cli          # Bundle packages/miao-viz-cli
npm run miao-viz -- ...    # Run the local CLI wrapper
npm run test:run           # Run Vitest once
npm run check              # Svelte/TypeScript checks for the web app
npm run check:size         # Enforce source file size limits
npm run test:e2e           # Playwright E2E tests
npm run pack:skill         # Package the Miao Vision skill
```

For CLI development, prefer `npm run miao-viz -- <command>` so the local wrapper exercises the repository version.

## Primary Workflows

### Data Report

Use the deterministic CLI pipeline for report generation and for testing report-related code changes:

```bash
npm run miao-viz -- analyze /path/to/data.csv \
  --intent "user intent" \
  --output /tmp/miao-vision/context.json

npm run miao-viz -- profile /path/to/data.csv \
  > /tmp/miao-vision/profile.json

npm run miao-viz -- block instantiate <block-id> \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/report.yaml

npm run miao-viz -- validate \
  --spec /tmp/miao-vision/report.yaml \
  --profile /tmp/miao-vision/profile.json \
  --context /tmp/miao-vision/context.json \
  --verify

npm run miao-viz -- render \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/report.html
```

When changing evidence, validation, chart selection, or rendering behavior, test the full `analyze -> instantiate/spec -> validate -> render` path.

### Article Infographic

Agents fetch URLs and normalize article content themselves. The CLI accepts local Markdown/text only:

```bash
npm run miao-viz -- article /tmp/miao-vision/article.md \
  --style editorial \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

### Browser Deck

Use `miao-viz deck` for presentation artifacts:

```bash
npm run miao-viz -- deck \
  --input /path/to/data.csv \
  --spec /path/to/deck.yaml \
  --output /tmp/miao-vision/deck.html
```

Deck validation should keep returning structured field and spec repair information.

## CLI Architecture

The CLI source is in `packages/miao-viz-cli/src/`.

Core responsibilities:

- Data loading/profiling: `data-loader.ts`, `data-profiler.ts`, `data-query.ts`, `data-transform.ts`.
- Analyze context and evidence: `analyzer.ts`, `context-schema.ts`.
- Public contracts and schemas: `types.ts`, `spec-schema.ts`.
- Spec validation and patch hints: `spec-validator.ts`, `patch-hints.ts`, `directive-resolver.ts`.
- Chart catalog rules: `chart-catalog.ts`.
- Block instantiate workflow: `report-block-registry.ts`, `cli-block.ts`.
- Static report rendering: `html-export.ts`, `svg-renderer.ts`, `themes/`.
- Deck rendering: `deck-types.ts`, `deck-schema.ts`, `deck-validator.ts`, `deck-layouts.ts`, `deck-renderer.ts`.
- Article infographic rendering: `article-infographic.ts`, `article-html.ts`.
- CLI entrypoint and command utilities: `cli.ts`, `cli-utils.ts`, `cli-help.ts`.

CLI commands should preserve structured, machine-readable output using the existing result style:

```ts
{ ok: true, value: ... }
{ ok: false, code: string, message: string, ... }
```

For evidence-related work, do not degrade machine-readable `ok/value` responses, structured errors, evidence ids, `$evidence:` path validation, or patch-hint behavior.

## Agent Skill Architecture

The source skill lives at:

```text
skills/miao-vision/SKILL.md
```

Skill references live under:

```text
skills/miao-vision/references/
```

Packaged or copied skill files, including `apps/web/public/SKILL.md` and `apps/web/dist/SKILL.md`, are not the primary source of truth. Update the source skill and use the existing build/pack flow to refresh generated copies when needed.

Skill docs should describe CLI workflows and agent behavior. They should not duplicate renderer internals or become a second implementation spec for CLI logic.

## Web App Scope

The Svelte app in `apps/web/` supports the website, install/distribution flow, and public assets. Keep generation, validation, profiling, catalog, and rendering logic in `packages/miao-viz-cli`.

Use normal Svelte 5 patterns in `apps/web/src`. Do not import browser-only app modules into CLI code.

## Dependency Boundaries

- CLI code must not depend on browser-only Svelte app code.
- Web app code should not own CLI/product generation logic.
- `packages/shared/` should remain type/schema focused.
- Skill docs should describe workflows rather than duplicate CLI internals.
- Generated and dist files should not be edited as source.
- `videos/miaoshou-promo/` is a standalone HyperFrames project and should stay separate from main CLI architecture.

## Testing Expectations

For documentation-only changes:

```bash
npm run check:size
```

For CLI behavior changes:

```bash
npm run test:run
npm run build:cli
```

For web app changes:

```bash
npm run check
npm run build
```

For deck/browser behavior changes:

```bash
npm run test:e2e
```

For report generation changes, include a workflow-level smoke test that covers `analyze`, block instantiate or spec authoring, `validate --context --verify`, and `render`.

## Code Quality Rules

- Keep non-test `.ts` and `.svelte` files under 500 lines. `npm run check:size` fails over the limit.
- Files over 400 lines are warnings; avoid pushing them closer to the hard limit.
- Split large CLI modules by responsibility instead of extending oversized files.
- Prefer existing schemas, parsers, and structured APIs over ad hoc string manipulation.
- Keep CLI output stable and machine-readable.
- Add focused tests for changes to CLI behavior, schemas, validation, rendering, deck generation, article generation, or skill workflow assumptions.

## Common Pitfalls

- Do not revive old SQL Workspace, Monaco, DuckDB-WASM OPFS, or plugin-heavy browser architecture assumptions in root guidance.
- Do not add URL fetching to the CLI article command; agents should fetch and normalize web content before calling the CLI.
- Do not invent metrics in generated reports. Use `context.evidence`, `$evidence:` directives, and `metricCandidates`.
- Do not use blocked chart types from `context.catalog.blockedCharts`.
- Do not edit packaged skill copies without also updating the source skill.
- Do not treat the web app as the owner of report/deck/article generation.

## Current Priorities

- Improve reliability of `miao-viz analyze -> instantiate/spec -> validate -> render`.
- Keep report insights evidence-grounded and machine-verifiable.
- Move deterministic chart, block, template, and validation knowledge into the CLI to reduce agent token cost.
- Preserve local-first operation: no backend, no data upload, no required API key.
- Keep generated artifacts self-contained and easy to share.
