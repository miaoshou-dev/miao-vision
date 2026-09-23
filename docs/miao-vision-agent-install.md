# Miao Vision Agent Installation

Miao Vision ships as a cross-host plugin backed by one local CLI:

- `miao-viz` CLI: local data profiling, spec validation, and HTML rendering.
- `miao-vision` plugin: shared Skill and metadata for Codex, Claude Code, and OpenClaw.

Current plugin release: [`v0.9.3`](https://github.com/miaoshou-dev/miao-vision/releases/tag/skill-v0.9.3).
The release contains the plugin ZIP, compatibility Skill ZIP, checksums, and
native CLI binaries. The recommended npm CLI is `@miao-vision/cli@0.8.2`.

## Requirements

- Node.js 20 or newer
- npm
- An agent environment that can run local shell commands for local-file workflows

Optional data-story image/video generation additionally requires Node.js 22 or
newer, `ai-cli`, and `AI_GATEWAY_API_KEY`. It is remotely generated and billed
separately. Users who remain on Node.js 20 retain all report, poster, deck,
article, and validation workflows.

## Optional AI Media

Only after the user approves installation:

```bash
npm install -g ai-cli
```

Create a Vercel AI Gateway key, set `AI_GATEWAY_API_KEY` in the Agent's own
environment, and restart the Agent environment. Do not paste the Key into a
prompt or write it into this repository. Miao Vision checks setup without a
paid generation call, then shows the fixed model tier, live catalog pricing
summary, prompt/reference upload scope, and a confirmation question before
every remote generation. It does not enable or modify automatic recharge.

## Shared CLI

The plugin resolves `$MIAO_VISION_HOME/bin/miao-viz`, then
`~/.miao-vision/bin/miao-viz`, then `PATH`. With approval, its versioned
installer downloads a checksum-verified CLI into the shared user directory.
Global npm installation remains optional.

## Lightweight Skill Compatibility Install

```bash
# Codex
npx skills add miaoshou-dev/miao-vision --global --agent codex --yes

# Claude Code
npx skills add miaoshou-dev/miao-vision --global --agent claude-code --yes
```

For another agent, pass its explicit `--agent` id only if it supports global
skills. Otherwise omit `--global` and install at project scope. In particular,
PromptScript does not support global skill installation.

The main GitHub Release artifact is
[`miao-vision-plugin.zip`](https://github.com/miaoshou-dev/miao-vision/releases/latest/download/miao-vision-plugin.zip). See the install
documents inside `skills/miao-vision/install/` for Codex, Claude Code, and
OpenClaw commands.

## Install for Codex

From a local checkout:

```bash
mkdir -p ~/.codex/skills
cp -R skills/miao-vision ~/.codex/skills/miao-vision
```

Restart Codex or open a new thread.

## Install for Claude

For local files and CLI execution, Claude Code is the recommended surface.

```bash
npm install -g @miao-vision/cli
mkdir -p ~/.claude/skills
cp -R skills/miao-vision ~/.claude/skills/miao-vision
```

If your Claude Code version uses a different skills directory, use that configured directory instead.

For Claude app/web Skills upload, package the skill as ZIP:

```bash
npm run pack:skill
```

Then upload:

```text
dist/skills/miao-vision-skill.zip
```

Browser/app-hosted Claude environments may not be able to execute local shell commands or read arbitrary local files. Use Claude Code for the full local workflow.

## Use

```text
使用 miao-vision 分析 ~/data/sales.csv，生成 HTML 可视化报告。
```

The skill will run:

```bash
miao-viz data analyze ~/data/sales.csv \
  --intent "key metrics and trends" \
  --output /tmp/miao-vision/context.json
miao-viz data profile ~/data/sales.csv
miao-viz spec validate \
  --spec /tmp/miao-vision/report.yaml \
  --profile /tmp/miao-vision/profile.json \
  --context /tmp/miao-vision/context.json \
  --verify --strict
miao-viz render report \
  --input ~/data/sales.csv \
  --spec /tmp/miao-vision/report.yaml \
  --context /tmp/miao-vision/context.json \
  --format html \
  --output /tmp/miao-vision/report.html
```

For reports, strict publication also validates provenance for every KPI, chart,
and insight. Both object coverage and required claim-check coverage must reach
100%. The generated HTML exposes business-readable evidence details while
keeping evidence IDs and paths under Technical details.

## Common Errors

### No compatible `miao-viz` found

Approve the plugin's platform installer, or install the CLI globally:

```bash
npm install -g @miao-vision/cli
```

Then verify:

```bash
which miao-viz
miao-viz spec catalog
```

### `FILE_NOT_FOUND`

The input path is wrong or inaccessible. Use an absolute path and confirm it exists.

### `FIELD_NOT_FOUND`

The generated spec references a field not present in the data profile. Re-run `miao-viz data profile` and update the spec field names.

### `UNSUPPORTED_CHART_TYPE`

Use one of the MVP chart types listed by:

```bash
miao-viz spec catalog
```
