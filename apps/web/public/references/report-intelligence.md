# Report Intelligence

Use this reference for data reports after `miao-viz data analyze`.

The CLI is the source of truth. Do not invent a parallel field-role, chart, block, or insight rule. Read `context.json` and follow the machine-readable rules it contains.

## Field Semantics

Each `fields[]` item may include:

- `role`: `measure`, `dimension`, `time`, `id`, `status`, `score`, `flag`, `text`, `geo`, or `unknown`.
- `semanticTags`: formatting or domain hints such as `currency`, `percentage`, `url`, `latitude`, `longitude`, `country`, `province`, or `city`.
- `confidence` and `rationale`: why the CLI assigned the role.
- `qualityFlags`: data quality risks such as high missing rate or high uniqueness.
- `chartUsage`: whether the field is recommended, allowed, discouraged, or forbidden as a measure, dimension, or detail key.

Rules:

- Never aggregate an `id` field as a business metric.
- Use `measure` and `score` fields for quantitative encodings.
- Use `dimension`, `status`, `flag`, and `geo` fields for grouping.
- Use `time` only for ordered temporal views.
- Treat `text` fields as labels or detail keys, not summary dimensions.

## Evidence

Every numeric, ranking, share, change, threshold, or comparison claim must cite evidence.

Use `$evidence:<id>.<path>` in insight text and include the evidence id in `insights[].evidence`.

Do not compute new totals, percentages, or rates in prose. Use `evidence[]` or `metricCandidates[]`.

## Blocks And Templates

Prefer `catalog.templates[]`, then `catalog.blocks[]`, before writing charts manually.

When a block or template exposes `requiredEvidence`, keep the generated evidence-backed insights unless you have a validated replacement.

When a block or template is blocked, use the provided reason instead of forcing the structure.

## Validation

Always run:

```bash
miao-viz spec validate --spec /tmp/miao-vision/report.yaml --profile /tmp/miao-vision/profile.json --context /tmp/miao-vision/context.json --verify --strict
```

Fix every warning before rendering.
