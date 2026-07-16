---
name: miao-vision
version: 0.1.21
description: Use when a user asks an agent such as Codex or Claude to turn an article URL, Markdown file, or long-form text into an infographic artifact with Miao Vision, or to visualize a local CSV, TSV, XLSX, or JSON data file, inspect data fields, generate an HTML chart/report, validate a visualization spec, choose charts from natural language, or produce a browser-presentable slide deck from data.
---

# Miao Vision

Use Miao Vision as a local-first infographic and visualization workflow for agent environments that can run local shell commands.

## Agent Self-Install

Install via `npx skills add` (recommended):

```bash
# 1. Install the CLI
npm install -g @miao-vision/cli

# 2. Install the skill
npx skills add miaoshou-dev/miao-vision
```

Or install from a GitHub Release ZIP:

```bash
# 1. Install the CLI
npm install -g @miao-vision/cli

# 2. Install the skill
SKILL_VERSION=$(npm show @miao-vision/cli version)
mkdir -p ~/.claude/skills
curl -fsSL "https://github.com/miaoshou-dev/miao-vision/releases/download/skill-v${SKILL_VERSION}/miao-vision-skill.zip" \
  -o /tmp/miao-vision-skill.zip
unzip -o /tmp/miao-vision-skill.zip -d ~/.claude/skills/
rm /tmp/miao-vision-skill.zip
```

After installation, the skill is available at `~/.claude/skills/miao-vision/SKILL.md`.

## Requirement

The `miao-viz` CLI must be installed and available on `PATH`.

Check:

```bash
miao-viz spec catalog
```

To get a machine-readable catalog of chart types and infographic templates with rules, encodings, and anti-patterns:

```bash
miao-viz spec catalog --for-llm
```

If the command is missing, tell the user to install:

```bash
npm install -g @miao-vision/cli
```

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
