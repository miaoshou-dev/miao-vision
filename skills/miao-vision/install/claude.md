# Install Miao Vision Plugin for Claude Code

Miao Vision requires an environment where Claude can run local shell commands. For local files and the `miao-viz` CLI, Claude Code is the recommended surface.

## 1. Plugin marketplace (recommended)

```bash
claude plugin marketplace add miaoshou-dev/miao-vision
claude plugin install miao-vision@miao-vision
```

The standalone Skill remains available as a temporary compatibility channel:

```bash
npx skills add miaoshou-dev/miao-vision --global --agent claude-code --yes
```

## 2. Shared CLI

On first use, Miao Vision checks for the CLI version pinned to this plugin
release. If it is absent, approve the request to download and verify the
matching release binary in the shared user directory. An older compatible CLI
can still be used if you decline the update. Plugin cache replacement and
uninstall do not remove this CLI.

## 3. Claude App / Web ZIP Install

If your Claude app supports uploaded Skills, package the skill as a ZIP:

```bash
cd skills
zip -r miao-vision-skill.zip miao-vision
```

Upload the ZIP through Claude's Skills UI.

Important: browser/app-hosted Claude environments may not be able to execute local shell commands or read arbitrary local files. Use Claude Code for full local-file visualization workflows.

## 4. Use

```text
Use miao-vision to analyze ~/data/sales.csv and generate an HTML visualization report, a single-page ranking poster, an article infographic, or a browser deck.
```

Data remains local. PDF browser dependencies are optional and separate. Fully
removing the shared CLI requires deleting `~/.miao-vision`.
