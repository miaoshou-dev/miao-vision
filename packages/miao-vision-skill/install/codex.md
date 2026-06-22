# Install Miao Vision Skill for Codex

## 1. Install the CLI

```bash
npm install -g @miao-vision/cli
```

Verify:

```bash
miao-viz catalog
```

## 2. Install the Skill

From a local checkout:

```bash
mkdir -p ~/.codex/skills
cp -R packages/miao-vision-skill ~/.codex/skills/miao-vision
```

Or from a released skill folder:

```bash
mkdir -p ~/.codex/skills
cp -R miao-vision-skill ~/.codex/skills/miao-vision
```

## 3. Restart Codex

Restart Codex or open a new thread.

## 4. Use

```text
使用 miao-vision 分析 ~/data/sales.csv，生成 HTML 可视化报告。
```
