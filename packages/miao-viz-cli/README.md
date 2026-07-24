# Miao Vision CLI

`miao-viz` is a local visualization CLI for agent workflows. It reads local CSV, TSV, XLSX, and JSON files for data reports and decks, and local Markdown/text files for article-to-infographic artifacts.

## Install

```bash
npm install -g @miao-vision/cli
```

## Commands

```bash
miao-viz data profile ./examples/sales.csv
miao-viz spec catalog
miao-viz spec validate --spec ./examples/sales-dashboard.yaml --profile ./profile.json
miao-viz render report --input ./examples/sales.csv --spec ./examples/sales-dashboard.yaml --output /tmp/miao-report.html
miao-viz render report --input ./examples/sales.csv --spec ./examples/sales-dashboard.yaml --format pdf --output /tmp/miao-report.pdf
miao-viz render deck --input ./examples/sales.csv --spec ./examples/sales-deck.yaml --output /tmp/miao-deck.html
miao-viz render deck --input ./examples/sales.csv --spec ./examples/sales-deck.yaml --format pdf --output /tmp/miao-deck.pdf
miao-viz render article ./article.md --style editorial --format html --output /tmp/article-infographic.html
```

Generate both report formats with one render:

```bash
miao-viz render report \
  --input ./examples/sales.csv \
  --spec ./examples/sales-dashboard.yaml \
  --format html,pdf \
  --output-dir /tmp/miao-report
```

## Recurring Reports

Create a project from a verified Report Spec and AnalyzeContext, then replay it on new-period data:

```bash
miao-viz report init ./sales-weekly \
  --input ./week-28.xlsx \
  --spec ./report.yaml \
  --context ./context.json \
  --period 2026-W28 \
  --dry-run

miao-viz report update ./sales-weekly \
  --input ./week-29.xlsx \
  --period 2026-W29 \
  --format html,pdf

miao-viz report info ./sales-weekly
miao-viz report history ./sales-weekly
miao-viz report clean ./sales-weekly --keep 10
```

Recurring projects freeze Evidence recipes and the Report Spec, validate each new input against a data contract, and keep independent run manifests and artifacts. Cleaning is a preview unless `--confirm` is provided.

Deck examples are included for several common presentation scenarios:

- `sales-deck.yaml`
- `product-metrics-deck.yaml`
- `finance-review-deck.yaml`
- `ops-update-deck.yaml`

Deck HTML supports arrow-key navigation and fullscreen mode. Direct Deck PDF export uses a fixed 16:9 page with one Slide per page.

DeckSpec validation returns structured repair information. `INVALID_DECK_SPEC` includes an `errors` array with `path`, `message`, and `hint`; `DECK_FIELD_NOT_FOUND` identifies missing fields in chart encodings, chart transforms, or metric transforms.

## Agent Usage

Install the CLI, then install the `miao-vision` skill for Codex or Claude. The skill will call `miao-viz` from your `PATH`.

## Notes

- Default output format is HTML.
- Report PDF defaults to A4 portrait; Deck PDF defaults to 16:9. PDF export requires Playwright Chromium.
- Multi-format Report output uses `--format html,pdf --output-dir <directory>`.
- Recurring report projects currently support Data Reports; Decks support direct PDF export but not recurring projects.
- `article` reads local Markdown/text only; agents should fetch URLs and normalize them before calling the CLI.
- The CLI does not call an LLM or require an API key.
