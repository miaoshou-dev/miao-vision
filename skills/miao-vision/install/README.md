# Miao Vision Plugin Installation

Current compatible release: `v0.7.0` (`skill-v0.7.0`), with
`@miao-vision/cli@0.7.0`. Download the cross-host bundle from:

```text
https://github.com/miaoshou-dev/miao-vision/releases/latest/download/miao-vision-plugin.zip
```

The cross-host plugin bundle is the recommended installation. It contains the
same source skill for Codex, Claude Code, and OpenClaw:

- Codex: see `codex.md`
- Claude Code: see `claude.md`
- OpenClaw: see `openclaw.md`

The standalone Skill ZIP remains a lightweight compatibility channel for one
release cycle.

On first use, the plugin resolves the CLI from `MIAO_VISION_HOME` when set,
then `~/.miao-vision/bin/miao-viz`, then `PATH`. Only when no compatible CLI
exists does it ask permission to download the versioned, checksum-verified
binary. Plugin upgrades and uninstalls do not remove this shared CLI.

All source data stays local. PDF browser dependencies are optional and are not
downloaded with the plugin. To remove the shared CLI explicitly, delete
`~/.miao-vision`; plugin uninstall intentionally leaves it intact.

## Try It

After installation, attach your file or link and ask your agent:

- “Analyze this sales spreadsheet and create an HTML report with key metrics and charts.”
- “Export this report as a printable A4 PDF.”
- “Use this week’s new data to update last week’s report with the same metrics and layout.”
