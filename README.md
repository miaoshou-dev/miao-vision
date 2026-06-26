# Miao Vision

> Turn your data files and articles into shareable visual reports — with one command or one prompt to your AI agent.

[![npm](https://img.shields.io/npm/v/@miao-vision/cli)](https://www.npmjs.com/package/@miao-vision/cli)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)](https://www.typescriptlang.org/)

<table>
<tr>
<td><img src="docs/assets/demo-report.png" alt="Data report — KPI cards, charts, and AI-written insights" width="480"/></td>
<td><img src="docs/assets/demo-deck.png" alt="Presentation deck — editorial slides with keyboard navigation" width="480"/></td>
</tr>
<tr>
<td align="center"><em>Data report</em></td>
<td align="center"><em>Presentation deck</em></td>
</tr>
</table>

Give Miao Vision a CSV, spreadsheet, or article. You get a self-contained HTML file — KPI cards, charts, tables, insights — ready to open, share, or email. No server. No login. No expiry.

Built for **analysts and developers** who want a polished output in minutes, not a dashboard to maintain forever.

---

## What you get

**Data report** — KPI cards, bar charts, line trends, tables, and written insights, all in one HTML file.

**Presentation deck** — browser slides with keyboard navigation, fullscreen, and print-to-PDF. No PowerPoint required.

**Article infographic** — paste in an article URL or Markdown file; get back a static visual summary you can drop into any document.

All outputs are a single `.html` file. Open it anywhere, share it with anyone, archive it forever.

---

## Get started in 3 steps

**Step 1 — Install the CLI**

```bash
npm install -g @miao-vision/cli
```

**Step 2 — Run on your data**

```bash
miao-viz render \
  --input ./sales.csv \
  --spec ./sales-dashboard.yaml \
  --output ./report.html
```

**Step 3 — Open the result**

```bash
open ./report.html
```

That's it. No config files, no accounts, no backend.

> **Shortcut:** If you use Claude or Codex, skip the YAML entirely — [install the agent skill](#agent-skill) and just ask in plain English.

---

## Three ways to use it

### 1. Data report

You have a CSV, TSV, XLSX, or JSON file. You want a chart report to share with your team.

Ask your AI agent:
```
Use miao-vision to analyze ~/data/sales.csv and generate an editorial HTML report.
```

Or run the CLI yourself:
```bash
# Let the CLI inspect your data first
miao-viz profile ./sales.csv

# Then render
miao-viz render --input ./sales.csv --spec ./sales-dashboard.yaml --output ./report.html
```

You get: KPI cards, bar charts, trend lines, and data tables — styled and ready to share.

---

### 2. Presentation deck

You have data and you need slides for a meeting — not a chart dump, but an actual narrative deck.

Ask your AI agent:
```
Use miao-vision to turn ~/data/sales.csv into a presentation deck for an executive review.
```

Or use the CLI:
```bash
miao-viz deck --input ./sales.csv --spec ./sales-deck.yaml --output ./deck.html
```

You get: a browser-based slide deck with cover, metrics, charts, and an ending slide. Arrow-key navigation, fullscreen, and print-to-PDF built in.

---

### 3. Article infographic

You have an article URL or a Markdown file and you want a visual summary — not just a wall of text.

Ask your AI agent:
```
Use miao-vision to turn this article Markdown file into an infographic.
```

Or use the CLI with a local file:
```bash
miao-viz article ./my-article.md --style editorial --output ./infographic.html
```

You get: a static, shareable infographic you can embed or send directly.

---

## Why Miao Vision

| | |
|---|---|
| **Your data stays local** | Nothing leaves your machine. No upload, no API call with your data. |
| **One file to share** | Every output is a self-contained `.html` file — open it, email it, archive it. No viewer needed. |
| **Ask in plain English** | Install the agent skill and describe what you want. The agent profiles your data, writes the spec, and runs the CLI. |
| **Not a dashboard** | No database to connect, no tiles to arrange, no filter panel to maintain. You get an artifact, not a workspace. |
| **Looks good by default** | The editorial theme is designed to be clear and credible out of the box. |

---

## Agent skill

Miao Vision ships with a skill for Claude and Codex. Once installed, your agent knows how to profile data, pick the right chart types, write the spec, and call the CLI — you just describe what you want.

**The quickest way — ask your agent:**

```
Read https://miaoshou.dev/SKILL.md and follow the instructions to install or upgrade miao-viz for your AI agent.
```

Your agent installs the CLI and skill in one shot, no manual steps.

---

**Or install manually:**

**Step 1 — Install the CLI:**
```bash
npm install -g @miao-vision/cli
miao-viz catalog   # confirm it's working
```

**Step 2 — Install the skill for Claude Code:**
```bash
mkdir -p ~/.claude/skills
unzip miao-vision-skill.zip -d ~/.claude/skills/
```

**Step 2 — Install the skill for Codex:**
```bash
mkdir -p ~/.codex/skills
cp -R packages/miao-vision-skill ~/.codex/skills/miao-vision
```

Then restart your agent and ask naturally:

| What you say | What you get |
|---|---|
| "analyze sales.csv and make a report" | Self-contained HTML data report |
| "turn this into a deck for Monday's meeting" | Browser slide deck |
| "make an infographic from this article" | Static infographic HTML |

Download the latest skill ZIP from [GitHub Releases](../../releases) or see [Agent Install Guide](./docs/miao-vision-agent-install.md).

---

## VizSpec example

If you prefer writing specs yourself, here's what a simple one looks like:

```yaml
title: Sales Dashboard
theme: editorial
charts:
  - type: bigvalue
    title: Total Sales
    data:
      transform:
        - type: aggregate
          measures:
            - field: sales
              op: sum
              as: total_sales
    encoding:
      value:
        field: total_sales

  - type: bar
    title: Sales by Region
    data:
      transform:
        - type: aggregate
          groupBy: [region]
          measures:
            - field: sales
              op: sum
              as: total_sales
        - type: sort
          field: total_sales
          order: desc
    encoding:
      x:
        field: region
      y:
        field: total_sales
```

Run `miao-viz catalog` to see all supported chart types. Run `miao-viz validate --spec ./your-spec.yaml` to catch errors before rendering.

---

## DeckSpec example

```yaml
title: Sales Review
theme: editorial
slides:
  - layout: cover
    eyebrow: Q4 Review
    title: Sales Momentum Is Concentrated In Key Regions
    claim: Revenue is growing, but performance is not evenly distributed.

  - layout: metrics-chart
    eyebrow: Executive Snapshot
    title: Quarter At A Glance
    metrics:
      - label: Total Revenue
        format: "$,.0f"
        data:
          transform:
            - type: aggregate
              measures:
                - field: sales
                  op: sum
                  as: total_sales
    charts:
      - type: line
        title: Monthly Sales Trend
        data:
          transform:
            - type: derive-month
              field: order_date
              as: month
            - type: aggregate
              groupBy: [month]
              measures:
                - field: sales
                  op: sum
                  as: total_sales
            - type: sort
              field: month
              order: asc
        encoding:
          x:
            field: month
          y:
            field: total_sales
```

Supported layouts: `cover`, `title-only`, `text-points`, `text-chart`, `metrics-chart`, `chart-full`, `table-full`, `ending`.

---

## CLI reference

| Command | What it does |
|---|---|
| `miao-viz profile <file>` | Inspect fields, types, distributions, and get chart suggestions |
| `miao-viz catalog` | List all chart types with AI-readable usage guidance |
| `miao-viz validate` | Check your VizSpec or DeckSpec before rendering |
| `miao-viz render` | Render a self-contained HTML data report |
| `miao-viz deck` | Render a browser slide deck |
| `miao-viz article` | Convert a local Markdown/text file into a static infographic |

---

## Documentation

- [Product Overview](./docs/PRODUCT_OVERVIEW.md)
- [Agent Install Guide](./docs/miao-vision-agent-install.md)
- [Feature Roadmap](./docs/roadmap/FEATURE_ROADMAP.md)
- [All docs](./docs/README.md)

---

## Development

```bash
npm run dev          # Start the Svelte preview app (http://localhost:5173)
npm run build:cli    # Build the miao-viz CLI package
npm run check        # TypeScript and Svelte diagnostics
npm run test         # Run unit tests
```

The web app is a preview and debugging surface. The main product path is the CLI, optionally driven by an agent skill.

---

## License

License to be finalized before public release.
