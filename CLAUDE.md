# CLAUDE.md

This file provides guidance to Claude Code when working in this repository.

## Project Overview

Miao Vision is an AI-first, local-first static visualization system. The primary product surface is the `miao-viz` CLI, which turns local data files and local article text into shareable HTML artifacts.

Primary outputs:

- Data reports: KPI cards, charts, tables, written insights, and evidence-backed annotations.
- Browser decks: presentation-style HTML with keyboard navigation and print/PDF support.
- Article infographics: static visual summaries from normalized Markdown or text.

The web app is currently a landing, preview, packaging, and distribution surface. It is not the main SQL workspace, and product generation logic should live in the CLI packages.

## Repository Shape

```text
packages/miao-viz-cli/       Primary CLI implementation and renderer
packages/miao-vision-skill/  Source skill instructions and install docs
packages/shared/             Shared type packages
apps/web/                    Svelte landing/distribution app
skills/miao-vision/          Installed/local skill copy
docs/                        Product, architecture, and implementation plans
tests/                       E2E tests and test helpers
test_data/                   CLI and rendering fixtures
videos/miaoshou-promo/       Standalone HyperFrames promo video project
```

Do not treat `packages/miao-viz-cli/dist/` or `apps/web/dist/` as source. Edit `src/`, package docs, or source skill files instead.

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

For CLI work, prefer `npm run miao-viz -- <command>` while developing so changes are exercised through the repository wrapper.

## CLI Architecture

The CLI is in `packages/miao-viz-cli/src/`.

Important modules:

- `cli.ts`: command routing for profile, analyze, validate, render, deck, article, catalog, block, and query.
- `types.ts`: public report, chart, transform, dataset, and result contracts.
- `spec-schema.ts`: Zod schema for report specs.
- `spec-validator.ts`: field validation, catalog compliance, evidence path checks, verify warnings, and patch-hint integration.
- `analyzer.ts` and `context-schema.ts`: data profiling, role detection, evidence generation, catalog recommendations, metric candidates, and analyze context schema.
- `chart-catalog.ts`: chart capabilities, required encodings, anti-patterns, and validation rules.
- `report-block-registry.ts` and `cli-block.ts`: report block matching and block draft generation.
- `data-loader.ts`, `data-profiler.ts`, `data-query.ts`, `data-transform.ts`: local data ingestion and deterministic data operations.
- `svg-renderer.ts` and `html-export.ts`: static chart and report rendering.
- `deck-*`: deck spec, validation, layout, and rendering.
- `article-*`: article infographic generation and HTML rendering.

All CLI commands should return structured, machine-readable results using the existing `AgentResult` style: `{ ok: true, value }` or `{ ok: false, code, message, ... }`.

## Claude Workflows

### Data Report Workflow

Use the evidence-first pipeline for report generation and report-related code changes:

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

When writing or repairing report specs:

- Use `context.fields` for field names and roles.
- Use `context.catalog.charts` for allowed chart types.
- Avoid `context.catalog.blockedCharts`.
- Cite `context.evidence` through `$evidence:` directives instead of inventing metrics.
- Prefer `metricCandidates` over ad hoc formula construction.
- Preserve structured validation errors and patch hints so agents can repair specs programmatically.

### Article Workflow

The CLI reads local Markdown/text only. Agents are responsible for fetching URLs, extracting the article body, and saving normalized Markdown before invoking:

```bash
npm run miao-viz -- article /tmp/miao-vision/article.md \
  --style editorial \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

Do not add URL fetching to the CLI unless the product direction explicitly changes.

### Deck Workflow

Use `miao-viz deck` for browser presentation artifacts:

```bash
npm run miao-viz -- deck \
  --input /path/to/data.csv \
  --spec /path/to/deck.yaml \
  --output /tmp/miao-vision/deck.html
```

Deck validation should continue to identify missing fields in chart encodings, chart transforms, and metric transforms with structured repair information.

## Skill Maintenance

The source skill is:

```text
packages/miao-vision-skill/SKILL.md
```

Reference docs for the skill live under:

```text
packages/miao-vision-skill/references/
```

Packaged or copied skill files such as `apps/web/public/SKILL.md`, `apps/web/dist/SKILL.md`, and `skills/miao-vision/SKILL.md` are not the primary source of truth. Update the source skill, then use the existing build or packaging workflow to refresh generated copies when needed.

## Web App Scope

The Svelte app in `apps/web/` supports the product website, installation flow, and public assets. Keep report/deck/article generation behavior in `packages/miao-viz-cli`; the web app should not become the owner of CLI rendering, validation, or analysis logic.

Use normal Svelte 5 patterns in `apps/web/src`, and keep browser-only code out of CLI modules.

## Dependency Boundaries

- CLI code must not import browser-only Svelte app modules.
- Web app code may present or distribute CLI/skill artifacts, but should not duplicate product generation logic.
- `packages/shared/` should remain focused on shared types and schemas.
- Skill docs should describe CLI workflows rather than reimplement renderer internals.
- Generated files and build outputs should not be edited as source.
- `videos/miaoshou-promo/` is a standalone video project; do not mix its HyperFrames-specific files into the main CLI architecture.

## Code Quality

- Keep non-test `.ts` and `.svelte` files under 500 lines. `npm run check:size` enforces this.
- Split large CLI modules by responsibility instead of appending unrelated logic.
- Prefer existing structured parsers and schemas over ad hoc string parsing.
- Keep command output stable and machine-readable.
- Add or update focused tests when changing CLI behavior, schemas, validation, rendering, deck generation, or article generation.

## Testing Expectations

For documentation-only changes, run:

```bash
npm run check:size
```

For CLI behavior changes, run at least:

```bash
npm run test:run
npm run build:cli
```

For web app changes, run:

```bash
npm run check
npm run build
```

For deck or browser behavior changes, include:

```bash
npm run test:e2e
```

## Current Priorities

- Improve the reliability of `miao-viz analyze -> instantiate/spec -> validate -> render`.
- Keep report insights evidence-grounded and machine-verifiable.
- Reduce agent token cost by moving deterministic chart, block, template, and validation knowledge into the CLI.
- Preserve local-first operation: no backend, no data upload, no required API key.
- Keep artifacts self-contained and easy to share.
