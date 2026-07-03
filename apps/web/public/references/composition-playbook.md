# Infographic Composition Playbook

Use this playbook before writing an article `InfographicSpec`. Choose the page-level `composition` from narrative shape and data shape, not from isolated keywords.

## Decision Rules

- First decide what the source is trying to do: narrate, compare, explain, brief, or show lifecycle change.
- Then verify the data shape required by the composition.
- If two compositions are plausible and the confidence is below 0.65, set `compositionDecision.needsUserChoice: true` and ask the user.
- `style` controls visual theme. `composition` controls page structure.

## Composition Types

### `article-linear`

- Best for: long editorial articles, opinion pieces, research summaries, mixed narrative sections.
- Required data shape: sectioned prose with facts, timeline, comparison, quotes, or takeaways.
- Good visual pairings: `kpi-strip`, `timeline-path`, `concept-contrast`, `quote`, `takeaways`.
- Anti-patterns: do not use as a silent fallback when a structured composition was requested but invalid.
- Example outline: hero -> facts -> timeline -> quote -> takeaways.
- User choice wording: "Use a linear article infographic that preserves the source's narrative order."

### `lifecycle-curve`

- Best for: product lifecycle, adoption curve, growth to maturity to decline, staged metric change.
- Required data shape: at least 3 ordered phase points with numeric values.
- Good visual pairings: `metric-bars`, `timeline-path`, phase action cards.
- Anti-patterns: do not use for generic process steps with no measurable phase values.
- Example outline: hero -> phase metrics -> curve -> phase actions -> summary.
- User choice wording: "Use a lifecycle curve after adding ordered numeric phase data."

### `strategy-dashboard`

- Best for: executive brief, KPI review, business decision memo, risk/action plan.
- Required data shape: headline KPIs plus recommendations, risks, actions, or priorities.
- Good visual pairings: `kpi-strip`, `metric-bars`, `risk-matrix`, `checklist`.
- Anti-patterns: do not use for long essays where metrics are incidental.
- Example outline: KPI header -> decision summary -> risks -> next actions.
- User choice wording: "Use a strategy dashboard focused on KPIs, risk, and action."

### `explainer-map`

- Best for: mechanism explanation, system architecture, causal chain, workflow, how-it-works article.
- Required data shape: components and relationships, process steps, callouts, or node-edge flow.
- Good visual pairings: `system-diagram`, `callout-diagram`, `process-flow`, `icon-cluster`.
- Anti-patterns: do not use when the article only lists conclusions without a mechanism.
- Example outline: thesis -> central system/process visual -> explanation panels -> implications.
- User choice wording: "Use an explainer map to show how the system or mechanism works."

### `comparison-matrix`

- Best for: A/B choice, option evaluation, before/after, competitor comparison, tradeoff analysis.
- Required data shape: at least 2 comparable entities or 4 tradeoff quadrants.
- Good visual pairings: `concept-contrast`, `tradeoff-matrix`, `before-after`, `ranked-list-chart`.
- Anti-patterns: do not use because one paragraph says "compared"; comparison must be the main structure.
- Example outline: framing -> comparison visual -> option cards -> verdict.
- User choice wording: "Use a comparison matrix to evaluate options side by side."
