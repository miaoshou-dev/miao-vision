# Install Miao Vision Skill for Codex

## 1. Install the CLI

```bash
npm install -g @miao-vision/cli
```

Verify:

```bash
miao-viz catalog
```

## 2. Quick Install (Recommended)

```bash
npx skills add miaoshou-dev/miao-vision
```

## 3. Local Checkout Install

```bash
mkdir -p ~/.codex/skills
cp -R skills/miao-vision ~/.codex/skills/miao-vision
```

## 4. Restart Codex

Restart Codex or open a new thread.

## 5. Use

```text
使用 miao-vision 分析 ~/data/sales.csv，生成 HTML 可视化报告。
```
