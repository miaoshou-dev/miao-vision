# Feature Roadmap

> Last updated: 2026-06-23  
> Product focus: `miao-viz-cli` plus agent workflows for Data Display, Article-to-Infographic, and Presentation Deck.

## Current Product Tracks

### 1. Data Display

Local data files become polished data display artifacts:

```text
CSV / TSV / XLSX / JSON
  -> miao-viz data profile
  -> AI writes VizSpec
  -> miao-viz spec validate
  -> miao-viz render report
  -> KPI / chart / table / annotation / insight HTML artifact
```

### 2. Article-to-Infographic

Article URLs, Markdown files, or long-form text become static infographic artifacts:

```text
article URL / markdown
  -> agent reads and normalizes content
  -> miao-viz render article
  -> infographic HTML / future PNG / future PDF
```

### 3. Presentation Deck

Local data files become browser-presentable slide decks:

```text
CSV / TSV / XLSX / JSON
  -> miao-viz data profile
  -> AI writes DeckSpec
  -> miao-viz render deck
  -> browser slide deck / print-to-PDF
```

## v0.3 - CLI And Agent Quality

Priority: High

### Data Display

- [ ] Define first-class VizSpec sections: KPI, chart, table, annotation, insight.
- [ ] Complete static SVG/HTML rendering for declared chart types.
- [ ] Add field requirements, use cases, and YAML examples for each catalog chart.
- [ ] Add a static interaction baseline: tooltip, legend toggle, table sort/search, lightweight filters.

### CLI Workflow

- [ ] Add human-readable `miao-viz data profile` summary output.
- [ ] Improve validation errors with repair hints.
- [ ] Add golden examples for sales, marketing, product, finance, and operations.
- [ ] Keep generated specs short and token-efficient for agents.

### Agent Skill

- [ ] Keep Data Display, Article-to-Infographic, and Presentation Deck decision rules in sync.
- [ ] Add prompt examples for each product track.
- [ ] Add smoke examples that run through the actual CLI commands.

## v0.4 - Visual Quality

Priority: High

### Themes

- [ ] Strengthen the editorial theme.
- [ ] Add fashion visual presets.
- [ ] Polish dark and minimal themes.
- [ ] Add consistent chart captions, footnotes, and source labels.

### Visual Vocabulary

- [ ] Add annotation and callout layers.
- [ ] Add richer information blocks for insight summaries.
- [ ] Prioritize high-value static charts: heatmap, treemap, funnel, waterfall, sankey, radar, calendar heatmap.
- [ ] Build chart examples that agents can copy directly.

## v0.5 - Article-to-Infographic

Priority: High

Detailed plan: [Article-to-Infographic Implementation Plan](../article-to-infographic-implementation-plan.md)

- [x] Implement or finalize `miao-viz render article`.
- [x] Keep URL fetching in the agent/skill layer; CLI accepts local Markdown/text.
- [x] Add a deterministic local article parser and dedicated `InfographicSpec`.
- [x] Output HTML first, with JSON and Markdown debug/fallback formats.
- [ ] Add examples for analytical and storytelling styles after those styles are implemented.

## v0.6 - Presentation Deck

Priority: Medium

- [x] Harden DeckSpec schema and structured errors.
- [x] Add more deck examples beyond sales: product metrics, finance review, ops update.
- [x] Improve browser presentation ergonomics: keyboard navigation, fullscreen, print layout.
- [ ] Keep PPTX native export as later work until deck HTML is stable.

## v0.7 - Export And Preview

Priority: Medium

### Export

- [ ] Single-file HTML as the default artifact.
- [ ] Chart-level SVG export.
- [ ] PNG export for shareable images.
- [ ] PDF export for reports and decks.

### Web Surface

- [ ] Keep Web UI as preview/gallery/debug only.
- [ ] Add VizSpec and DeckSpec preview.
- [ ] Add theme gallery and chart catalog gallery.
- [ ] Do not restore SQL Workspace, dashboard builder, or multi-source connector management.

## Non-Goals

These are not part of the current roadmap:

- Full SQL Workspace.
- Database connectors as a primary product path.
- Dashboard builder.
- Global CrossFilter / Drilldown runtime.
- Multi-page Markdown BI workspace.
- Streaming dashboards and experimental demos.
