---
name: miao-vision
description: Use when a user asks an agent such as Codex or Claude to turn an article URL, Markdown file, or long-form text into an infographic artifact with Miao Vision, or to visualize a local CSV, TSV, XLSX, or JSON data file, inspect data fields, generate an HTML chart/report, validate a visualization spec, choose charts from natural language, or produce a browser-presentable slide deck from data.
---

# Miao Vision

Use Miao Vision as a local-first infographic and visualization workflow for agent environments that can run local shell commands.

## Agent Self-Install

Install the skill via `npx skills add` (recommended):

```bash
npx skills add miaoshou-dev/miao-vision
```

Or install from a GitHub Release ZIP:

```bash
SKILL_VERSION=0.1.21
mkdir -p ~/.claude/skills
curl -fsSL "https://github.com/miaoshou-dev/miao-vision/releases/download/skill-v${SKILL_VERSION}/miao-vision-skill.zip" \
  -o /tmp/miao-vision-skill.zip
unzip -o /tmp/miao-vision-skill.zip -d ~/.claude/skills/
rm /tmp/miao-vision-skill.zip
```

After installation, the skill is available at `~/.claude/skills/miao-vision/SKILL.md`.

## CLI Bootstrap

Prefer the skill-private CLI at `bin/miao-viz`. If it is absent, reuse a compatible `miao-viz` already available on `PATH`, including one installed with `npm install -g @miao-vision/cli`.

Before the first visualization task, resolve the CLI in this order:

```bash
# 1. Skill-private binary
test -x ./bin/miao-viz

# 2. Existing global installation
command -v miao-viz
```

Resolve `./bin` relative to this `SKILL.md`, not the user's current working directory. Run `scripts/check-miao-viz.mjs` to apply this resolution order. If neither executable exists, ask for approval to access the network and write inside the installed skill directory, then run the platform installer:

```bash
# macOS or Linux
./scripts/install-miao-viz.sh

# Windows PowerShell
./scripts/install-miao-viz.ps1
```

The installer downloads the matching release asset, verifies its SHA-256 checksum, and writes `bin/miao-viz` (or `bin/miao-viz.exe`). After installation, verify it:

```bash
./bin/miao-viz --version
./bin/miao-viz spec catalog
```

Use the resolved executable consistently for the entire task. In command examples below, `miao-viz` means either the absolute skill-private path or the global executable found on `PATH`. Do not download a private copy when a working global installation already exists.

To get a machine-readable catalog of chart types and infographic templates with rules, encodings, and anti-patterns, run `miao-viz spec catalog --for-llm`.

## Route The Request

Read only the reference needed for the user's task.

| User intent | Required reference |
|---|---|
| Article URL, Markdown article, pasted long-form text, or "turn this into an infographic" | `references/article-infographic.md` and `references/composition-playbook.md` — **Use the atomic bundle path as default for non-trivial articles. Auto-extract is for quick drafts only.** |
| Local CSV/TSV/XLSX/JSON data report, analysis, dashboard, chart, visualization, or detailed findings | `references/data-report.md`, `references/report-intelligence.md`, `references/chart-selection.md`, and `references/anti-patterns.md` |
| Slides, presentation, PPT, deck, 演示, 演示文稿, 汇报, 给老板看, meeting brief, or executive briefing | `references/browser-deck.md` |

If the request mixes report and presentation, prefer the explicitly named output format. If the output format is ambiguous, ask one concise clarification question before running CLI commands.

## Global Rules

- Default output is HTML.
- Default working directory for generated specs/artifacts is `/tmp/miao-vision`.
- Keep all work local. Do not upload user data.
- Do not call an LLM from the CLI. The agent may reason and write specs; the CLI validates and renders.
- Do not edit generated output as source.
- Keep URL fetching in the agent workflow. Do not require the CLI to fetch URLs directly.
- For article workflows, normalize URL or pasted content to local Markdown/text before rendering.
- For data reports, validate before render.
- For decks, use `miao-viz render deck`; DeckSpec validation happens inside the render deck command.
- Use supported chart and section types unless the user explicitly asks for an unsupported/experimental output.
- For article infographics, use `miao-viz spec catalog --for-llm` when choosing a visual structure (article templates are included alongside chart types). The article catalog includes structures such as roadmap sequences, priority quadrants, hierarchy trees, relation flows, pyramid lists, and grid lists.

## Source Of Truth

The source skill lives in `skills/miao-vision/`.

Packaged or copied skill files, including `apps/web/public/SKILL.md` and `apps/web/dist/SKILL.md`, are not the primary source of truth. Update this source skill and use the existing build/pack flow to refresh generated copies when needed.

## Shared References

- Read `references/vizspec.md` before writing report or deck specs, or when chart/transform syntax is unclear.
- Read `references/examples.md` when the request is ambiguous or close to an existing example.
- Use `miao-viz spec catalog --for-llm` only when the compact workflow context does not explain a chart rule clearly enough.
