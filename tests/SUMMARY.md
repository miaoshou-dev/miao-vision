# Testing Infrastructure Summary

**Date**: 2026-06-23
**Status**: E2E refocused on CLI/VizSpec/static report artifacts

## Completed

- Playwright configured for artifact-level E2E tests.
- Retired SQL Workspace, BubbleChart workflow, and HybridGNode E2E specs removed.
- Added `miao-viz-static-report.spec.ts`.
- E2E no longer requires starting the Web preview dev server.

## E2E Scope

```text
miao-viz profile -> miao-viz render -> generated HTML -> artifact verification
```

Current checks:

- Profile output includes rows, column roles, quality, and chart hints.
- Render output writes an HTML artifact from local data and VizSpec.
- Artifact checks verify embedded VizSpec, headings, and SVG charts.
- Browser DOM verification runs when system Chrome can launch headless; it is skipped in local environments where Chrome headless aborts.

## Quick Commands

```bash
npm run test
npm run test:e2e
npm run test:e2e:ui
npm run test:coverage
```

## Next Testing Priorities

- Add E2E coverage for invalid VizSpec diagnostics.
- Add SVG-only export E2E for single-chart specs.
- Add Web preview/gallery E2E only after those screens load VizSpec directly.
- Keep unit coverage focused on agent profile, spec validation, static render, and chart data transforms.
