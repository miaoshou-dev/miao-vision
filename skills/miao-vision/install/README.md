# Miao Vision Skill Installation

Install the skill for your agent:

- **Codex (global):** `npx skills add miaoshou-dev/miao-vision -g -a codex -y`
- **Claude Code (global):** `npx skills add miaoshou-dev/miao-vision -g -a claude-code -y`
- **Other agents:** use `-a <agent-id>` only when that agent supports global skills; otherwise omit `-g` for a project install.

`npx skills add` does not update a globally installed npm CLI. Upgrade that
separately with `npm install -g @miao-vision/cli@latest`, or let the skill install
its matching private CLI on first use.
- Codex: see `codex.md`
- Claude: see `claude.md`

On first use, the skill prefers its private `bin/miao-viz`, then reuses a global `miao-viz` on `PATH`. Only when neither exists does it ask to download a checksum-verified private binary. A global npm installation is optional and is not duplicated.

## Try It

After installation, attach your file or link and ask your agent:

- “Analyze this sales spreadsheet and create an HTML report with key metrics and charts.”
- “Export this report as a printable A4 PDF.”
- “Use this week’s new data to update last week’s report with the same metrics and layout.”
