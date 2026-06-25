# Article-to-Infographic Implementation Plan

This document defines the product implementation plan for the `infographics` track. It is written from a product-management perspective: scope, user promise, phased delivery, and acceptance criteria.

## Product Positioning

Article-to-Infographic is a first-class product workflow, not another chart type.

The user gives an agent an article URL, Markdown file, or long-form text. The agent normalizes the source into local Markdown, calls `miao-viz article`, and returns a polished static infographic artifact.

The first product promise should be narrow and reliable:

```text
local Markdown/text
  -> miao-viz article
  -> single-file HTML infographic
```

URL fetching remains in the agent or skill layer for the first release. The CLI should accept deterministic local input and should not own browser extraction, redirects, login flows, or dynamic-page handling.

## Implementation Baseline

The repository presents Article-to-Infographic as a product track and now has a deterministic CLI baseline.

- The skill workflow instructs agents to call `miao-viz article`.
- The CLI accepts local Markdown/text input and writes HTML, JSON, or Markdown output.
- The product uses a dedicated `InfographicSpec` instead of forcing article sections into chart specs.
- The first renderer is static HTML with inline CSS and no browser runtime dependency.
- URL fetching remains outside the CLI and belongs to the agent/skill layer.

The next product gap is visual depth: expand templates and export options after the baseline HTML artifact is stable.

## MVP Scope

### Inputs

- Local Markdown file.
- Local plain-text file.
- Markdown normalized by an agent from an article URL.

### Outputs

- `html`: single-file static infographic artifact.
- `json`: structured `InfographicSpec` for debugging and automation.
- `markdown`: normalized narrative output for inspection and fallback.

### Styles

MVP styles:

- `editorial`: default user-facing style.
- `executive`: concise, business-review oriented.
- `minimal`: plain, low-decoration output.

Deferred styles:

- `analytical`
- `storytelling`

### First Templates

The MVP should support a small set of strong, reusable section templates:

- Hero summary: title, source, subtitle, and primary conclusion.
- Key facts: 3-6 important numbers, claims, or facts.
- Timeline: chronological sequence when dates or milestones are present.
- Comparison: side-by-side contrast between entities, options, or periods.
- Quote or callout: highlighted quote, warning, implication, or insight.
- Takeaways: final recommendations, lessons, or implications.

## Target Workflow

```text
User request
  -> Agent reads URL or local file
  -> Agent normalizes content into Markdown
  -> miao-viz article <markdown-file> --style editorial --format html --output <artifact.html>
  -> Agent returns the generated artifact path
```

Example CLI shape:

```bash
miao-viz article ./article.md \
  --style editorial \
  --format html \
  --output /tmp/miao-vision/article-infographic.html
```

The CLI should return structured JSON on failure, consistent with existing agent-oriented commands.

## Product Model

Article infographics should use a dedicated `InfographicSpec`. They should not be forced into the existing `AgentReportSpec.charts[]` model.

Reasoning:

- Data reports are field-encoding driven.
- Article infographics are narrative-section driven.
- Validation, template selection, and agent instructions are clearer when the product model matches the source material.

Recommended high-level shape:

```text
InfographicSpec
  title
  subtitle
  source
  style
  summary
  sections[]

InfographicSection
  type
  title
  items[]
  emphasis
  notes
```

Initial section types:

- `hero`
- `facts`
- `timeline`
- `comparison`
- `quote`
- `takeaways`

## Delivery Phases

### Phase 1: Command Contract

Goal: make `miao-viz article` a real, testable command.

Deliverables:

- Add the `article` command to the CLI command surface.
- Accept local Markdown and plain-text input.
- Support `--style`.
- Support `--format json,markdown`.
- Emit structured errors for missing input, unsupported format, unreadable files, and empty content.
- Add CLI help text and README command documentation.

Acceptance criteria:

- A local Markdown file can be converted into a JSON `InfographicSpec`.
- `miao-viz article --help` describes the command and supported formats.
- The skill no longer points to a missing command.

### Phase 2: Static HTML Artifact

Goal: produce a useful single-file infographic that users can open and share.

Deliverables:

- Add a static HTML renderer for `InfographicSpec`.
- Inline all CSS.
- Implement the MVP section templates.
- Implement `editorial` and `minimal` styles.
- Include source/title metadata in the artifact.
- Add sample article fixtures and golden output checks.

Acceptance criteria:

- `miao-viz article ./sample.md --format html --output out.html` succeeds.
- The generated artifact has a clear infographic layout, not a generic report layout.
- The output has no runtime backend dependency and can be opened directly in a browser.

### Phase 3: Agent Experience

Goal: make the Codex/Claude skill workflow reliable.

Deliverables:

- Update skill instructions to match the actual CLI behavior.
- Keep URL fetching and article extraction in the agent layer.
- Document Markdown normalization expectations.
- Add examples for article URL, Markdown file, and pasted long-form text.
- Define one repair attempt for common CLI errors.

Acceptance criteria:

- Given a URL, the agent extracts article content, writes local Markdown, calls `miao-viz article`, and returns the HTML path.
- Given a Markdown file, the agent can skip URL extraction and call the CLI directly.
- If the CLI fails, the agent reports the structured error and does not manually invent an infographic pipeline.

### Phase 4: Template Expansion

Goal: increase coverage and visual quality after the MVP is stable.

Candidate templates:

- Process or flow.
- Problem-solution.
- Pros and cons.
- Stat grid.
- Risk matrix.
- Framework or 2x2 matrix.
- Checklist.

Template selection rules should be explicit and agent-readable:

- Date or milestone sequence -> timeline.
- Multiple metrics or evidence points -> key facts or stat grid.
- Two entities, options, or periods -> comparison.
- Process language -> flow.
- Recommendations or risks -> takeaways or risk matrix.

Acceptance criteria:

- New templates can be selected by deterministic rules.
- Each template has at least one realistic sample article.
- Template additions do not require changes to the data-report chart schema.

### Phase 5: Export Formats

Goal: support sharing and presentation use cases after HTML is stable.

Delivery order:

1. PNG screenshot export.
2. PDF print export.
3. Optional long-image or paginated output.

PNG/PDF may use Playwright or a browser renderer, but this dependency should not block the Phase 1 and Phase 2 CLI contract.

## Priority

### P0

- `miao-viz article` command.
- Dedicated `InfographicSpec`.
- JSON and Markdown output.
- HTML renderer.
- Skill and CLI documentation alignment.

### P1

- Editorial visual quality.
- Sample article fixtures.
- Structured validation and errors.
- Tests for command, parser, spec generation, and renderer.

### P2

- More templates.
- PNG/PDF export.
- Web preview/gallery.
- Style variants beyond `editorial`, `executive`, and `minimal`.

## Non-Goals For The First Release

- Do not restore the old Web demo as the primary product path.
- Do not make the CLI fetch URLs directly.
- Do not require an LLM API inside the CLI.
- Do not treat article infographics as ordinary chart specs.
- Do not block the MVP on PNG/PDF export.
- Do not rebuild the removed BI workspace or dashboard runtime.

## Product Acceptance Standard

The first complete release is accepted when:

> A user gives an agent a Markdown file or article URL. The agent normalizes the content, calls `miao-viz article`, and returns a single-file HTML infographic with title, summary, key facts, structured sections, and clear visual hierarchy.

At that point, Article-to-Infographic moves from roadmap promise to usable product capability.
