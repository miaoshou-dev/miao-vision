# Lessons from json-render for Miao Vision

> Reference: `vercel-labs/json-render`
> Date: 2026-06-25
> Related: `docs/cli-llm-improvement-proposal.md`, `docs/llm-report-quality-improvement-plan.md`

---

## Purpose

`json-render` is not a data-report product, but its core generative UI architecture is highly relevant to Miao Vision's CLI + Agent workflow.

The useful idea is not to copy its UI renderer. The useful idea is the contract:

```
LLM generates a constrained JSON spec
Catalog defines what the LLM is allowed to use
Schema validates shape and props
Runtime renders and executes deterministically
Patch streams support progressive output and targeted repair
```

For Miao Vision, the equivalent target is:

```
LLM chooses evidence and report structure
CLI computes evidence and validates semantics
Catalog scopes charts, transforms, interactions, and insight rules
Renderer produces deterministic HTML/deck/article artifacts
```

The strategic goal is to make LLM output narrower, more verifiable, and cheaper in tokens while still supporting many user intents.

---

## What json-render Does Well

### 1. Catalog as the LLM capability boundary

`json-render` constrains AI output to a component and action catalog. The AI does not invent arbitrary UI primitives; it chooses from predefined components whose props are typed by schema.

Miao Vision should use the same pattern for reports:

```json
{
  "charts": {
    "bar": {
      "requiredEncodings": ["x", "y"],
      "allowedTransforms": ["aggregate", "sort", "limit"],
      "rules": [
        "x.role = dimension",
        "y.role = measure",
        "x.distinctCount <= 12"
      ]
    },
    "line": {
      "requiredEncodings": ["x", "y"],
      "allowedTransforms": ["derive-month", "aggregate", "sort"],
      "rules": [
        "x.role = time",
        "timePeriods >= 3"
      ]
    }
  }
}
```

This turns chart selection from a prose instruction in `SKILL.md` into a machine-readable contract.

### 2. Prompt generation from catalog

`json-render` can generate AI prompts from the active catalog. This avoids large handwritten prompts that drift from implementation.

Miao Vision should move toward command-generated prompt context:

```bash
miao-viz prompt-context data.csv \
  --intent "regional sales trend" \
  --output /tmp/miao-vision/prompt-context.json
```

The output should contain only the relevant subset:

- available fields and roles
- evidence ids
- allowed chart types
- transform syntax for those chart types
- interaction/action capabilities
- insight grounding rules
- minimal spec examples

This should reduce permanent `SKILL.md` token load and keep LLM instructions aligned with CLI behavior.

### 3. Schema-first specs

`json-render` treats JSON specs as the durable interface between AI and renderer. Specs are validated before rendering.

Miao Vision already has `VizSpec` and `DeckSpec`, but the current workflow still relies heavily on natural-language skill rules. The next step is to make all important report constraints schema-visible or validator-visible:

- chart type constraints
- encoding field constraints
- transform availability
- interaction availability
- insight evidence references
- caveat requirements for small samples

The agent should not need to remember these from prose when the CLI can validate them deterministically.

### 4. Deterministic directives

`json-render` includes directives such as formatting, math, string concatenation, counts, pluralization, and translation. These let specs express dynamic values without forcing the LLM to compute or format them directly.

Miao Vision can borrow the concept for evidence-backed reports:

```yaml
insights:
  - text:
      $template: "{region} generated {sales}, representing {share} of total sales."
      values:
        region: { $evidence: "by_region_top.region" }
        sales: { $format: [{ $evidence: "by_region_top.sales" }, "number"] }
        share: { $format: [{ $evidence: "by_region_top.share" }, "percent"] }
    evidence: ["by_region_top"]
```

The LLM chooses which evidence to cite and how to phrase the sentence. The CLI supplies numbers and formatting.

This directly addresses:

- percentage hallucination
- inconsistent number formatting
- untraceable insight claims
- small-sample caveat enforcement

### 5. Patch-based generation and repair

`json-render` supports JSON Patch style streaming, so specs can be built or edited incrementally.

For Miao Vision, the highest-value use is not progressive rendering. It is targeted repair.

Instead of asking the LLM to rewrite an entire YAML report after validation fails, the CLI can ask for or emit focused patches:

```jsonl
{"op":"replace","path":"/charts/1/type","value":"bar"}
{"op":"replace","path":"/charts/1/encoding/x/type","value":"nominal"}
{"op":"remove","path":"/charts/2/data/transform/0"}
```

Potential commands:

```bash
miao-viz validate --spec report.json --profile profile.json --patch-hints
miao-viz repair --spec report.json --profile profile.json --output fixed-report.json
```

Patch repair reduces token use because the agent and CLI exchange only the delta, not the whole spec.

### 6. Runtime-owned actions

`json-render` treats actions as catalog entries. The model can bind to actions, but the runtime owns execution.

Miao Vision should define interactions similarly:

```json
{
  "actions": {
    "filterByCategory": {
      "allowedOn": ["bar", "pie"],
      "requiresFieldRole": "dimension"
    },
    "showDetailRows": {
      "allowedOn": ["bar", "table"],
      "requiresSourceRows": true
    }
  }
}
```

This prevents the LLM from inventing unsupported interaction behavior and keeps generated artifacts deterministic.

### 7. Inspectable runtime state

`json-render` includes devtools for inspecting spec trees, catalog entries, state, actions, and stream events.

Miao Vision needs an agent-oriented equivalent:

```bash
miao-viz inspect \
  --input data.csv \
  --spec report.yaml \
  --output /tmp/miao-vision/inspect.json
```

The inspect output should include:

- resolved chart data row counts
- transform-by-transform field availability
- encoding field source and type
- evidence ids used by insights
- uncited evidence
- insight claims without evidence
- warnings that do not block rendering

This gives agents a structured debugging surface instead of forcing them to infer from final HTML.

---

## Recommended Miao Vision Direction

The current `miao-viz analyze` proposal should be reframed as an evidence and catalog compiler, not as a full planning replacement.

Recommended command shape:

```bash
miao-viz analyze data.csv \
  --intent "regional sales trend" \
  --emit evidence,catalog,prompt \
  --output /tmp/miao-vision/context.json
```

Recommended output shape:

```json
{
  "intent": {
    "raw": "regional sales trend",
    "coverage": "partial",
    "assumptions": ["sales is the primary measure", "region is the primary dimension"]
  },
  "fields": [
    { "name": "sales", "role": "measure", "type": "number" },
    { "name": "region", "role": "dimension", "type": "string", "distinctCount": 3 },
    { "name": "month", "role": "time", "type": "date", "timePeriods": 2 }
  ],
  "evidence": [
    {
      "id": "total",
      "query": "sum(sales) as total_sales, count(*) as rows",
      "values": { "total_sales": 450, "rows": 4 }
    },
    {
      "id": "by_region",
      "query": "sum(sales) by region",
      "rows": [
        { "region": "East", "sales": 240, "share": 0.5333 },
        { "region": "West", "sales": 120, "share": 0.2667 }
      ]
    }
  ],
  "catalog": {
    "charts": ["bigvalue", "bar", "table"],
    "blockedCharts": [
      { "type": "line", "reason": "timePeriods < 3" }
    ],
    "actions": ["tooltip"]
  },
  "sampleWarnings": [
    { "code": "small_sample", "message": "Only 4 rows are available." },
    { "code": "two_period_only", "message": "Only 2 time periods are available." }
  ],
  "promptRules": [
    "Use only charts listed in catalog.charts.",
    "Every insight must cite evidence ids.",
    "Do not compute new percentages. Use evidence values only.",
    "Mention sampleWarnings as caveats when making comparisons."
  ]
}
```

This gives the LLM enough flexibility to satisfy varied user requests while keeping numerical and structural claims deterministic.

---

## Proposed Workflow

Replace the current multi-step profile/query planning loop with a contract-driven workflow:

```
1. miao-viz analyze
   -> emits scoped catalog, evidence, sample warnings, prompt rules

2. LLM writes VizSpec
   -> uses only scoped catalog and evidence ids

3. miao-viz validate
   -> schema + semantic validation

4. miao-viz verify
   -> insight/evidence/caveat verification

5. miao-viz render
   -> deterministic artifact generation
```

`validate` should remain mandatory. `verify` can start optional, but should become mandatory once structured insights are supported.

---

## Impact on Token Use

The token saving should come from narrowing context, not from skipping safety steps.

High-value reductions:

- Generate prompt context from scoped catalog instead of loading broad `SKILL.md` sections.
- Emit only relevant chart schemas and examples.
- Use evidence ids instead of repeating full query outputs in every reasoning step.
- Use patch repair instead of whole-spec rewrites.
- Move formatting and math into deterministic directives.

Avoid:

- Dropping validation to save one command.
- Removing necessary transform/encoding rules from the agent context before the CLI can enforce them.
- Asking the LLM to infer unsupported chart or interaction rules from examples.

---

## Implementation Priorities

### Phase 1: Contract cleanup

- Add `miao-viz catalog --for-llm`.
- Make unsupported transform types fail validation instead of being silently ignored.
- Keep `validate` mandatory in the Skill workflow.
- Add explicit multi-column `groupby` and range filter examples to Skill docs.

### Phase 2: Scoped context

- Implement `miao-viz analyze --emit evidence,catalog,prompt`.
- Emit only chart types relevant to the dataset and intent.
- Include `blockedCharts` with machine-readable reasons.
- Include `coverage`, `assumptions`, and `needsQuery` fields for incomplete analysis.

### Phase 3: Evidence-backed insights

- Extend `insights` from `string[]` to a backward-compatible union:

```yaml
insights:
  - "Legacy free-text insight."
  - text: "East generated 240 in sales."
    evidence: ["by_region"]
    caveat: "small_sample"
```

- Add `miao-viz verify` for evidence id existence, caveat requirements, and forbidden unsupported claims.

### Phase 4: Directives and patch repair

- Add deterministic insight directives for `$evidence`, `$format`, `$template`, and limited `$math`.
- Add `validate --patch-hints`.
- Add optional `repair` command for local autofixes.

### Phase 5: Agent debugging

- Add `miao-viz inspect`.
- Include resolved transforms, chart row counts, encoding types, insight evidence usage, and warnings.

---

## Risks and Boundaries

### Do not turn Miao Vision into a generic UI framework

`json-render` is broad by design. Miao Vision should remain a data artifact engine. The catalog should describe charts, transforms, evidence, report sections, deck slides, article sections, and interactions, not arbitrary application UI.

### Do not let directives become a second programming language

Only include deterministic directives that reduce LLM arithmetic or formatting errors. Avoid general scripting.

Recommended initial set:

- `$evidence`
- `$format`
- `$template`
- `$ratio`
- `$delta`

Avoid initially:

- arbitrary `$computed`
- custom user JavaScript
- nested control flow

### Do not skip validation for token savings

The json-render pattern is reliable because schema and runtime remain strong. Miao Vision should follow that principle: reduce prompt size and repair size, not validation coverage.

---

## Summary

The main lesson from `json-render` is:

> Put the LLM inside a narrow, catalog-defined, schema-validated lane, then let deterministic runtime code do the rendering, calculation, state handling, and repair.

For Miao Vision, this means evolving from:

```
Skill prose + profile/query output + LLM-written report spec
```

to:

```
Scoped catalog + evidence pack + schema validation + evidence verification + deterministic render
```

This is a stronger direction than only adding `miao-viz analyze`. `analyze` should become the producer of scoped catalog and evidence, while `validate`, `verify`, `inspect`, and patch repair provide the deterministic guardrails that make Agent-generated reports reliable.
