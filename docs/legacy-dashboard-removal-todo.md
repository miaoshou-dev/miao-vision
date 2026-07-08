# Legacy Dashboard Removal TODO

> Date: 2026-06-24
> Goal: shrink Miao Vision from a browser BI/dashboard workspace into a landing page plus `miao-viz` CLI and agent skill product.

## Product Boundary

Keep the product centered on:

- Landing page and install/docs surface.
- `miao-viz` CLI commands for `profile`, `catalog`, `validate`, `render`, and `deck`.
- Agent/skill package and references for Codex/Claude workflows.
- Static artifact generation: HTML reports, SVG charts, browser decks, and future infographic output.
- Reusable chart/rendering assets only when they directly serve CLI/skill artifact generation.

Remove or demote:

- Browser dashboard builder.
- SQL Workspace and manual SQL authoring paths.
- DuckDB-WASM/OPFS as a user-facing product engine.
- Markdown BI report editor/runtime as a primary app surface.
- Interactive dashboard inputs, page trees, version history, and report management UI.
- Multi-source connector direction and old app stores that exist only to support browser BI.

## Current Keep Set

These paths are core to the new direction and should not be removed during dashboard cleanup:

- `apps/web/src/components/LandingPage.svelte`
- `apps/web/src/components/landing-page.css`
- `packages/miao-viz-cli/src/`
- `scripts/miao-viz.mjs`
- `packages/miao-viz-cli/`
- `skills/miao-vision/`
- `skills/miao-vision/`
- `packages/miao-viz-cli/src/themes/`
- `test_data/agent-sales.*`
- CLI-oriented docs such as `docs/PRODUCT_OVERVIEW.md`, `docs/miao-viz-product-restructure-direction.md`, `docs/miao-vision-agent-skill-prd.md`, and `docs/architecture/CLI_AGENT_INTELLIGENCE_DESIGN.md`

## Phase 1: Detach the Web App From Old BI Runtime

- [x] Rewrite the web app entry so the default app only renders the landing page and does not import BI/report/demo components.
- [x] Remove browser-side DuckDB initialization from the web app entry.
- [x] Remove report workspace imports from the web app entry.
- [x] Simplify the web bootstrap so it does not expose legacy stores on `window`.
- [x] Replace app startup logging that enumerates all registered dashboard components with landing/CLI-oriented startup only.
- [x] Change `initializeApp()` / `initializeMiaoRuntime()` usage so the landing page does not register every old plugin on browser load.
- [x] Keep a separate CLI/headless runtime if any CLI tests still need shared catalog initialization.
- [x] Run `npm run check` after this phase to identify now-unused imports and broken aliases.

## Phase 2: Remove Old App Shell And Report Workspace UI

Delete after Phase 1 confirms the landing page no longer imports them:

- [x] `src/components/app/`
- [x] `src/components/ReportList.svelte`
- [x] `src/components/ReportRenderer.svelte`
- [x] `src/components/MarkdownEditor.svelte`
- [x] `src/components/MissingDataSources.svelte`
- [x] `src/components/ReportToolbar.svelte`
- [x] `src/components/layouts/ReportLayout.svelte`
- [x] `src/components/navigation/`
- [x] `src/components/report/`
- [x] `src/components/ai-report/`
- [x] `src/components/FileUploader.svelte`
- [x] `src/components/InfographicDemo.svelte`
- [x] `src/components/infographic-demo/`
- [x] `src/components/ArticleToInfographicDemo.svelte` if article-to-infographic is moved fully into CLI/skill.
- [x] `src/components/article-to-infographic/` after the CLI has an `article` command or a replacement static renderer path.

Notes:

- `ArticleToInfographicDemo` contained useful product logic, but the Web demo surface was not the target product. Migrate any future parsing/export helpers into `packages/miao-viz-cli/src/`.
- Do not delete infographic renderers that are still needed by CLI-generated static artifacts until a replacement path exists.

## Phase 3: Remove Browser BI Stores

Delete once old app/report UI is gone:

- [x] `src/app/stores/database.svelte.ts`
- [x] `src/app/stores/report.svelte.ts`
- [x] `src/app/stores/report-inputs.ts`
- [x] `src/app/stores/report-inputs.svelte.ts`
- [x] `src/app/stores/selection.svelte.ts`
- [x] `src/app/stores/version.svelte.ts`
- [x] `src/app/stores/ai-config.svelte.ts` if no CLI/skill configuration imports it.
- [x] Simplify or delete `src/app/stores/index.ts`.
- [x] Delete `src/app/index.ts` if it only re-exports removed app stores.

Validation:

- [ ] `rg "@app/stores|reportStore|databaseStore|versionStore|report-inputs" apps packages scripts`
- [ ] `npm run check`

## Phase 4: Remove DuckDB-WASM And Markdown BI Runtime

Delete after no browser report preview or SQL block execution path remains:

- [x] `src/core/database/`
- [x] `src/core/engine/`
- [x] `src/core/markdown/`
- [x] `src/core/pages/`
- [x] `src/core/version/`
- [x] `src/core/export/report-package-service.ts`
- [x] `src/core/export/interactive-runtime.ts`
- [x] `src/core/export/mvr-types.ts`
- [x] `src/core/export/share-service.ts`
- [x] `src/core/export/static-site-exporter.ts` if it only packages old reports.
- [x] `src/lib/export/` if PDF export only serves the old Web report UI.
- [x] `src/workers/chart-data.worker.ts`
- [x] `src/workers/use-chart-worker.ts`

Dependencies to revisit after deletion:

- [ ] Remove `@duckdb/duckdb-wasm` if no remaining import exists.
- [ ] Remove `apache-arrow` if only DuckDB-WASM used it.
- [ ] Remove `idb` if only OPFS/browser storage used it.
- [ ] Remove `diff-match-patch` and `@types/diff-match-patch` if only version compare used them.
- [ ] Remove `html2pdf.js` if browser PDF export is removed.
- [ ] Remove `unified`, `remark-parse`, `remark-rehype`, `rehype-stringify`, and `unist-util-visit` if Markdown BI parsing is removed and no article pipeline uses them.

Validation:

- [ ] `rg "DuckDB|duckdb|OPFS|sql-executor|report-execution|Markdown" src package.json`
- [ ] `npm run check`
- [ ] `npm run test:run`

## Phase 5: Reduce Plugin Surface To Static Artifact Needs

Current browser plugin registration still imports inputs, maps, layout, UI components, and all data-display plugins. Keep only components that serve CLI/static artifact generation.

Remove or isolate:

- [x] `src/plugins/inputs/`
- [x] `src/plugins/layout/grid/` if it remains dashboard-grid oriented.
- [x] `src/plugins/maps/` unless map artifacts are explicitly in the CLI catalog.
- [x] `src/plugins/ui/` components that only support Markdown BI blocks.
- [x] `src/plugins/index.ts` all-plugin registration path for the browser landing page.
- [x] `src/bootstrap/init-plugins.ts` if no browser runtime needs component registry bootstrapping.

Keep or migrate:

- [ ] Keep core chart assets needed by `miao-viz catalog` and `miao-viz render`.
- [ ] Keep `src/plugins/data-display/infographic/` if it remains the static infographic renderer.
- [ ] Keep chart metadata/schema only when it is exposed through the CLI catalog or static renderer.
- [ ] Prefer keeping CLI-needed rendering logic in `packages/miao-viz-cli/src/` or a future `packages/shared/` module so it does not depend on the web app.

High-priority chart keep candidates:

- `bigvalue`
- `bar-chart`
- `line-chart`
- `area-chart`
- `pie-chart`
- `scatter-chart`
- `histogram`
- `heatmap`
- `datatable`
- `treemap`
- `funnel`
- `waterfall`
- `sankey`
- `radar`
- `calendar-heatmap`
- `infographic`

## Phase 6: Simplify Bootstrap, Registry, Catalog

- [x] Split browser landing startup from CLI/static artifact runtime.
- [x] Remove component registry code that only exists for old Markdown block mounting.
- [ ] Keep `src/core/catalog/` only if `miao-viz catalog` uses it or will use it soon.
- [ ] Delete `src/core/registry/` if Svelte component mounting is no longer part of product runtime.
- [ ] Keep `src/core/viz/` only if it powers CLI validation/rendering or infographic spec generation.
- [ ] Remove dependency injection adapters that wrap old app stores.

Candidate files:

- [x] `src/bootstrap/init-services.ts`
- [x] `src/bootstrap/init-plugins.ts`
- [x] `src/bootstrap/init-catalog.ts`
- [x] `src/bootstrap/init-runtime.ts`
- [x] `src/core/services/`
- [x] `src/core/shared/di/`
- [x] `src/core/registry/`

## Phase 7: Remove Old Tests, Fixtures, And Docs

Remove or rewrite tests that validate retired BI behavior:

- [ ] Report rendering tests under the retired web report runtime.
- [ ] Markdown loop/conditional/sql executor tests if Markdown BI runtime is removed.
- [ ] DuckDB/database tests once database runtime is removed.
- [ ] Dashboard tree validation tests in `src/core/catalog/` if the catalog no longer models dashboard UI trees.
- [ ] E2E tests that open static report pages through old Web preview.
- [x] `test-opfs.html`.
- [ ] Dashboard-heavy Markdown demos in `test_data/` that no longer support CLI examples.

Docs cleanup:

- [ ] Update `AGENTS.md` after cleanup so it no longer describes SQL Workspace as production.
- [ ] Update `README.md` to focus on CLI/skill install and artifact examples.
- [ ] Update `docs/getting-started/` to remove old Web preview and DuckDB-WASM troubleshooting unless still relevant.
- [ ] Archive old BI architecture docs rather than leaving them as current guidance.

## Phase 8: Package And Build Cleanup

- [x] Ensure `npm run build` builds only the landing page, not old BI app chunks.
- [x] Ensure `npm run build:cli` remains the primary product build check.
- [ ] Keep `scripts/miao-viz.mjs` as the local dev runner for CLI.
- [ ] Keep `scripts/pack-miao-vision-skill.mjs`.
- [ ] Remove `scripts/create-plugin.ts` if plugin scaffolding is no longer part of the product.
- [ ] Re-check package dependencies after code removal with `rg "from 'package-name'|from \"package-name\""`.
- [ ] Re-run `npm run check:size` after file deletion and any file consolidation.

## Suggested Execution Order

1. Make `App.svelte` landing-only.
2. Make `main.ts` and bootstrap landing-safe.
3. Run type check and delete now-unreachable UI directories.
4. Remove app stores and old report execution runtime.
5. Trim plugin registration and dependencies.
6. Update docs and tests.
7. Run full verification.

## Verification Checklist

- [ ] `npm run check`
- [ ] `npm run test:run`
- [ ] `npm run build`
- [ ] `npm run build:cli`
- [ ] `npm run miao-viz -- profile packages/miao-viz-cli/examples/sales.csv`
- [ ] `npm run miao-viz -- catalog`
- [ ] `npm run miao-viz -- validate --profile <profile.json> --spec packages/miao-viz-cli/examples/sales-dashboard.yaml`
- [ ] `npm run miao-viz -- render --input packages/miao-viz-cli/examples/sales.csv --spec packages/miao-viz-cli/examples/sales-dashboard.yaml --output /tmp/miao-vision-smoke.html`
- [ ] `npm run pack:skill`

## Current Status

- Browser app is now landing-only.
- `npm run check` passes with `0 errors, 0 warnings`.
- `npm run build` passes.
- `npm run build:cli` passes.
- Large legacy Web BI/report/dashboard/runtime codepaths have been removed from `src/`.

## Open Decisions

- [ ] Should `ArticleToInfographicDemo` be removed now, or retained temporarily until `miao-viz article` exists?
- [ ] Should Svelte chart components ever return, or should CLI rendering stay fully headless in `packages/miao-viz-cli/src/`?
- [ ] Should map components be in the initial CLI catalog, or removed until there is a concrete map artifact use case?
- [ ] Should browser PDF export be kept, or should PDF/PNG be generated later through a Playwright-based CLI renderer?
- [ ] Should old Markdown report syntax be fully retired, or kept only as an import format that converts into VizSpec?
