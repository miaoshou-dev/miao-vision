# Article-to-Infographic Implementation Plan

This document defines the implementation plan for the `infographics` track. It reflects the current repository state: `miao-viz article` already exists, produces static HTML/JSON/Markdown from local article input, and can render a pre-built `InfographicSpec` through `--spec-input`.

The next goal is not merely to add more templates. The next goal is to make article-to-infographic reliable enough for user-facing agent workflows.

## Product Positioning

Article-to-Infographic is a first-class product workflow, not another chart type.

The user gives an agent an article URL, Markdown file, or long-form text. The agent normalizes the source, understands the article, writes or requests an `InfographicSpec`, calls `miao-viz article`, and returns a polished static artifact.

The product promise should stay narrow:

```text
article URL / Markdown / pasted text
  -> agent extraction and article understanding
  -> InfographicSpec
  -> miao-viz article
  -> single-file HTML infographic
```

URL fetching remains in the agent or skill layer. The CLI should accept deterministic local input and should not own browser extraction, redirects, login flows, or dynamic-page handling.

## Current Baseline

The repository already has the deterministic MVP foundation.

- The skill workflow instructs agents to call `miao-viz article`.
- The CLI accepts local Markdown/text input and writes HTML, JSON, or Markdown output.
- The CLI accepts `--spec-input` for agent-authored `InfographicSpec` JSON.
- The product uses a dedicated `InfographicSpec` instead of forcing article sections into chart specs.
- The first renderer is static HTML with inline CSS and no browser runtime dependency.
- URL fetching remains outside the CLI and belongs to the agent/skill layer.

The main product gap is quality of understanding and structure. Regex-based auto extraction is useful for quick drafts, but a user-facing article infographic needs an agent-led structured reading path.

## User-Facing Modes

### Fast Mode

Use when the article is short, the user asks for a quick draft, or token budget is tight.

```text
article.md
  -> miao-viz article article.md --format html
```

This mode relies on deterministic CLI extraction. It is acceptable as a fast fallback, but it should not be treated as the highest-quality path.

### Quality Mode

Use by default for user-facing article URL, Markdown, or pasted long-form text requests.

```text
article
  -> compact claims
  -> section outline
  -> InfographicSpec
  -> miao-viz article --spec-input
```

The agent owns article understanding. The CLI owns schema validation and deterministic rendering.

### Long Article Mode

Use when the article is long enough that carrying the full text through every step would waste context.

```text
article chunks
  -> top claims per chunk
  -> merged claims
  -> section outline
  -> InfographicSpec
  -> miao-viz article --spec-input
```

Intermediate claims and outlines should be stored in temporary files when useful. Do not keep replaying full source text into every subsequent generation step.

## Token Budget Rules

The quality path increases tokens, but it should reduce rework and hallucinated structure. Keep the intermediate representation compact.

- Keep `claims[]` to 12-20 items for ordinary articles.
- Keep each claim under 160 characters when possible.
- Keep the section outline to 4-6 sections.
- Keep each section to 3-6 items.
- Do not include the full article when generating the final `InfographicSpec`; include compact claims and the selected outline.
- For long articles, chunk first and keep only top claims from each chunk.
- Skip the outline step for short articles and generate `claims -> InfographicSpec` directly.

## Article Understanding Model

The agent should not write `InfographicSpec` directly from raw article text in one step. Use a small structured reading pipeline.

### Step 1: Normalize Source

Extract and preserve:

- title
- source URL or file path
- author/date when available
- headings
- paragraphs with stable paragraph ids
- lists
- tables
- direct quotes

### Step 2: Extract Compact Claims

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

Allowed claim kinds:

- `stat`
- `claim`
- `quote`
- `event`
- `risk`
- `recommendation`
- `contrast`
- `process`
- `definition`

Rules:

- Every number, date, quote, and strong conclusion must come from a claim.
- Claims should be source-grounded, not invented.
- If the article is mostly opinion, preserve the author's argument and avoid fabricating metrics.

### Step 3: Build A Section Outline

Group claims into infographic sections before writing the final spec.

```json
{
  "thesis": "The article's central message in one sentence.",
  "sections": [
    { "type": "facts", "title": "Key Facts", "claimIds": ["c1", "c3"] },
    { "type": "timeline", "title": "What Changed", "claimIds": ["c2", "c5"] },
    { "type": "takeaways", "title": "Takeaways", "claimIds": ["c8"] }
  ]
}
```

Selection rules:

- Numbers or quantitative claims -> `facts` or future `stat-grid`.
- Dates, milestones, releases, or history -> `timeline`.
- Two entities, options, sides, or periods -> `comparison`.
- Explicit quote or distinctive sentence -> `quote`.
- Recommendations, implications, or lessons -> `takeaways`.
- Steps, stages, or ordered process -> future `process`.
- Risks, likelihood, impact, or mitigation -> future `risk-matrix`.

### Step 4: Write InfographicSpec

The agent writes a valid `InfographicSpec` and renders it through `--spec-input`.

```bash
miao-viz article \
  --spec-input /tmp/miao-vision/article-spec.json \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

The CLI validates structure. If validation fails, the agent should repair the JSON once using the structured error. It should not invent a separate rendering path.

## Product Model

Article infographics use a dedicated `InfographicSpec`. They must not be forced into the existing `AgentReportSpec.charts[]` model.

Reasoning:

- Data reports are field-encoding driven.
- Article infographics are narrative-section driven.
- Validation, template selection, and agent instructions are clearer when the product model matches the source material.

Current high-level shape:

```text
InfographicSpec
  title
  subtitle
  source
  style
  summary
  sections[]
  metadata

InfographicSection
  type
  title
  items[]
  emphasis
  notes
```

Current section types:

- `hero`
- `facts`
- `timeline`
- `comparison`
- `quote`
- `takeaways`

Near-term section types:

- `process`
- `pros-cons`
- `stat-grid`
- `risk-matrix`
- `checklist`

## Research Directions To Borrow

These papers are useful as implementation guidance, not as required dependencies.

| Direction | Source | How Miao Vision should borrow it |
|---|---|---|
| Text-to-infographic metadata | [Infogen](https://arxiv.org/abs/2507.20046) | Treat `InfographicSpec` as the intermediate metadata layer; do not ask the agent to write HTML. |
| Fact extraction and visual story organization | [Compendia](https://arxiv.org/abs/2602.07410) | Use `claims -> grouped story outline -> sections` as the agent workflow. |
| Schema-guided decomposition | [Map&Make](https://arxiv.org/abs/2505.23174) | Break text into atomic/propositional claims before filling a schema. |
| Long-document structure | [StrucSum](https://arxiv.org/abs/2505.22950) | For long articles, preserve structure and central claims instead of relying on lead paragraphs. |
| Dense but readable summary | [Chain of Density](https://arxiv.org/abs/2309.04269) | Improve `summary`, `hero.emphasis`, and `takeaways` without making them verbose. |
| Factuality checking | [FActScore](https://arxiv.org/abs/2305.14251), [OpenFActScore](https://arxiv.org/abs/2507.05965) | Every generated fact should be decomposable and supported by source claims. |
| Structured JSON generation | [JSONSchemaBench](https://arxiv.org/abs/2501.10868) | Keep `InfographicSpec` schema-constrained and repair validation errors through the CLI. |

## Delivery Plan

### P0: Make The Quality Path Official

Goal: make `--spec-input` the default high-quality agent path.

Deliverables:

- Update skill instructions so Path B is not just a fallback; it is the preferred quality path.
- Add a short `claims -> outline -> InfographicSpec` example.
- Add one realistic fixture using an agent-authored spec.
- Ensure `INVALID_INFOGRAPHIC_SPEC` errors remain structured and easy to repair.
- Add guidance that the CLI auto extraction path is fast mode, not the highest-quality mode.

Acceptance criteria:

- Given an article URL, the agent can extract content, write compact claims, write an `InfographicSpec`, render with `--spec-input`, and return the HTML path.
- Given malformed spec JSON, the agent can repair once from the CLI `issues` array.
- The workflow does not require any LLM API inside the CLI.

### P1: Visual Reliability Of Current HTML

Goal: make generated HTML look usable across common article shapes before expanding many templates.

Deliverables:

- Refactor dynamic section numbering; do not hardcode `01`, `02`, `03`, `04`.
- Ensure long titles, long facts, and long quotes do not overflow on mobile.
- Include source/title metadata visibly enough for a shared artifact.
- Add realistic fixtures covering English, Chinese, list-heavy, quote-heavy, and data-heavy articles.
- Add smoke checks that generated HTML includes expected section types and inline CSS.

Acceptance criteria:

- HTML opens directly in a browser without backend or runtime dependencies.
- Section numbers are correct regardless of which sections are present.
- Mobile layout remains readable for long titles and long item text.

### P2: Template Expansion

Goal: increase coverage after the quality path and current renderer are reliable.

Add the following section types to the `InfographicSectionType` union and schema.

| Section Type | Selection Signal | Visual Format | Items Limit |
|---|---|---|---|
| `process` | Steps, phases, stages, first/then/finally, numbered steps | Connected step flow | 3-6 |
| `pros-cons` | Pros/cons, advantages/disadvantages, upside/downside | Two-column grouped list | 2-8 |
| `stat-grid` | 4+ quantitative claims | Compact metric grid | 4-8 |
| `risk-matrix` | Risk, impact, likelihood, severity, mitigation | 2x2 likelihood/impact matrix | 2-8 |
| `checklist` | Checkbox lines, readiness, requirements, prerequisites | Vertical checklist | 2-10 |

Implementation notes:

- `pros-cons` should use `item.label` values such as `Pro` and `Con`.
- `risk-matrix` should use `item.label` as the quadrant.
- Avoid JSON strings inside `notes` for grouped data.
- Keep detection deterministic for the fast path.
- Let the quality path select these templates from claims/outline.

Acceptance criteria:

- Each new template has at least one realistic fixture.
- Template additions do not require changes to the data-report chart schema.
- Agent-authored `--spec-input` can use the same section types as CLI auto extraction.

### P3: Renderer Structure And File Size

Goal: avoid crossing source file size limits while adding templates.

Do not wait until files exceed the 500-line hard limit. Split renderer code once the new templates materially expand CSS and HTML.

Recommended structure:

```text
packages/miao-viz-cli/src/
  article-infographic.ts        # parsing, auto extraction, schemas
  article-html.ts               # renderer shell
  article-html-css.ts           # CSS builder
  article-section-renderers.ts  # section render functions
```

If section behavior becomes more complex later, introduce an `article-templates/` registry. It is not needed for the first template expansion if the split above is enough.

### P4: Export Formats

Goal: support sharing and presentation use cases after HTML is stable.

Delivery order:

1. PNG screenshot export.
2. PDF print export.
3. Optional long-image or paginated output.

PNG/PDF may use Playwright or a browser renderer, but this dependency must not block the HTML product path.

Implementation notes:

- Lazy-load Playwright only when `png` or `pdf` is requested.
- Return a structured `MISSING_PLAYWRIGHT` error when unavailable.
- Keep Playwright optional; do not make basic HTML generation depend on it.

## Non-Goals

- Do not add URL fetching to the CLI.
- Do not require an LLM API inside the CLI.
- Do not ask the agent to write HTML directly.
- Do not treat article infographics as ordinary chart specs.
- Do not block the usable product on PNG/PDF export.
- Do not restore the old Web demo as the primary product path.
- Do not rebuild the removed BI workspace or dashboard runtime.

## Verification

For documentation-only changes:

```bash
npm run check:size
```

For CLI behavior changes:

```bash
npm run test:run
npm run build:cli
npm run check:size
```

For article renderer changes, include at least one workflow-level smoke test:

```bash
npm run miao-viz -- article test_data/article-editorial.md \
  --style editorial \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

For `--spec-input` changes, include a fixture that renders a spec generated from compact claims and a section outline.

## Product Acceptance Standard

Article-to-Infographic becomes user-usable when:

> A user gives an agent a Markdown file, article URL, or pasted long-form text. The agent extracts and understands the article, writes a source-grounded `InfographicSpec`, calls `miao-viz article --spec-input`, and returns a single-file HTML infographic with title, summary, key facts, structured sections, and clear visual hierarchy.

Fast mode can remain available, but quality mode is the standard for polished user-facing output.
