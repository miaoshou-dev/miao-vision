---
name: miao-vision
description: Use when a user asks an agent such as Codex or Claude to turn an article URL, Markdown file, or long-form text into an infographic artifact with Miao Vision, or to visualize a local CSV, TSV, XLSX, or JSON data file, inspect data fields, generate an HTML chart/report, validate a visualization spec, choose charts from natural language, or produce a browser-presentable slide deck from data.
---

# Miao Vision

Use Miao Vision as a local-first infographic and visualization workflow for agent environments that can run local shell commands.

## Requirement

The `miao-viz` CLI must be installed and available on `PATH`.

Check:

```bash
miao-viz catalog
```

If the command is missing, tell the user to install:

```bash
npm install -g @miao-vision/cli
```

## Workflow

Choose the workflow based on the user input.

### Article URL / Markdown → Infographic

Use this workflow when the user provides:

- an article URL
- a Markdown file
- a plain-text article
- a request such as "turn this into an infographic"

Steps:

1. If the input is a URL, fetch/open the page and extract the main article content. Preserve title, date/author if available, headings, body text, lists, tables, and key quotes.
2. Save normalized Markdown to `/tmp/miao-vision/article.md`.
3. Run `miao-viz article`:

```bash
miao-viz article /tmp/miao-vision/article.md \
  --style editorial \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

4. Return the generated artifact path to the user.

If `miao-viz article` is not available yet, explain that the installed CLI is older than the article workflow and fall back only if the user agrees. Do not try to recreate the whole infographic pipeline manually inside the skill.

Keep URL fetching in the agent workflow. Do not require the CLI to fetch URLs directly.

### Data File → Visualization Report

Use this workflow when the user asks for a report, analysis, dashboard, charts, or visualizations from a data file.

**Fast path (< 100 rows or pure KPI summary):** Skip Phase 2 targeted profiling. Run `miao-viz profile --summary <file>` then go directly to a single aggregate query in Phase 3. The Narrative Plan is still required, even if short.

---

#### Phase 1 — Intent Extraction

Fill this out from the user request and filename alone, **before any CLI commands**:

```
INTENT CARD
══════════════════════════════════════════
User question     : [core analytical question from the user's request]
Analysis type     : [up to 2 of: trend / comparison / distribution / correlation / KPI]
Primary measure   : [guessed numeric column name, e.g. sales, revenue]
Primary dimension : [guessed grouping column name, e.g. region, category]
Time focus        : [yes / no]
══════════════════════════════════════════
```

#### Phase 2 — Targeted Profiling

1. Run the lightweight summary to confirm column names match Intent Card guesses:

```bash
miao-viz profile --summary <file>
```

2. If column names don't match your guesses, revise the Intent Card (once only).

3. Select at most 5 relevant columns and load their detailed statistics:

```bash
miao-viz profile --columns col1,col2,col3 <file>
```

Column selection priority: primary measure (required) → primary dimension (required) → time column (if time focus = yes) → secondary measure/dimension (optional).

**Rules:** Do not load full profile before Phase 1. Maximum 5 columns per `--columns` call.

#### Phase 3 — Narrative Planning

Run 1–3 `miao-viz query` calls to get real aggregated values, then output a Narrative Plan (see the Narrative Planning section in the Decision Framework). Maximum 3 queries; exceeding this requires explicit justification.

Only proceed to spec writing after completing the Narrative Plan.

#### Phase 4 — Spec Writing, Validation, and Render

1. Write spec in YAML or JSON using the Decision Framework below and `https://raw.githubusercontent.com/maishou-dev/miao-vision/main/packages/miao-vision-skill/references/vizspec.md`. Ground every insight in the Narrative Plan's real numbers.
2. Run Self-Review (Step G) before finalising.
3. Validate:

```bash
miao-viz validate --spec /tmp/miao-vision/report.yaml --profile /tmp/miao-vision/profile.json
```

4. Fix structured errors once when possible (`FIELD_NOT_FOUND`, `MISSING_ENCODING`, `UNSUPPORTED_CHART_TYPE`).
5. Render:

```bash
miao-viz render \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/report.yaml \
  --theme editorial \
  --format html \
  --output /tmp/miao-vision/report.html
```

Return the generated HTML path to the user. Use `--theme editorial` for all user-facing reports.

### Data File → Presentation Deck

Use this workflow when the user asks for:

- slides
- a presentation
- a PPT/PPTX-like output
- a deck
- 演示文稿
- 汇报材料
- something "for a meeting", "for executives", "for the boss", or "to present"

Steps:

1. Run `miao-viz profile <file>` to inspect the data.
2. Read the profile JSON and decide the story arc: opening claim, key metrics, supporting chart, and closing implication.
3. Create a DeckSpec YAML using `https://raw.githubusercontent.com/maishou-dev/miao-vision/main/packages/miao-vision-skill/references/vizspec.md`.
4. Render the deck directly. Do not run `miao-viz validate`; DeckSpec uses its own schema inside the `deck` command.

```bash
miao-viz deck \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/deck.yaml \
  --theme editorial \
  --output /tmp/miao-vision/deck.html
```

5. Return the generated HTML path to the user.

Use `--theme editorial` for user-facing decks unless the user asks for `dark` or `minimal`.

If `miao-viz deck` returns `INVALID_DECK_SPEC`, read the `errors` array and fix the reported `path` first. Common fixes:

- Add `charts` to `text-chart`, `metrics-chart`, and `chart-full` slides.
- Add 1-4 `metrics` to each `metrics-chart` slide.
- Use only a `table` chart inside `table-full`.
- Split more than 4 metrics across multiple slides.

If it returns `DECK_FIELD_NOT_FOUND`, use the reported `path` and `field` to correct the chart or metric transform. Only reference input fields from the profile, or fields created earlier in the same transform chain.

Example DeckSpecs are available in the CLI package:

- `examples/sales-deck.yaml`
- `examples/product-metrics-deck.yaml`
- `examples/finance-review-deck.yaml`
- `examples/ops-update-deck.yaml`

## Decision Framework for Spec Creation

### Choose the right command

- User says "report", "analysis", "dashboard", "chart", "visualization", or asks for detailed findings → use `miao-viz render`.
- User says "slides", "presentation", "PPT", "deck", "演示", "演示文稿", "汇报", "给老板看", "for a meeting", or "executive briefing" → use `miao-viz deck`.
- User provides an article URL, Markdown file, plain text article, or asks to "turn this into an infographic" → use `miao-viz article`.
- If the request mixes report and presentation, ask only if the output format is ambiguous. Otherwise prefer the explicitly named format.

### Phase 3: Narrative Planning (required before writing spec)

Before creating any spec, run 1–3 `miao-viz query` commands to get real aggregated values, then produce a Narrative Plan. Maximum 3 query calls; exceeding this requires explicit justification.

**Query examples:**

```bash
# Ranking by measure
miao-viz query sales.csv --groupby region --measure "sum(sales) as total_sales" --orderby total_sales --limit 10

# KPI total
miao-viz query sales.csv --measure "sum(sales) as total, count(*) as orders"

# Filtered sub-group
miao-viz query sales.csv --filter "region=East" --groupby quarter --measure "sum(sales) as east_sales" --orderby quarter
```

**Narrative Plan format** (output this before writing the spec):

```
NARRATIVE PLAN
══════════════════════════════════════════════════════════
Main story   : [1–2 sentences summarising the most important finding, using real numbers]

Data evidence: (from miao-viz query — list the actual values)
  - [field]: [real value] ([share or change %])
  - [field]: [real value]

Chart intents:
  Chart 1 ([type]): [which analytical goal this chart serves]
  Chart 2 ([type]): [which analytical goal this chart serves]

Excluded charts: [chart types not generated and why]

Insight drafts:
  - "[statement grounded in real numbers above]"
  - "[statement grounded in real numbers above]"
══════════════════════════════════════════════════════════
```

Only proceed to spec writing after completing the Narrative Plan. Every insight in the spec must reference a value that appears in the "Data evidence" section above.

**Fast path:** For files with fewer than 100 rows or pure KPI summaries, Phase 3 can be reduced to a single total-aggregate query. The Narrative Plan still must be output, even if short.

### Step A — Read profile hints

The `hints` array in the profile is the primary signal. Map each hint to a chart type:

| Hint type | Chart to use | Notes |
| --- | --- | --- |
| `kpi` | `bigvalue` | Place ALL kpi hints first, group them together |
| `time-series` | `line` or `area` | Use `xField` as x, pick primary `yField` as y |
| `ranking` | `bar` | Use `groupField` as x, `measureField` as y; add aggregate + sort + limit 10 |
| `share` | `pie` | Use `labelField` as label, `valueField` as value; add aggregate |
| `distribution` | `histogram` | Use `field` as x; add note "(skewed)" to title if `skewed: true` |
| `correlation` | `scatter` | Use `a` as x, `b` as y; mention r value in title |

**Chart order:** KPI bigvalues → time-series → ranking → share/pie → distribution → scatter → table (always last if useful).

### Step B — Apply cardinality rules

Even without hints, apply these rules when choosing chart type:

- `distinctCount ≤ 5` → pie is fine
- `distinctCount 6–12` → bar is better than pie
- `distinctCount > 12` → table only (too many categories for pie/bar)
- `topSharePct` — **do not use in insights**. This field measures row frequency (how often a value appears), not value contribution (its share of the total measure). The two diverge significantly on skewed data. To get actual value share, run a `miao-viz query` aggregation instead (see Phase 3, available in P1).
- `temporal.gapCount > 0` → note missing periods in a chart caption only; do not assert "missing data" in insights (gaps may be non-business days or expected sparse periods)

### Step C — Write insights

Populate the `insights` field with 2–4 short sentences grounded in the Narrative Plan's query results. Write in plain language for non-technical readers:

```yaml
insights:
  - "East generated 240 in sales, 53.3% of the 450 total, making it the largest region."
  - "West generated 120 in sales, half of East's total."
```

Primary source for insight text:
- `miao-viz query` values listed in the Narrative Plan's Data evidence section.

Allowed supplemental sources:
- `skewness` > 1 or < -1 → mention skewed distribution only when `rows ≥ 30` and the statistic is included in Data evidence.
- `correlations[].r` > 0.6 or < -0.5 → mention relationship only when `n ≥ 10` and the statistic is included in Data evidence.
- `outlierCount` > 0 → mention outliers only when `rows ≥ 20` and the statistic is included in Data evidence.
- **Forbidden**: `topSharePct` — row frequency, not value contribution. Never use as a percentage claim in insights.
- **Forbidden for assertion**: `temporal.gapCount` — note in caption only, never assert "N periods of missing data" in insights.

### Step D — Insights Grounding rules

Every insight sentence must be traceable to one of these allowed sources:

| Source | Example | Allowed in insights |
| --- | --- | --- |
| `miao-viz query` real aggregated value from Narrative Plan | `sum(sales, region=East)=240` | ✅ Yes |
| Profile statistic with sufficient sample and listed in Data evidence (`rows ≥ 30` for skewness, `n ≥ 10` for correlation) | `skewness=2.1, rows=1200` | ✅ Yes |
| User's own statement in the request | "user said Q3 was weak" | ✅ Yes |
| **Profile `topSharePct`** | `topSharePct=0.5` | ❌ No — row frequency, not value share |
| Profile statistic with insufficient sample | `skewness=2.1, rows=8` | ❌ No — statistically unreliable |
| `temporal.gapCount` as a claim | `gapCount=29` → "29 missing days" | ❌ No — assert in caption only |

**Forbidden insight patterns:**

```yaml
# ❌ topSharePct misread as value share
- "East region accounts for 50% of sales."
  # topSharePct=0.5 means East appears in 50% of rows, not 50% of revenue

# ❌ Small-sample skewness assertion
- "Data shows a strong right skew (skewness=2.1)."
  # rows=8 — skewness has no statistical meaning here

# ❌ gapCount misread as missing records
- "The time series has 29 days of missing data."
  # gapCount counts calendar gaps; non-business days are expected
```

### Step E — Temporal granularity rules

When a `time-series` hint exists, use `temporal.granularity` to pick the right transform:

- `granularity = day` → use the date field directly as x, no derive-month needed
- `granularity = month` → use `derive-month` transform on the date field
- `granularity = year` → use `bar` instead of `line` (few data points)

### Step F — Chart Budget

- Default maximum: **6 charts** per report (4 `bigvalue` blocks count as 1).
- Every chart must serve one of the analytical goals stated in the Intent Card.
- Two charts of the same type (e.g. two `bar`) must cover clearly different dimensions.
- When over budget, merge rather than drop:
  - Multiple trends → multi-line `line` chart
  - Multiple measure bars → grouped `bar` chart

### Step G — Self-Review before submitting spec

Output the following checklist explicitly (as a comment block or separate reasoning step) before finalising the spec. Do not skip this step.

```
Self-Review:
  [ ] Every insight traces to a Narrative Plan query value, an evidence-listed reliable profile statistic, OR the user's own statement?
  [ ] No insight cites topSharePct as a value-share percentage?
  [ ] No insight asserts gapCount as "missing data"?
  [ ] No insight relies on a statistic where rows < 30 (skewness) or n < 10 (correlation)?
  [ ] Chart count ≤ 6 (bigvalue groups counted as 1)?
  [ ] Every chart maps to a goal in the Intent Card?
  [ ] Time-series granularity matches derive-month usage?
```

Resolve any unchecked items before rendering.

## Defaults

- Default output: HTML.
- Default working directory for generated specs/artifacts: `/tmp/miao-vision`.
- Do not call an LLM from the CLI. The agent writes the spec from the profile and user request.
- Use supported MVP chart types unless the user explicitly asks for unsupported/experimental charts.
- For article workflows, use `--style editorial` by default unless the user asks for `executive`, `analytical`, `storytelling`, or `minimal`.
- For URL workflows, normalize the URL to local Markdown before calling the CLI.

## References

- Read `https://raw.githubusercontent.com/maishou-dev/miao-vision/main/packages/miao-vision-skill/references/vizspec.md` before writing specs.
- Read `https://raw.githubusercontent.com/maishou-dev/miao-vision/main/packages/miao-vision-skill/references/examples.md` when the request is ambiguous or close to an existing example.
