# Miao Vision Skill Installation

Install the skill for your agent:

- **Quick install (all agents):** `npx skills add miaoshou-dev/miao-vision`
- Codex: see `codex.md`
- Claude: see `claude.md`

On first use, the skill prefers its private `bin/miao-viz`, then reuses a global `miao-viz` on `PATH`. Only when neither exists does it ask to download a checksum-verified private binary. A global npm installation is optional and is not duplicated.
