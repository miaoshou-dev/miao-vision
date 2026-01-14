# Miaoshou Vision Skills

项目专属 Claude Skills，用于常见开发任务的向导式执行。

## 可用 Skills

| 命令 | 用途 | 适用场景 |
|------|------|----------|
| `/new-chart` | 创建新图表组件 | 添加新的 SVG 可视化图表 |
| `/fix-large-file` | 拆分大文件 | 文件超过 500 行限制时 |
| `/add-template` | 添加信息图模板 | 扩展 infographic-section 模板 |

## 使用方法

在 Claude Code 对话中输入 skill 命令：

```
/new-chart
```

Claude 将按照 skill 定义的步骤向导式执行任务。

## 项目约束

- 文件行数限制: **500 行**
- 推荐行数: **< 300 行**
- 检查命令: `npm run check:size`

## 技术栈

- **Svelte 5** - Runes 模式 (`$state`, `$derived`, `$props`)
- **TypeScript** - 严格模式
- **Pure SVG** - 图表渲染
- **DuckDB-WASM** - 浏览器 SQL

## 相关资源

- 项目文档: `CLAUDE.md`
- 图表示例: `src/plugins/data-display/`
- 模板示例: `src/plugins/data-display/infographic-section/`
