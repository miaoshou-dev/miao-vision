---
name: miao-vision
description: Use when a user asks an agent such as Codex or Claude to visualize a local CSV, TSV, XLSX, or JSON data file with Miao Vision, inspect data fields, generate an HTML chart/report, validate a visualization spec, or choose charts from natural language.
---

# Miao Vision

Use Miao Vision as a local-first visualization workflow for agent environments that can run local shell commands.

## Requirement

The `miao-viz` CLI must be installed and available on `PATH`.

Check:

```bash
miao-viz catalog
```

If the command is missing, tell the user to install:

```bash
npm install -g @miao-vision/cli
```

## Workflow

1. Run `miao-viz profile <file>` to inspect the data.
2. Read the compact profile JSON.
3. Create a YAML or JSON report spec using `references/vizspec.md`.
4. Validate it:

```bash
miao-viz validate --spec /tmp/miao-vision/report.yaml --profile /tmp/miao-vision/profile.json
```

5. Fix structured errors once when possible, especially `FIELD_NOT_FOUND`, `MISSING_ENCODING`, and `UNSUPPORTED_CHART_TYPE`.
6. Render HTML by default:

```bash
miao-viz render \
  --input /path/to/data.csv \
  --spec /tmp/miao-vision/report.yaml \
  --format html \
  --output /tmp/miao-vision/report.html
```

Return the generated HTML path to the user.

## Defaults

- Default output: HTML.
- Default working directory for generated specs/artifacts: `/tmp/miao-vision`.
- Do not call an LLM from the CLI. The agent writes the spec from the profile and user request.
- Use supported MVP chart types unless the user explicitly asks for unsupported/experimental charts.

## References

- Read `references/vizspec.md` before writing specs.
- Read `references/examples.md` when the request is ambiguous or close to an existing example.
