# Landing Page Optimization Plan

> Scope: `apps/web` landing page, with emphasis on `#gallery` visual polish and CLI command accuracy.
> Status: planning document only. Do not treat this as an implementation patch.

## Background

The landing page currently presents Miao Vision as a local-first artifact generator, but the `#gallery` section has two visible problems:

- The artifact cards look uneven, especially across preview heights, text baselines, and mobile card rhythm.
- Several displayed CLI command labels are stale after the CLI moved to grouped commands.

This page is the public distribution and preview surface. It should explain the product through credible artifact examples, while keeping generation, validation, and rendering logic inside `packages/miao-viz-cli`.

## Current Issues

### Gallery Layout

Observed at `http://localhost:5173/#gallery`:

- Anchor navigation lands too high, so the sticky header covers part of the gallery heading.
- The four cards share a grid row on desktop, but their internal content does not align consistently.
- Preview regions use mixed heights. The infographic preview is taller than the report, deck, and catalog previews.
- Card content baselines drift: command pills, titles, and descriptions start at different vertical positions.
- The report preview contains too much tiny UI detail for a small card thumbnail.
- The deck preview includes interactive-looking controls that compete with the card message.
- On mobile, cards stack in one column but heights vary enough to make the rhythm feel uneven.
- The gallery section heading is visually large enough to compete with the cards.

### CLI Command Labels

The landing page still shows older command labels in the artifact cards:

| Current label | Issue | Current CLI equivalent |
| --- | --- | --- |
| `miao-viz render` | Too vague; `render` is now a command group | `miao-viz render report` |
| `miao-viz article` | Top-level command no longer exists | `miao-viz render article` |
| `miao-viz deck` | Top-level command no longer exists | `miao-viz render deck` |
| `miao-viz data catalog` | `catalog` belongs to the `spec` group | `miao-viz spec catalog` |

Current grouped CLI surface:

```bash
miao-viz data profile
miao-viz data query
miao-viz data analyze

miao-viz spec validate
miao-viz spec catalog
miao-viz spec block
miao-viz spec template
miao-viz spec inspect

miao-viz render report
miao-viz render deck
miao-viz render article
```

Related copy outside the gallery may also need follow-up review:

- `apps/web/src/components/InstallSection.svelte`
- `skills/miao-vision/SKILL.md`
- `packages/miao-viz-cli/README.md`
- generated packaged skill copies under `apps/web/public/`
- older planning docs that intentionally may describe historical command names

## Design Goals

1. Make the gallery feel like a coherent product showcase, not four unrelated cards.
2. Keep command labels accurate and aligned with the grouped CLI.
3. Let artifact previews communicate output types quickly without recreating full product UIs at tiny scale.
4. Improve anchor navigation so linked sections land cleanly under the sticky header.
5. Preserve the local-first, artifact-first product message.
6. Keep the landing page as a distribution and preview surface, not a source of CLI generation logic.

## Recommended Changes

### 1. Fix Section Anchoring

Add section-level scroll offset for sticky navigation.

Expected behavior:

- Visiting `/#gallery` should show the section kicker and heading without clipping.
- The same rule should apply to other anchor sections such as workflow and install.

Implementation direction:

- Use `scroll-margin-top` on anchored sections.
- Size it from the header height plus breathing room, roughly `88px` to `112px`.

### 2. Normalize Gallery Card Anatomy

Use the same vertical structure in every artifact card:

```text
preview thumbnail
command pill
title
description
```

Recommended constraints:

- Fixed preview height on desktop: `180px` to `192px`.
- Fixed or bounded preview height on mobile: `176px` to `200px`.
- Title max: 2 lines.
- Description max: 3 to 4 lines.
- Card padding and internal gaps should be identical across all artifact types.
- The command pill should appear at the same vertical position in every card.

This keeps the gallery scannable even if each artifact has a different visual style.

### 3. Simplify Preview Thumbnails

The thumbnails should read as output-type cues, not full mini applications.

Report preview:

- Keep one title, three KPI blocks, and one simplified chart/table hint.
- Remove or reduce dense metadata and tiny rows.
- Make KPI values and labels clear at thumbnail scale.

Infographic preview:

- Keep the flow/callout structure, but constrain height to match other previews.
- If needed, reduce copy from three insight rows plus a long callout to two insight rows plus one short callout.

Deck preview:

- Make it read as a browser deck thumbnail.
- Treat arrows and pagination as subtle decorative signals rather than active controls.
- Avoid controls that visually dominate the slide preview.

Catalog preview:

- Keep category chips or compact chart-type dots.
- Present chart count and breadth clearly.
- Avoid making the catalog card look like a configuration panel.

### 4. Improve Desktop Grid Rhythm

Preferred desktop layout options:

- Keep 4 columns only if each card can remain readable at the current width.
- Otherwise use a 2x2 grid at medium desktop widths and reserve 4 columns for wider screens.

Recommended CSS direction:

- Use `repeat(auto-fit, minmax(...))` carefully, with a practical minimum card width around `260px` to `300px`.
- Increase grid gap to `20px` or `24px` if 4 columns remain.
- Avoid card widths that force thumbnail text into cramped micro-layouts.

### 5. Tighten Mobile Presentation

Mobile should feel like a curated list of examples.

Recommended behavior:

- One card per row.
- Consistent preview height and card padding.
- Reduced heading size so the artifact cards become the focus.
- Shorter descriptions or line clamping to avoid large card-height variation.
- Preserve at least `16px` vertical spacing between cards.

### 6. Update CLI Labels

Change the artifact card command labels to:

```ts
[
  'miao-viz render report',
  'miao-viz render article',
  'miao-viz render deck',
  'miao-viz spec catalog'
]
```

Also review install snippets and source skill docs for the same grouped command structure. Source skill updates should happen in `skills/miao-vision/`, then use the existing build or pack flow to refresh generated public copies.

### 7. Keep Copy Product-Correct

The page should describe the current architecture:

- `data` commands inspect, query, and analyze local files.
- `spec` commands validate, catalog, inspect, and instantiate specs.
- `render` commands generate report, deck, and article artifacts.

Avoid copy that implies:

- URL fetching is built into the CLI article command.
- The web app owns report/deck/article generation.
- The old top-level commands still exist.
- The browser landing app is a SQL workspace.

## Acceptance Criteria

- `/#gallery` lands with no heading clipped by the sticky header.
- Gallery card command labels match current `miao-viz --help` output.
- Desktop gallery cards align by preview, command pill, title, and description.
- Mobile gallery cards use a consistent rhythm with no large accidental height jumps.
- Artifact previews remain visually distinct but share a common scale and card structure.
- No generated files under `apps/web/dist/` are edited as source.
- If source skill command docs are changed, generated public skill copies are refreshed through the existing build or packaging flow.

## Suggested Verification

For copy-only or CSS-only landing page changes:

```bash
npm run check:size
npm run check
```

For changes that refresh public generated assets:

```bash
npm run build
```

For visual verification:

- Open `http://localhost:5173/#gallery`.
- Check desktop at the default browser size.
- Check mobile around `390px` width.
- Confirm heading position, card alignment, card heights, and command labels.
