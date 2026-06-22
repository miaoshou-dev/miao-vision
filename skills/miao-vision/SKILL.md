---
name: miao-vision
description: Use when a user asks Codex to visualize a local CSV, TSV, XLSX, or JSON data file with Miao Vision, generate an HTML chart/report from natural language, inspect data fields before choosing charts, validate a visualization spec, or create agent-friendly data visualizations.
---

# Miao Vision

Use Miao Vision as a local-first chart/report generator for agent workflows.

## Workflow

1. Run `npm run --silent miao-viz -- profile <file>` to inspect the data.
2. Read the compact profile JSON and choose chart specs from `references/vizspec.md`.
3. Write a YAML or JSON report spec in a temp file.
4. Run `npm run miao-viz -- validate --spec <spec> --profile <profile-json>`.
5. Fix structured errors once when possible, especially `FIELD_NOT_FOUND`, `MISSING_ENCODING`, and `UNSUPPORTED_CHART_TYPE`.
6. Render HTML by default:

```bash
npm run --silent miao-viz -- render \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/report.yaml \
  --format html \
  --output /tmp/miao-vision/report.html
```

Return the generated HTML path to the user. Only request PNG/SVG when the user explicitly asks for those formats.

## Defaults

- Default output: HTML.
- Default working directory for generated specs/artifacts: `/tmp/miao-vision`.
- CLI does not call an LLM. Codex generates the spec from the profile and user request.
- Use supported MVP chart types only unless the user asks for exploratory implementation work.

## References

- Read `references/vizspec.md` before writing specs.
- Read `references/examples.md` when the request is ambiguous or when a similar chart/report example would reduce risk.
