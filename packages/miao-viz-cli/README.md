# Miao Vision CLI

`miao-viz` is a local visualization CLI for agent workflows. It reads local CSV, TSV, XLSX, and JSON files for data reports and decks, and local Markdown/text files for article-to-infographic artifacts.

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
miao-viz deck --input ./examples/sales.csv --spec ./examples/sales-deck.yaml --output /tmp/miao-deck.html
miao-viz article ./article.md --style editorial --format html --output /tmp/article-infographic.html
```

Deck examples are included for several common presentation scenarios:

- `sales-deck.yaml`
- `product-metrics-deck.yaml`
- `finance-review-deck.yaml`
- `ops-update-deck.yaml`

Deck HTML supports arrow-key navigation, fullscreen mode, and browser print/PDF export.

DeckSpec validation returns structured repair information. `INVALID_DECK_SPEC` includes an `errors` array with `path`, `message`, and `hint`; `DECK_FIELD_NOT_FOUND` identifies missing fields in chart encodings, chart transforms, or metric transforms.

## Agent Usage

Install the CLI, then install the `miao-vision` skill for Codex or Claude. The skill will call `miao-viz` from your `PATH`.

## Notes

- Default output format is HTML.
- PNG/PDF commands are not included in v1; deck HTML can be printed to PDF in the browser.
- `article` reads local Markdown/text only; agents should fetch URLs and normalize them before calling the CLI.
- The CLI does not call an LLM or require an API key.
