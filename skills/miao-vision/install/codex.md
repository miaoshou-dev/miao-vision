# Install Miao Vision Skill for Codex

## 1. Quick Install (Recommended)

```bash
npx skills add miaoshou-dev/miao-vision
```

## 2. Local Checkout Install

```bash
mkdir -p ~/.codex/skills
cp -R skills/miao-vision ~/.codex/skills/miao-vision
```

## 3. Install the private CLI

On first use, the skill reuses an existing global `miao-viz` when available. Otherwise, approve its request to download and verify the matching release binary into `bin/miao-viz`. A global npm installation is optional and is not duplicated.

## 4. Restart Codex

Restart Codex or open a new thread.

## 5. Use

```text
使用 miao-vision 分析 ~/data/sales.csv，生成 HTML 可视化报告。
```
