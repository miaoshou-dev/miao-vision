# Miao Vision CLI

`miao-viz` is a local data visualization CLI for agent workflows. It reads local CSV, TSV, XLSX, and JSON files, profiles the data, validates a Miao Vision report spec, and renders a self-contained HTML report.

## Install

```bash
npm install -g @miao-vision/cli
```

## Commands

```bash
miao-viz profile ./examples/sales.csv
miao-viz catalog
miao-viz validate --spec ./examples/sales-dashboard.yaml --profile ./profile.json
miao-viz render --input ./examples/sales.csv --spec ./examples/sales-dashboard.yaml --output /tmp/miao-report.html
```

## Agent Usage

Install the CLI, then install the `miao-vision` skill for Codex or Claude. The skill will call `miao-viz` from your `PATH`.

## Notes

- Default output format is HTML.
- PNG/PDF are not included in v1.
- The CLI does not call an LLM or require an API key.
