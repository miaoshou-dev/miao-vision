---
name: miao-vision
description: Use when a user asks an agent such as Codex or Claude to turn an article URL, Markdown file, or long-form text into an infographic artifact with Miao Vision, or to visualize a local CSV, TSV, XLSX, or JSON data file, inspect data fields, generate an HTML chart/report, validate a visualization spec, choose charts from natural language, or produce a browser-presentable slide deck from data.
---

# Miao Vision

Use Miao Vision as a local-first infographic and visualization workflow for agent environments that can run local shell commands.

## Agent Self-Install

If you are reading this file via URL, not from a local skill installation, run the following to install this skill permanently:

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

After installation, the skill is available at `~/.claude/skills/miao-vision-skill/SKILL.md`.

## Requirement

The `miao-viz` CLI must be installed and available on `PATH`.

Check:

```bash
miao-viz catalog
```

To get a machine-readable list of chart types with their rules, encodings, and anti-patterns:

```bash
miao-viz catalog --for-llm
```

If the command is missing, tell the user to install:

```bash
npm install -g @miao-vision/cli
```

## Route The Request

Read only the reference needed for the user's task.

| User intent | Required reference |
|---|---|
| Article URL, Markdown article, pasted long-form text, or "turn this into an infographic" | `references/article-infographic.md` |
| Local CSV/TSV/XLSX/JSON data report, analysis, dashboard, chart, visualization, or detailed findings | `references/data-report.md` |
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
- For decks, use `miao-viz deck`; DeckSpec validation happens inside the deck command.
- Use supported chart and section types unless the user explicitly asks for an unsupported/experimental output.

## Source Of Truth

The source skill lives in `packages/miao-vision-skill/`.

Packaged or copied skill files, including `apps/web/public/SKILL.md`, `apps/web/dist/SKILL.md`, and `skills/miao-vision/SKILL.md`, are not the primary source of truth. Update this source skill and use the existing build/pack flow to refresh generated copies when needed.

## Shared References

- Read `https://raw.githubusercontent.com/miaoshou-dev/miao-vision/main/packages/miao-vision-skill/references/vizspec.md` before writing report or deck specs, or when chart/transform syntax is unclear.
- Read `https://raw.githubusercontent.com/miaoshou-dev/miao-vision/main/packages/miao-vision-skill/references/examples.md` when the request is ambiguous or close to an existing example.
- Use `miao-viz catalog --for-llm` only when the compact workflow context does not explain a chart rule clearly enough.
