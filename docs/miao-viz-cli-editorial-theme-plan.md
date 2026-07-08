# Miao Viz CLI Editorial Theme Plan

## Background

The current `miao-viz` static HTML output is functional but visually plain. It uses a typical SaaS-style blue/white palette, simple cards, and direct SVG rendering. After reviewing `../Kami/styles.css`, the main design opportunity is not copying individual styles, but adopting a more systematic editorial report design language:

- warm paper-like background
- ivory chart surfaces
- deep navy brand accent
- serif-led title and KPI hierarchy
- thin borders over heavy shadows
- restrained, lower-saturation chart palette
- chart labels and captions that explain encoding/aggregation

This plan defines implementation tasks for an `editorial` report theme. It is intentionally scoped to visual presentation and static HTML/SVG output. It should not change data loading, profiling, validation, or transforms.

## Design Direction

### Theme Name

```text
editorial
```

### Visual Principles

- Use design tokens instead of hard-coded scattered colors.
- Prefer report/editorial feeling over dashboard SaaS styling.
- Keep chart readability first: axis labels and data labels must stay legible.
- Use subtle surfaces: warm background, ivory chart cards, thin borders.
- Use muted categorical colors instead of high-saturation defaults.
- Add chart metadata/captions to explain what each chart shows.
- Keep generated HTML self-contained and viewable through `file://`.

### Inspired by Kami, but Not Copied Blindly

Borrow:

- `:root` design tokens
- warm parchment/ivory surfaces
- serif title hierarchy
- mono metadata
- thin borders and whisper shadows
- chart label/caption pattern
- responsive single-column fallback

Avoid:

- oversized 100px hero headings
- custom font file dependencies by default
- complex menus or hover-only UI
- decorative interactions that do not help reports

## Task Breakdown

### TASK-001: Add Theme Option to Agent Report Spec

Goal: allow report specs to request a visual theme without changing chart semantics.

Proposed spec extension:

```yaml
title: Sales Dashboard
theme: editorial
charts:
  - type: line
    title: Monthly Sales Trend
    encoding:
      x:
        field: order_month
      y:
        field: total_sales
```

Implementation notes:

- Add optional `theme` to `AgentReportSpec` in `src/agent/types.ts`.
- Add `theme` field to `reportSpecSchema` in `src/agent/spec-schema.ts` — **both files must be updated together**. If only `types.ts` is changed, zod strips the unknown key silently and the field is lost after parse without any error.
- Supported values for v1:
  - `default`
  - `editorial`
- If omitted, keep current output unchanged or map to `default`.

Acceptance:

- Existing specs without `theme` still render.
- `theme: editorial` validates and survives `singleOrReportSpecSchema.safeParse()`.
- Unknown theme returns structured validation error or falls back to `default` by explicit decision.

Recommended default: fall back to `default` for unknown theme in v1 to avoid blocking report generation.

### TASK-002: Extract HTML Theme Styles

Goal: separate report CSS generation from `html-export.ts` and update `renderStaticHtml` to accept a theme.

Proposed structure:

```text
src/agent/themes/
├── types.ts
├── default-theme.ts
└── editorial-theme.ts
```

Responsibilities:

- `default-theme.ts`: current visual output, moved out of `html-export.ts`.
- `editorial-theme.ts`: new Kami-inspired editorial CSS.
- `types.ts`: theme name and style builder types.

`renderStaticHtml` signature change:

```ts
// before
renderStaticHtml(spec: AgentReportSpec, profile: DataProfile, rows: Record<string, unknown>[]): string

// after
renderStaticHtml(spec: AgentReportSpec, profile: DataProfile, rows: Record<string, unknown>[], theme?: ThemeName): string
```

The explicit `theme` parameter (from the CLI `--theme` flag) takes precedence over `spec.theme`. This allows `runRender` in `cli.ts` to pass the CLI flag value directly without mutating the already-normalized spec.

Acceptance:

- HTML output remains unchanged for default theme.
- `html-export.ts` chooses CSS by resolved theme (CLI flag > spec field > `default`).
- No file exceeds 500 lines.

### TASK-003: Define Editorial Design Tokens

Goal: centralize visual identity for the new theme.

Suggested tokens:

```css
:root {
  --mv-paper: #f5f4ed;
  --mv-surface: #faf9f5;
  --mv-border: #e5e3d8;
  --mv-ink: #141413;
  --mv-muted: #6b6a64;
  --mv-soft-text: #504e49;
  --mv-brand: #1b365d;
  --mv-brand-light: #2d5a8a;
  --mv-mono: "SF Mono", "JetBrains Mono", Consolas, monospace;
  --mv-serif: Charter, Georgia, "Times New Roman", serif;
  --mv-sans: Inter, ui-sans-serif, system-ui, sans-serif;
}
```

Acceptance:

- No external font file dependency.
- Works offline.
- Supports English and CJK reasonably through system fallback fonts.

### TASK-004: Redesign Report Header

Goal: make generated HTML look like a polished report, not a plain tool dump.

Target structure:

```html
<header class="report-hero">
  <div class="report-eyebrow">
    <span>Miao Vision Report</span>
    <span>Generated 2026-06-22</span>
  </div>
  <h1>Sales Dashboard</h1>
  <p class="report-description">...</p>
  <div class="report-tokens">
    <span><b>Rows</b> 4</span>
    <span><b>Columns</b> 5</span>
    <span><b>Source</b> sales.csv</span>
  </div>
</header>
```

Acceptance:

- Header includes title, optional description, source file, row count, column count, generation timestamp.
- Long file paths do not overflow on mobile.
- Metadata uses tabular/mono style for scannability.

### TASK-005: Add Chart Card Labels and Captions

Goal: give each chart more context and polish.

Target structure:

```html
<section class="chart-card">
  <div class="chart-label">LINE CHART</div>
  <h2>Monthly Sales Trend</h2>
  <svg>...</svg>
  <p class="chart-caption">x: order_month · y: total_sales · aggregated by order_month</p>
</section>
```

Caption generation:

- Include chart type.
- Include primary encodings.
- If transforms exist, summarize them compactly.

Acceptance:

- Every chart has a label.
- Every chart has a caption.
- Captions stay concise and do not expose raw JSON.

### TASK-006: Add Editorial Chart Palette

Goal: replace highly saturated chart colors with muted report colors for editorial theme.

Suggested palette:

```text
#1b365d deep navy
#8a5a44 muted clay
#4f6f52 sage
#a37f2c ochre
#6b5b95 muted violet
#2f6f73 deep teal
```

Implementation notes:

- Keep existing palette for default theme.
- CSS variables (`var(--mv-brand)`) apply to HTML elements only. SVG attributes (`fill="..."`, `stroke="..."`) are hardcoded strings and **cannot use CSS variables**. The palette must be passed as explicit color strings into `renderChartSvg`.
- Update `renderChartSvg` signature to accept an optional palette:

```ts
// before
renderChartSvg(chart: AgentChartSpec, rows: Record<string, unknown>[]): string

// after
renderChartSvg(chart: AgentChartSpec, rows: Record<string, unknown>[], palette?: string[]): string
```

- `html-export.ts` selects the palette array based on resolved theme and passes it to `renderChartSvg`.
- The SVG background fill (`fill="#ffffff"` in `svgFrame`) should also be parameterised for editorial ivory (`#faf9f5`).
- Use the brand color (`#1b365d`) for line charts.
- Use muted categorical palette for bars.

Acceptance:

- `editorial` bar and line charts use the editorial palette.
- Default theme colors remain unchanged.
- Colors have sufficient contrast on ivory background.

### TASK-007: Improve SVG Axis and Plot Styling

Goal: make static SVG charts feel designed.

Changes:

- Use softer axis color.
- Add horizontal grid lines for y-axis where useful.
- Reduce axis dominance.
- Use serif/sans font consistent with selected theme.
- Add more breathing room around plot area.
- Use `stroke-linecap="round"` and `stroke-linejoin="round"` for line charts.
- Consider subtle area fill for `area` charts.

Note on scope: the current `axis()` function only draws two axis lines with no y-axis tick values. Adding horizontal grid lines requires also generating numeric y-axis ticks (evenly spaced values between min and max). This is roughly 2–3× the current axis implementation. Budget accordingly.

Unsupported chart types (`pie`, `scatter`, `histogram`, `heatmap`) currently render as an orange "not implemented" box. This task does not change that — the editorial theme applies only to implemented chart types (`bar`, `line`, `area`, `table`, `bigvalue`).

Acceptance:

- Bar and line charts remain readable.
- Labels do not overlap for sample data.
- SVG remains self-contained.

### TASK-008: Redesign KPI / BigValue

Goal: make KPI cards feel like editorial metrics.

Target direction:

- Remove strong blue card fill.
- Use ivory surface and thin border.
- Use large serif number in brand color.
- Use mono/small uppercase label.
- Use `font-variant-numeric: tabular-nums`.

Acceptance:

- KPI visually aligns with report theme.
- Long values do not overflow.
- Default theme KPI remains unchanged.

### TASK-009: Redesign Tables for Editorial Theme

Goal: make table output match report styling.

Changes:

- Thin row separators.
- Uppercase small table headers.
- Tabular numeric values.
- No heavy background fills.
- Horizontal overflow handling for narrow screens.

Acceptance:

- Tables are readable on desktop and mobile.
- Long cell values wrap or scroll without breaking layout.

### TASK-010: Add Responsive Rules

Goal: preserve polish on mobile.

Rules:

- Report padding reduces on small screens.
- Chart cards become single-column full width.
- Header tokens wrap.
- Long file paths wrap.
- SVG width remains responsive.

Acceptance:

- Generated report works at 390px width.
- No text overflows horizontally.
- Chart sections remain readable.

### TASK-011: Add CLI Theme Flag

Goal: allow users and agents to request the theme without editing spec.

Proposed CLI:

```bash
miao-viz render \
  --input sales.csv \
  --spec report.yaml \
  --theme editorial \
  --output report.html
```

Precedence:

1. CLI `--theme` overrides spec `theme`.
2. Spec `theme` applies if CLI flag is absent.
3. Default theme applies if neither is provided.

Implementation notes:

- `runRender` in `cli.ts` reads `--theme` via `stringFlag(args, 'theme')` and passes it as the fourth argument to `renderStaticHtml` (see TASK-002 for the updated signature).
- Do not mutate the already-normalized `AgentReportSpec` to apply the CLI override — pass the theme as a separate parameter so the embedded `miao-viz-spec` JSON in the HTML always reflects what was in the spec file, not the CLI override.

Acceptance:

- `--theme editorial` works.
- Existing render commands still work.
- Invalid CLI theme falls back to default or returns structured error. Recommended: return `UNSUPPORTED_THEME` for CLI flag typos.

### TASK-012: Update Skill References

Goal: teach agents to request polished reports.

Updates:

- Add theme guidance to `skills/miao-vision/references/vizspec.md`.
- Add examples using `theme: editorial`.
- Update `skills/miao-vision/SKILL.md` Workflow section to mention `theme: editorial` as the recommended default for user-facing HTML reports — agents read `SKILL.md` as the entry point and will miss the option if only `vizspec.md` is updated.

Recommended agent behavior:

- Use `theme: editorial` by default for user-facing HTML reports.
- Use `default` only when user asks for plain/minimal output.

Acceptance:

- Skill examples show `theme: editorial`.
- Generated specs remain valid.

### TASK-013: Add Snapshot and Smoke Tests

Goal: prevent regressions in generated HTML structure.

Tests:

- Default theme still contains current class names.
- Editorial theme contains:
  - `--mv-paper`
  - `report-hero`
  - `chart-label`
  - `chart-caption`
  - `miao-viz-spec`
  - `<svg`
- CLI render with `--theme editorial` creates HTML.

Acceptance:

- `npm run test:run -- src/agent/agent.test.ts` passes.
- CLI package smoke render passes.

### TASK-014: Add Visual QA Checklist

Goal: manually review report output before release.

Checklist:

- Open generated HTML through `file://`.
- Verify desktop width around 1280px.
- Verify mobile width around 390px.
- Verify dark text contrast.
- Verify chart cards have consistent spacing.
- Verify labels do not collide on sample data.
- Verify generated spec/profile still embedded.

Acceptance:

- Checklist is appended to `docs/miao-viz-cli-editorial-theme-plan.md` under a `## Visual QA Log` section, with date and reviewer noted for each completed check.

## Suggested Implementation Order

Batch 1 — Contracts (do together; all three touch type/schema/call-site as a unit):

- TASK-001: Add `theme` to `AgentReportSpec` + `reportSpecSchema`.
- TASK-002: Extract theme CSS, update `renderStaticHtml` and `renderChartSvg` signatures.
- TASK-011: Wire `--theme` CLI flag through `runRender` using the new signatures.

Batch 2 — Visual content:

- TASK-003: Define editorial design tokens.
- TASK-004: Redesign report header.
- TASK-005: Add chart card labels and captions.
- TASK-006: Add editorial chart palette (SVG color strings via parameter).

Batch 3 — Polish:

- TASK-007: Improve SVG axis and plot styling (note: y-axis ticks add scope).
- TASK-008: Redesign KPI / BigValue.
- TASK-009: Redesign tables.
- TASK-010: Add responsive rules.

Batch 4 — Validation and docs:

- TASK-012: Update skill references (`vizspec.md` + `SKILL.md`).
- TASK-013: Add snapshot and smoke tests.
- TASK-014: Add visual QA checklist to this document.

## Non-Goals

- No D3 or external charting library.
- No remote font loading.
- No PNG/PDF changes.
- No headless browser requirement.
- No change to data transforms or validation semantics except optional theme validation.

## Validation Commands

```bash
npm run test:run -- src/agent/agent.test.ts
npm run build:cli
node packages/miao-viz-cli/dist/cli.cjs render \
  --input packages/miao-viz-cli/examples/sales.csv \
  --spec packages/miao-viz-cli/examples/sales-dashboard.yaml \
  --theme editorial \
  --output /tmp/miao-viz-editorial-report.html
```

Manual check:

```bash
open /tmp/miao-viz-editorial-report.html
```

If GUI open is unavailable, inspect:

```bash
rg 'report-hero|chart-label|chart-caption|--mv-paper|<svg|miao-viz-spec' /tmp/miao-viz-editorial-report.html
```

