# Compact Analyze Context

`miao-viz analyze --compact` emits `compact-v1`, a tuple-oriented context intended for low-token agent workflows. The default `analyze` output and `analyze --verbose` remain the full debug context.

## Top-Level Shape

```json
{
  "format": "compact-v1",
  "intent": { "raw": "...", "coverage": "full" },
  "assumptions": [],
  "fields": [],
  "evidence": [],
  "metricCandidates": [],
  "catalog": {},
  "warnings": [],
  "clarificationQuestions": []
}
```

## Tuple Fields

`assumptions[]`:

```text
[key, value, confidence, alternatives?]
```

`fields[]`:

```text
[name, role, type, distinctCount?, timePeriods?]
```

`evidence[]`:

```text
[id, valuesOrRows]
```

If `valuesOrRows` is an object, it maps to full-context `evidence[].values`. If it is an array, it maps to `evidence[].rows`.

`metricCandidates[]`:

```text
[id, type, formula, value?]
```

`catalog.blocks[]`:

```text
[id, score, density, charts]
```

`catalog.templates[]`:

```text
[id, score, density, blocks]
```

`catalog.blockedCharts[]`, `catalog.blockedBlocks[]`, and `catalog.blockedTemplates[]`:

```text
[idOrType, reason]
```

`warnings[]`:

```text
[code, message]
```

`clarificationQuestions[]`:

```text
[id, question, options, blocking, appliesTo]
```

Agents should ask blocking questions before generating a report. Non-blocking questions should normally be recorded as assumptions and only asked when the user requests high-precision business analysis.
