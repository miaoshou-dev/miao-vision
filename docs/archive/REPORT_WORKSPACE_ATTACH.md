# Report 访问 Workspace 数据指南

## 概述

Miaoshou Vision 支持两种数据存储模式：

- **SQL Workspace**: OPFS 持久化存储，用于长期保存用户上传的数据
- **Report**: Memory 临时存储，用于快速、隔离的数据分析

从 v0.2.0 开始，Report 可以通过 `workspace_data` schema 访问 SQL Workspace 中的持久化数据。

## 架构

```
┌─────────────────────────────────┐
│  SQL Workspace (OPFS)           │
│  - 持久化存储                    │
│  - 用户上传的数据文件            │
│  - 表: customers, orders...     │
└─────────────────────────────────┘
         ↑
         │ ATTACH 'workspace.db' (READ_ONLY)
         │ (自动，透明)
         │
┌─────────────────────────────────┐
│  Report (Memory)                │
│  - 临时存储                      │
│  - 独立的分析计算                │
│  - 可访问 workspace_data.*      │
└─────────────────────────────────┘
```

## 使用方法

### 1. 在 SQL Workspace 中准备数据

首先在 SQL Workspace 上传或创建数据表：

```sql
-- 上传 CSV 文件，或直接在 SQL Workspace 创建表
CREATE TABLE customers AS
SELECT 'Alice' as name, 'NYC' as city, 25000 as lifetime_value
UNION ALL
SELECT 'Bob' as name, 'LA' as city, 15000 as lifetime_value
UNION ALL
SELECT 'Charlie' as name, 'NYC' as city, 30000 as lifetime_value
```

**✅ 数据已保存到 OPFS，刷新页面后仍然存在**

---

### 2. 在 Report 中引用 Workspace 数据

创建 Report，使用 `workspace_data.` 前缀引用 Workspace 表：

```markdown
# Customer Analysis Report

## Data from SQL Workspace

```sql customer_metrics
-- 引用 Workspace 的 customers 表
SELECT
  city,
  COUNT(*) as customer_count,
  SUM(lifetime_value) as total_ltv,
  AVG(lifetime_value) as avg_ltv
FROM workspace_data.customers  -- ← 自动 ATTACH workspace.db
WHERE lifetime_value > 10000
GROUP BY city
ORDER BY total_ltv DESC
```

## Visualization

```chart
type: bar
data: customer_metrics
x: city
y: customer_count
title: Customers by City
```

```datatable
data: customer_metrics
```
```

**执行流程：**

1. Report 执行时创建独立的 Memory DuckDB 实例
2. 检测到 SQL 中的 `workspace_data.customers` 引用
3. 自动 ATTACH workspace.db (READ_ONLY 模式)
4. 执行查询，从 Workspace 读取数据
5. 计算结果存储在 Report 的 Memory DB 中
6. Report 关闭时自动 DETACH

---

### 3. 结合 Report Inputs 进行动态分析

```markdown
# Dynamic Customer Analysis

## Inputs

```input.dropdown
name: min_ltv
label: Minimum Lifetime Value
options:
  - 5000
  - 10000
  - 20000
  - 30000
default: 10000
```

## Filtered Customers

```sql filtered_customers
-- 结合 Workspace 数据和 Report Inputs
SELECT *
FROM workspace_data.customers
WHERE lifetime_value >= ${inputs.min_ltv}
ORDER BY lifetime_value DESC
```

## Results

```datatable
data: filtered_customers
```
```

**优势：**

- ✅ Workspace 数据持久化（不随 Report 关闭而丢失）
- ✅ Report 计算临时化（快速、隔离）
- ✅ 动态交互（inputs 响应式更新）

---

## 语法参考

### 引用 Workspace 表

```sql
-- ✅ 正确: 使用 workspace_data schema
SELECT * FROM workspace_data.table_name

-- ❌ 错误: 直接引用（在 Report Memory DB 中不存在）
SELECT * FROM table_name
```

### JOIN Workspace 和 Report 数据

```sql
-- Step 1: 从 Workspace 加载基础数据
```sql base_data
SELECT * FROM workspace_data.orders
WHERE order_date > '2024-01-01'
```

-- Step 2: 在 Report 中进行额外计算
```sql enriched_data
SELECT
  *,
  amount * 1.1 as amount_with_tax,
  CASE
    WHEN amount > 1000 THEN 'High'
    ELSE 'Normal'
  END as tier
FROM base_data  -- ← 引用 Report 内部表
```
```

---

## 限制和注意事项

### 1. READ_ONLY 模式

Report 对 Workspace 数据的访问是**只读**的，无法修改：

```sql
-- ❌ 会失败: 无法在 READ_ONLY 模式下写入
INSERT INTO workspace_data.customers VALUES (...)
UPDATE workspace_data.customers SET ...
DELETE FROM workspace_data.customers WHERE ...

-- ✅ 只能读取
SELECT * FROM workspace_data.customers
```

**原因：** 保护 Workspace 数据完整性，防止 Report 意外修改源数据

---

### 2. Workspace 数据库不存在

如果 Workspace 中没有任何数据（首次使用），ATTACH 会失败：

```sql
SELECT * FROM workspace_data.customers
```

**错误提示：**
```
⚠️  Failed to attach workspace database: file not found
❌ Catalog Error: Schema with name workspace_data does not exist
```

**解决方法：** 先在 SQL Workspace 上传或创建数据表

---

### 3. 表名大小写

DuckDB 默认表名不区分大小写，但建议使用小写：

```sql
-- ✅ 推荐
SELECT * FROM workspace_data.customers

-- ⚠️ 也可以，但不推荐
SELECT * FROM workspace_data.CUSTOMERS
SELECT * FROM workspace_data.Customers
```

---

## 性能考虑

### ATTACH 操作开销

- **首次 ATTACH**: ~10-20ms (读取 OPFS 元数据)
- **后续引用**: 0ms (已 attached，自动跳过)

**优化：** ATTACH 是幂等的，多次调用不会重复操作

---

### 数据传输

ATTACH 不会复制数据，只共享元数据和文件句柄：

```
Memory 占用:
  - ATTACH workspace.db: ~100KB (catalog 信息)
  - 查询数据: 按需加载，不会全量复制
```

**适用场景：**
- ✅ 大数据集只读查询（Workspace 保存原始数据）
- ✅ 小数据集聚合计算（Report 计算中间结果）

---

## 示例场景

### 场景 1: 销售分析 Report

**Workspace 数据：**
- `orders` (100万行): 订单历史数据
- `customers` (10万行): 客户信息
- `products` (1000行): 产品目录

**Report 计算：**

```sql monthly_sales
SELECT
  DATE_TRUNC('month', o.order_date) as month,
  p.category,
  SUM(o.amount) as total_sales,
  COUNT(DISTINCT o.customer_id) as unique_customers
FROM workspace_data.orders o
JOIN workspace_data.products p ON o.product_id = p.id
WHERE o.order_date >= '2024-01-01'
GROUP BY 1, 2
ORDER BY 1, 2
```

**优势：**
- Report Memory DB 只存储聚合后的小结果集（~100行）
- Workspace 保留完整的原始数据（100万行）
- 多次执行 Report 不会污染 Workspace

---

### 场景 2: 交互式仪表盘

**Workspace 数据：**
- `user_events` (1000万行): 用户行为日志

**Report Inputs：**
```input.dropdown
name: event_type
options: [login, purchase, page_view, signup]
```

**Report 计算：**

```sql event_analysis
SELECT
  DATE(event_time) as date,
  COUNT(*) as event_count,
  COUNT(DISTINCT user_id) as unique_users
FROM workspace_data.user_events
WHERE event_type = '${inputs.event_type}'
  AND event_time > CURRENT_DATE - INTERVAL 30 DAY
GROUP BY 1
ORDER BY 1
```

**优势：**
- 用户切换 input 时，Report 响应式重新查询
- 每次查询都是隔离的（独立 Memory DB）
- Workspace 日志数据持久化保存

---

## 故障排查

### 问题 1: "Schema with name workspace_data does not exist"

**原因：** Workspace 数据库文件不存在（首次使用）

**解决：**
1. 进入 SQL Workspace
2. 上传 CSV/Parquet 文件，或手动创建表
3. 重新执行 Report

---

### 问题 2: "Table with name xxx does not exist"

**原因：** 表名拼写错误，或表在 Workspace 中不存在

**解决：**
1. 在 SQL Workspace 运行 `SHOW TABLES` 检查表名
2. 确认 Report SQL 中使用 `workspace_data.` 前缀
3. 检查表名大小写

---

### 问题 3: Report 执行很慢

**原因：** Workspace 数据集过大，且未创建索引

**解决：**
1. 在 Workspace 为常用查询字段创建索引:
   ```sql
   CREATE INDEX idx_orders_date ON orders(order_date)
   ```
2. 在 Report 中使用 WHERE 子句过滤数据
3. 考虑在 Workspace 预聚合数据

---

## 最佳实践

### 1. 数据分层

```
Workspace (OPFS):
  - 原始数据 (Raw data)
  - ETL 清洗后的数据 (Cleaned data)
  - 维度表 (Dimension tables)

Report (Memory):
  - 聚合指标 (Metrics)
  - 可视化数据 (Chart data)
  - 临时计算 (Temp calculations)
```

---

### 2. 命名规范

**Workspace 表命名：**
```
raw_orders           (原始数据)
cleaned_customers    (清洗后数据)
dim_products         (维度表)
```

**Report 表命名：**
```
monthly_sales        (聚合结果)
top_customers        (分析结果)
chart_data_xxx       (自动生成的图表数据)
```

---

### 3. 查询优化

```sql
-- ❌ 不推荐: 全表扫描
SELECT * FROM workspace_data.large_table

-- ✅ 推荐: 过滤 + 投影
SELECT
  id, name, amount
FROM workspace_data.large_table
WHERE date >= '2024-01-01'
  AND amount > 100
LIMIT 1000
```

---

## 总结

| 特性 | SQL Workspace | Report |
|------|--------------|--------|
| **存储** | OPFS (持久化) | Memory (临时) |
| **数据来源** | 用户上传 | SQL 计算 + Workspace ATTACH |
| **生命周期** | 跨会话 | 单次执行 |
| **访问权限** | 读写 | 只读 Workspace (READ_ONLY) |
| **适用场景** | 数据存储 | 数据分析 |

**核心优势：**
- ✅ Workspace 数据持久化，Report 计算临时化
- ✅ 自动 ATTACH，用户无感知
- ✅ READ_ONLY 保护，防止意外修改
- ✅ 清晰分层，职责分离
