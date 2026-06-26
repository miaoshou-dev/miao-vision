# Catalog, Block, and Template Implementation Plan

> ⚠️ **已废弃**：本文档被 `docs/catalog-productization-prd-v2.md` 取代。
> 仅保留供 Layer 3 Template 层设计参考（Phase 3 节）及风险分析参考（Risks 节）。
> 实施时以 PRD v2 为准。
>
> Inspired by HyperFrames catalog/block architecture
> Date: 2026-06-26
> Related: `docs/cli-llm-improvement-proposal.md`, `docs/json-render-lessons-for-miao-viz.md`

---

## Purpose

Miao Vision currently exposes low-level chart primitives to agents:

```
bar / line / pie / table / bigvalue / ...
```

That is useful but still leaves the LLM responsible for too much report design:

- choosing chart combinations
- mapping business intent to report structure
- deciding chart order
- adding caveats
- choosing fallback views
- maintaining visual and narrative consistency

HyperFrames shows a stronger model: package reusable visual capabilities as catalog assets with metadata, typed variables, strict validation, and a lint/inspect/render loop.

For Miao Vision, the equivalent is to evolve from:

```
LLM writes full VizSpec from chart primitives
```

to:

```
Agent selects catalog asset -> fills typed variables -> CLI expands to VizSpec -> validate/verify/inspect/render
```

The goal is not to turn Miao Vision into a generic UI framework. The goal is to make report generation more deterministic, lower-token, reusable, and easier for agents to operate.

---

## Target Model

Introduce three catalog layers:

```
Chart        Atomic visualization primitive
ReportBlock  Business-semantic section composed of one or more charts/insights
Template     Full report skeleton composed of report blocks
```

Examples:

| Layer | Example | Purpose |
| --- | --- | --- |
| Chart | `bar` | Render a single ranking/comparison chart |
| ReportBlock | `ranking-summary-block` | KPI + top-N bar + optional table + caveat |
| Template | `sales-review` | Full sales report with overview, trend, ranking, and detail |

Agents should prefer higher-level assets when available:

```
Template > ReportBlock > Chart
```

Chart primitives remain available as escape hatches for unusual requests.

---

## Core Principle

Blocks and templates must not bypass the existing VizSpec renderer.

They should compile down to the same report spec shape:

```
template id + variables + evidence
        |
        v
Template resolver
        |
        v
VizSpec
        |
        v
validate -> verify -> inspect -> render
```

This keeps the rendering layer deterministic and avoids creating a second report engine.

---

## Catalog Item Schema

Define catalog items as structured contracts, not prose-only documentation.

```typescript
type CatalogItem =
  | ChartCatalogItem
  | ReportBlockCatalogItem
  | ReportTemplateCatalogItem

interface BaseCatalogItem {
  id: string
  kind: 'chart' | 'report-block' | 'template'
  title: string
  description: string
  bestFor: string[]
  outputFormats: Array<'html' | 'deck'>
  examples: CatalogExample[]
  qualityChecks: QualityCheck[]
}

interface ReportBlockCatalogItem extends BaseCatalogItem {
  kind: 'report-block'
  requiredRoles: Array<'measure' | 'dimension' | 'time'>
  variables: VariableSchema[]
  constraints: Constraint[]
}

interface ReportTemplateCatalogItem extends BaseCatalogItem {
  kind: 'template'
  blocks: string[]
  variables: VariableSchema[]
  constraints: Constraint[]
}
```

### Variable Schema

Variables are the main mechanism for reducing LLM burden. The agent should fill variables, not rewrite full specs.

```typescript
interface VariableSchema {
  name: string
  type: 'field' | 'number' | 'string' | 'enum' | 'boolean'
  required: boolean
  role?: 'measure' | 'dimension' | 'time' | 'id'
  enumValues?: string[]
  min?: number
  max?: number
  default?: unknown
  description?: string
}
```

Example:

```yaml
variables:
  primaryMeasure:
    type: field
    role: measure
    required: true
  primaryDimension:
    type: field
    role: dimension
    required: true
  timeField:
    type: field
    role: time
    required: false
  topN:
    type: number
    default: 10
    min: 3
    max: 20
```

### Constraint Schema

Constraints should be machine-readable where possible.

```typescript
interface Constraint {
  code: string
  severity: 'error' | 'warning'
  message: string
  expression?: string
}
```

Examples:

```json
[
  {
    "code": "TOO_MANY_CATEGORIES_FOR_BAR",
    "severity": "warning",
    "expression": "primaryDimension.distinctCount > 12",
    "message": "Use table or top-N bar when the dimension has more than 12 categories."
  },
  {
    "code": "TREND_REQUIRES_THREE_PERIODS",
    "severity": "error",
    "expression": "timePeriods < 3",
    "message": "Trend blocks require at least 3 time periods."
  }
]
```

---

## Built-In Catalog Registry

Do not start with an external plugin ecosystem. Start with built-in catalog assets under the CLI package.

Suggested structure:

```
packages/miao-viz-cli/src/catalog/
├── catalog-schema.ts
├── catalog-registry.ts
├── catalog-resolver.ts
├── chart-catalog.ts
├── block-catalog.ts
├── template-catalog.ts
└── resolvers/
    ├── ranking-summary-block.ts
    ├── kpi-overview-block.ts
    ├── trend-with-caveat-block.ts
    └── sales-review-template.ts
```

Responsibilities:

| Module | Responsibility |
| --- | --- |
| `catalog-schema.ts` | TypeScript types and Zod schemas for catalog assets |
| `catalog-registry.ts` | Static registry of built-in charts, blocks, and templates |
| `catalog-resolver.ts` | Scores assets against profile + intent + evidence |
| `chart-catalog.ts` | Existing chart capabilities as catalog items |
| `block-catalog.ts` | Business-semantic reusable report blocks |
| `template-catalog.ts` | Full report templates |
| `resolvers/*` | Compile block/template variables into VizSpec fragments |

---

## Analyze Output

`miao-viz analyze` should emit scoped catalog assets, not only evidence and chart types.

```bash
miao-viz analyze sales.csv \
  --intent "regional sales ranking" \
  --output /tmp/miao-vision/context.json
```

Example output:

```json
{
  "fields": [
    { "name": "sales", "role": "measure", "type": "number" },
    { "name": "region", "role": "dimension", "type": "string", "distinctCount": 3 },
    { "name": "month", "role": "time", "type": "date", "timePeriods": 2 }
  ],
  "evidence": [
    {
      "id": "by_region",
      "query": "sum(sales) by region",
      "rows": [
        { "region": "East", "sales": 240, "share": 0.533 },
        { "region": "West", "sales": 120, "share": 0.267 }
      ]
    }
  ],
  "catalog": {
    "charts": ["bigvalue", "bar", "table"],
    "blocks": [
      {
        "id": "ranking-summary-block",
        "score": 0.92,
        "variables": {
          "primaryDimension": "region",
          "primaryMeasure": "sales",
          "topN": 10
        }
      },
      {
        "id": "kpi-overview-block",
        "score": 0.75,
        "variables": {
          "primaryMeasure": "sales"
        }
      }
    ],
    "templates": [
      {
        "id": "sales-review",
        "score": 0.64,
        "variables": {
          "primaryMeasure": "sales",
          "primaryDimension": "region",
          "timeField": "month"
        }
      }
    ],
    "blocked": [
      {
        "id": "trend-with-caveat-block",
        "reason": "timePeriods < 3"
      }
    ]
  },
  "sampleWarnings": [
    {
      "code": "two_period_only",
      "message": "Only 2 time periods. Do not describe the chart as a trend."
    }
  ]
}
```

This narrows the LLM task to:

1. select a recommended template/block,
2. confirm or adjust variables,
3. write concise narrative text,
4. let the CLI validate and render.

---

## Template and Variable Rendering

Add a template rendering path that compiles templates into ordinary VizSpec.

Example command:

```bash
miao-viz render \
  --input sales.csv \
  --template sales-review \
  --variables /tmp/miao-vision/vars.json \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/report.html
```

Example variables file:

```json
{
  "primaryMeasure": "sales",
  "primaryDimension": "region",
  "timeField": "month",
  "topN": 10
}
```

Internal flow:

```
load dataset
load context
load template catalog item
load variables
validate variables against profile/context
compile template to VizSpec
validate VizSpec
verify evidence references
render artifact
```

This should produce the same final path as a hand-written report spec.

---

## Strict Variable Validation

Borrow the HyperFrames-style strict variable idea.

Strict validation checks:

- required variables are present
- no unknown variables are provided when strict mode is enabled
- variable type matches schema
- field variables exist in the profile
- field role matches required role
- enum values are valid
- numeric values are within range
- required evidence exists in context

Command shape:

```bash
miao-viz validate \
  --template sales-review \
  --variables /tmp/miao-vision/vars.json \
  --profile /tmp/miao-vision/profile.json \
  --context /tmp/miao-vision/context.json \
  --strict-variables
```

Example error:

```json
{
  "ok": false,
  "error": {
    "code": "INVALID_TEMPLATE_VARIABLE",
    "message": "Variable 'primaryMeasure' requires a measure field, but 'region' is a dimension.",
    "details": {
      "variable": "primaryMeasure",
      "expectedRole": "measure",
      "actualField": "region",
      "actualRole": "dimension"
    }
  }
}
```

---

## ReportBlock Resolver

Each report block should have a resolver that can:

- determine whether the block fits the current context,
- infer default variables,
- compile variables and evidence into VizSpec fragments.

```typescript
interface ReportBlockResolver {
  id: string

  canUse(context: AnalyzeContext): BlockDecision

  defaultVariables(context: AnalyzeContext): Record<string, unknown>

  toCharts(
    variables: Record<string, unknown>,
    context: AnalyzeContext
  ): AgentChartSpec[]

  toInsights?(
    variables: Record<string, unknown>,
    context: AnalyzeContext
  ): Insight[]
}

interface BlockDecision {
  ok: boolean
  score: number
  reason?: string
  warnings?: string[]
}
```

Example: `ranking-summary-block`

Inputs:

- `primaryDimension`
- `primaryMeasure`
- `topN`

Output:

- optional bigvalue for total measure
- top-N bar chart
- optional detail table when cardinality is high
- caveat if sample size is small

---

## Validation Changes

`validate` needs to accept context, because profile alone cannot validate catalog and evidence constraints.

Recommended command:

```bash
miao-viz validate \
  --spec report.yaml \
  --profile profile.json \
  --context context.json
```

Additional checks when context exists:

- chart type is in `catalog.charts`
- spec does not use blocked chart/block/template ids
- insight evidence ids exist
- sample warning caveats are propagated
- `$evidence` paths resolve
- block/template variables are valid
- transform types are executable by the renderer

Severity split:

| Issue | Severity |
| --- | --- |
| unknown field | error |
| required encoding missing | error |
| transform type exists in schema but has no executor | error |
| blocked chart used in strict catalog mode | error |
| line chart on nominal field | warning or error depending on catalog strictness |
| too many categories for bar | warning |
| sample warning not mentioned | warning now, error later when structured insights are mandatory |

---

## Inspect Command

`inspect` should cover both data/evidence risk and visual risk.

```bash
miao-viz inspect \
  --input sales.csv \
  --spec report.yaml \
  --context context.json \
  --output inspect.json
```

Data/evidence checks:

- chart transform pipeline row counts
- fields available after each transform
- encoding field source and inferred type
- evidence ids referenced by insights
- evidence ids not referenced by any insight
- sample warnings without caveats

Visual risk checks:

- too many x-axis categories
- long labels likely to overlap
- legend too long
- bigvalue text too long
- table has too many columns
- chart has too few data points for its type
- caveat is missing near a risky chart

First version can be static and heuristic. A later version can add browser-based screenshot QA.

---

## Agent Workflow

Recommended future workflow:

```
1. miao-viz analyze
   -> fields, evidence, scoped catalog, recommended blocks/templates

2. Agent selects template/block
   -> preferably from catalog.recommendedTemplates or catalog.recommendedBlocks

3. Agent writes variables
   -> small JSON object, not full report spec

4. miao-viz validate --template/--variables --context
   -> strict variable and catalog validation

5. miao-viz render --template/--variables --context
   -> compiles to VizSpec and renders deterministic artifact

6. Optional: miao-viz inspect
   -> structured data/evidence/visual QA
```

Fallback workflow:

```
Agent writes full VizSpec -> validate --context -> render
```

The fallback remains important for unusual user requests.

---

## Initial Built-In Assets

Start with a small catalog that covers common reports.

### Report Blocks

| ID | Use Case |
| --- | --- |
| `kpi-overview-block` | 1-4 top-level metrics |
| `ranking-summary-block` | top-N ranking by dimension and measure |
| `trend-with-caveat-block` | time series when enough periods exist |
| `distribution-summary-block` | histogram or table depending on sample size |
| `detail-table-block` | data table fallback for high-cardinality dimensions |

### Templates

| ID | Use Case |
| --- | --- |
| `sales-review` | sales KPI, trend, region/category ranking, details |
| `ops-weekly` | operational KPI, status distribution, exceptions |
| `finance-summary` | revenue/cost/profit overview with comparison |

Keep this catalog small until validation and inspect are solid.

---

## Implementation Phases

### Phase 1: Schema and registry

- Define catalog item schemas.
- Add built-in chart catalog from existing chart support.
- Add 2-3 report blocks.
- Add 1 report template.
- Add `miao-viz catalog --for-llm` output with charts, blocks, and templates.

### Phase 2: Analyze integration

- Extend `miao-viz analyze` to output recommended blocks/templates.
- Include inferred variable defaults.
- Include blocked assets with reasons.
- Keep output compact and scoped to the current intent.

### Phase 3: Template compilation

- Implement `template + variables -> VizSpec`.
- Add strict variable validation.
- Add render path for `--template --variables`.
- Ensure generated VizSpec still passes normal validation.

### Phase 4: Context-aware validation

- Add `validate --context`.
- Check catalog compliance and evidence references.
- Make unsupported transforms errors.
- Introduce warning/error severity rules.

### Phase 5: Inspect and visual QA

- Add `miao-viz inspect`.
- Start with static data/evidence/visual heuristics.
- Later add browser screenshot checks for HTML output.

### Phase 6: External asset ecosystem

Only after the built-in model works:

- `miao-viz catalog search`
- `miao-viz add report-block <id>`
- `miao-viz add template <id>`
- versioned external asset registry

Do not start here. Built-in assets are enough to prove the product model.

---

## Risks

### Risk: Too much abstraction too early

If blocks/templates are introduced before validation is strong, failures become harder to debug.

Mitigation: keep initial catalog small and compile every asset to plain VizSpec.

### Risk: Catalog becomes another prose prompt

If catalog rules are not machine-readable, the system only moves prose from `SKILL.md` to JSON.

Mitigation: represent variables, roles, constraints, and severity as structured fields.

### Risk: Template rigidity

Templates may not satisfy unusual user requests.

Mitigation: keep chart-level fallback workflow and allow agents to write full VizSpec when needed.

### Risk: Variable inference mistakes

The CLI may infer the wrong primary measure or dimension.

Mitigation: include assumptions in `analyze`, expose variables for agent/user correction, and validate roles strictly.

---

## Summary

HyperFrames demonstrates a useful production pattern:

```
catalog asset -> typed variables -> strict validation -> inspect/lint -> deterministic render
```

Miao Vision should adapt that pattern for data reports:

```
scoped catalog -> recommended block/template -> variables -> VizSpec -> validate/verify/inspect/render
```

This reduces LLM freedom where it is harmful, preserves flexibility where it is useful, and gives agents a smaller, more reliable interface for producing high-quality reports.
