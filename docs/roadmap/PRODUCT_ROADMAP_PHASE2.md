# Miao Vision Phase 2 Product Roadmap

## Executive Summary

基于竞品分析 (Evidence.dev) 和当前能力评估，Phase 2 聚焦于 **数据探索体验** 和 **企业数据源连接**，这是 BI 工具的核心价值点。

### 战略定位
- **差异化优势**: Local-First、隐私优先、零后端
- **目标用户**: 数据分析师、BI 开发者、技术产品经理
- **核心场景**: 快速数据探索 → SQL 分析 → 可视化报告

---

## P0: 数据探索增强 (Critical Path)

### 1. Schema 浏览器重构

**当前问题:**
- 仅显示表名和列名
- 无数据预览
- 无列统计信息
- 无搜索功能

**目标体验:**
```
┌─────────────────────────────────────┐
│ 🔍 Search tables, columns...        │
├─────────────────────────────────────┤
│ 📁 Tables (12)                      │
│  ├─ 📋 orders (1.2M rows)           │
│  │   ├─ order_id (INT) PK           │
│  │   ├─ customer_id (INT) FK→users  │
│  │   ├─ total (DECIMAL) $12.5~$999  │
│  │   └─ created_at (TIMESTAMP)      │
│  ├─ 📋 users (50K rows)             │
│  │   └─ [展开显示列...]              │
│  └─ 📋 products (3.2K rows)         │
├─────────────────────────────────────┤
│ 📊 Quick Stats                      │
│  • Total tables: 12                 │
│  • Total rows: 1.5M                 │
│  • Last updated: 5 min ago          │
└─────────────────────────────────────┘
```

**实现要点:**
```typescript
// 新增 SchemaExplorer 组件
interface TableSchema {
  name: string
  rowCount: number
  columns: ColumnSchema[]
  primaryKey?: string[]
  foreignKeys?: ForeignKeyInfo[]
}

interface ColumnSchema {
  name: string
  type: string
  nullable: boolean
  stats?: {
    min?: number | string
    max?: number | string
    nullPercent: number
    distinctCount: number
  }
}
```

**文件变更:**
- `src/components/sql-workspace/SchemaExplorer.svelte` (重构)
- `src/core/database/schema-analyzer.ts` (新增)
- `src/types/schema.ts` (新增)

---

### 2. SQL 智能补全增强

**当前问题:**
- 基础关键字补全
- 无表名/列名感知
- 无函数签名提示

**目标体验:**
```sql
SELECT cu|
       ↓
┌─────────────────────────────────┐
│ 📋 customer_id    (orders.INT)  │
│ 📋 customer_name  (users.VARCHAR)│
│ 🔧 CURRENT_DATE   (function)    │
│ 🔧 CURRENT_TIMESTAMP            │
└─────────────────────────────────┘
```

**实现要点:**
```typescript
// Monaco Editor 补全提供者
interface SQLCompletionProvider {
  // 上下文感知
  getTableCompletions(): CompletionItem[]
  getColumnCompletions(tableName: string): CompletionItem[]
  getFunctionCompletions(): CompletionItem[]

  // 语法分析
  parseQueryContext(sql: string, position: number): QueryContext
}

interface QueryContext {
  clause: 'SELECT' | 'FROM' | 'WHERE' | 'JOIN' | 'ORDER BY' | 'GROUP BY'
  tables: string[]
  aliases: Map<string, string>
}
```

**文件变更:**
- `src/components/sql-workspace/SQLCompletionProvider.ts` (重构)
- `src/core/database/sql-parser.ts` (新增轻量解析)

---

## P1: 数据连接扩展

### 3. PostgreSQL 连接器

**技术方案:**
- 使用 `pg` npm 包 (需要后端代理)
- 或使用 `pglite` (WASM 版 PostgreSQL)
- 推荐: **HTTP 代理模式** (保持 local-first 架构)

```typescript
// src/core/connectors/postgresql/
interface PostgreSQLConnectorConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
  ssl?: boolean
}

// 通过 HTTP 代理执行
// Browser → HTTP Proxy → PostgreSQL
```

**UI 需求:**
- 连接配置表单
- 连接测试
- Schema 同步到 DuckDB (可选)

---

### 4. MySQL 连接器

**技术方案:**
同 PostgreSQL，使用 HTTP 代理模式。

```typescript
// src/core/connectors/mysql/
interface MySQLConnectorConfig {
  host: string
  port: number
  database: string
  username: string
  password: string
}
```

---

### 5. PDF 导出功能

**技术方案:**
- 使用 `html2canvas` + `jsPDF`
- 或使用 `puppeteer` (需后端)
- 推荐: **客户端方案** (保持 local-first)

```typescript
// src/core/export/pdf-export.ts
interface PDFExportOptions {
  format: 'a4' | 'letter' | 'a3'
  orientation: 'portrait' | 'landscape'
  margin: number
  includeTimestamp: boolean
  headerImage?: string
  footerText?: string
}
```

**UI 需求:**
- 导出按钮 (工具栏)
- 导出预览
- 格式选项

---

## P2: 协作功能 (MVP)

### 6. 报告分享 (只读链接)

**方案一: 静态 HTML 导出**
```
[Export as HTML] → 生成包含数据快照的独立 HTML 文件
                 → 可上传到任意静态托管 (GitHub Pages, Vercel)
                 → 无需后端
```

**方案二: URL 状态编码**
```
https://app.miaovision.com/view?report=base64(压缩后的报告内容)
                               → 完全无后端
                               → URL 长度限制 (~2KB)
```

**推荐: 方案一 + 本地存储 IndexedDB 同步**

---

### 7. 静态站点导出

**目标:** 像 Evidence.dev 一样导出为静态网站

```bash
# CLI 命令
npx miao-vision build

# 输出结构
dist/
├── index.html
├── reports/
│   ├── sales-dashboard.html
│   └── user-analytics.html
├── assets/
│   ├── styles.css
│   └── scripts.js
└── data/
    └── snapshots.json
```

---

## P3: 性能优化

### 8. 大数据集分页

**问题:** 当前一次性加载全部结果

**方案:**
```typescript
interface PaginatedQuery {
  sql: string
  page: number
  pageSize: number
  totalRows?: number
}

// SQL 改写
// 原始: SELECT * FROM orders
// 改写: SELECT * FROM orders LIMIT 1000 OFFSET 0
```

**UI:**
```
┌───────────────────────────────────────┐
│ Results: 1-1000 of 1,234,567         │
│ [◀ Prev] [1] [2] [3] ... [Next ▶]    │
└───────────────────────────────────────┘
```

---

### 9. 查询结果缓存

**方案:**
```typescript
// 基于 SQL hash 的缓存
interface QueryCache {
  key: string  // SHA256(sql + params)
  result: QueryResult
  timestamp: number
  ttl: number  // 默认 5 分钟
}

// IndexedDB 存储
const cache = new QueryCacheStore('query-cache')
```

---

## 优先级与工作量评估

| 功能 | 优先级 | 工作量 | 用户价值 | 技术风险 |
|------|--------|--------|----------|----------|
| Schema 浏览器重构 | P0 | 3 天 | 高 | 低 |
| SQL 智能补全 | P0 | 5 天 | 高 | 中 |
| PostgreSQL 连接器 | P1 | 3 天 | 高 | 中 (需代理) |
| MySQL 连接器 | P1 | 2 天 | 高 | 中 |
| PDF 导出 | P1 | 2 天 | 高 | 低 |
| 报告分享 | P2 | 3 天 | 中 | 低 |
| 静态站点导出 | P2 | 5 天 | 中 | 中 |
| 分页查询 | P3 | 2 天 | 中 | 低 |
| 查询缓存 | P3 | 2 天 | 中 | 低 |

**总计: ~27 天**

---

## 推荐执行顺序

### Sprint 1 (Week 1-2): 数据探索核心
1. Schema 浏览器重构
2. SQL 智能补全基础版

### Sprint 2 (Week 3-4): 数据连接
3. PostgreSQL 连接器
4. MySQL 连接器
5. PDF 导出

### Sprint 3 (Week 5-6): 协作与性能
6. 报告分享 (HTML 导出)
7. 分页查询
8. 查询缓存

### Sprint 4 (Week 7+): 进阶功能
9. 静态站点导出
10. SQL 智能补全增强

---

## 技术决策

### 保持 Local-First 架构
- PostgreSQL/MySQL 通过 HTTP 代理连接
- 不引入强制后端依赖
- 支持可选的自托管代理

### 渐进式增强
- PDF 导出先用纯客户端方案
- 后续可选支持 Puppeteer 后端

### 兼容现有架构
- 新连接器遵循 `IConnector` 接口
- Schema 分析复用 DuckDB 能力
- 缓存使用 IndexedDB (已有基础设施)

---

## 成功指标

| 指标 | 当前 | 目标 |
|------|------|------|
| 支持数据源数量 | 4 | 6 (+PostgreSQL, MySQL) |
| Schema 浏览深度 | 表名+列名 | 表名+列名+统计+预览 |
| SQL 补全准确率 | ~30% | ~80% |
| 导出格式 | HTML/CSV | +PDF |
| 分享方式 | 无 | HTML 链接 |

---

## 附录: Evidence.dev 功能对比

| 功能 | Evidence.dev | Miao Vision | 差距 |
|------|-------------|-------------|------|
| 数据源 | 10+ (DuckDB, Postgres, MySQL, BigQuery...) | 4 | 需补齐 |
| 图表 | 16 种 | 25+ 种 | ✅ 领先 |
| 输入组件 | 8 种 | 8 种 | ✅ 持平 |
| PDF 导出 | ✅ | ❌ | 需实现 |
| 静态部署 | ✅ | ❌ | 需实现 |
| 协作 | Cloud 版 | ❌ | MVP 版 |
| 本地优先 | ❌ | ✅ | 差异化优势 |

---

*Last Updated: 2024-12-31*
*Author: Product Team*
