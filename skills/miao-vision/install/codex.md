# Install Miao Vision Plugin for Codex

## 1. Install the plugin (recommended)

Install `miao-vision-plugin.zip` using the Codex plugin installation surface,
or load the repository root as a local plugin during development.

The standalone Skill remains available as a temporary compatibility channel:

```bash
npx skills add miaoshou-dev/miao-vision --global --agent codex --yes
```

## 2. Shared CLI

On first use, Miao Vision checks for the CLI version recommended by this plugin.
If it is absent, approve the request to download the matching release binary
into the shared user directory. An older compatible CLI can still be used if
you decline the update. The installer verifies the checksum, version, and
capabilities before replacing the shared copy. Check the version at the path
printed by `node scripts/check-miao-viz.mjs --print-path`; a plain
`miao-viz` command can resolve to a separate global installation.
Uninstalling or upgrading the plugin does not remove the shared CLI.

## 3. Restart Codex

Restart Codex or open a new thread.

## 4. Use

```text
Use miao-vision to analyze ~/data/sales.csv and generate an HTML visualization report, a single-page ranking poster, an article infographic, or a browser deck.
```

Data remains local. PDF browser dependencies are installed separately only
when requested. Fully removing the shared CLI requires deleting
`~/.miao-vision`.
