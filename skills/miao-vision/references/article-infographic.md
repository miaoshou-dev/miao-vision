# Article URL / Markdown To Infographic

Use this workflow when the user provides an article URL, a Markdown file, a plain-text article, pasted long-form text, or asks to "turn this into an infographic".

Use the **atomic bundle quality path** for polished user-facing output (default). Use single-composition specs only when the user explicitly asks for one integrated composition. Use the auto-extract path only for quick drafts, short articles, or tight token budgets. For long articles, use the long-article mode.

## Path A: Atomic Bundle + `--bundle-input` (Default)

The agent understands the article and writes an `InfographicBundleSpec`: a numbered set of atomic chart blocks. Each block has one visual, one claim, one explanation, and a stable id such as `fig-03-market-structure`. This improves accuracy and lets users request local edits like "修改 fig-03-market-structure".

1. If the input is a URL, fetch/open the page and extract the main article content. Preserve title, date/author if available, headings, body text, lists, tables, and key quotes.
2. Save normalized Markdown to `/tmp/miao-vision/article.md`.
3. Extract compact, source-grounded claims (see below).
4. Group claims into 3-6 atomic chart blocks. Use one visual per block.
5. Assign stable, readable ids in display order: `fig-01-timeline`, `fig-02-kpi-summary`, `fig-03-market-structure`.
6. Choose the visual for each block by data shape (see Visual Components below).
7. Write `/tmp/miao-vision/article-bundle.json`.
8. Render with `--bundle-input`:

```bash
miao-viz article \
  --bundle-input /tmp/miao-vision/article-bundle.json \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

9. Return the generated artifact path to the user.

Aim for 3-6 atomic blocks. Every block should have `id`, `order`, `title`, `claim`, `explanation`, and `visual`.

```json
{
  "title": "Global Market Expansion Timeline",
  "summary": "One-sentence page summary.",
  "style": "executive",
  "layout": "stacked",
  "blocks": [
    {
      "id": "fig-01-market-timeline",
      "order": 1,
      "title": "Market Entry Timeline",
      "claim": "The expansion unfolded through four yearly milestones.",
      "explanation": "2020 focused on APAC, 2021 added Europe, 2022 entered North America, and 2023 added emerging markets.",
      "evidenceIds": ["c1", "c2", "c3", "c4"],
      "visual": {
        "type": "timeline-path",
        "data": {
          "items": [
            { "label": "2020", "text": "APAC accounted for 60% of revenue." },
            { "label": "2021", "text": "Europe increased to 25%." }
          ]
        }
      }
    }
  ]
}
```

For sharing and presentation, use `--format png` or `--format pdf`:

   ```bash
   miao-viz article \
     --bundle-input /tmp/miao-vision/article-bundle.json \
     --format png \
     --output /tmp/miao-vision/article-infographic.png
   ```

   Note: `png` and `pdf` export require Playwright. Install with:

   ```bash
   npm install --save-dev @playwright/test && npx playwright install chromium
   ```

### Long Article Mode

Use when the article is long enough that carrying the full text through every step would waste token budget.

1. Chunk the article into sections (by headings or paragraph groups).
2. Extract top 5-8 claims per chunk.
3. Merge all claims into one list (deduplicate).
4. Write the atomic bundle blocks from merged claims — do not include the full article text.

### Token Budget Rules

- Keep `claims[]` to 12-20 items for ordinary articles.
- Keep each claim under 160 characters when possible.
- Keep the bundle to 3-6 atomic blocks.
- Keep each block focused on one visual claim.
- Do not include the full article when generating the final `InfographicBundleSpec`; include compact claims and selected block explanations.
- For long articles, chunk first and keep only top claims from each chunk, then merge.
- Skip the outline step for short articles (<5 claims) and generate `claims -> InfographicBundleSpec` directly.

## Compact Claims

Claims are the bridge between article understanding and infographic structure.

```json
{
  "claims": [
    {
      "id": "c1",
      "kind": "stat",
      "text": "Revenue grew 42% in 2025.",
      "source": "p4",
      "confidence": "high"
    }
  ]
}
```

Allowed claim kinds: `stat`, `claim`, `quote`, `event`, `risk`, `recommendation`, `contrast`, `process`, `definition`.

Rules:

- Every number, date, quote, and strong conclusion in the final spec must come from a claim.
- Do not carry the full article into the final spec-writing prompt when compact claims and outline are enough.
- If the article is mostly opinion, preserve the author's argument and avoid fabricating metrics.

## Narrative Arc

**Do not skip this step.** Before grouping claims into sections, classify the article's primary type and choose a narrative arc. The arc determines which section types appear and how they flow. If you don't consciously choose an arc, you will default to a template — every infographic will look the same.

### Article Type → Arc → Section Sequence

| Article type | Definition | Narrative arc | Typical section sequence example |
|---|---|---|---|
| **Technical diagnosis** | Root cause analysis, debugging journey, performance investigation | Problem → Tools explored → Root cause → Interventions → Result → Cost | hero → comparison → timeline → before-after → metric-bars → quote → takeaways |
| **Behavioral guide** | Best practices, rules, team norms, how-to | Principles → Universal rules → Advanced rules → Common pitfalls → Action list | hero → checklist → pros-cons → comparison → checklist → quote → takeaways |
| **Scientific narrative** | Evidence chain, research synthesis, biological mechanism | Origin → Evidence chain → Mechanism → Implications → Actions | hero → kpi-strip → timeline-path → concept-contrast → stat-grid → checklist → takeaways |
| **Opinion / argument** | Thesis-driven, polemic, position piece | Claim → Arguments → Counterpoint → Rebuttal → Conclusion | hero → facts → concept-contrast → quote → comparison → takeaways |
| **Data / listicle** | Rankings, comparisons, enumerations | Overview → Categories → Comparison → Ranking → Summary | hero → kpi-strip → stat-grid → ranked-list-chart → comparison → takeaways |
| **Narrative / story** | Personal journey, historical account, case study | Setting → Conflict → Discovery → Resolution → Lesson | hero → timeline-path → callout-diagram → before-after → quote → takeaways |

Rules:

- The arc is a **starting point**, not a straitjacket. Adapt freely, but pick one consciously before writing a single section.
- **If this article's type matches the last infographic you wrote, force yourself to change at least 2 section types.** E.g., if you used `checklist` last time for a guide, use `pros-cons` this time.
- After selecting the arc, map each claim to the section type that best serves the **narrative**, not the section type you used for similar claims in the previous infographic.

## Composition Selection

After choosing the narrative arc, select a **composition type** for the page-level layout. The composition determines how sections are arranged as a whole.

**Do not force short structured business text into the default article-linear layout.**
**Do not treat `style: "editorial"` as a layout choice.** `style` is only the visual theme; `composition.type` is the rendering layout.

| Input characteristics | Recommended composition |
|---|---|
| Long editorial article, scientific narrative, text-heavy multi-section | `article-linear` (default) |
| Stage progression with numeric values (growth → maturity → decline) | `lifecycle-curve` |
| KPIs + recommendations + compact decision brief | `strategy-dashboard` |
| Mechanism, system, cause-effect, how-it-works | `explainer-map` |
| Option A vs B, tradeoffs, before/after alternatives | `comparison-matrix` |

Add both `composition` and `compositionDecision` to the spec. The CLI rejects specs that omit `compositionDecision`.

```json
{
  "composition": { "type": "lifecycle-curve", "emphasis": "metrics" },
  "compositionDecision": {
    "recommended": "lifecycle-curve",
    "selected": "lifecycle-curve",
    "confidence": 0.91,
    "rationale": "The article has ordered lifecycle phases with numeric phase values.",
    "signals": ["stage progression", "numeric phase metrics"],
    "dataShape": ["4 ordered phase points", "metric-bars visual"],
    "alternatives": [
      { "type": "article-linear", "reason": "Use if the user wants narrative order instead of a curve." }
    ],
    "needsUserChoice": false
  }
}
```

Allowed `emphasis` values: `narrative`, `metrics`, `actions`, `structure`.

If `needsUserChoice` is true, do not render. Ask the user to choose from the alternatives, then regenerate the spec.

## Section Outline

Group claims into infographic sections according to the chosen narrative arc.

```json
{
  "thesis": "The article's central message in one sentence.",
  "narrativeArc": "technical-diagnosis",
  "sections": [
    { "type": "facts", "title": "Key Facts", "claimIds": ["c1", "c3"] },
    { "type": "timeline", "title": "Diagnosis Journey", "claimIds": ["c4", "c5", "c6"] }
  ]
}
```

Section-to-claim mapping rules (use the narrative arc to prioritize which rules fire):

- Numbers or quantitative claims → `facts` (or `stat-grid` for 4+ metrics).
- Dates, milestones, releases, or history → `timeline`.
- Two entities, options, sides, or periods → `comparison`.
- Explicit quote or distinctive sentence → `quote`.
- Recommendations, implications, or lessons → `takeaways`.
- Steps, stages, or ordered process → `process` (near-term).
- Pros/cons, upside/downside → `pros-cons` (near-term).
- Risks, likelihood, impact, mitigation → `risk-matrix` (near-term).
- Actionable items, to-dos, verification steps → `checklist`.
- System architecture, data flow, dependency chain → `system-diagram` (use `callout-diagram` for annotation-heavy explanation).
- Before/after state, intervention result → `before-after`.

## Single-Composition InfographicSpec (Advanced / Legacy)

Use this only when the user explicitly asks for one integrated page-level composition or when maintaining older `--spec-input` workflows. For default article infographics, prefer the atomic bundle path above.

Write a valid `InfographicSpec` after claims and outline are stable.

```json
{
  "title": "Article Title",
  "subtitle": "One-line summary",
  "source": "https://example.com/article",
  "style": "editorial",
  "composition": { "type": "article-linear", "emphasis": "narrative" },
  "compositionDecision": {
    "recommended": "article-linear",
    "selected": "article-linear",
    "confidence": 0.88,
    "rationale": "The source is a long-form article with mixed narrative sections.",
    "signals": ["long-form editorial structure", "mixed section flow"],
    "dataShape": ["facts, quote, and takeaways"],
    "alternatives": [],
    "needsUserChoice": false
  },
  "summary": "Two-sentence summary of the key finding.",
  "sections": [
    {
      "type": "hero",
      "title": "Article Title",
      "emphasis": "Lead sentence.",
      "items": [{ "text": "Lead sentence." }]
    },
    {
      "type": "facts",
      "title": "Key Facts",
      "items": [
        { "value": "42%", "text": "Increase in reported cases since 2020." },
        { "value": "$1.2B", "text": "Estimated economic impact." }
      ]
    },
    {
      "type": "takeaways",
      "title": "Takeaways",
      "items": [
        { "text": "Regulators are expected to respond by Q3." }
      ]
    }
  ],
  "metadata": { "inputFile": "", "generatedAt": "", "wordCount": 0 }
}
```

Allowed section types: `hero`, `facts`, `timeline`, `comparison`, `quote`, `takeaways`, `process`, `pros-cons`, `stat-grid`, `risk-matrix`, `checklist`.

Every section must have at least one item. `hero` is required and must come first.

If `miao-viz article` returns `INVALID_INFOGRAPHIC_SPEC`, read the `issues` array and fix each reported `path`. Common fixes:

- Add `"text"` to every item.
- Add at least one item to each section.
- Use only allowed section types.
- Ensure `title` and `summary` are non-empty strings.

Composition-specific errors:

- `MISSING_COMPOSITION_DECISION`: regenerate the spec using this workflow.
- `COMPOSITION_DECISION_MISMATCH`: make `composition.type` match `compositionDecision.selected`.
- `COMPOSITION_DATA_INSUFFICIENT`: repair the data shape required by the selected composition, or ask the user to choose a different composition.
- `COMPOSITION_SELECTION_REQUIRED`: show `choices[]` to the user and regenerate the spec with their selection.

## Visual Components

Sections can include an optional `visual` field to replace text layout with an SVG graphic. When `visual` is present, the section renders the graphic first, with `items` as supporting annotations below.

Aim for these targets per infographic:
- **visual component count ≥ 4**
- **SVG visual count ≥ 2** (all types except kpi-strip)
- **text-only sections ≤ 3**

### Complete Visual Type Catalog

**Pick visual types that match the data shape, not the ones you used last time.**

| # | Type | Data shape (`visual.data`) | Best for | Anti-pattern (don't use when) |
|---|---|---|---|---|
| 1 | `kpi-strip` | `{ items: [{ label, value, unit?, delta? }] }` | Headline numbers, KPIs, percentages, short deltas | Items lack numeric values → use `stat-grid` or text instead |
| 2 | `metric-bars` | `{ items: [{ label, value, unit? }] }` | A vs B, before vs after, proportional comparison | More than 8 items (bars get cramped) |
| 3 | `process-flow` | `{ items: [{ label, text }] }` | Step sequences, investigation paths, causal chains | Fewer than 3 steps (not enough for a flow) |
| 4 | `concept-contrast` | `{ items: [{ label, text, key1, key2, ... }] }` | Multi-dimensional comparison across shared criteria | Items have **only** `{ label, text }` — must add dimension keys or pick a different visual |
| 5 | `timeline-path` | `{ items: [{ label, text }] }` | Events, phases, historical progression, evidence chains | Fewer than 3 milestones |
| 6 | `part-to-whole` | `{ items: [{ label, value }] }` | Proportional breakdown, composition, market share | Values don't sum to a meaningful whole |
| 7 | `before-after` | `{ items: [{ label, text?, value? }], before?: [], after?: [], beforeLabel?, afterLabel? }` | Intervention results, state change, pre/post treatment | No clear before/after boundary in the article |
| 8 | `tradeoff-matrix` | `{ items: [{ label, text, detail? }], xLabel?, yLabel? }` | 2×2 quadrant evaluation (priority, risk, strategy) | Items don't fit a 2×2 grid naturally |
| 9 | `ranked-list-chart` | `{ items: [{ label, value }] }` | Rankings, leaderboards, priority ordering | Fewer than 3 items to rank |
| 10 | `system-diagram` | `{ nodes: [{ label, color?, zone? }], edges: [{ from, to }] }` | System architecture, data flow, dependency graph | No clear node-edge structure |
| 11 | `callout-diagram` | `{ items: [{ label, text, detail? }] }` | Annotated explanations, feature callouts | Just a plain list → use `facts` or `takeaways` instead |
| 12 | `icon-cluster` | `{ items: [{ label, text }] }` | Grouped concepts, category overviews, feature sets | More than 9 items (grid overflows) |

### Visual Type Selection Guide

Map the section content to a visual type by asking:

1. **What shape is the data?** — Single numbers? → `kpi-strip`. Paired values? → `metric-bars`. Multi-key comparison? → `concept-contrast`. Ranking? → `ranked-list-chart`.
2. **Is it a sequence?** — Steps? → `process-flow`. Milestones? → `timeline-path`.
3. **Is it a structure?** — Architecture? → `system-diagram`. Annotations? → `callout-diagram`. Categories? → `icon-cluster`.
4. **Does it contrast two states?** — Before/after? → `before-after`. 2×2 tradeoffs? → `tradeoff-matrix`. Composition? → `part-to-whole`.

**Variety rule:** Across the 6-7 sections in your spec, use at least **3 different visual types**. If two visuals are the same type, they must serve clearly different content purposes (e.g., one `kpi-strip` for energy numbers, one `metric-bars` for latency comparison — not two `kpi-strip` sections).

### Visual Data Requirements (Per Type)

**`concept-contrast`** — Each item must have **extra keys beyond `label` and `text`** to define comparison dimensions (rows):

```json
// ✅ Correct — extra keys (对比维度, 适用场景) become table rows
{ "label": "Profiler A", "text": "Description", "对比维度": "值1", "适用场景": "场景A" }

// ❌ Wrong — only label+text, renders empty
{ "label": "Profiler A", "text": "Description" }
```

**`process-flow`** — Items are rendered as numbered cards in a grid, not as an SVG flowchart with arrows. Best for 3-6 steps.

**`before-after`** — Can use either `items` + `before`/`after` arrays, or a single `items` array where each item has both states:

```json
{ "items": [{ "label": "Latency", "value": 3500, "unit": "ms" }],
  "before": [{ "label": "Before", "value": 3500 }],
  "after": [{ "label": "After", "value": 500 }],
  "beforeLabel": "1GiB / 2 vCPU",
  "afterLabel": "10 vCPU" }
```

**`system-diagram`** — Requires explicit `nodes` and `edges` arrays. Node indices are 0-based. `zone` groups nodes vertically.

**`tradeoff-matrix`** — Exactly 4 items (for 4 quadrants). Items without explicit placement are ordered: top-right → top-left → bottom-left → bottom-right.

### Example: Section With Visual

```json
{
  "type": "comparison",
  "title": "Profiler Comparison",
  "visual": {
    "type": "concept-contrast",
    "data": {
      "items": [
        { "label": "CPU Profiler", "text": "Samples RUNNABLE only", "Visibility": "Partial", "Overhead": "Low", "Native Frames": "No" },
        { "label": "Wallclock", "text": "Samples all thread states", "Visibility": "Full", "Overhead": "Higher", "Native Frames": "Yes" }
      ]
    },
    "caption": "Wallclock captures off-CPU time invisible to CPU profiling."
  },
  "items": [
    { "text": "CPU profiling missed ~50% of endpoint time spent in allocation stalls." }
  ]
}
```

### Quality Feedback

The CLI emits warnings in the JSON response when visual density is low:

```json
{
  "ok": true,
  "value": {
    "warnings": [
      { "code": "low_visual_density", "message": "..." }
    ]
  }
}
```

Aim for zero warnings on the final render. If the article is inherently text-heavy (guide, philosophy), `checklist` and `quote` sections are acceptable — but still aim for ≥2 SVG visuals.

## Self-Review: Avoid Template Traps

Before writing the final spec, run this checklist. **If you cannot honestly check every box, revise the spec before rendering.**

```
Narrative Arc Check:
  [ ] Did I explicitly choose a narrative arc from the table, or did I default to the same
      sequence as my last infographic?
  [ ] If this article type matches my previous one, did I change at least 2 section types?

Visual Variety Check:
  [ ] How many visual types am I using? (target ≥ 3 different types)
  [ ] Am I defaulting to kpi-strip + timeline-path + comparison again?
  [ ] Which unused visual types could replace a section? (before-after? pros-cons?
      callout-diagram? icon-cluster? tradeoff-matrix? ranked-list-chart?

Section Diversity Check:
  [ ] Are my section types the same 4-5 as my last 2 infographics?
  [ ] If yes, restart: pick a different narrative arc and rebuild the outline.

Data Shape Check:
  [ ] Does each visual's data match the required shape in the catalog?
  [ ] concept-contrast items have extra dimension keys (not just label+text)?
  [ ] before-after has a clear before/after boundary?
  [ ] system-diagram has both nodes[] and edges[]?
  [ ] tradeoff-matrix fits a 2x2 grid?
```

## Path B: Auto-Extract Quick Draft

The CLI can parse the article and generate an `InfographicSpec` automatically using regex-based extraction. Use this for quick drafts, short articles (<5 sections), or when the user explicitly asks for a fast result without structured claims/outline.

```bash
miao-viz article /tmp/miao-vision/article.md \
  --style editorial \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

Path B is a fallback, not the standard. For user-facing output, use Path A.

If `miao-viz article` returns a structured error, fix the input or command once when the repair is obvious. Do not recreate a separate HTML pipeline manually inside the skill.

## Examples

- URL input, quality path: fetch/open the URL, extract the article body, save `/tmp/miao-vision/article.md`, write `/tmp/miao-vision/article-bundle.json`, then run `miao-viz article --bundle-input /tmp/miao-vision/article-bundle.json --format html --output /tmp/miao-vision/article-infographic.html`.
- Markdown file input, quality path: read the file, write compact claims and `/tmp/miao-vision/article-bundle.json`, then render with `--bundle-input`.
- Pasted text input, quality path: write the text to `/tmp/miao-vision/article.md`, write `/tmp/miao-vision/article-bundle.json`, then render with `--bundle-input`.
- Quick draft: run `miao-viz article /tmp/miao-vision/article.md --style editorial --format html --output /tmp/miao-vision/article-infographic.html`.
