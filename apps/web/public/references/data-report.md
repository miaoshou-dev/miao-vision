# Data File To Visualization Report

Use this workflow when the user asks for a report, analysis, dashboard, charts, visualizations, or detailed findings from a local CSV, TSV, XLSX, or JSON data file.

## Step 0: Intent Routing

Before running any CLI command, classify the user's intent to narrow the candidate blocks for spec generation.

| If the intent is... | Candidate block |
|---|---|
| Time trend ("over time", "monthly", "by quarter") | `trend-overview` or `trend-ranking` |
| Static ranking ("top N", "by region", "category comparison") | `snapshot-ranking` |
| Part-to-whole / share ("breakdown", "share", "composition") | `comparison-breakdown` |
| Executive summary with both trend + ranking | `trend-ranking` |
| Comprehensive analysis with detail table | `full-detail-report` |
| KPI only ("total", "summary numbers", "key metrics") | `kpi-summary` |
| User specifies custom chart types or complex requirements | build from `catalog.charts` directly |

Record the candidate block in the Intent Card. After analyze, check `catalog.blocks` to confirm the block is available.

## Step 1: Intent Card

Fill this out from the user request and filename alone, before any CLI commands:

```text
INTENT CARD
══════════════════════════════════════════
User question     : [core analytical question from the user's request]
Analysis type     : [up to 2 of: trend / comparison / distribution / correlation / KPI]
Primary measure   : [guessed numeric column name, e.g. sales, revenue]
Primary dimension : [guessed grouping column name, e.g. region, category]
Time focus        : [yes / no]
══════════════════════════════════════════
```

## Step 2: Analyze

Run two commands. The analyze output is what you read; the profile is only needed as a technical input to validate.

```bash
# Evidence pack + catalog (read this before writing spec)
miao-viz analyze /path/to/data.csv \
  --intent "..." \
  --compact \
  --output /tmp/miao-vision/context.json

# Profile for validate (you do not need to read this)
miao-viz profile /path/to/data.csv > /tmp/miao-vision/profile.json
```

If the auto-detected primary measure or dimension is wrong, rerun analyze with a correction:

```bash
miao-viz analyze /path/to/data.csv \
  --intent "..." \
  --correct-assumption "primary_measure=orders" \
  --compact \
  --output /tmp/miao-vision/context.json
```

To add a non-standard query not covered by the 3 standard evidence queries:

```bash
miao-viz analyze /path/to/data.csv \
  --intent "..." \
  --extra-query "groupby=region,month;measure=sum(revenue) as total;filter=year>=2024" \
  --compact \
  --output /tmp/miao-vision/context.json
```

Use `--verbose` instead of `--compact` only when debugging full block/template metadata. Use `miao-viz catalog --for-llm` only when compact context does not explain a chart rule clearly enough.

Read `context.json` and use these fields before writing the spec:

| Field | How to use |
|---|---|
| `fields[]` | Column roles and types; use `role` to understand each column |
| `evidence[]` | Precomputed query results; cite `id` in insights |
| `catalog.charts` | Allowed chart types; only use types listed here |
| `catalog.blockedCharts` | Blocked chart types with reasons; do not use these |
| `catalog.blocks[]` | Available report blocks sorted by score |
| `catalog.templates[]` | Available report templates sorted by score |
| `catalog.blockedBlocks[]` | Excluded blocks with machine-readable reasons |
| `assumptions[]` | Default field assumptions; proceed unless a blocking clarification exists |
| `clarificationQuestions[]` | Ask at most one blocking question |
| `catalog.recommendedPlan` | Suggested starting combination |
| `metricCandidates[]` | Precomputed derived metrics; prefer these over constructing formulas |
| `sampleWarnings[]` | Sample-size limitations; must appear as caveats |
| `promptRules[]` | Dataset-specific generation rules; follow all |

## Step 3: Write Spec

Write the report spec based solely on `context.json`. Follow all `promptRules[]`.

If `clarificationQuestions[]` contains a blocking question, ask exactly one before continuing. If questions are non-blocking, proceed with `assumptions[]` and mention the assumption in the report description or caveat when it affects interpretation.

### Preferred Template/Block Path

1. Read `catalog.templates` first. If a template matches Step 0 routing, run:

```bash
miao-viz template instantiate <id> --context /tmp/miao-vision/context.json
```

2. If no template matches, read `catalog.blocks` and run:

```bash
miao-viz block instantiate <id> --context /tmp/miao-vision/context.json
```

3. Review the draft: confirm field names against `context.json fields[]`, adjust variables such as `topN`, and complete each generated quality check. **Insights are auto-generated from `evidence[]` values** — review them, add caveats if needed (e.g. when `sampleWarnings` are present), but do not delete them.
4. Proceed to validate. Skip manual chart writing when using a matching template or block.

If `catalog.blocks` is empty or no block matches the intent, fall back to manual chart selection from `catalog.charts`.

If a relevant block appears in `catalog.blockedBlocks`, read its `reason` and explain the limitation to the user.

### Manual Chart Selection Fallback

Use only types in `catalog.charts`. Never use a type in `catalog.blockedCharts`. Use `catalog.recommendedPlan` as a layout starting point.

Read `references/vizspec.md` before writing specs. Key rules:

- Use only fields from `context.json fields[]`, or fields created earlier in the same transform chain.
- KPI bigvalues come first, then time-series, ranking, comparison, and table last if useful.
- Default maximum is 6 charts per report; 4 `bigvalue` blocks count as 1.
- Two charts of the same type must cover clearly different dimensions.
- When over budget, merge charts instead of dropping analytical goals.
- **`encoding.color` is supported** for multi-series bar (grouped/stacked), multi-line, stacked area, and donut. See `references/vizspec.md`.

## Insights And Evidence

Cite evidence ids for every claim. Do not compute new percentages or totals; use values from `evidence[].values`, `evidence[].rows`, or `metricCandidates[]`.

Prefer structured insights with `$evidence:<id>.<path>` directives:

```yaml
insights:
  - text: "East contributed $evidence:by_dimension.rows[0].total out of $evidence:total.values.total_sales total."
    evidence: [by_dimension, total]
    caveat: "Based on limited rows only."
    severity: info
```

Path formats:

- `$evidence:total.values.total_sales` from a single-row summary.
- `$evidence:by_dimension.rows[0].region` from a multi-row result.

`miao-viz validate --context context.json` checks every `$evidence` path and returns `EVIDENCE_PATH_NOT_FOUND` if a path does not resolve.

Required caveats for `sampleWarnings[]`:

| code | Required caveat pattern |
|---|---|
| `extreme_small_sample` | Add "(仅供参考，样本量极小)" or "(based on N rows only)" after ranking/comparison claims |
| `small_sample` | Add "(基于有限数据)" after distribution or outlier claims |
| `two_period_only` | Write "环比变化" or "period-over-period change", not "趋势" or "trend" |
| `one_period_only` | No time-based analysis; describe only current state |

## Step 4: Validate And Render

Validate with full checks:

```bash
miao-viz validate \
  --spec /tmp/miao-vision/report.yaml \
  --profile /tmp/miao-vision/profile.json \
  --context /tmp/miao-vision/context.json \
  --verify \
  --strict
```

`--verify --strict` is the final gate. It upgrades forbidden words, missing sample caveats, blocked charts, and unresolved evidence references to hard errors.

Read `warnings[]`. Fix every warning before rendering.

For machine-fixable errors and warnings, add `--patch-hints`:

```bash
miao-viz validate \
  --spec /tmp/miao-vision/report.yaml \
  --profile /tmp/miao-vision/profile.json \
  --context /tmp/miao-vision/context.json \
  --patch-hints
```

Patch fields:

- Hard error -> `{ "ok": false, ..., "patches": [...] }`.
- Warnings only -> `{ "ok": true, ..., "warnings": [...], "warningPatches": [...] }`.

Patchable hard errors:

| Error code | What the patch does |
|---|---|
| `X_MUST_BE_TEMPORAL` | Sets `encoding.x.type` to `"temporal"` on line/area chart |
| `X_MUST_BE_DIMENSION` | Sets `encoding.x.type` to `"nominal"` on bar chart |
| `UNSUPPORTED_TRANSFORM` | Removes the `filter` transform entry |
| `BLOCKED_CHART_STRICT` | Replaces chart type with first allowed catalog type |
| `DUPLICATE_CHART_ID` | Renames the last duplicate id |
| `MISSING_ENCODING` | Adds skeleton encoding; fill field names manually |

Patchable warnings:

| Warning code | What the patch does |
|---|---|
| `MISSING_SORT_TRANSFORM` | Appends a line/area sort transform |

Non-patchable errors: `FIELD_NOT_FOUND`, `UNSUPPORTED_CHART_TYPE`, `EVIDENCE_PATH_NOT_FOUND`.

## Step 5: Choose Theme

Before rendering, ask the user which theme they want (or default to `magazine` if unsure):

| Theme | Style |
|---|---|
| `standard-white` | Clean blue/white card-based, default |
| `magazine` | Serif font, warm paper texture |
| `standard-dark` | Dark background, mono+serif |
| `minimal` | Ultra-minimal, borderless |
| `nyt` | New York Times — Georgia serif, hairline borders, newspaper feel |
   | `bloomberg` | Bloomberg Terminal — monospace, green-on-black, data-dense |
   | `tableau` | Tableau-style BI dashboard — orange/blue palette, clean cards, tool-like |

If the user has no preference, use `magazine` for user-facing reports.

Render:

```bash
miao-viz render \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --theme <chosen-theme> \
  --format html \
  --output /tmp/miao-vision/report.html
```

Return the generated HTML path to the user.

## Edit Mode

Use Edit Mode when the user asks to change an existing report. The goal is minimum change; do not regenerate the whole spec.

```text
New report:  analyze -> block instantiate -> fill insights -> validate -> render
Edit report: read existing spec -> identify minimum change -> edit only that part -> validate -> render
```

Steps:

1. Read the existing spec file completely before making changes.
2. Identify the minimum fields to change.
3. Apply common edits: change one parameter, append one chart, apply `--patch-hints`, or edit one insight string.
4. Run `miao-viz validate` again after editing.

Rewrite the full spec only when the user asks for a completely different report structure, or more than 50% of the spec needs to change.

## Conservative Language

These rules apply to all insight text. Violations are caught by `miao-viz validate --verify`.

Forbidden words unless backed by statistical output in `context.json`:

- `trend` / `趋势`: use only when `timePeriods >= 3` and line chart is allowed.
- `drive` / `驱动`: correlation is not causation.
- `significant` / `显著`: use only with statistical test output.
- `strong correlation` / `强相关`: use only when correlation value is in `evidence[]`.
- `should` / `应该`: do not recommend actions from data alone.

Allowed formulations:

- "在当前样本中" / "in this N-row sample"
- "基于现有数据" / "based on available data"
- "环比变化" / "period-over-period change" when only 2 time periods exist

## Self-Review

Output this checklist before finalizing the spec and resolve unchecked items before rendering.

```text
Self-Review:
  [ ] Every chart type is in catalog.charts and not in catalog.blockedCharts?
  [ ] Every numeric claim in insights comes from evidence[].values, evidence[].rows, or metricCandidates[]?
  [ ] No new percentages computed manually?
  [ ] Every insight cites evidence ids?
  [ ] sampleWarnings are reflected as caveats?
  [ ] No forbidden words used without statistical backing?
  [ ] filter transform NOT used in spec?
  [ ] derive-month applied only to date-role fields?
  [ ] Chart count <= 6?
  [ ] Every chart maps to a goal in the Intent Card?
```
