# Miao Vision Skill Triggering and Scope Improvement Plan

## 1. Background

External evaluation found that the Miao Vision skill describes its main capabilities but does not make all limitations or trigger conditions sufficiently clear. As a result, an agent may not know when to select the skill, when to reject an adjacent task, or which workflow to run after selection.

The current `skills/miao-vision/SKILL.md` has three structural issues:

- Its frontmatter description is primarily a long capability list rather than a precise selection contract.
- Its body begins with self-installation and CLI bootstrap instructions even though scope and workflow have not yet been confirmed.
- Its routing table assumes that selection was correct and does not provide a compact recovery guard for accidental or explicit loading on an unsupported task.

## 2. Goals

- Improve automatic skill selection for article infographics, data reports, browser decks, chart recommendations, and Miao Vision spec validation.
- Reduce false triggers for text-only work, general analysis without a visual deliverable, raster image creation, native PowerPoint authoring, and live or remote-data dashboards.
- Separate selector metadata, post-trigger scope protection, workflow routing, and execution instructions.
- State the HTML, URL handling, local-data, PPTX, and remote-system boundaries directly.
- Preserve progressive disclosure by keeping detailed workflow knowledge in `references/` and deterministic rules in the CLI.
- Add measurable selection, routing, and scope-recovery evaluations.

## 3. Non-Goals

- Do not change CLI commands, schemas, validation behavior, renderers, or output contracts.
- Do not add URL fetching to the CLI.
- Do not add remote database connections, data uploads, hosted BI, or live dashboards.
- Do not add native `.pptx` generation.
- Do not edit generated or copied skill files as source.
- Do not duplicate the chart catalog, renderer internals, or reference workflows in `SKILL.md`.

## 4. Core Design Model

The skill must use four distinct layers. Each layer has one owner and must not duplicate another layer's decisions.

| Layer | Loaded when | Responsibility |
|---|---|---|
| Frontmatter selector | Before skill selection | Describe what the skill does and every material context in which it should trigger |
| Scope Guard | After the skill loads | Recover safely from an explicit or accidental load for an unsupported request |
| Request Router | After scope confirmation | Select exactly one article, report, deck, chart-selection, or spec-validation path |
| Workflow references and CLI rules | Only when required | Execute the selected path with domain-specific guidance and deterministic validation |

### 4.1 Frontmatter Is the Only Selection Contract

The selector sees `name` and `description` before it decides whether to load the body. Therefore, all material positive trigger information must live in `description`. A body section named `When To Use` cannot improve initial selection and should not be added.

The description should include:

- Supported source classes: article URL, Markdown, long-form text, and local CSV/TSV/XLSX/JSON data.
- Supported deliverables: article infographic, self-contained HTML chart or report, and browser-based data deck.
- Non-rendering triggers: chart recommendation and Miao Vision spec validation.
- High-risk exclusions: text-only work, raster images, native PPTX, and live or remote-data dashboards.
- URL responsibility: the agent fetches and normalizes article URLs before invoking the CLI.

### 4.2 Scope Guard Is a Recovery Mechanism

The body is loaded only after selection or explicit skill invocation. The body-level guard must therefore be named `Scope Guard`, not `Trigger Gate`. It should prevent installation or CLI work when:

- The user does not want a supported visual deliverable, chart recommendation, or Miao Vision spec validation.
- The request requires a capability outside the documented boundaries.
- The user requires a native file or live system that Miao Vision does not produce.

The guard must run before reference loading, CLI resolution, network approval, or installation.

### 4.3 Request Router Owns Workflow Selection

Only `Route The Request` should map intent to references. The Scope Guard must not repeat article, report, deck, chart-selection, or validation routing. This prevents drift when workflows change.

### 4.4 Production Instructions Must Stay Lean

The body should contain only information that is useful after the skill loads. Detailed examples and evaluation prompts belong in test fixtures or this plan, not in production instructions.

Use the following size guidance:

- Treat approximately 300-400 characters as a soft target for `description`, not a hard correctness limit.
- Prefer complete trigger coverage over arbitrary character reduction.
- Target approximately 140 lines or fewer for `SKILL.md` after removing self-install documentation.
- Keep the body comfortably below the general 500-line skill limit.

## 5. Proposed Production Structure

Use this order in `skills/miao-vision/SKILL.md`:

1. YAML frontmatter with only `name` and `description`.
2. One-sentence product definition.
3. `Scope Guard`.
4. `Route The Request`.
5. `CLI Bootstrap`.
6. `Global Execution Rules`.
7. `Shared References`.
8. `Source Of Truth`.

Do not add separate `When To Use`, `When Not To Use`, or trigger-example sections. Their selector-relevant content belongs in frontmatter, and their detailed examples belong in evaluation fixtures.

Move `Agent Self-Install` out of `SKILL.md`. The repository already has dedicated installation documents under `skills/miao-vision/install/`; update those files or public installation documentation if installation guidance changes. CLI bootstrap remains in the skill because a selected task may still need to resolve or install the executable.

## 6. Proposed Copy

### 6.1 Frontmatter

Use imperative language consistently:

```yaml
---
name: miao-vision
description: >
  Use Miao Vision to create article infographics from URLs, Markdown, or long-form
  text; self-contained HTML charts or reports from local CSV, TSV, XLSX, or JSON;
  browser-based data decks; chart recommendations; or Miao Vision spec validation.
  The agent fetches article URLs. Excludes text-only work, raster images, native
  PPTX, and live or remote-data dashboards.
---
```

This copy explicitly retains article URL discoverability while assigning fetching responsibility to the agent. It does not claim dashboard generation as a supported primary artifact.

### 6.2 Scope Guard

```md
## Scope Guard

Before reading workflow references, resolving the CLI, or requesting installation:

1. Confirm that the request requires an article infographic, an HTML chart or
   report from local structured data, a browser-based data deck, a chart
   recommendation, or Miao Vision spec validation.
2. Stop and use an appropriate alternative when the request is text-only, requires
   a raster image or native `.pptx`, depends on a live or remote data source, or
   otherwise exceeds the limitations below.

Ask one concise clarification question only when the required deliverable or file
format is materially ambiguous.
```

### 6.3 Compact Limitations

Keep limitations with the Scope Guard or immediately after it. Avoid duplicating them in `Global Execution Rules`.

```md
## Limitations

- Produce self-contained HTML artifacts by default.
- Treat deck output as a browser-based HTML presentation, not native PowerPoint.
- Fetch article URLs in the agent workflow and normalize them to local Markdown or text.
- Require local CSV, TSV, XLSX, or JSON input for data-report rendering.
- Do not connect to remote databases, upload user data, or create live dashboards.
- Ground report metrics and findings in available evidence; do not invent them.
- Use catalog-supported charts and sections; do not improvise unsupported types.
```

### 6.4 Request Router

Keep routing in one table. Remove broad terms such as bare `analysis` and `dashboard` unless they are paired with a supported visual deliverable.

| User intent | Required reference |
|---|---|
| Article URL, Markdown, or long-form text explicitly requested as an infographic | `references/article-infographic.md` and `references/composition-playbook.md` |
| Local CSV/TSV/XLSX/JSON requested as an HTML chart, report, visualization, or evidence-backed findings artifact | `references/data-report.md`, `references/report-intelligence.md`, `references/chart-selection.md`, and `references/anti-patterns.md` |
| Slides, presentation, deck, executive briefing, or meeting brief accepted as browser-based HTML | `references/browser-deck.md` |
| Chart recommendation for local structured data | `references/chart-selection.md` and, when needed, `references/anti-patterns.md` |
| Miao Vision report or deck spec validation | `references/vizspec.md` plus the relevant report or deck reference |

If a request mixes report and presentation, prefer the explicitly named final deliverable. Ask one concise question only if the deliverable remains materially ambiguous.

## 7. Evaluation Design

Do not evaluate selection and routing as one operation. Run three separate suites so each failure has a clear owner.

### 7.1 Metadata Selection Evaluation

Input only the skill `name`, `description`, and user request. Do not expose the body, expected label, rationale, or proposed fix.

Record:

- Expected trigger: yes or no.
- Actual trigger: yes or no.
- False positive or false negative classification.
- Model and configuration used.
- Baseline result from the current description.
- Candidate result from the revised description.

Report precision, recall, accuracy, false-positive count, and false-negative count. Require all high-risk exclusion cases to remain false.

### 7.2 Post-Trigger Routing Evaluation

Force the revised skill to load, then provide only supported positive requests. Record the selected workflow and references. The expected output is one primary route, with additional shared references only when the routing table explicitly allows them.

Report route accuracy separately from selector accuracy.

### 7.3 Scope-Recovery Evaluation

Force the revised skill to load for unsupported or ambiguous requests. Verify that it:

- Stops before resolving or installing the CLI for unsupported work.
- Does not fetch or normalize content when no infographic is requested.
- Does not promise native PPTX, raster-image, live-dashboard, or remote-database output.
- Asks no more than one concise question for materially ambiguous deliverables.

### 7.4 Evaluation Corpus

Store the durable corpus outside the packaged skill, for example at `tests/skill-evals/miao-vision-trigger-cases.json`. Start with at least 24 prompts: eight positive selection cases, eight negative selection cases, four ambiguous cases, and four routing-specific cases.

Minimum coverage:

| Category | Example request | Expected result |
|---|---|---|
| Positive | Turn this article URL into an infographic. | Trigger; article route |
| Positive | Convert this Markdown essay into an editorial infographic. | Trigger; article route |
| Positive | Create a self-contained HTML report from this CSV. | Trigger; report route |
| Positive | Visualize this XLSX file as a chart. | Trigger; report route |
| Positive | Turn this sales data into a browser presentation for executives. | Trigger; deck route |
| Positive | Which chart best fits these fields? | Trigger; chart-selection route |
| Positive | Validate this Miao Vision report spec. | Trigger; spec-validation route |
| Positive | Check whether this deck spec uses valid fields. | Trigger; spec-validation route |
| Negative | Summarize this article. | Do not trigger |
| Negative | Translate this Markdown file. | Do not trigger |
| Negative | Analyze this CSV and explain its data-quality problems. | Do not trigger by default |
| Negative | Create a photorealistic poster. | Do not trigger |
| Negative | Edit this PNG image. | Do not trigger |
| Negative | Deliver an editable native PPTX file. | Do not trigger |
| Negative | Build a live dashboard connected to PostgreSQL. | Do not trigger |
| Negative | Fetch the body text from this URL. | Do not trigger |
| Ambiguous | Make a presentation from this data. | Clarify HTML deck versus native PPTX if required |
| Ambiguous | Build a dashboard from this spreadsheet. | Clarify static HTML report versus live dashboard |
| Ambiguous | Analyze this article visually. | Clarify the expected visual artifact |
| Ambiguous | Make this data easier to understand. | Clarify whether a visual deliverable is wanted |
| Routing | Create an infographic from this locally normalized article. | Article route |
| Routing | Build an evidence-backed HTML findings report from this JSON. | Report route |
| Routing | Make a browser-based meeting brief from this CSV. | Deck route |
| Routing | Recommend a chart without rendering it. | Chart-selection route |

Add Chinese equivalents in the evaluation fixture before release to protect multilingual selection behavior. Keep the production plan and skill instructions in English.

### 7.5 Acceptance Thresholds

- Achieve 100% accuracy on the eight high-risk negative cases.
- Achieve at least 90% recall on positive selector cases.
- Achieve at least 90% routing accuracy on supported requests.
- Introduce no regression in chart-recommendation or spec-validation selection.
- Prevent CLI bootstrap on every unsupported scope-recovery case.
- Compare the candidate against the current description and document every changed result.

Run more than one independent pass when the selected model or selector is nondeterministic. Preserve raw prompts, outputs, and labels without leaking expected answers into the tested context.

## 8. Implementation Plan

### Phase 1: Rewrite the Selector Contract

- [ ] Update only the source frontmatter in `skills/miao-vision/SKILL.md`.
- [ ] Include all positive selection contexts in `description`.
- [ ] Include the highest-risk exclusions without turning the description into an exhaustive policy document.
- [ ] Treat the 300-400 character range as a soft target and verify behavior with the metadata selection suite.

### Phase 2: Restructure the Skill Body

- [ ] Remove `Agent Self-Install` from the production skill body.
- [ ] Keep installation guidance under `skills/miao-vision/install/` and public installation documentation.
- [ ] Add `Scope Guard` before routing, reference loading, and CLI bootstrap.
- [ ] Add one compact `Limitations` section.
- [ ] Keep workflow ownership exclusively in `Route The Request`.
- [ ] Remove duplicate limitations from `Global Rules` and rename it `Global Execution Rules`.
- [ ] Keep the final source skill near 140 lines or fewer when practical.

### Phase 3: Add Evaluation Assets

- [ ] Add the versioned evaluation corpus outside the packaged skill.
- [ ] Implement or document separate metadata-selection, routing, and scope-recovery runners.
- [ ] Capture a baseline against the current source before replacing its description.
- [ ] Run the candidate on the same prompts and compare metrics and raw failures.
- [ ] Add multilingual equivalents before release without placing the complete corpus in `SKILL.md`.

### Phase 4: Validate Metadata and Packaging

- [ ] Run the Skill Creator validator:

  ```bash
  python3 "${CODEX_HOME:-$HOME/.codex}/skills/.system/skill-creator/scripts/quick_validate.py" skills/miao-vision
  ```

- [ ] Check whether `skills/miao-vision/agents/openai.yaml` exists and still matches the revised skill.
- [ ] If metadata is absent or stale, read the Skill Creator `openai_yaml.md` reference and generate `display_name`, `short_description`, and `default_prompt` deterministically.
- [ ] Run `npm run check:size`.
- [ ] Run `npm run pack:skill`.
- [ ] Run `npm run build` when synchronizing the web public copy.
- [ ] Do not edit `apps/web/public/SKILL.md`, `apps/web/dist/SKILL.md`, or CLI `dist/` files directly.

## 9. Acceptance Criteria

### Production Skill

- Frontmatter contains every material positive trigger and the highest-risk exclusions.
- The body contains no separate `When To Use` or trigger-example section.
- `Scope Guard` is clearly described as post-trigger recovery, not selector logic.
- Scope confirmation occurs before reference loading, CLI resolution, network approval, or installation.
- `Route The Request` is the only workflow mapping.
- URL fetching responsibility, local-data requirements, HTML output, and non-PPTX deck behavior are explicit.
- Self-install instructions no longer consume production skill context.
- Detailed evaluation examples remain outside the packaged skill.

### Evaluation

- The baseline and candidate use the same versioned prompt corpus.
- Selection, routing, and scope recovery are scored separately.
- All thresholds in Section 7.5 pass.
- Raw failures are retained so future revisions can reproduce the comparison.

### Engineering

- Skill Creator validation passes.
- `agents/openai.yaml` is either generated and consistent or its deliberate absence is documented.
- `npm run check:size` passes.
- `npm run pack:skill` passes.
- `npm run build` passes when public copies are refreshed.
- No generated directory is edited as source.
- CLI structured output and rendering behavior remain unchanged.

## 10. Risks and Mitigations

| Risk | Impact | Mitigation |
|---|---|---|
| Over-compressed frontmatter | Missed article or non-rendering triggers | Use a soft size target and optimize against measured recall |
| Excessive negative wording | Selector may associate the skill with excluded tasks | Keep only high-risk exclusions and verify false positives empirically |
| Body-level guard mistaken for selector logic | Reviewers expect it to prevent initial loading | Name it `Scope Guard` and test it only in scope-recovery evaluation |
| Duplicate routing rules | Article, report, and deck behavior drifts | Keep workflow mapping only in `Route The Request` |
| Installation content remains in the body | Wasted context on every task | Move self-install guidance to existing installation documents |
| Evaluation leakage | Unrealistically high apparent accuracy | Hide expected labels and proposed fixes from evaluated agents |
| Small or unbalanced corpus | False confidence in selector quality | Use at least 24 balanced prompts and add real failures over time |
| PPT wording over-promises `.pptx` | Wrong deliverable and tool choice | State browser-based HTML deck boundaries in selector and Scope Guard |

## 11. Post-Launch Feedback Loop

Review selector and routing feedback for two release cycles. Add every confirmed false positive, false negative, or wrong route to the versioned evaluation corpus before changing copy again. Prioritize recurring failures involving text-only analysis, URL responsibility, dashboard ambiguity, and native PPTX expectations.

## 12. Definition of Done

The improvement is complete when the source skill uses the four-layer model, self-install content has moved out of the production body, metadata and body validation pass, the three evaluation suites meet their thresholds, packaging succeeds, generated copies are refreshed through the supported build flow, and the first post-release review date is recorded.
