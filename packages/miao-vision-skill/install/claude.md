# Install Miao Vision Skill for Claude

Miao Vision requires an environment where Claude can run local shell commands. For local files and the `miao-viz` CLI, Claude Code is the recommended surface.

## 1. Install the CLI

```bash
npm install -g @miao-vision/cli
```

Verify:

```bash
miao-viz catalog
```

## 2. Claude Code Local Install

Install the skill into the local skills directory supported by your Claude Code setup. If your Claude Code configuration exposes a user skills folder, copy the package there as `miao-vision`.

Example:

```bash
mkdir -p ~/.claude/skills
cp -R packages/miao-vision-skill ~/.claude/skills/miao-vision
```

If your Claude Code version uses a different skills directory, use that configured directory instead.

## 3. Claude App / Web ZIP Install

If your Claude app supports uploaded Skills, package the skill as a ZIP:

```bash
cd packages
zip -r miao-vision-skill.zip miao-vision-skill
```

Upload the ZIP through Claude's Skills UI.

Important: browser/app-hosted Claude environments may not be able to execute local shell commands or read arbitrary local files. Use Claude Code for full local-file visualization workflows.

## 4. Use

```text
Use miao-vision to analyze ~/data/sales.csv and generate an HTML visualization report.
```
