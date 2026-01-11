# DuckDB Memory Optimization Proposal

## 问题分析

当前架构：每个 Report 创建独立的 DuckDB-WASM 实例

**内存开销：**
- SQL Workspace: 1 × WASM (~20MB)
- Report A: 1 × WASM (~20MB)
- Report B: 1 × WASM (~20MB)
- Report C: 1 × WASM (~20MB)
- **总计: ~80MB** (仅 WASM overhead，不含数据)

**性能问题：**
- 实例化 WASM 慢 (~500-1000ms per instance)
- 多个 Web Worker 调度开销
- 不能充分利用 DuckDB 的查询优化

## 推荐方案对比

### 方案 1: ATTACH DATABASE ⭐ **最优方案**

使用 DuckDB 的 `ATTACH` 特性附加内存数据库。

#### 概念
```
┌─────────────────────────────────────┐
│   Single DuckDB-WASM Instance       │
│   (workspaceDB)                     │
├─────────────────────────────────────┤
│  main catalog (default)             │
│    ├─ user_data (OPFS tables)      │
│    └─ uploaded_files                │
├─────────────────────────────────────┤
│  report_abc123 (ATTACH ':memory:')  │  ← Report A
│    ├─ my_query                      │
│    └─ chart_data                    │
├─────────────────────────────────────┤
│  report_def456 (ATTACH ':memory:')  │  ← Report B
│    ├─ sales_data                    │
│    └─ metrics                       │
└─────────────────────────────────────┘
```

#### 实现代码

```typescript
// src/core/database/duckdb.ts

export class DuckDBManager {
  private attachedDatabases = new Set<string>()

  /**
   * Attach a memory database for a report
   */
  async attachReportDatabase(reportId: string): Promise<string> {
    const dbName = `report_${reportId}`

    if (this.attachedDatabases.has(dbName)) {
      console.warn(`Database ${dbName} already attached`)
      return dbName
    }

    await this.query(`ATTACH ':memory:' AS ${dbName}`)
    this.attachedDatabases.add(dbName)

    console.log(`✅ Attached memory database: ${dbName}`)
    return dbName
  }

  /**
   * Detach a report database when report closes
   */
  async detachReportDatabase(reportId: string): Promise<void> {
    const dbName = `report_${reportId}`

    if (!this.attachedDatabases.has(dbName)) {
      return
    }

    await this.query(`DETACH ${dbName}`)
    this.attachedDatabases.delete(dbName)

    console.log(`🗑️  Detached database: ${dbName}`)
  }

  /**
   * List all tables in a specific database
   */
  async listTablesInDatabase(dbName: string): Promise<string[]> {
    const result = await this.query(`
      SELECT table_name
      FROM ${dbName}.information_schema.tables
      WHERE table_schema = 'main'
    `)
    return result.data.map(row => row.table_name)
  }
}
```

```typescript
// src/core/database/table-loader.ts

export interface LoadTableOptions {
  temporary?: boolean
  database?: string  // NEW: Target database (e.g., 'report_abc123')
  db?: DuckDBManager
}

export async function loadDataIntoTable(
  tableName: string,
  data: any[],
  columns: string[],
  options?: LoadTableOptions
): Promise<void> {
  const db = options?.db || workspaceDB

  // Determine table name with database prefix
  const fullTableName = options?.database
    ? `${options.database}.${tableName}`
    : tableName

  // Create and load table
  const tableArrow = createArrowTable(data, columns)
  await db.insertArrowTable(tableArrow, fullTableName)

  console.log(`✅ Loaded ${data.length} rows into ${fullTableName}`)
}
```

```typescript
// src/core/engine/report-execution.service.ts

export class ReportExecutionService {
  private attachedDatabases = new Map<string, string>()  // reportId -> dbName

  async executeReport(
    report: Report,
    inputStore: IInputStore,
    onProgress?: ProgressCallback,
    onBlockUpdate?: BlockUpdateCallback
  ): Promise<ExecutionResult> {
    console.log('🚀 ReportExecutionService.executeReport() called for:', report.id)

    try {
      // Attach a memory database for this report
      console.log('🔧 Attaching memory database for Report...')
      const dbName = await workspaceDB.attachReportDatabase(report.id)
      this.attachedDatabases.set(report.id, dbName)
      console.log(`✅ Report database attached: ${dbName}`)

      // Parse markdown
      const parsed = await parseMarkdown(report.content)
      const sqlBlocks = extractSQLBlocks(parsed.codeBlocks)

      // Initialize inputs
      getInputInitializer().initializeDefaults(parsed.codeBlocks, inputStore)
      const inputValues = get(inputStore)

      const templateContext: SQLTemplateContext = {
        inputs: inputValues,
        metadata: report.metadata
      }

      // Execute report SQL in the attached database
      const result = await executeReportSQL(
        report,
        parsed.codeBlocks,
        workspaceDB,  // Same DB instance
        onProgress,
        templateContext,
        { database: dbName }  // Pass database name for table creation
      )

      // ... rest of execution logic

      return {
        success: result.success,
        errors: result.errors.map(e => `${e.blockId}: ${e.message}`),
        failedBlocks: result.failedBlocks,
        tableMapping: result.tableMapping,
        dependencyAnalysis: result.dependencyAnalysis
      }
    } catch (error) {
      console.error('💥 Failed to execute report:', error)
      throw error
    }
  }

  /**
   * Cleanup: detach database when report closes
   */
  async clearExecutionState(reportId: string) {
    console.log('🧹 Clearing execution state for report:', reportId)

    // Unsubscribe from reactive updates
    const unsubscribe = this.reactiveUnsubscribers.get(reportId)
    if (unsubscribe) {
      unsubscribe()
      this.reactiveUnsubscribers.delete(reportId)
    }

    // Detach the report's database
    const dbName = this.attachedDatabases.get(reportId)
    if (dbName) {
      await workspaceDB.detachReportDatabase(reportId)
      this.attachedDatabases.delete(reportId)
    }

    this.executionStates.delete(reportId)
  }
}
```

#### 优点
- ✅ **单 WASM 实例** (~20MB vs ~80MB)
- ✅ **真正的数据库隔离** (ATTACH 创建独立的 catalog)
- ✅ **生命周期管理清晰** (ATTACH/DETACH)
- ✅ **DuckDB 原生特性** (稳定、经过测试)
- ✅ **查询性能好** (单 Web Worker，无 IPC 开销)
- ✅ **符合 Report 概念模型** (每个 Report 是独立的数据库)

#### 缺点
- ⚠️ 所有 Report 在同一 Web Worker (CPU 密集查询会阻塞)
- ⚠️ 需要管理 attach/detach 生命周期
- ⚠️ 无法完全隔离崩溃 (一个查询崩溃会影响所有)

#### 内存对比
```
Before: 20MB (workspace) + 20MB × N (reports) = 20 + 20N MB
After:  20MB (workspace) + 数据大小 × N          = 20 + data MB

示例 (3 reports, 每个 5MB 数据):
Before: 20 + 60 = 80MB
After:  20 + 15 = 35MB  (节省 56%)
```

---

### 方案 2: Schema 隔离 (最简单)

使用 schema 命名空间隔离。

```typescript
// Create schema per report
await workspaceDB.query(`CREATE SCHEMA report_${reportId}`)
await workspaceDB.query(`CREATE TABLE report_${reportId}.my_table AS ...`)

// Cleanup
await workspaceDB.query(`DROP SCHEMA report_${reportId} CASCADE`)
```

#### 优点
- ✅ **最简单实现** (已有 report_data schema)
- ✅ **最低开销** (仅命名空间隔离)
- ✅ **性能最好** (同一 catalog，查询优化器可跨 schema)

#### 缺点
- ❌ **非真隔离** (可以 `SELECT * FROM report_abc.table`)
- ❌ **清理风险** (忘记 DROP CASCADE 会泄漏表)
- ❌ **不符合 "Report = Database" 概念**

---

### 方案 3: Connection-based Temporary Tables

每个 Report 使用独立的连接 + TEMP 表。

```typescript
const reportConn = await workspaceDB.connect()
await reportConn.query('CREATE TEMP TABLE my_table AS ...')
// Temp tables auto-cleanup when connection closes
await reportConn.close()
```

#### 优点
- ✅ **自动清理** (连接关闭时 TEMP 表自动删除)
- ✅ **连接级隔离** (TEMP 表对其他连接不可见)

#### 缺点
- ❌ **不适合 Report 场景** (TEMP 表在连接间不可见，无法给 Chart 使用)
- ❌ **DuckDB-WASM 的多连接支持有限**

---

### 方案 4: 当前方案 (Multi-instance)

每个 Report 独立 WASM 实例。

#### 优点
- ✅ **最大隔离**
- ✅ **独立崩溃**
- ✅ **并行执行** (多 Web Worker)

#### 缺点
- ❌ **高内存开销** (20MB × N)
- ❌ **慢启动** (实例化 WASM 500-1000ms)
- ❌ **不可扩展** (10个 Report = 200MB)

---

## 推荐决策树

```
是否需要跨 Report 查询? (如 JOIN 两个 Report 的数据)
├─ 是 → Schema 隔离 (方案 2)
└─ 否 → 是否关心内存? (< 50MB 可用)
    ├─ 否 → 当前方案 (方案 4) - 最大隔离
    └─ 是 → ATTACH DATABASE (方案 1) ⭐ 推荐
```

## 我的建议

**从 DuckDB 专家视角，我强烈推荐方案 1: ATTACH DATABASE**

理由：
1. **符合 DuckDB 设计哲学** - DuckDB 设计用于嵌入式场景，ATTACH 是其核心特性
2. **真正的数据库隔离** - 每个 attached DB 有独立的 catalog
3. **内存效率** - 节省 ~60-70% WASM overhead
4. **符合概念模型** - "Report = Database" 概念清晰
5. **生产级特性** - ATTACH 在 DuckDB 中广泛使用，稳定可靠

### 实施路线图

**Phase 1: 验证 ATTACH 在 DuckDB-WASM 中的兼容性**
- 在 SQL Workspace 测试 `ATTACH ':memory:' AS test`
- 验证 attached DB 的表创建和查询

**Phase 2: 修改 ReportExecutionService**
- 移除 `createReportDB()` 调用
- 改用 `workspaceDB.attachReportDatabase(reportId)`
- 修改 `table-loader` 支持 `database` 参数

**Phase 3: 更新清理逻辑**
- `clearExecutionState()` 调用 `detachReportDatabase()`
- 添加错误处理 (确保 DETACH 总是执行)

**Phase 4: 数据快照支持 (可选)**
- 从 attached DB 导出数据: `COPY (SELECT * FROM report_abc.table) TO 'data.parquet'`
- 存储到 `report.embeddedData`

## 性能测试建议

```javascript
// Benchmark: 对比当前方案 vs ATTACH 方案

// Test 1: 创建时间
console.time('Create Report DB')
// Current: await createReportDB()
// ATTACH:  await workspaceDB.attachReportDatabase(id)
console.timeEnd('Create Report DB')

// Test 2: 内存占用
// Current: performance.memory.usedJSHeapSize (before/after)
// ATTACH:  performance.memory.usedJSHeapSize (before/after)

// Test 3: 查询性能
// 在 attached DB 中执行相同查询，对比性能
```

## 风险评估

| 风险 | 影响 | 缓解措施 |
|------|------|---------|
| ATTACH 在 WASM 不稳定 | 高 | Phase 1 充分测试 |
| 单 Worker 性能瓶颈 | 中 | 监控查询时间，考虑 Worker Pool |
| DETACH 失败导致泄漏 | 中 | try-finally 确保清理 |
| 跨 Report 数据访问 | 低 | 不是问题 (符合用户需求) |

## 总结

**从 DuckDB 专家角度，ATTACH DATABASE 是最优雅、最高效的解决方案。**

它利用了 DuckDB 的原生能力，避免了重复实例化的开销，同时保持了逻辑隔离。这正是 DuckDB 设计用于嵌入式场景的核心理念。
