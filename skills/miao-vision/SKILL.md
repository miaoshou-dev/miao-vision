---
name: miao-vision
description: Use when a user asks Codex to visualize a local CSV, TSV, XLSX, or JSON data file with Miao Vision, generate an HTML chart/report from natural language, inspect data fields before choosing charts, validate a visualization spec, or create agent-friendly data visualizations.
---

# Miao Vision

Use Miao Vision as a local-first chart/report generator for agent workflows. The CLI stays deterministic; the agent writes or patches the spec.

## Workflow

### Data File → Visualization Report

Use this workflow when the user asks for a report, analysis, dashboard, charts, or visualizations from a data file.

#### Phase 1 — Intent Extraction

Fill this out from the user request and filename alone, before any CLI commands:

```text
INTENT CARD
User question     : [core analytical question]
Analysis type     : [up to 2 of: trend / comparison / distribution / correlation / KPI]
Primary measure   : [guessed numeric column]
Primary dimension : [guessed grouping column]
Time focus        : [yes / no]
```

#### Phase 2 — Targeted Profiling

Run a lightweight summary to confirm column names:

```bash
npm run --silent miao-viz -- profile --summary <file>
```

Select at most 5 relevant columns, then deep-profile only those columns:

```bash
npm run --silent miao-viz -- profile --columns col1,col2,col3 <file>
```

Do not load the full profile before completing the Intent Card. For files with fewer than 100 rows or pure KPI summaries, you may skip targeted profiling after the summary.

#### Phase 3 — Narrative Planning

Before writing any spec, run 1-3 query calls to get real aggregated values:

```bash
npm run --silent miao-viz -- query <file> \
  --groupby region \
  --measure "sum(sales) as total_sales" \
  --orderby "total_sales desc" \
  --limit 10
```

Then produce a short Narrative Plan with:

- Main story: 1-2 sentences based on real query values.
- Data evidence: actual values from `miao-viz query`.
- Chart intents: why each chart exists.
- Excluded charts: what you are not generating and why.
- Insight drafts: statements grounded in the data evidence.

#### Phase 4 — Spec Writing, Validation, and Render

Write YAML/JSON using `references/vizspec.md`. Every insight must trace to a Narrative Plan query value, an evidence-listed reliable profile statistic, or the user's own statement.

Forbidden insight sources:

- `topSharePct` as value share. It is row frequency, not contribution to a measure.
- unreliable profile statistics, such as skewness with fewer than 30 rows or correlation with fewer than 10 paired values.
- `temporal.gapCount` as a claim that data is missing.

Validate:

```bash
npm run --silent miao-viz -- validate --spec /tmp/miao-vision/report.yaml --profile /tmp/miao-vision/profile.json
```

Render HTML by default:

```bash
npm run --silent miao-viz -- render \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/report.yaml \
  --theme editorial \
  --format html \
  --output /tmp/miao-vision/report.html
```

Return the generated HTML path to the user. Only request PNG/SVG when the user explicitly asks for those formats.

## Defaults

- Default output: HTML.
- Default working directory for generated specs/artifacts: `/tmp/miao-vision`.
- CLI does not call an LLM. Codex generates or patches the spec from profile/query results and user request.
- Use supported MVP chart types only unless the user asks for exploratory implementation work.

## References

- Read `references/vizspec.md` before writing specs.
- Read `references/examples.md` when the request is ambiguous or when a similar chart/report example would reduce risk.
