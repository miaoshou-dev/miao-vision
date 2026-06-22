# Miao Vision Agent Installation

Miao Vision ships as two installable pieces:

- `miao-viz` CLI: local data profiling, spec validation, and HTML rendering.
- `miao-vision` skill: reusable instructions for Codex, Claude, and compatible Agent Skills environments.

## Requirements

- Node.js 20 or newer
- npm
- An agent environment that can run local shell commands for local-file workflows

## Install CLI

```bash
npm install -g @miao-vision/cli
```

Verify:

```bash
miao-viz catalog
```

## Install for Codex

```bash
mkdir -p ~/.codex/skills
cp -R packages/miao-vision-skill ~/.codex/skills/miao-vision
```

Restart Codex or open a new thread.

## Install for Claude

For local files and CLI execution, Claude Code is the recommended surface.

```bash
npm install -g @miao-vision/cli
mkdir -p ~/.claude/skills
cp -R packages/miao-vision-skill ~/.claude/skills/miao-vision
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
miao-viz profile ~/data/sales.csv
miao-viz validate --spec /tmp/miao-vision/report.yaml --profile /tmp/miao-vision/profile.json
miao-viz render --input ~/data/sales.csv --spec /tmp/miao-vision/report.yaml --format html --output /tmp/miao-vision/report.html
```

## Common Errors

### `miao-viz: command not found`

Install the CLI:

```bash
npm install -g @miao-vision/cli
```

Then verify:

```bash
which miao-viz
miao-viz catalog
```

### `FILE_NOT_FOUND`

The input path is wrong or inaccessible. Use an absolute path and confirm it exists.

### `FIELD_NOT_FOUND`

The generated spec references a field not present in the data profile. Re-run `miao-viz profile` and update the spec field names.

### `UNSUPPORTED_CHART_TYPE`

Use one of the MVP chart types listed by:

```bash
miao-viz catalog
```
