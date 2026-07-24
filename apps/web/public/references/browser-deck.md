# Data File To Browser Deck

Use this workflow when the user asks for slides, a presentation, a deck, 演示文稿, 汇报材料, something for a meeting, executives, or a boss.

## Workflow

1. Analyze the data and save the evidence context.

```bash
miao-viz data analyze /path/to/data.csv \
  --intent "user request and audience" \
  --output /tmp/miao-vision/context.json
```

2. Instantiate a deterministic DeckSpec from the context.

```bash
miao-viz deck instantiate executive-brief \
  --context /tmp/miao-vision/context.json \
  --output /tmp/miao-vision/deck.yaml
```

Use `business-review` instead when the user needs a longer periodic review. The CLI selects applicable slide blocks and omits blocked trend or ranking slides. Review the generated spec before validation; do not replace its evidence metadata with newly calculated values.

For a custom narrative, read `context.json` and write a Deck Plan before editing DeckSpec.

The plan must include:

- `intent`: `executive-brief` or `business-review`
- `audience`
- `primaryQuestion`
- optional grounded `mainClaim`
- `slideOutline`
- `blockedClaims`
- `assumptions`
- warning codes that require caveats

Use factual claims only when they declare `claimType`, `evidence`, `derivedFrom`, and `check`. Do not invent aggregates or percentages that are absent from context evidence.

```yaml
deckPlan:
  intent: executive-brief
  audience: executives
  primaryQuestion: What changed and what needs attention?
  mainClaim:
    text: Revenue increased from the previous period.
    claimType: delta
    evidence: [by_time]
    derivedFrom:
      - $evidence:by_time.rows[0].revenue
      - $evidence:by_time.rows[1].revenue
    check: delta_formula
  slideOutline:
    - role: cover-claim
      purpose: State the verified conclusion.
      evidence: [by_time]
    - role: kpi-snapshot
      purpose: Show current scale.
      evidence: [total]
  blockedClaims:
    - text: Channel A caused the decline.
      reasonCode: causal_evidence_unavailable
      reason: Only descriptive aggregate evidence is available.
  assumptions:
    - key: primary_measure
      value: revenue
      reason: Highest-confidence metric candidate.
```

3. Confirm the intent and narrative pattern.

| Intent | Length | Default sequence |
|---|---:|---|
| `executive-brief` | 5-7 slides | claim, KPI, change/ranking, risk, next step |
| `business-review` | 6-10 slides | period summary, KPI, trend, ranking, composition, caveat/appendix |

Do not add a trend slide unless a time field has at least three periods. With two periods, use a delta or period-over-period comparison.

4. Build the DeckSpec with these first-release slide roles:

| Slide role | Requirement |
|---|---|
| `cover-claim` | One verified claim, or a question when no claim is reliable |
| `kpi-snapshot` | Up to four metrics |
| `trend-overview-slide` | Time + measure, at least three periods |
| `ranking-slide` | Dimension + measure and ordered rows evidence |
| `data-quality-slide` | Covers relevant `sampleWarnings` codes |

Each main slide may contain at most one claim, four metrics, and one chart. Put detailed tables in an appendix or generate a report instead.

5. Validate the deck against AnalyzeContext.

```bash
miao-viz deck validate \
  --spec /tmp/miao-vision/deck.yaml \
  --context /tmp/miao-vision/context.json \
  --verify \
  --strict
```

Repair the first reported issue path, then validate again. Do not remove grounding metadata merely to silence a warning.

6. Choose a theme. Default to `magazine` when the user has no preference.

| Theme | Style |
|---|---|
| `standard-white` | Clean blue and white |
| `magazine` | Serif type and warm paper |
| `standard-dark` | Dark presentation surface |
| `minimal` | Minimal and borderless |
| `nyt` | Newspaper-style serif |
| `bloomberg` | Dense terminal-inspired theme |
| `tableau` | BI dashboard-inspired theme |

7. Render with the same context used during validation.

```bash
miao-viz render deck \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/deck.yaml \
  --context /tmp/miao-vision/context.json \
  --strict \
  --theme <chosen-theme> \
  --output /tmp/miao-vision/deck.html
```

8. Return the generated HTML path.

## PDF Export

When the user requests a PDF deck, render the same validated DeckSpec directly:

```bash
miao-viz render deck \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/deck.yaml \
  --context /tmp/miao-vision/context.json \
  --strict \
  --theme <chosen-theme> \
  --format pdf \
  --output /tmp/miao-vision/deck.pdf
```

Deck PDF is fixed at 16:9 in the MVP. Each Slide must produce exactly one PDF page; navigation, interactive overlays, and speaker notes are excluded. Do not offer 4:3, `--include-notes`, or native PPTX as supported output.

PDF export requires Playwright Chromium. Surface structured `PDF_*` errors and layout diagnostics. Do not replace the browser-deck renderer or ask the user to print manually when direct CLI export was requested.

## Claim And Recommendation Rules

- Descriptive, rank, delta, trend, share, comparative, and evaluative claims need structured grounding.
- Evaluative claims need benchmark, target, baseline, or historical evidence.
- Causal and predictive claims are blocked in the first release.
- `analytical-next-step` may suggest additional analysis.
- `operational-recommendation` needs evidence, derived paths, and a caveat.
- Do not automatically generate strategic decisions, budget commitments, staffing actions, or deterministic forecasts.

## Error Repair

- `DECK_SLIDE_EVIDENCE_NOT_FOUND`: use an id from `context.evidence`.
- `DECK_CLAIM_EVIDENCE_PATH_NOT_FOUND`: fix the `$evidence:` path.
- `DECK_NUMERIC_CLAIM_UNGROUNDED`: add `claimType`, `evidence`, `derivedFrom`, and `check`.
- `DECK_TREND_REQUIRES_TIME_PERIODS`: rewrite as a delta or remove the trend slide.
- `DECK_EVALUATIVE_CLAIM_NEEDS_BENCHMARK`: add a real benchmark or use descriptive language.
- `DECK_MISSING_CAVEAT`: reference each applicable `sampleWarnings[].code` in deck or slide `warningRefs`.
- `DECK_SLIDE_OVERLOADED`: split the slide or reduce metrics/charts.

Example DeckSpecs are in `packages/miao-viz-cli/examples/`.
