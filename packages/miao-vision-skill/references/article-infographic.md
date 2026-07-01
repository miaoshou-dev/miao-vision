# Article URL / Markdown To Infographic

Use this workflow when the user provides an article URL, a Markdown file, a plain-text article, pasted long-form text, or asks to "turn this into an infographic".

Use the **quality path** for polished user-facing output (default). Use the auto-extract path only for quick drafts, short articles, or tight token budgets. For long articles, use the long-article mode.

## Path A: Quality Spec + `--spec-input` (Default)

The agent understands the article and writes an `InfographicSpec`; the CLI validates and renders it.

1. If the input is a URL, fetch/open the page and extract the main article content. Preserve title, date/author if available, headings, body text, lists, tables, and key quotes.
2. Save normalized Markdown to `/tmp/miao-vision/article.md`.
3. Extract compact, source-grounded claims (see below).
4. Group claims into a short section outline (see below).
5. Plan visual components: for each section, decide whether to use a text layout or a visual graphic (see Visual Components below).
6. Write `/tmp/miao-vision/article-spec.json` including `section.visual` where applicable.
7. Render with `--spec-input`:

```bash
miao-viz article \
  --spec-input /tmp/miao-vision/article-spec.json \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

8. Return the generated artifact path to the user.

The CLI will emit visual density warnings if the spec is too text-heavy. Aim for at least 4 visual components and 2 SVG visuals per infographic.

For sharing and presentation, use `--format png` or `--format pdf`:

   ```bash
   miao-viz article \
     --spec-input /tmp/miao-vision/article-spec.json \
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
4. Write the section outline and `InfographicSpec` from merged claims — do not include the full article text.

### Token Budget Rules

- Keep `claims[]` to 12-20 items for ordinary articles.
- Keep each claim under 160 characters when possible.
- Keep the section outline to 4-6 sections.
- Keep each section to 3-6 items.
- Do not include the full article when generating the final `InfographicSpec`; include compact claims and the selected outline.
- For long articles, chunk first and keep only top claims from each chunk, then merge.
- Skip the outline step for short articles (<5 claims) and generate `claims -> InfographicSpec` directly.

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

## Section Outline

Group claims into infographic sections before writing the final spec.

```json
{
  "thesis": "The article's central message in one sentence.",
  "sections": [
    { "type": "facts", "title": "Key Facts", "claimIds": ["c1", "c3"] },
    { "type": "takeaways", "title": "Takeaways", "claimIds": ["c8"] }
  ]
}
```

Selection rules:

- Numbers or quantitative claims -> `facts` (or `stat-grid` for 4+ metrics).
- Dates, milestones, releases, or history -> `timeline`.
- Two entities, options, sides, or periods -> `comparison`.
- Explicit quote or distinctive sentence -> `quote`.
- Recommendations, implications, or lessons -> `takeaways`.
- Steps, stages, or ordered process -> `process` (near-term).
- Pros/cons, upside/downside -> `pros-cons` (near-term).
- Risks, likelihood, impact, mitigation -> `risk-matrix` (near-term).

## InfographicSpec

Write a valid `InfographicSpec` after claims and outline are stable.

```json
{
  "title": "Article Title",
  "subtitle": "One-line summary",
  "source": "https://example.com/article",
  "style": "editorial",
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

## Visual Components

Sections can include an optional `visual` field to replace text layout with an SVG graphic. When `visual` is present, the section renders the graphic first, with `items` as supporting annotations below.

Available visual types:

| Type | Purpose | Best for |
|---|---|---|
| `kpi-strip` | Compact KPI band | Headline numbers, counts, percentages, short deltas |
| `metric-bars` | Horizontal proportional bars | A vs B, before vs after, cost/size/latency comparison |
| `process-flow` | SVG node-link flowchart | Investigation paths, causal chains, step sequences |
| `concept-contrast` | Multi-column criteria matrix | Tool comparisons, conceptual distinctions |
| `timeline-path` | Connected milestone graphic | Events, phases, historical progression |

Aim for these targets per infographic:
- **visual component count ≥ 4**
- **SVG visual count ≥ 2** (metric-bars, process-flow, concept-contrast, timeline-path)
- **text-only sections ≤ 3**

### Visual Planning In The Quality Path

After writing compact claims and the section outline, decide which sections should use a visual:

```text
number or headline stat       → kpi-strip
two or more comparable values → metric-bars
step/stage/then/finally       → process-flow or timeline-path
A vs B/compared/unlike        → concept-contrast
```

Example: a section with `visual`:

```json
{
  "type": "facts",
  "title": "Recording Size",
  "visual": {
    "type": "metric-bars",
    "data": {
      "items": [
        { "label": "Default", "value": 250, "unit": "MiB" },
        { "label": "Reservoir", "value": 6, "unit": "MiB" }
      ]
    },
    "caption": "Reservoir sampling reduces recording size 40×."
  },
  "items": [{ "text": "Default wallclock produces 250MiB in 60s." }]
}
```

### Quality Feedback

The CLI emits warnings in the JSON response when visual density is low:

```json
{
  "ok": true,
  "value": {
    "output": "...",
    "warnings": [
      { "code": "low_visual_density", "message": "..." }
    ]
  }
}
```

Aim for zero warnings on the final render.

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

- URL input, quality path: fetch/open the URL, extract the article body, save `/tmp/miao-vision/article.md`, write `/tmp/miao-vision/article-spec.json`, then run `miao-viz article --spec-input /tmp/miao-vision/article-spec.json --format html --output /tmp/miao-vision/article-infographic.html`.
- Markdown file input, quality path: read the file, write compact claims and `/tmp/miao-vision/article-spec.json`, then render with `--spec-input`.
- Pasted text input, quality path: write the text to `/tmp/miao-vision/article.md`, write `/tmp/miao-vision/article-spec.json`, then render with `--spec-input`.
- Quick draft: run `miao-viz article /tmp/miao-vision/article.md --style editorial --format html --output /tmp/miao-vision/article-infographic.html`.
