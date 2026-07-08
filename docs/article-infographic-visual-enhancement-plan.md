# Article Infographic Visual Enhancement Plan

> 关联文档：`docs/infographic-optimization-with-antv-and-data-report.md`
> 本方案定方向和组件集，关联文档定执行细节（文件拆分、schema 强化、验收标准）

## Purpose

`miao-viz article` already produces deterministic article infographic artifacts, but the current output is closer to an article summary layout than a true infographic. The main gap is not visual polish alone. The product lacks reusable graphic components that encode article meaning through proportion, position, flow, grouping, contrast, and structure.

This plan combines two workstreams:

- Improve the Article Infographic feature so visual density becomes a product requirement.
- Fill the missing infographic graphic component set while reusing the Data Report visual language.

The goal is for article infographics and data reports to feel like one Miao Vision product family while keeping their generation models separate.

## Current Baseline

Article infographic source files:

- `packages/miao-viz-cli/src/article-infographic.ts`
- `packages/miao-viz-cli/src/article-html.ts`
- `skills/miao-vision/references/article-infographic.md`

Data report visual source files:

- `packages/miao-viz-cli/src/html-export.ts`
- `packages/miao-viz-cli/src/svg-renderer.ts`
- `packages/miao-viz-cli/src/themes/`

Current article section types include:

```text
hero
facts
timeline
comparison
quote
takeaways
process
pros-cons
stat-grid
risk-matrix
checklist
```

Most of these are text layout components rather than infographic graphic components.

Examples:

- `facts` renders large-number cards, not proportional metric graphics.
- `timeline` renders a list, not a path or staged visual.
- `comparison` renders text cards, not a contrast diagram or matrix.
- `process` renders steps, not nodes and connectors.
- `stat-grid` renders KPI cards, not data-encoded visuals.
- `risk-matrix` is the closest to a graphic component, but it is still card-grid oriented.

## Product Gap

A useful infographic should contain graphic components, not just styled text sections.

For standard article infographics, the expected visual density is:

```text
short infographic:       3-5 graphic components
standard long graphic:   5-8 graphic components
complex explainer:       8-12 graphic components
```

The current `miao-viz article` baseline is effectively:

```text
true infographic graphic components: 0
text/layout components:              about 10
core missing graphic components:     at least 8
```

This creates three user-visible problems:

- Numeric claims are shown as typography, not scale or proportion.
- Processes and timelines require reading every row instead of following a visual path.
- Comparisons are text-heavy and do not reveal structure at a glance.

## Design Direction

Article infographic should reuse the Data Report visual system:

- theme names: `default`, `editorial`, `dark`, `minimal`
- SVG theme tokens: `palette`, `background`, `axisColor`, `labelColor`
- card shell patterns: `chart-card`, label, heading, caption
- KPI hierarchy: big numeric values, tabular numerals, compact labels
- visual language: restrained palette, thin borders, low-radius cards, readable static SVG

Article infographic should not reuse the data report chart model directly. Data reports are field-encoding driven. Article infographics are narrative and claim driven.

The shared layer should be visual primitives and theme tokens, not report-specific chart semantics.

```text
Data report:
  dataset fields -> AgentChartSpec -> bar/line/pie/table/bigvalue

Article infographic:
  article claims -> InfographicSpec -> metric/process/contrast/part-whole visuals

Shared:
  themes, SVG primitives, card shell, palette, caption style
```

## Target Capability

The default article infographic output should evolve from:

```text
hero + text cards + list timeline + text comparison + quote + takeaways
```

to:

```text
hero
+ KPI strip
+ metric bars
+ process flow
+ concept contrast
+ timeline path
+ part-to-whole or before-after visual
+ concise takeaways
```

Every generated article infographic should aim for:

```text
visual component count >= 4
real SVG visual count >= 2
text-only sections <= 40% of page area
numeric articles include metric-bars or part-to-whole
sequence/process articles include timeline-path or process-flow
comparison articles include concept-contrast
```

## Spec Model

Keep old specs compatible by adding an optional `visual` field to `InfographicSection`.

The existing `notes` field changes from `string` to `string[]`. No current fixtures use `notes`, so this is a source-compatible change. Schema should accept both `string` and `string[]` during a transition window:

```ts
// Transition: accept both forms during P0
notes: z.union([z.string(), z.array(z.string())]).optional()
// After transition: final form
notes: z.array(z.string()).optional()
```

```ts
export type InfographicVisualType =
  | 'kpi-strip'
  | 'metric-bars'
  | 'process-flow'
  | 'concept-contrast'
  | 'timeline-path'
  | 'before-after'
  | 'tradeoff-matrix'
  | 'ranked-list-chart'
  // P1: part-to-whole (needs ratio calculation — see note)
  // P2: system-diagram (needs layout engine — see note)

export interface InfographicSection {
  type: InfographicSectionType
  title: string
  items: InfographicSectionItem[]
  emphasis?: string
  notes?: string[]
  visual?: InfographicVisual
}

export interface InfographicVisual {
  type: InfographicVisualType
  data: unknown
  caption?: string
}
```

Note on `part-to-whole`: this component requires ratio normalization (segmented bars or donut). It is the only P0 candidate that needs data computation at render time. Move to P1 unless `data` includes pre-computed percentages, with the renderer only drawing, not calculating.

Note on `system-diagram`: this component needs a layout engine (node positioning, edge routing, zone grouping). It has the highest implementation cost in the plan. Move to P2. For P1, approximate system relationships with a `process-flow` horizontal variant.

Renderer behavior:

- If `section.visual` exists, render the visual component first.
- If `section.items` also exist, render them as supporting annotations or compact bullets.
- If `section.visual` is absent, continue using the existing text section renderer.

Example:

```json
{
  "type": "facts",
  "title": "Recording size drops sharply",
  "visual": {
    "type": "metric-bars",
    "data": {
      "mode": "comparison",
      "items": [
        { "label": "Default wallclock", "value": 250, "unit": "MiB" },
        { "label": "Reservoir sampling", "value": 6, "unit": "MiB" }
      ]
    },
    "caption": "Reservoir sampling bounds recording size while preserving trace utility."
  },
  "items": []
}
```

## Component Roadmap

### P0: Core Visual Components

P0 should be enough to stop article infographics from looking like plain summaries.

`part-to-whole` and `system-diagram` are deferred to P1/P2 (see notes in Spec Model section).

#### `kpi-strip`

Purpose:

- Summarize key numbers in a compact band.
- Reuse the data report KPI style.

Best for:

- headline numbers
- counts
- percentages
- short deltas

Visual behavior:

- Render as a bordered KPI group.
- Use tabular numeric values.
- Support optional delta chips and units.
- Use `theme.svg.palette[0]` for primary accent and muted label text for supporting copy.

#### `metric-bars`

Purpose:

- Show numeric comparison through length and proportion.

Best for:

- A vs B
- before vs after
- reduced/increased values
- cost, size, latency, throughput, budget, memory, emissions

Visual behavior:

- Render horizontal bars by default.
- Use true proportional scale when units are compatible.
- Support normalized scale when values are conceptually comparable but not mathematically identical.
- Show labels, values, units, and optional delta.

#### `process-flow`

Purpose:

- Turn steps, mechanisms, and cause-effect chains into a node-link graphic.

Best for:

- investigation paths
- operating models
- causal chains
- technical mechanisms

Visual behavior:

- Render SVG nodes connected by arrows.
- Use compact node titles and short annotations.
- Fall back to vertical flow on narrow screens.
- Use report theme palette for node accents.

#### `concept-contrast`

Purpose:

- Replace text-only A/B comparison cards with structured contrast diagrams.

Best for:

- tool comparisons
- option comparisons
- conceptual distinctions
- "CPU profiler vs wallclock profiler" style contrasts

Visual behavior:

- Render two or more lanes.
- Use shared criteria rows when available.
- Use check/cross/limited markers or short chips.
- Keep text short and aligned to make differences scannable.

#### `timeline-path`

Purpose:

- Replace list timelines with visual paths.

Best for:

- events
- phases
- historical progression
- investigation sequences

Visual behavior:

- Render connected milestones.
- Use date/step label, concise title, and optional annotation.
- Use vertical layout on mobile.

### P1: Secondary Visual Components

#### `part-to-whole`

Purpose:

- Show composition, share, status breakdown, or allocation.

Best for:

- percentages
- sample distribution
- budget/source breakdown
- state composition

Visual behavior:

- Prefer segmented bars for readability.
- Support donut only for small category counts.
- Reuse report palette and legend style.
- Accept pre-computed percentages in `data`. Do not compute ratios in the renderer.
- For agent-authored specs, the agent should supply normalised values.

#### `before-after`

Purpose:

- Show state change clearly.

Best for:

- optimization results
- product changes
- policy changes
- resource scaling

Visual behavior:

- Render two state panels with a transition marker.
- Support one to three metrics per state.
- Highlight the main change with color and delta text.

#### `system-diagram` (P2)

Purpose:

- Explain components, inputs, outputs, and relationships.

Best for:

- architecture articles
- platform explanations
- technical systems
- data flow

Visual behavior:

- Render labeled boxes and directed links.
- Support grouped zones.
- Keep diagrams shallow and readable.

Implementation note: this component needs a layout engine (node positioning, edge routing, zone grouping) — highest implementation cost in this plan. Demoted to P2. For P1, approximate system relationships with `process-flow` extended to support horizontal layout.

#### `tradeoff-matrix`

Purpose:

- Generalize `risk-matrix` into a reusable 2x2 or quadrant diagram.

Best for:

- cost vs benefit
- impact vs effort
- risk vs likelihood
- simplicity vs power

Visual behavior:

- Render axis labels, quadrant labels, and positioned items.
- Reuse card-grid styling for fallback.

#### `ranked-list-chart`

Purpose:

- Provide an article-friendly ranking graphic.

Best for:

- top causes
- top recommendations
- ranked factors

Visual behavior:

- Reuse horizontal bar logic from data report style.
- Keep labels readable for long article-derived text.

### P2: Polish Components

#### `callout-diagram`

Purpose:

- Annotate an object, workflow, or source excerpt visually.

Best for:

- explaining a code path
- labeling parts of a product or architecture
- making a key mechanism more concrete

#### `icon-cluster`

Purpose:

- Visualize categories or roles when numeric scale is not available.

Best for:

- personas
- feature groups
- principles
- checklist categories

This component should use simple inline SVG symbols, not external icon dependencies.

## Rendering Architecture

Add dedicated infographic visual modules instead of expanding `article-html.ts` indefinitely.

Proposed structure (同步自 `docs/infographic-optimization-with-antv-and-data-report.md` P0 方案):

```text
packages/miao-viz-cli/src/
  article-html.ts
  article-infographic.ts
  infographic-planner.ts              # 从 article-infographic.ts 拆分
  shared-svg.ts                       # 共享 primitives（从 svg-renderer.ts + infographic-visual-primitives.ts 提取）
  infographic-visuals/
    index.ts                          # Record 派发表 + renderSectionVisual
    kpi-strip.ts
    metric-bars.ts
    process-flow.ts
    concept-contrast.ts
    timeline-path.ts
    part-to-whole.ts
    before-after.ts
    tradeoff-matrix.ts
    ranked-list-chart.ts
    system-diagram.ts
    callout-diagram.ts
    icon-cluster.ts
```

Responsibilities:

```text
article-html.ts
  Page structure, section dispatch, legacy fallback rendering.

infographic-visuals.ts
  renderInfographicVisual(visual, theme)
  One renderer per visual component type.

infographic-visual-primitives.ts
  Shared SVG helpers: frame, text, bars, arrows, nodes, legends, chips.

infographic-quality.ts
  Visual density scoring and warnings.
```

Where possible, extract shared helpers from `svg-renderer.ts`:

```text
escapeHtml
svgFrame
formatTick
theme-aware mark/text helpers
```

Do not copy large chunks of data report chart code into article infographic rendering. Extract small primitives where useful.

## Theme Integration

Article infographic visuals should resolve a theme using the existing report theme registry.

Rules:

- `spec.style` may continue to exist for article flavor.
- Rendering should map article styles to report themes where possible.
- The visual layer should use `ReportTheme.svg` as its source of truth for SVG colors.

Mapping (current `ARTICLE_STYLES` = `editorial`, `executive`, `minimal`):

```text
article style editorial -> report theme editorial
article style executive -> report theme minimal
article style minimal   -> report theme minimal
```

If future article styles `technical` or `social` are added to `ARTICLE_STYLES`, extend this mapping at that point.

CSS class naming should align with the existing product prefix:

The current codebase uses `.mv-*` (e.g. `.mv-infographic`, `.mv-facts`, `.mv-hero`). New visual components should continue the `.mv-visual-*` convention. Do not introduce a second `.miao-*` prefix — it creates two naming systems in the same file.

```text
.mv-visual-card
.mv-visual-label
.mv-visual-svg
.mv-visual-caption
.mv-visual-grid
```

Visual card rules:

- Use thin borders and low radius.
- Avoid decorative shadows as the primary style.
- Keep captions compact and explanatory.
- Prefer restrained palettes from the theme over one-off colors.
- Keep generated HTML self-contained and `file://` friendly.

## Generation Planner

The CLI auto-generation path should infer visual candidates from article text. The agent-authored quality path should write visual specs directly.

### Claim Tags

Extend article understanding around compact claims:

```text
number
delta
ratio
percentage
sequence
comparison
causal
component
risk
quote
takeaway
```

### Mapping Rules

```text
number or headline stat       -> kpi-strip
two or more comparable values -> metric-bars
percentage/share/composition  -> part-to-whole
step/stage/then/finally       -> timeline-path or process-flow
A vs B/compared/unlike        -> concept-contrast
before/after/reduced/grew     -> before-after or metric-bars
component/input/output        -> system-diagram
risk/impact/effort/cost       -> tradeoff-matrix
rank/top/most/least           -> ranked-list-chart
```

### CLI Surface For Warnings

Quality warnings should surface through the existing CLI JSON output. Add a `warnings` array to `value`, consistent with the data report `validate`/`verify` result style:

```ts
{
  ok: true,
  value: {
    output: "/tmp/...",
    format: "html",
    sections: ["hero", "facts", "..."],
    warnings: [
      { code: "low_visual_density", message: "..." },
      { code: "numeric_claims_not_visualized", message: "..." }
    ]
  }
}
```

This is additive and does not change existing `value` structure. The `--strict-visuals` flag (future) could elevate warnings to errors.

### Quality Mode Agent Guidance

The agent should not write a final `InfographicSpec` directly from full article text. Preferred flow:

```text
article
  -> compact claims
  -> visual candidate outline
  -> InfographicSpec with visual components
  -> miao-viz article --spec-input
```

The visual candidate outline should explicitly name:

- primary visual
- quantitative visual
- comparison visual, if applicable
- any text-only sections that remain

## Quality Gates

Add visual density checks for generated specs and rendered HTML.

Proposed result:

```ts
export interface InfographicQualityReport {
  visualComponentCount: number
  svgVisualCount: number
  textOnlySectionCount: number
  quantifiedVisualCount: number
  averageWordsPerSection: number
  warnings: InfographicWarning[]
}

export interface InfographicWarning {
  code:
    | 'low_visual_density'
    | 'numeric_claims_not_visualized'
    | 'timeline_rendered_as_text'
    | 'comparison_rendered_as_text'
    | 'text_heavy_infographic'
  message: string
}
```

Recommended thresholds:

```text
visualComponentCount >= 4
svgVisualCount >= 2
textOnlySectionCount <= 3
averageWordsPerSection <= 90
if numeric claims >= 2 then quantifiedVisualCount >= 1
```

CLI behavior:

- Default: emit warnings but still render.
- Future strict mode: fail validation when visual density is too low.

Possible future flags:

```bash
--visual-density text|standard|high
--strict-visuals
```

Definitions:

- `text`: current summary-oriented behavior.
- `standard`: at least four visual components when content supports it.
- `high`: aggressively convert text sections to graphic components.

## CLI And Compatibility

Existing commands should keep working:

```bash
npm run miao-viz -- article article.md --format html --output out.html
```

Existing specs without `visual` should keep rendering through the legacy section layout.

New specs may use visual components:

```bash
npm run miao-viz -- article article.md \
  --spec-input /tmp/miao-vision/article-spec.json \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

The schema should reject malformed visual data with structured errors. It should not silently drop unknown visual component fields if those fields are needed for rendering.

## Testing Plan

### Schema Tests

- Old `InfographicSpec` fixtures still pass.
- New visual specs validate.
- Unknown visual type returns a structured validation error.
- Missing required visual data returns a structured validation error.
- `notes` field accepts both `string` and `string[]` during transition period.

### Renderer Tests

- A spec with P0 visuals renders HTML with `.miao-visual-svg`.
- `metric-bars` renders proportional SVG bars.
- `process-flow` renders nodes and connectors.
- `concept-contrast` renders lanes or criteria rows.
- `timeline-path` renders connected milestones.
- Legacy text sections still render.

### Quality Tests

- Text-only infographic produces `low_visual_density`.
- Numeric article without a metric visual produces `numeric_claims_not_visualized`.
- Timeline article rendered as list produces `timeline_rendered_as_text`.
- A good visual spec passes without warnings.

### Workflow Smoke Test

Use a technical article fixture with:

- numeric claims
- sequence/process claims
- comparison claims

Acceptance:

- generated HTML includes at least two SVG visual components
- generated HTML includes at least four visual components overall
- output remains self-contained
- `npm run test:run`
- `npm run build:cli`
- `npm run check:size`

## Example Acceptance Scenario

For a latency profiling article, a good output should contain:

- `concept-contrast`: CPU profiler vs wallclock profiler
- `metric-bars`: recording size `250MiB -> 6MiB`
- `before-after` or `metric-bars`: heap `1GiB -> 6GiB`
- `metric-bars`: vCPU `2 -> 10`
- `process-flow` or `timeline-path`: five-step investigation journey
- `part-to-whole`: thread state or sample breakdown, if supported by claims

It should not be considered successful if it only renders:

- large text numbers
- list-based timeline
- two text comparison cards
- quote block
- long bullet list

## Implementation Phases

### Phase 1: Visual Infrastructure

Deliverables:

- Add `visual` to `InfographicSection`.
- Add `InfographicVisualType`.
- Add schema validation for P0 visual types with `notes` accepting `string | string[]`.
- Add `infographic-visuals.ts`.
- Add `infographic-visual-primitives.ts`.
- Wire `article-html.ts` to render visual sections before falling back to legacy text sections.
- Use `.mv-visual-*` CSS prefix throughout — consistent with existing `.mv-*` naming. Do not introduce `.miao-*`.

Acceptance:

- Existing article infographic tests pass.
- New P0 fixture renders at least one visual SVG.
- No source file exceeds the 500-line limit.

### Phase 2: P0 Component Set

Deliverables:

- `kpi-strip`
- `metric-bars`
- `process-flow`
- `concept-contrast`
- `part-to-whole`
- `timeline-path`

Acceptance:

- Each component has at least one fixture-driven renderer test.
- Components use report theme tokens.
- Components render without external assets or runtime JS.

### Phase 3: Planner And Quality Gates

Deliverables:

- Add claim-to-visual planning rules in `article-infographic.ts`.
- Add `infographic-quality.ts`.
- Emit visual density warnings.
- Update CLI output handling if warnings need to surface in JSON mode.

Acceptance:

- Numeric article fixture generates `metric-bars` or `part-to-whole`.
- Sequence article fixture generates `timeline-path` or `process-flow`.
- Text-heavy output emits `low_visual_density`.

### Phase 4: Skill And Documentation

Deliverables:

- Update `skills/miao-vision/references/article-infographic.md`.
- Explain visual candidate planning in the quality path.
- Add examples for `metric-bars`, `process-flow`, and `concept-contrast`.
- Clarify that URL fetching remains in the agent layer.

Acceptance:

- Agent-authored article infographic specs prefer visual components over text-only sections.
- Skill docs describe workflows, not renderer internals.

### Phase 5: P1 Component Set

Deliverables:

- `before-after`
- `system-diagram`
- `tradeoff-matrix`
- `ranked-list-chart`

Acceptance:

- Components reuse theme tokens and visual primitives.
- They do not duplicate data report chart rendering logic unnecessarily.

## Risks And Constraints

- Do not move article generation into the web app.
- Do not add URL fetching to the CLI.
- Do not make article infographics depend on browser-only modules.
- Do not edit generated `dist` files as source.
- Keep non-test `.ts` and `.svelte` files under 500 lines.
- Avoid inventing data. Visual components must be based on article claims or explicit spec data.
- Keep output machine-readable and schema-validated.

## Definition Of Done

This feature is complete when:

- Article infographics have a reusable visual component layer.
- P0 visual components are implemented and tested.
- Generated article infographics include visual density warnings.
- Quality mode documentation asks agents to plan visuals explicitly.
- Data report and article infographic outputs share a coherent visual language.
- A representative technical article no longer renders as an all-text summary.

