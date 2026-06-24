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

Use this workflow when the user asks for:

- a report
- analysis
- a dashboard-like HTML artifact
- charts or visualizations from data
- detailed findings that should be read as a document

1. Run `miao-viz profile <file>` to inspect the data.
2. Read the profile JSON — pay close attention to the `hints` array and `correlations`.
3. Create a YAML or JSON report spec using the decision framework below and `https://raw.githubusercontent.com/guming/miao-vision/main/packages/miao-vision-skill/references/vizspec.md`.
4. Validate it:

```bash
miao-viz validate --spec /tmp/miao-vision/report.yaml --profile /tmp/miao-vision/profile.json
```

5. Fix structured errors once when possible, especially `FIELD_NOT_FOUND`, `MISSING_ENCODING`, and `UNSUPPORTED_CHART_TYPE`.
6. Render HTML with the editorial theme by default:

```bash
miao-viz render \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/report.yaml \
  --theme editorial \
  --format html \
  --output /tmp/miao-vision/report.html
```

Return the generated HTML path to the user. Use `--theme editorial` for all user-facing HTML reports. Use `--theme default` only when the user explicitly asks for plain or minimal output.

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
3. Create a DeckSpec YAML using `https://raw.githubusercontent.com/guming/miao-vision/main/packages/miao-vision-skill/references/vizspec.md`.
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

## Decision Framework for Spec Creation

### Choose the right command

- User says "report", "analysis", "dashboard", "chart", "visualization", or asks for detailed findings → use `miao-viz render`.
- User says "slides", "presentation", "PPT", "deck", "演示", "演示文稿", "汇报", "给老板看", "for a meeting", or "executive briefing" → use `miao-viz deck`.
- User provides an article URL, Markdown file, plain text article, or asks to "turn this into an infographic" → use `miao-viz article`.
- If the request mixes report and presentation, ask only if the output format is ambiguous. Otherwise prefer the explicitly named format.

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
- `topSharePct > 0.7` → note dominant category in the insights field
- `temporal.gapCount > 0` → note missing periods in insights

### Step C — Write insights

Populate the `insights` field with 2–4 short sentences based on profile signals. Write in plain language for non-technical readers:

```yaml
insights:
  - "Sales are right-skewed (skewness 2.1): a small number of large orders drive most revenue."
  - "North region accounts for 43% of total sales — the dominant market."
  - "Strong correlation between sales and quantity (r=0.87): bundle promotions may amplify revenue."
  - "2 months have no data in the time series — the trend chart may show gaps."
```

Sources for insight text:
- `skewness` > 1 or < -1 → mention skewed distribution
- `topSharePct` > 0.5 → mention dominant value
- `correlations[].r` > 0.6 → mention positive correlation
- `correlations[].r` < -0.5 → mention negative relationship
- `temporal.gapCount` > 0 → mention missing periods
- `outlierCount` > 0 → mention outliers and their potential impact

### Step D — Temporal granularity rules

When a `time-series` hint exists, use `temporal.granularity` to pick the right transform:

- `granularity = day` → use the date field directly as x, no derive-month needed
- `granularity = month` → use `derive-month` transform on the date field
- `granularity = year` → use `bar` instead of `line` (few data points)

## Defaults

- Default output: HTML.
- Default working directory for generated specs/artifacts: `/tmp/miao-vision`.
- Do not call an LLM from the CLI. The agent writes the spec from the profile and user request.
- Use supported MVP chart types unless the user explicitly asks for unsupported/experimental charts.
- For article workflows, use `--style editorial` by default unless the user asks for `executive`, `analytical`, `storytelling`, or `minimal`.
- For URL workflows, normalize the URL to local Markdown before calling the CLI.

## References

- Read `https://raw.githubusercontent.com/guming/miao-vision/main/packages/miao-vision-skill/references/vizspec.md` before writing specs.
- Read `https://raw.githubusercontent.com/guming/miao-vision/main/packages/miao-vision-skill/references/examples.md` when the request is ambiguous or close to an existing example.
