# E2E Tests

End-to-end tests now follow the `miao-viz` product path:

```text
local data file -> profile -> VizSpec -> render/export -> static artifact checks
```

The E2E suite intentionally does not exercise the retired SQL Workspace, HybridGNode demos, Monaco editor, or dashboard-style chart builders.

## Structure

```text
tests/
├── e2e/
│   └── miao-viz-static-report.spec.ts
├── helpers/
│   └── test-utils.ts
└── README.md
```

## Run

```bash
npm run test:e2e
```

UI/debug modes still work:

```bash
npm run test:e2e:ui
npm run test:e2e:debug
```

## Current Coverage

`miao-viz-static-report.spec.ts` verifies:

- `miao-viz data profile` returns AI-readable profile metadata, column roles, quality, and chart hints.
- `miao-viz render report` writes a static HTML report from a local CSV and VizSpec YAML.
- The generated HTML artifact includes embedded VizSpec, report title, chart headings, and SVG output.
- When system Chrome can launch headless, Playwright also opens the generated HTML artifact directly and checks the rendered DOM.

## Writing New E2E Tests

Prefer testing static artifacts over Web app implementation details.

Good E2E targets:

- CLI profile schema and useful hints.
- CLI validate errors for broken VizSpec.
- CLI render output for HTML/SVG.
- Generated HTML opened in a browser and checked for expected charts, labels, and export-safe markup.
- Future Web preview/gallery/debug screens that load an existing VizSpec.

Avoid reintroducing E2E tests for:

- Full SQL Workspace flows.
- Manual SQL editor interaction.
- Query tabs, snippets, or query history.
- Heavy real-time dashboard demos.
