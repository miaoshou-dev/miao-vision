# Miao Vision Architecture Overview

> Updated: 2026-06-23
> Product direction: AI-first static visualization reports around `miao-viz-cli`.

## Product Shape

Miao Vision is being refactored from a browser SQL workspace into a local-first visualization generation system.

Primary path:

```text
data file -> profile/catalog -> VizSpec -> validate -> render/export
```

The Web app remains useful for preview, gallery, report editing, and debugging. It is no longer the main SQL analysis workspace.

## Runtime Layers

```text
Layer 4: Entry
  - src/main.ts
  - src/App.svelte
  - scripts/miao-viz.mjs

Layer 3: Bootstrap
  - src/bootstrap/index.ts
  - src/bootstrap/init-runtime.ts
  - src/bootstrap/init-services.ts
  - src/bootstrap/init-plugins.ts

Layer 2: Product Surfaces
  - src/agent/                 CLI/profile/render pipeline
  - src/components/            Web preview and report UI
  - src/plugins/data-display/  Pure Svelte/SVG charts
  - src/plugins/ui/            Lightweight report UI blocks

Layer 1: Core
  - src/core/catalog/          Viz catalog and chart metadata
  - src/core/viz/              VizSpec types/providers
  - src/core/registry/         Component registry
  - src/core/markdown/         Markdown parsing/execution
  - src/core/database/         Local preview SQL support

Layer 0: Types
  - src/types/
```

## Dependency Rules

| From | Can Depend On | Avoid |
| --- | --- | --- |
| `plugins/` | `core`, `types` | `app`, `components`, other plugins |
| `core/` | `types` and narrowly scoped core modules | `app`, `components`, `plugins` |
| `agent/` | `core`, `types`, local Node utilities | browser-only app state |
| `components/` | `core`, `app`, `plugins`, `types` | product logic that belongs in `agent/` or `core/` |
| `types/` | no runtime modules | all implementation layers |

## Visualization Runtime

The active visualization stack is:

- VizSpec as the AI-friendly contract.
- Catalog metadata for chart discovery and prompt grounding.
- Pure Svelte/SVG data-display plugins for browser preview.
- Agent renderers for static export paths.

Removed runtime paths:

- SQL Workspace UI.
- Monaco SQL editor.
- SQL snippets/query tabs/query history.
- Remote connector system.
- Streaming/HybridGNode demos.
- Mosaic/vgplot chart compatibility runtime.
- Global drilldown/modal runtime and Tabs/Modal UI plugins.

## Bootstrap Flow

```ts
initializeApp()
  -> initializeMiaoRuntime()
     -> registerServices()
     -> registerPlugins()
     -> initialize catalog and Viz catalog
```

CLI/headless code should reuse runtime/catalog concepts without depending on `App.svelte` or browser-only stores.

## Current Priorities

1. Strengthen `miao-viz-cli` profile, validate, render, and export workflows.
2. Expand static but high-end visual templates: charts, infographics, annotations, insights, and themes.
3. Keep Web UI focused on preview/gallery/debug.
4. Preserve only lightweight report interactions that survive static sharing, such as tooltip, legend toggles, table sorting, search, and simple filter state.
5. Continue retiring Workspace-era docs/tests/code paths when they do not serve VizSpec or static report generation.
