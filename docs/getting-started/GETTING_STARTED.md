# Miao Vision - 快速启动指南

## ✨ 项目概述

Miao Vision 是一个**浏览器原生的 Evidence 类数据分析框架**，实现了完全的 Local-First 架构：

- 🔒 **隐私优先**：所有数据处理都在浏览器端完成
- ⚡ **高性能**：DuckDB-WASM 提供接近原生的 SQL 分析能力
- 📝 **声明式**：Markdown + SQL + 可视化的组合
- 🎯 **零运维**：纯静态部署，无需后端服务器

## 🚀 快速开始

### ⚠️ 重要：正确的启动方式

**❌ 错误方式：**
- 不要双击 `index.html` 文件
- 不要直接在浏览器中打开 HTML 文件
- 不要使用 `file://` 协议

**✅ 正确方式：**

### 1. 安装依赖

```bash
npm install
```

### 2. 启动开发服务器

```bash
npm run dev
```

### 3. 在浏览器中访问

打开浏览器，访问 **http://localhost:5173**

### 4. 开始使用

- 上传 CSV 或 Parquet 文件
- 编写 SQL 查询
- 查看数据结果

> 💡 如果遇到 CORS 错误或其他问题，请查看 [故障排除指南](./TROUBLESHOOTING.md)

### 3. 类型检查

```bash
npm run check
```

### 4. 构建生产版本

```bash
npm run build
```

构建产物位于 `dist/` 目录。

### 5. 预览生产构建

```bash
npm run preview
```

## 📖 使用指南

### 上传数据

1. 点击 "Upload Data" 标签页
2. 拖拽或点击上传 CSV 或 Parquet 文件
3. 文件会被自动加载到 DuckDB-WASM

### 执行 SQL 查询

1. 切换到 "Query" 标签页
2. 在 Monaco Editor 中编写 SQL 查询
3. 点击 "Run Query" 执行
4. 结果会以表格形式展示

### 数据可视化（新功能！）

**方式 1: 从查询结果创建**
1. 在 Query 标签页执行查询
2. 查询成功后，点击 "📊 Create Chart from Result"
3. 自动切换到 Visualize 标签页
4. 配置图表：
   - 选择图表类型（柱状图/折线图/散点图）
   - 选择 X 轴和 Y 轴列
   - 设置尺寸和标签
5. 点击 "Generate Chart" 查看可视化

**方式 2: 直接在 Visualize 标签页**
1. 切换到 "Visualize" 标签页
2. 使用配置面板设置图表
3. 查看交互式可视化结果

> 📚 详细使用指南：[CHART_USAGE_GUIDE.md](./CHART_USAGE_GUIDE.md)

### Markdown 报告（最新功能！）

**Evidence 风格的数据报告**
1. 切换到 "Report" 标签页
2. 点击 "+ New" 创建新报告
3. 在 Markdown 编辑器中编写报告：
   - 使用 YAML front matter 定义变量
   - 嵌入 SQL 查询块
   - 嵌入图表配置块
   - 使用 {variable} 语法插入变量
4. 点击 "▶ Execute" 执行所有 SQL 查询
5. 右侧预览窗格实时显示渲染后的报告

**示例报告结构**:
```markdown
---
title: Sales Report
author: Data Team
date: 2024-12-04
---

# {title}

```sql
SELECT region, SUM(amount) as total
FROM sales GROUP BY region
```

```chart
type: bar
data: query_result
x: region
y: total
```
```

> 📚 详细使用指南：[REPORT_USAGE_GUIDE.md](./REPORT_USAGE_GUIDE.md)

## 🏗️ 项目结构

```
miaoshou-vision/
├── src/
│   ├── components/          # UI 组件
│   │   ├── MonacoEditor.svelte
│   │   ├── FileUploader.svelte
│   │   ├── QueryRunner.svelte
│   │   └── Chart.svelte
│   │
│   ├── lib/
│   │   ├── database/       # DuckDB 管理
│   │   ├── markdown/       # Markdown 解析
│   │   ├── viz/           # 可视化
│   │   └── stores/        # 状态管理
│   │
│   ├── types/             # TypeScript 类型
│   ├── App.svelte         # 主应用
│   └── main.ts            # 入口
│
├── ARCHITECTURE.md         # 架构文档
├── README.md              # 项目说明
└── package.json           # 依赖配置
```

## 🎯 核心功能

### ✅ 已实现

- [x] Vite + TypeScript + Svelte 5 项目基础
- [x] DuckDB-WASM 核心集成（含 Web Worker）
- [x] Svelte 5 Runes 状态管理
- [x] Monaco Editor SQL 编辑器
- [x] CSV/Parquet 文件上传
- [x] SQL 查询执行
- [x] Mosaic vgplot 可视化基础
- [x] Unified/Remark Markdown 解析
- [x] Vercel 静态部署配置

### 🚧 开发中

- [ ] 完整的 vgplot 图表实现
- [ ] Markdown 驱动的报告生成
- [ ] 交互式图表编辑器
- [ ] 数据探索面板
- [ ] 查询历史记录
- [ ] 导出功能

## 💡 使用示例

### 示例 1: 基础查询

上传 CSV 文件后，可以执行：

```sql
-- 查看前 10 行
SELECT * FROM your_table LIMIT 10;

-- 聚合统计
SELECT
  COUNT(*) as total_rows,
  AVG(column_name) as avg_value
FROM your_table;
```

### 示例 2: 复杂分析

```sql
-- 分组聚合
SELECT
  category,
  COUNT(*) as count,
  SUM(amount) as total
FROM sales_data
GROUP BY category
ORDER BY total DESC;
```

### 示例 3: 多表关联

```sql
-- 加载多个文件后可以 JOIN
SELECT
  a.id,
  a.name,
  b.value
FROM table_a a
JOIN table_b b ON a.id = b.id;
```

## 🔧 技术栈

| 技术 | 版本 | 说明 |
|------|------|------|
| Vite | ^6.0 | 极速构建工具 |
| Svelte | ^5.15 | Runes 模式 UI 框架 |
| TypeScript | ^5.7 | 类型安全 |
| DuckDB-WASM | ^1.29 | 浏览器端 SQL 引擎 |
| Mosaic | latest | 数据可视化 |
| Monaco Editor | ^0.52 | 代码编辑器 |
| Unified/Remark | ^11.0 | Markdown 处理 |

## 📦 部署

### Vercel 部署

1. 连接 GitHub 仓库到 Vercel
2. Vercel 会自动检测 Vite 项目
3. 使用默认设置即可部署

或使用 Vercel CLI：

```bash
npm install -g vercel
vercel
```

### 其他静态托管

构建后的 `dist/` 目录可以部署到任何静态托管服务：

- Netlify
- GitHub Pages
- Cloudflare Pages
- AWS S3 + CloudFront

**重要**: 确保配置以下响应头（DuckDB-WASM 需要）：

```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

## 🐛 常见问题

### Q: 上传文件后无法查询？

A: 确保表名正确。上传时会生成形如 `table_1733123456789` 的表名，可以在上传区域查看。

### Q: Monaco Editor 未显示？

A: 检查浏览器控制台是否有错误。Monaco Editor 依赖 Web Workers。

### Q: DuckDB-WASM 初始化失败？

A: 检查：
1. 浏览器是否支持 WebAssembly
2. 是否配置了正确的 CORS headers
3. 网络是否能加载 WASM 文件

### Q: 大文件上传缓慢？

A: 建议：
1. 使用 Parquet 格式（比 CSV 更高效）
2. 文件大小建议 < 100MB
3. 确保浏览器有足够内存

## 📚 学习资源

### 官方文档

- [DuckDB-WASM](https://duckdb.org/docs/api/wasm)
- [Svelte 5 Runes](https://svelte.dev/docs/svelte/runes)
- [Mosaic](https://idl.uw.edu/mosaic/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)

### 示例项目

- [DuckDB-WASM Examples](https://github.com/duckdb-wasm-examples)
- [Mosaic Framework Example](https://github.com/uwdata/mosaic-framework-example)

### 社区资源

- [Evidence.dev](https://evidence.dev/) - 灵感来源
- [Observable Framework](https://observablehq.com/framework/) - 类似项目

## 🤝 贡献指南

欢迎贡献！请查看项目 Issues 或提交 Pull Request。

### 开发流程

1. Fork 项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 开启 Pull Request

## 📄 许可证

MIT License

---

**Built with ❤️ using Vite + Svelte 5 + DuckDB-WASM**
