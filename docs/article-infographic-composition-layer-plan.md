# Article Infographic Composition Layer Plan

## Purpose

`miao-viz article` now supports agent-authored `InfographicSpec` files and a growing set of visual components, but user-facing output can still feel template-bound. The issue is not only visual polish or missing component types. The current renderer organizes every infographic as a linear article summary:

```text
hero -> section -> section -> section -> takeaways
```

That works for long-form editorial summaries, but it is a poor fit for short strategic narratives, lifecycle stories, business playbooks, operating models, and mechanism diagrams. For those inputs, the output should be driven by an overall composition such as a lifecycle curve, strategy dashboard, matrix, or explainer map.

This document proposes adding a composition/template layer between `InfographicSpec` and HTML rendering.

Related documents:

- `docs/article-to-infographic-implementation-plan.md`
- `docs/article-infographic-visual-enhancement-plan.md`
- `docs/infographic-optimization-with-antv-and-data-report.md`

## Current Baseline

Relevant source files:

```text
packages/miao-viz-cli/src/article-infographic.ts
packages/miao-viz-cli/src/article-html.ts
packages/miao-viz-cli/src/infographic-visuals.ts
packages/miao-viz-cli/src/infographic/
```

Current flow:

```text
Article or agent-authored spec
  -> InfographicSpec.sections[]
  -> article-html.ts renders each section in order
  -> optional section.visual renders a local visual component
```

The visual component layer already exists:

```text
kpi-strip
metric-bars
process-flow
concept-contrast
timeline-path
part-to-whole
before-after
tradeoff-matrix
ranked-list-chart
system-diagram
callout-diagram
icon-cluster
```

This improves visual density, but it does not change the page-level composition. The page shell remains a vertical sequence of repeated section blocks.

## Product Problem

For inputs like:

```text
From introduction to growth phase, sales rapidly increased and market share grew from 5% to 25%.
During maturity, it peaked at 40% and remained stable.
In the decline phase, it dropped to 15%.
By increasing marketing investment during growth, optimizing cost structure during maturity,
and timely launching upgraded products during decline, a smooth transition was achieved.
```

The desired artifact is not an article summary. It is a business lifecycle infographic:

```text
market-share curve
  + phase annotations
  + stage-specific management levers
  + executive readout
```

Rendering the same content as `hero + facts + timeline + comparison + takeaways` produces a valid artifact, but it still feels like the same template as a long article infographic. The agent can improve wording and choose different visuals, but it cannot escape the renderer's page structure.

## Design Direction

Add a first-class `composition` concept to `InfographicSpec`.

The spec should represent both:

1. **Content structure**: claims, sections, visual data, captions.
2. **Composition intent**: how the page should be arranged as a whole.

Proposed mental model:

```text
InfographicSpec
  -> composition selector
  -> composition renderer
  -> visual components and shared SVG primitives
  -> self-contained HTML artifact
```

This keeps the CLI deterministic while giving agents a controlled way to ask for meaningfully different layouts.

## Proposed Spec Extension

Add an optional `composition` field:

```ts
export type InfographicCompositionType =
  | 'article-linear'
  | 'lifecycle-curve'
  | 'strategy-dashboard'
  | 'explainer-map'
  | 'comparison-matrix'

export interface InfographicComposition {
  type: InfographicCompositionType
  density?: 'compact' | 'standard' | 'long'
  emphasis?: 'narrative' | 'metrics' | 'actions' | 'structure'
}

export interface InfographicSpec {
  title: string
  subtitle?: string
  source?: string
  style: InfographicStyle
  composition?: InfographicComposition
  summary: string
  sections: InfographicSection[]
  metadata: {
    inputFile: string
    generatedAt: string
    wordCount: number
  }
}
```

Backward compatibility:

- Existing specs without `composition` default to `article-linear`.
- Existing `style` values remain valid.
- Existing `sections[]` and `visual` data remain the primary content carrier.

### Zod schema update

The runtime Zod schema mirrors the TS interface, with `.optional()` so old specs pass unmodified:

```ts
const infographicCompositionSchema = z.object({
  type: z.enum(['article-linear', 'lifecycle-curve', 'strategy-dashboard', 'explainer-map', 'comparison-matrix']),
  density: z.enum(['compact', 'standard', 'long']).optional(),
  emphasis: z.enum(['narrative', 'metrics', 'actions', 'structure']).optional(),
}).optional()

// Merge into existing spec schema
export const infographicSpecSchema = z.object({
  title: z.string().min(1),
  subtitle: z.string().optional(),
  source: z.string().optional(),
  style: z.enum(['editorial', 'executive', 'minimal']).default('editorial'),
  composition: infographicCompositionSchema,
  summary: z.string().min(1),
  sections: z.array(infographicSectionSchema).min(1),
  metadata: z.object({
    inputFile: z.string().default(''),
    generatedAt: z.string().default(() => new Date().toISOString()),
    wordCount: z.number().int().min(0).default(0),
  }).default(() => ({ inputFile: '', generatedAt: new Date().toISOString(), wordCount: 0 })),
})
```

### Conditional validation with `superRefine`

Certain composition types require specific section data. Use `superRefine` to catch mismatches early (especially in strict mode):

```ts
export const infographicSpecSchema = baseSpecSchema.superRefine((spec, ctx) => {
  if (spec.composition?.type === 'lifecycle-curve') {
    const phaseCount = countOrderedPhasePoints(spec)
    if (phaseCount < 3) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['composition', 'type'],
        message: 'lifecycle-curve requires at least 3 ordered phase points with numeric values',
      })
    }
  }
  if (spec.composition?.type === 'strategy-dashboard') {
    if (!hasKpiVisual(spec)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['composition', 'type'],
        message: 'strategy-dashboard requires at least one kpi-strip visual',
      })
    }
  }
})
```

The `countOrderedPhasePoints` and `hasKpiVisual` helpers are lightweight (no rendering deps) and live in `infographic/compositions/` alongside the renderers.

In strict mode (`--strict-visuals`), these Zod issues become hard failures. In normal mode, they produce quality warnings and a fallback to `article-linear`.

## Composition Types

### `article-linear`

Current default behavior.

Best for:

- Long editorial articles.
- Scientific narratives.
- Opinion pieces.
- Text-heavy summaries with multiple sections.

Expected structure:

```text
hero
facts / timeline / comparison / process
quote
takeaways
```

### `lifecycle-curve`

Page built around a single lifecycle path or curve.

Best for:

- Product lifecycle.
- Market share progression.
- Growth, maturity, decline, renewal narratives.
- Before/after phase transitions.

Expected structure:

```text
header metrics
primary SVG curve/path
phase cards pinned to points
stage strategy row
management readout
```

Required data:

- At least 3 ordered phase points.
- Numeric values for the curve when available.
- Action or strategy text for at least 2 phases.

Data extraction note:

The renderer reads phase data from `section.visual.data` (e.g. `MetricBarsData.items[N].value`) where values are already typed as `number`. Section-level `InfographicSectionItem.value` is typed as `string` — if the renderer falls back there it must call `Number()` to parse. This avoids changing the existing type just for composition use.

Example spec fragment — the composition renderer extracts phase data from `visual.data.items` and actions from `section.items` keyed by matching label:

```json
{
  "composition": { "type": "lifecycle-curve", "emphasis": "metrics" },
  "sections": [
    {
      "type": "facts",
      "title": "Market Share Curve",
      "visual": {
        "type": "metric-bars",
        "data": {
          "items": [
            // visual.data.items[N].label → phase name
            //                 .value     → phase value (typed as number here)
            //                 .unit      → phase unit
            { "label": "Introduction", "value": 5, "unit": "%" },
            { "label": "Growth", "value": 25, "unit": "%" },
            { "label": "Maturity", "value": 40, "unit": "%" },
            { "label": "Decline", "value": 15, "unit": "%" }
          ]
        }
      },
      "items": [
        // section.items[N].label → matched to phase label
        //               .text    → strategy action for that phase
        { "label": "Growth", "text": "Increase marketing investment." },
        { "label": "Maturity", "text": "Optimize cost structure." },
        { "label": "Decline", "text": "Launch upgraded products." }
      ]
    }
  ]
}
```

Data flow:

```text
visual.data.items[0..N].label + .value  → LifecyclePoint.label + .value
section.items[M].label match            → LifecyclePoint.action (string
  (matched to visual label)               parse for numeric .value)
```

This requires no new spec model for P0; the `extractLifecyclePoints` helper handles the translation.

### `strategy-dashboard`

Page built around KPIs, levers, decisions, and action priorities.

Best for:

- Executive recommendations.
- Business summaries.
- Strategy memos.
- Compact decision briefs.

Expected structure:

```text
KPI strip
2x2 matrix or lever grid
ranked actions
risks / watchpoints
```

### `explainer-map`

Page built around a mechanism, system, or cause-effect chain.

Best for:

- Technical explainers.
- Scientific mechanisms.
- Architecture summaries.
- How-it-works articles.

Expected structure:

```text
hero claim
system diagram / process flow
callouts
evidence or implications
takeaways
```

### `comparison-matrix`

Page built around comparing options or concepts.

Best for:

- Tool comparisons.
- Tradeoff analysis.
- Before/after alternatives.
- Product or policy options.

Expected structure:

```text
comparison lanes
criteria rows
metric bars or chips
recommendation
```

## Rendering Architecture

Introduce a composition registry with a consistent renderer signature.

### Composition renderer contract

```ts
// infographic/compositions/types.ts

export type CompositionRenderer = (spec: InfographicSpec, theme: Theme) => string

export interface CompositionRegistry {
  [type: string]: CompositionRenderer | undefined
}
```

Each composition renderer takes the full `InfographicSpec` and a resolved `Theme` object and returns HTML content for the page body (no `<html>`/`<style>` wrapper — the shell handles that). Renderers call `renderVisual()` from `infographic/structures/index.ts` directly for embedded SVG components, bypassing `article-html.ts` section wrappers.

### Composition CSS

Each composition may need additional CSS beyond the shared theme styles. Define a parallel map:

```ts
const compositionStyles: Record<InfographicCompositionType, string> = {
  'article-linear':   '',
  'lifecycle-curve':  lifecycleCurveStyles,
  'strategy-dashboard': dashboardStyles,
  'explainer-map':    explainerMapStyles,
  'comparison-matrix': comparisonMatrixStyles,
}
```

The document shell function merges these into the `<style>` tag so each artifact stays self-contained.

### Files

```text
packages/miao-viz-cli/src/infographic/compositions/
  index.ts           registry dispatch
  types.ts           CompositionRenderer, shared helpers
  article-linear.ts  current section-by-section rendering
  lifecycle-curve.ts lifecycle curve renderer
  strategy-dashboard.ts
  explainer-map.ts
  comparison-matrix.ts
```

Responsibilities:

```text
article-html.ts
  HTML document shell + merged CSS.
  Calls renderInfographicComposition(spec).

infographic/compositions/index.ts
  Selects renderer from spec.composition.type.
  Falls back to article-linear when absent or unsupported.

infographic/compositions/article-linear.ts
  Current section-by-section rendering behavior (moved from article-html.ts).

infographic/compositions/lifecycle-curve.ts
  Extracts ordered phase data from sections and visual data.
  Renders full-page lifecycle curve composition.
  Calls renderVisual() directly — not renderVisualSection() — to get bare SVG output.

infographic/structures/*
  Continue rendering reusable local visual components.

infographic/primitives/*
  Shared SVG, text, layout, axis, and theme helpers.
```

Target flow:

```text
renderInfographicHtml(spec)
  -> renderDocumentShell(spec, compositionHtml, compositionStyles)
  -> renderInfographicComposition(spec)
  -> composition renderer (via registry)
  -> local visual components / primitives
```

## Lifecycle Data Extraction

The lifecycle renderer should avoid a new spec model at first. It can read ordered phase points from existing visual data.

Accepted sources, in priority order:

1. `metric-bars` items with numeric values.
2. `timeline-path` items with `value` in matching section items.
3. `facts` items with `value` fields that parse as numbers.

Recommended helper:

```ts
interface LifecyclePoint {
  label: string
  value: number
  unit?: string
  text?: string
  action?: string
}

function extractLifecyclePoints(spec: InfographicSpec): LifecyclePoint[]
```

Action extraction:

- Match section items by `label`.
- Prefer items in process, comparison, checklist, or takeaways sections.
- Do not invent actions. If no action exists, omit the action annotation.

## Quality Checks

Extend `infographic-quality.ts` with composition-aware warnings.

New warning codes:

```text
composition_fallback_used
lifecycle_requires_ordered_points
lifecycle_requires_numeric_values
lifecycle_missing_actions
dashboard_missing_kpis
comparison_missing_criteria
```

Rules:

- If `composition.type = lifecycle-curve` but fewer than 3 points are found, fall back to `article-linear` and warn with `composition_fallback_used`.
- If lifecycle values are non-numeric, render a timeline-path variant and warn with `lifecycle_requires_numeric_values`.
- If `composition.type = strategy-dashboard` but no KPI visual is found, fall back and warn.

Note: `composition_missing` (auto-detecting phase labels in specs without a composition) is deferred to P1. It requires heuristic auto-detection logic, which contradicts the P0 principle of "no auto-detection". The P0 quality system only validates composition fields that are explicitly set.

Strict mode:

```bash
miao-viz article --spec-input spec.json --strict-visuals
```

In strict mode, invalid composition requirements should fail instead of silently falling back.

## Agent Skill Updates

Update `packages/miao-vision-skill/references/article-infographic.md`.

Add a composition selection step after narrative arc selection:

```text
If the source is a short business, lifecycle, strategy, or process text, choose a composition before writing sections.
```

Suggested routing:

```text
stage progression + numeric values -> lifecycle-curve
KPIs + recommendations -> strategy-dashboard
mechanism / system / cause-effect -> explainer-map
option A vs B / tradeoffs -> comparison-matrix
long article / editorial argument -> article-linear
```

Add instruction:

```text
Do not force short structured business text into the default article-linear layout.
Use composition.type to express the intended page-level layout.
```

## P0 Implementation Plan

### P0.1 Schema

- Add `InfographicCompositionType`.
- Add optional `composition` to `InfographicSpec`.
- Default absent composition to `article-linear`.
- Preserve current structured error style for invalid composition values.
- Add `infographicCompositionSchema` to Zod schema with `.optional()`.
- Add `superRefine` conditional validation for `lifecycle-curve` (3+ points) and `strategy-dashboard` (KPI required).

File-size note: `article-infographic.ts` is currently 384 lines (close to 400-line warning). Put the composition `superRefine` helper functions (`countOrderedPhasePoints`, `hasKpiVisual`) and the `extractLifecyclePoints` helper in `infographic/compositions/types.ts` or `infographic/compositions/helpers.ts` to keep the core spec file under the limit.

Files:

```text
packages/miao-viz-cli/src/article-infographic.ts
packages/miao-viz-cli/src/infographic/types.ts
packages/miao-viz-cli/src/infographic/compositions/types.ts
packages/miao-viz-cli/src/infographic/compositions/helpers.ts
```

### P0.2 Renderer Split

- Move current section rendering functions from `article-html.ts` into `infographic/compositions/article-linear.ts`.
- Keep `article-html.ts` below file-size limits by making it document-shell only.

Files:

```text
packages/miao-viz-cli/src/article-html.ts
packages/miao-viz-cli/src/infographic/compositions/article-linear.ts
packages/miao-viz-cli/src/infographic/compositions/index.ts
```

### P0.3 Lifecycle Renderer

- Implement `lifecycle-curve.ts`.
- Use existing theme tokens and SVG primitives.
- Render:
  - header title/subtitle
  - KPI strip for phase values
  - SVG curve/path
  - phase annotations
  - strategy/action row
  - compact readout

No external browser or frontend dependencies.

### P0.4 Quality Warnings

- Add composition checks to `infographic-quality.ts`.
- Include warnings in CLI JSON output as today.

### P0.5 Fixtures And Tests

Add fixtures:

```text
test_data/article-spec-lifecycle.json
test_data/article-spec-lifecycle-invalid.json
```

Tests:

- Zod schema: valid composition values pass `safeParse`, invalid composition values return `INVALID_INFOGRAPHIC_SPEC`.
- `extractLifecyclePoints` unit tests: `metric-bars` input, `timeline-path` input, missing-numeric fallback.
- `article --spec-input article-spec-lifecycle.json` renders without warnings.
- Output HTML contains `data-composition-type="lifecycle-curve"` (machine-readable selector) and a curve SVG path.
- Invalid lifecycle data warns or fails under strict mode.
- Existing article fixtures still pass.

Commands:

```bash
npm run test:run
npm run build:cli
npm run check:size
```

## P1 Implementation Plan

### Strategy Dashboard

Add `strategy-dashboard.ts` for compact business summaries.

Inputs:

- `kpi-strip`
- `tradeoff-matrix`
- `ranked-list-chart`
- checklist/takeaways

Output:

```text
KPI header
decision grid
priority bars
risks/watchpoints
```

### Comparison Matrix

Add `comparison-matrix.ts`.

Inputs:

- `concept-contrast`
- `metric-bars`
- `before-after`

Output:

```text
comparison lanes
criteria rows
recommendation strip
```

## P2 Implementation Plan

### Explainer Map

Add `explainer-map.ts`.

Inputs:

- `system-diagram`
- `process-flow`
- `callout-diagram`
- evidence/takeaways

Output:

```text
central mechanism
annotated nodes
evidence row
implication row
```

## Non-Goals

- Do not move article generation into the web app.
- Do not add browser-only rendering dependencies to CLI.
- Do not replace the existing visual component registry.
- Do not make the agent write arbitrary HTML as the primary product path.
- Do not introduce hundreds of templates. Start with a few high-signal compositions.
- Do not invent data in composition renderers. Renderers only arrange validated spec data.

## Success Criteria

The lifecycle example should render as:

```text
Lifecycle curve + phase annotations + strategy levers
```

not:

```text
Hero + facts cards + timeline list + comparison cards + takeaways
```

Acceptance criteria:

- A short product lifecycle text can produce an artifact visually distinct from a long editorial article.
- Existing article workflows remain backward compatible.
- `miao-viz article --spec-input` remains deterministic and machine-readable.
- Generated HTML remains self-contained and `file://` friendly.
- Article outputs keep sharing Miao Vision theme primitives with data reports.

## Recommended First PR

Scope the first PR narrowly:

```text
schema composition field
composition registry
article-linear migration
lifecycle-curve renderer
one lifecycle fixture
tests
skill reference update
```

Avoid combining this with planner auto-detection. Agent-authored specs can set `composition.type` first. Auto-detection can follow after the rendering contract is stable.
