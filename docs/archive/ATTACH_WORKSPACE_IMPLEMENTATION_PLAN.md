# ATTACH Workspace Implementation Plan

## 目标

实现 Report 通过 ATTACH 访问 SQL Workspace OPFS 数据的能力。

## 架构概述

```
SQL Workspace (OPFS)          Report (Memory)
┌──────────────────┐         ┌──────────────────┐
│ workspaceDB      │         │ reportDB_A       │
│ persist: true    │◄────────│ persist: false   │
│ path: workspace.db│ ATTACH │ ATTACH workspace │
└──────────────────┘ READ_ONLY└──────────────────┘
```

## 核心原则

1. **SQL Workspace**: 始终使用 OPFS (`persist: true`)
2. **Report**: 始终使用 Memory (`persist: false`)
3. **数据访问**: Report 需要访问 Workspace 数据时，ATTACH workspace.db (READ_ONLY)
4. **向后兼容**: 不破坏现有 Report 功能
5. **自动检测**: 自动识别 SQL 中的 workspace 表引用

## 代码影响分析

### 文件修改清单

| 文件 | 修改类型 | 行数影响 | 风险 |
|------|---------|---------|------|
| `src/core/database/duckdb.ts` | 修改 | +30 行 | 低 |
| `src/core/markdown/sql-executor.ts` | 修改 | +60 行 | 中 |
| `src/core/engine/report-execution.service.ts` | 修改 | +20 行 | 低 |
| `src/types/database.ts` | 新增 | +15 行 | 无 |
| `docs/REPORT_WORKSPACE_ATTACH.md` | 新增 | N/A | 无 |

**总计: ~125 行新增代码**

---

## 详细修改方案

### 1. `src/core/database/duckdb.ts`

**目的**: 添加 ATTACH/DETACH workspace 数据库的方法

#### 修改 1.1: 添加 workspace 路径常量

```typescript
/**
 * Workspace OPFS database path
 */
export const WORKSPACE_DB_PATH = 'workspace.db'
export const WORKSPACE_ATTACH_NAME = 'workspace_data'
```

**位置**: 文件顶部，导入语句后
**影响**: +2 行
**风险**: 无

---

#### 修改 1.2: 添加 attached databases 跟踪

```typescript
export class DuckDBManager {
  private db: duckdb.AsyncDuckDB | null = null
  private conn: duckdb.AsyncDuckDBConnection | null = null
  private logger: duckdb.ConsoleLogger
  private attachedDatabases = new Set<string>()  // NEW: 跟踪已 attach 的数据库

  constructor() {
    this.logger = new duckdb.ConsoleLogger()
  }

  // ... existing methods
}
```

**位置**: DuckDBManager 类，constructor 上方
**影响**: +1 行
**风险**: 无

---

#### 修改 1.3: 添加 attachWorkspaceDatabase() 方法

```typescript
/**
 * Attach workspace OPFS database (read-only)
 * Allows Report Memory DB to read from persistent workspace data
 *
 * @returns true if attached, false if already attached
 */
async attachWorkspaceDatabase(): Promise<boolean> {
  if (!this.conn) {
    throw new Error('Database not initialized')
  }

  // Check if already attached
  if (this.attachedDatabases.has(WORKSPACE_ATTACH_NAME)) {
    console.log(`📎 Workspace already attached as ${WORKSPACE_ATTACH_NAME}`)
    return false
  }

  try {
    // ATTACH workspace.db in read-only mode
    await this.conn.query(`
      ATTACH '${WORKSPACE_DB_PATH}' (READ_ONLY) AS ${WORKSPACE_ATTACH_NAME}
    `)

    this.attachedDatabases.add(WORKSPACE_ATTACH_NAME)
    console.log(`✅ Attached workspace OPFS database as ${WORKSPACE_ATTACH_NAME} (READ_ONLY)`)
    return true
  } catch (error) {
    console.warn(`⚠️  Failed to attach workspace database:`, error)
    // Workspace DB might not exist yet (first time user)
    return false
  }
}
```

**位置**: DuckDBManager 类，query() 方法后
**影响**: +27 行
**风险**: 低 - 使用 READ_ONLY 避免锁冲突

---

#### 修改 1.4: 添加 detachWorkspaceDatabase() 方法

```typescript
/**
 * Detach workspace database
 */
async detachWorkspaceDatabase(): Promise<void> {
  if (!this.conn) {
    return
  }

  if (!this.attachedDatabases.has(WORKSPACE_ATTACH_NAME)) {
    return
  }

  try {
    await this.conn.query(`DETACH ${WORKSPACE_ATTACH_NAME}`)
    this.attachedDatabases.delete(WORKSPACE_ATTACH_NAME)
    console.log(`🔓 Detached workspace database`)
  } catch (error) {
    console.warn(`Failed to detach workspace:`, error)
  }
}
```

**位置**: DuckDBManager 类，attachWorkspaceDatabase() 后
**影响**: +18 行
**风险**: 无

---

#### 修改 1.5: 添加 isWorkspaceAttached() 辅助方法

```typescript
/**
 * Check if workspace database is currently attached
 */
isWorkspaceAttached(): boolean {
  return this.attachedDatabases.has(WORKSPACE_ATTACH_NAME)
}
```

**位置**: DuckDBManager 类，detachWorkspaceDatabase() 后
**影响**: +5 行
**风险**: 无

---

#### 修改 1.6: 更新 close() 方法，清理 attachments

```typescript
async close() {
  if (this.conn) {
    // Detach all attached databases before closing
    for (const dbName of this.attachedDatabases) {
      try {
        await this.conn.query(`DETACH ${dbName}`)
      } catch (err) {
        console.warn(`Failed to detach ${dbName}:`, err)
      }
    }
    this.attachedDatabases.clear()

    await this.conn.close()
    this.conn = null
  }

  if (this.db) {
    await this.db.terminate()
    this.db = null
  }

  console.log('DuckDB closed')
}
```

**位置**: DuckDBManager 类，替换现有 close() 方法
**影响**: +11 行 (修改现有方法)
**风险**: 低

---

**`src/core/database/duckdb.ts` 总结:**
- 新增行数: ~63 行
- 新增方法: 3 个 (attach, detach, isAttached)
- 修改方法: 1 个 (close)
- 向后兼容: ✅ 是 (纯新增功能)

---

### 2. `src/core/markdown/sql-executor.ts`

**目的**: 自动检测并 ATTACH workspace 数据库

#### 修改 2.1: 导入新的常量

```typescript
import {
  duckDBManager,
  type DuckDBManager,
  WORKSPACE_ATTACH_NAME  // NEW
} from '@core/database'
```

**位置**: 文件顶部 import 区域
**影响**: +1 行
**风险**: 无

---

#### 修改 2.2: 添加 SQL 分析函数

```typescript
/**
 * Detect if SQL references workspace tables
 *
 * Looks for patterns like:
 * - workspace_data.table_name
 * - FROM table_name (where table_name might be in workspace)
 *
 * @param sql - SQL query to analyze
 * @returns true if workspace reference detected
 */
function detectWorkspaceTableReference(sql: string): boolean {
  // Pattern 1: Explicit workspace_data schema reference
  if (sql.includes(`${WORKSPACE_ATTACH_NAME}.`)) {
    return true
  }

  // Pattern 2: Check for table names that aren't in report_data schema
  // This is a heuristic - we assume if a table is referenced without schema prefix
  // and it's not a report_data table, it might be a workspace table

  // For now, use simple heuristic: if workspace_data. is mentioned, attach
  // Future enhancement: query information_schema to check if table exists in workspace

  return false
}
```

**位置**: executeSQLBlock() 函数前
**影响**: +25 行
**风险**: 低 - 保守策略，只在明确引用时才 attach

---

#### 修改 2.3: 修改 executeSQLBlock() - 添加 ATTACH 逻辑

**现有代码位置**: `src/core/markdown/sql-executor.ts:30-100`

**修改点**: 在 SQL 执行前检测并 ATTACH

```typescript
export async function executeSQLBlock(
  block: ParsedCodeBlock,
  tableMapping: Map<string, string>,
  templateContext?: SQLTemplateContext,
  db?: DuckDBManager
): Promise<{
  success: boolean
  result?: QueryResult
  error?: string
  dependencies?: { inputs: string[]; blocks: string[] }
}> {
  try {
    console.log(`Executing SQL block: ${block.id}`)

    // Extract dependencies before template interpolation
    const dependencies = extractDependencies(block.content, templateContext)

    // Interpolate template variables
    let sql = interpolateSQLTemplate(block.content, templateContext)

    // NEW: Auto-attach workspace if needed
    if (db && detectWorkspaceTableReference(sql)) {
      console.log('🔍 Detected workspace table reference in SQL')
      const attached = await db.attachWorkspaceDatabase()
      if (attached) {
        console.log('✅ Workspace OPFS database attached for this query')
      }
    }

    // Execute query
    let result
    if (db) {
      result = await db.query(sql)
    } else {
      const dbStore = getDatabaseStore()
      result = await dbStore.executeQuery(sql)
    }

    // Rest of existing code...
    // (table loading, etc.)

  } catch (error) {
    // Existing error handling...
  }
}
```

**位置**: executeSQLBlock 函数内，SQL 执行前
**影响**: +8 行
**风险**: 低 - 仅在检测到引用时才 attach

---

#### 修改 2.4: 添加用户提示文档字符串

在 executeSQLBlock 函数头添加文档注释，说明如何引用 workspace 数据：

```typescript
/**
 * Execute a SQL block
 *
 * SQL blocks can reference workspace tables using the workspace_data schema:
 *
 * @example
 * ```sql
 * -- Reference workspace tables
 * SELECT * FROM workspace_data.customers
 * WHERE region = '${inputs.region}'
 * ```
 *
 * The workspace database will be automatically attached (read-only) when needed.
 *
 * @param block - Parsed SQL code block
 * @param tableMapping - Map of logical names to physical table names
 * @param templateContext - Template variables (inputs, metadata)
 * @param db - Database instance to use (defaults to workspace)
 */
export async function executeSQLBlock(
  // ... parameters
```

**位置**: executeSQLBlock 函数定义前
**影响**: +15 行
**风险**: 无

---

**`src/core/markdown/sql-executor.ts` 总结:**
- 新增行数: ~49 行
- 新增函数: 1 个 (detectWorkspaceTableReference)
- 修改函数: 1 个 (executeSQLBlock - 添加 attach 逻辑)
- 向后兼容: ✅ 是 (不影响不使用 workspace 的 Report)

---

### 3. `src/core/engine/report-execution.service.ts`

**目的**: 在 Report 清理时 detach workspace

#### 修改 3.1: 更新 clearExecutionState() - 添加 DETACH

**现有代码位置**: `src/core/engine/report-execution.service.ts:502-514`

```typescript
/**
 * Clear execution state for a report
 */
clearExecutionState(reportId: string) {
  console.log('🧹 Clearing execution state for report:', reportId)

  // Unsubscribe from reactive updates
  const unsubscribe = this.reactiveUnsubscribers.get(reportId)
  if (unsubscribe) {
    unsubscribe()
    this.reactiveUnsubscribers.delete(reportId)
  }

  // NEW: Detach workspace if attached
  const reportDB = this.reportDatabases.get(reportId)
  if (reportDB && reportDB.isWorkspaceAttached()) {
    console.log('  Detaching workspace database...')
    reportDB.detachWorkspaceDatabase().catch(err =>
      console.warn('  Failed to detach workspace:', err)
    )
  }

  // Clear execution state
  this.executionStates.delete(reportId)
}
```

**影响**: +8 行
**风险**: 无

---

#### 修改 3.2: 更新 cleanup() - 添加 DETACH

**现有代码位置**: `src/core/engine/report-execution.service.ts:519-534`

```typescript
/**
 * Cleanup all subscriptions and database instances
 */
cleanup() {
  console.log('🧹 Cleaning up all reactive subscriptions and Memory DB instances')

  for (const [_reportId, unsubscribe] of this.reactiveUnsubscribers.entries()) {
    unsubscribe()
  }
  this.reactiveUnsubscribers.clear()
  this.executionStates.clear()

  // Cleanup all Report Memory DB instances
  for (const [reportId, db] of this.reportDatabases.entries()) {
    console.log(`  Closing Memory DB for report: ${reportId}`)

    // NEW: Detach workspace before closing
    if (db.isWorkspaceAttached()) {
      db.detachWorkspaceDatabase().catch(err =>
        console.warn(`  Failed to detach workspace for ${reportId}:`, err)
      )
    }

    db.close().catch(err => console.warn(`Failed to close DB for ${reportId}:`, err))
  }
  this.reportDatabases.clear()
}
```

**影响**: +7 行
**风险**: 无

---

**`src/core/engine/report-execution.service.ts` 总结:**
- 新增行数: ~15 行
- 修改方法: 2 个 (clearExecutionState, cleanup)
- 向后兼容: ✅ 是

---

### 4. `src/types/database.ts` (新增类型定义)

**目的**: 添加 workspace attach 相关的类型定义

```typescript
/**
 * Workspace database attachment options
 */
export interface WorkspaceAttachOptions {
  /**
   * Name to use for the attached database
   * @default 'workspace_data'
   */
  attachName?: string

  /**
   * Whether to attach in read-only mode
   * @default true
   */
  readOnly?: boolean
}

/**
 * Database attachment state
 */
export interface AttachmentState {
  /**
   * Name of the attached database
   */
  name: string

  /**
   * Path to the attached database file
   */
  path: string

  /**
   * Whether attached in read-only mode
   */
  readOnly: boolean

  /**
   * Timestamp when attached
   */
  attachedAt: Date
}
```

**位置**: 新文件或在现有 `src/types/database.ts` 末尾
**影响**: +38 行 (可选，用于类型安全)
**风险**: 无

---

### 5. 文档更新

#### 5.1 新增: `docs/REPORT_WORKSPACE_ATTACH.md`

用户使用指南，说明如何在 Report 中引用 Workspace 数据。

**内容大纲:**
1. 概述: Report Memory vs Workspace OPFS
2. 使用方法: `workspace_data.table_name` 语法
3. 示例: 完整的 Report markdown 示例
4. 注意事项: READ_ONLY 限制
5. 故障排查

**影响**: 新文件
**风险**: 无

---

#### 5.2 更新: `docs/TABLE_LIFECYCLE.md`

添加 ATTACH 机制的说明。

**影响**: +50 行
**风险**: 无

---

## 功能行为

### 自动检测机制

```typescript
// Report SQL 块
```sql customer_analysis
-- 这会触发自动 ATTACH
SELECT
  region,
  COUNT(*) as count
FROM workspace_data.customers  -- ← 检测到 workspace_data.
WHERE age > 25
GROUP BY region
```

**执行流程:**
1. `executeSQLBlock()` 解析 SQL
2. `detectWorkspaceTableReference()` 检测到 `workspace_data.`
3. `db.attachWorkspaceDatabase()` 执行 ATTACH
4. SQL 正常执行
5. Report 关闭时 `detachWorkspaceDatabase()`

---

### 向后兼容性

**现有 Report 行为不变:**

```sql
-- 不使用 workspace_data，无影响
SELECT 1 as id, 'test' as name
```

```sql my_data
-- 使用 report_data schema，无影响
SELECT * FROM report_data.my_previous_query
```

✅ **100% 向后兼容**

---

## 错误处理

### 场景 1: Workspace 数据库不存在

```typescript
// 首次使用，workspace.db 不存在
await db.attachWorkspaceDatabase()
// ⚠️  Failed to attach workspace database: file not found
// 继续执行，SQL 会报错 "table not found" (符合预期)
```

### 场景 2: 表不存在

```sql
SELECT * FROM workspace_data.non_existent_table
-- ❌ Catalog Error: Table with name non_existent_table does not exist
-- (正常错误提示)
```

### 场景 3: 尝试写入 (READ_ONLY)

```sql
INSERT INTO workspace_data.customers VALUES (...)
-- ❌ Error: cannot write to read-only database
-- (DuckDB 自动阻止)
```

---

## 测试计划

### 单元测试

**文件**: `src/core/database/duckdb.test.ts` (新增)

```typescript
describe('DuckDBManager - Workspace Attach', () => {
  test('attachWorkspaceDatabase() attaches successfully', async () => {
    const db = new DuckDBManager()
    await db.initialize({ persist: false })

    const attached = await db.attachWorkspaceDatabase()
    expect(attached).toBe(true)
    expect(db.isWorkspaceAttached()).toBe(true)
  })

  test('attachWorkspaceDatabase() idempotent', async () => {
    const db = new DuckDBManager()
    await db.initialize({ persist: false })

    await db.attachWorkspaceDatabase()
    const secondAttach = await db.attachWorkspaceDatabase()
    expect(secondAttach).toBe(false) // Already attached
  })

  test('detachWorkspaceDatabase() cleans up', async () => {
    const db = new DuckDBManager()
    await db.initialize({ persist: false })

    await db.attachWorkspaceDatabase()
    await db.detachWorkspaceDatabase()
    expect(db.isWorkspaceAttached()).toBe(false)
  })
})
```

### 集成测试

**手动测试步骤:**

1. **准备 Workspace 数据**
   - 启动 dev server
   - 在 SQL Workspace 创建表:
     ```sql
     CREATE TABLE customers AS
     SELECT 'Alice' as name, 'NYC' as city
     UNION ALL
     SELECT 'Bob' as name, 'LA' as city
     ```

2. **创建引用 Workspace 的 Report**
   ```markdown
   # Customer Report

   ```sql customer_list
   SELECT * FROM workspace_data.customers
   WHERE city = 'NYC'
   ```

   ```datatable
   data: customer_list
   ```
   ```

3. **执行 Report**
   - 点击 Execute
   - 检查 Console: 应看到 "✅ Attached workspace OPFS database"
   - 验证表格显示 Alice 的数据

4. **关闭 Report**
   - 检查 Console: 应看到 "🔓 Detached workspace database"

---

## 风险评估

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|---------|
| ATTACH READ_ONLY 失败 | 中 | 低 | try-catch 捕获，记录警告 |
| Workspace DB 不存在 | 低 | 中 | 首次使用正常，SQL 报错友好 |
| 多个 Report 同时 ATTACH | 低 | 高 | READ_ONLY 允许并发 |
| DETACH 失败导致泄漏 | 低 | 低 | close() 强制清理 |
| 检测逻辑误判 | 低 | 低 | 保守策略，只检测显式引用 |

**总体风险: 低**

---

## 性能影响

### ATTACH 操作耗时

```
ATTACH ':memory:' AS test     ~5ms
ATTACH 'workspace.db' AS test ~10-20ms (OPFS 读取元数据)
DETACH test                    ~1ms
```

**影响**: 每个使用 workspace 的 Report 增加 ~20ms 初始化时间 (可忽略)

### 内存影响

- ATTACH 不复制数据，仅共享元数据
- 内存增加: ~100KB (catalog 信息)

**影响**: 可忽略

---

## 实施顺序

1. ✅ **Phase 1**: 修改 `duckdb.ts` (添加 attach/detach 方法)
2. ✅ **Phase 2**: 修改 `sql-executor.ts` (添加自动检测)
3. ✅ **Phase 3**: 修改 `report-execution.service.ts` (清理逻辑)
4. ✅ **Phase 4**: 添加文档 (`REPORT_WORKSPACE_ATTACH.md`)
5. ✅ **Phase 5**: 手动测试验证
6. 🔜 **Phase 6**: 更新 `TABLE_LIFECYCLE.md`

---

## 总结

### 代码修改统计

| 文件 | 新增 | 修改 | 删除 | 总计 |
|------|-----|------|------|------|
| `duckdb.ts` | 63 | 11 | 0 | 74 |
| `sql-executor.ts` | 49 | 8 | 0 | 57 |
| `report-execution.service.ts` | 15 | 0 | 0 | 15 |
| `database.ts` (types) | 38 | 0 | 0 | 38 |
| **总计** | **165** | **19** | **0** | **184** |

### 关键特性

✅ **自动检测**: SQL 中使用 `workspace_data.table` 自动 ATTACH
✅ **READ_ONLY**: 避免锁冲突，保护 Workspace 数据
✅ **向后兼容**: 现有 Report 无影响
✅ **自动清理**: Report 关闭自动 DETACH
✅ **零配置**: 用户无需手动 ATTACH/DETACH

### 用户体验

**Before:**
```sql
-- ❌ 无法访问 Workspace 数据
SELECT * FROM customers
-- Error: Table customers does not exist
```

**After:**
```sql
-- ✅ 自动 ATTACH，直接使用
SELECT * FROM workspace_data.customers
WHERE region = '${inputs.region}'
-- Works! 🎉
```

---

## 待审核问题

1. **检测策略**: 当前只检测显式的 `workspace_data.` 引用，是否需要更智能的检测？
2. **ATTACH 时机**: 当前在每个 SQL block 执行前检测，是否在 Report 开始时统一 ATTACH？
3. **错误提示**: Workspace DB 不存在时，是否需要更友好的提示？
4. **性能优化**: 是否需要缓存 ATTACH 状态，避免重复检查？

**请审核后反馈！** 🙏
