# Report Anti-Patterns

Use this before final validation fixes.

The validator enforces the high-risk cases. Treat these as hard rules unless the CLI returns only a warning and the report includes a clear caveat.

## Do Not

- Do not sum or average IDs, UUIDs, order numbers, phone numbers, postal codes, or keys.
- Do not use a line chart for unordered categories.
- Do not use pie/donut charts with more than 7 categories.
- Do not describe a trend without a time field and at least 3 time periods.
- Do not call two periods a trend; write period-over-period change.
- Do not use significant, prove, drive, cause, predict, or strong correlation language without supporting evidence.
- Do not turn correlation into causation.
- Do not hide caveats for small samples, high missingness, or unreliable distributions.
- Do not put unsupported conclusions in chart titles.
- Do not write good/bad performance without a benchmark, target, or historical comparison.
- Do not use a diverging bar without a meaningful zero or center.
- Do not use dumbbell for more than two endpoints or more than 20 categories.
- Do not use bullet without an explicit target.
- Do not render a range where lower exceeds upper.
- Do not derive a reference aggregate without binding evidence.
- Do not facet on ID or high-cardinality fields, or compare magnitude across independent facet scales.
- Do not repeat the same chart family when the views use equivalent fields and transforms; merge the redundant view first.
- Do not use Pareto with negative values or without descending contribution order.
- Do not use a bar-line combo for measures with the same unit or without explicit axis labels.
- Do not interpret color as good/bad unless `colorScale.semantic` declares that business meaning.
- Do not invent sample-size, estimated, incomplete, or missingness flags for quality styling.

## Required Evidence

Claims with numbers, rankings, shares, changes, thresholds, outliers, or relationships need `$evidence:` references.

If a claim cannot be validated from `context.evidence`, rewrite it as descriptive narrative without the number or strong judgment.
