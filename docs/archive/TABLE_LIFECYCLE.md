# Table Lifecycle and Visibility

**Last Updated**: 2025-12-26
**Purpose**: Document how different types of tables are created, managed, and displayed in Miaoshou Vision

---

## Table Types

### 1. User Tables (Permanent)

**Created by**:
- File uploads (CSV, Parquet, JSON) via Data Explorer
- Manual `CREATE TABLE` statements in SQL Workspace

**Visibility**:
- ✅ Shown in SQL Workspace Data Explorer
- ✅ Listed in `SHOW TABLES`
- ✅ Visible across sessions (persisted in OPFS)

**Lifecycle**:
- Persists in DuckDB OPFS storage
- Survives page refreshes
- Deleted explicitly by user

**Examples**:
- `users.csv`
- `sales_data`
- `products`

---

### 2. Report Tables (Internal - report_data Schema)

**Created by**:
- Report execution (SQL blocks in Markdown reports)
- Automatically created when executing `▶ Execute` in Report editor

**Visibility**:
- ❌ Hidden from SQL Workspace Data Explorer (schema-based filtering)
- ❌ NOT listed in Data Explorer (only `main` schema tables shown)
- ✅ Accessible within report via SQL references (cross-block queries)
- ✅ Stored in separate `report_data` schema for clean isolation

**Lifecycle**:
- Persists in DuckDB session (in-memory by default, OPFS-ready)
- Can be manually cleaned up via `cleanupReportTables()`
- Survives page refreshes (if OPFS enabled)
- Recreated when report is re-executed

**Naming Convention**:
- Schema: `report_data`
- Format: `memory.report_data.chart_data_<block_id>`
- Examples: `memory.report_data.chart_data_block_0`, `memory.report_data.chart_data_sql_query_1`

**Implementation**:
```typescript
// In sql-executor.ts
await loadDataIntoTable(tableName, result.data, result.columns, {
  schema: 'report_data'  // Create in report_data schema (hidden from SQL Workspace)
})
// Tables created as: report_data."chart_data_block_0"
```

**Why Schema Separation?**:
1. ✅ Clean organizational separation: user tables (main) vs report tables (report_data)
2. ✅ Schema-based filtering in Data Explorer (no table name patterns needed)
3. ✅ Reports use plugin charts (JSON-based) - no direct table access required
4. ✅ Supports both in-memory and OPFS persistence
5. ✅ Manual cleanup available via `cleanupReportTables()` API
6. ⚠️ SQL Workspace uses `main` schema for user tables

---

### 3. SQL Workspace Query Tables (User-Created Temporary)

**Created by**:
- User's `CREATE TABLE` in SQL editor (without persistence)
- Ad-hoc data transformations

**Visibility**:
- ✅ Shown in Data Explorer (if not prefixed with `chart_data_`)
- ✅ Listed in `SHOW TABLES`
- ⚠️ Session-based (in-memory, not persisted to OPFS)

**Lifecycle**:
- Exists until page refresh or explicit `DROP TABLE`
- Lost on browser refresh
- Can be converted to permanent by re-running with OPFS enabled

---

## Technical Implementation

### Report Table Creation (Schema-Based)

**File**: `src/core/markdown/sql-executor.ts`

```typescript
// Step 1: Execute SQL block
const result = await dbStore.executeQuery(sql)

// Step 2: Generate table name
const tableName = `chart_data_${block.id}`

// Step 3: Load into DuckDB in report_data schema
// Tables in report_data schema are hidden from SQL Workspace Data Explorer
await loadDataIntoTable(tableName, result.data, result.columns, {
  schema: 'report_data'  // Create in report_data schema
})

// Step 4: Store fully qualified table name for cross-block references
// DuckDB-WASM uses 'memory' as the default catalog
const fullTableName = `memory.report_data.${tableName}`
tableMapping.set(block.id, fullTableName)
```

### Table Loader

**File**: `src/core/database/table-loader.ts`

```typescript
export interface LoadTableOptions {
  schema?: string  // Schema to create table in (e.g., 'report_data')
}

function buildTableSQLSync(tableName, data, columns, options) {
  // Handle schema-qualified table names
  // Input: tableName = "report_data.chart_data_block_0"
  // Output: CREATE TABLE report_data."chart_data_block_0"
  let tableIdentifier: string
  if (tableName.includes('.')) {
    const parts = tableName.split('.')
    const schema = parts.slice(0, -1).join('.')
    const table = parts[parts.length - 1]
    tableIdentifier = `${schema}."${table}"`  // Correct quoting
  } else {
    tableIdentifier = `"${tableName}"`
  }

  return `CREATE OR REPLACE TABLE ${tableIdentifier} AS ...`
}
```

### Dual Architecture: Plugin Charts vs vgplot

**Reports (report_data Schema + Plugin Charts)**:
- SQL blocks create tables in `report_data` schema
- Charts use **plugin pattern** (Svelte+SVG): BarChart, PieChart, LineChart, AreaChart, ScatterChart, etc.
- Data flow: SQL → `report_data.chart_data_*` → Extract JSON → Plugin Component
- Benefits: Schema isolation, clean separation, OPFS-ready

**SQL Workspace (main Schema + vgplot)**:
- User uploads and ad-hoc queries create tables in `main` schema
- Charts use **Mosaic vgplot** for advanced features (crossfilter, brush, large datasets)
- Data flow: SQL → `main.table_name` → vgplot → DOM
- Benefits: Direct DuckDB access, reactive queries, crossfilter

**File**: `src/bootstrap/init-charts.ts`

```typescript
// Register vgplot charts (SQL Workspace only)
export function registerVgplotCharts(): void {
  // Only generic 'chart' uses vgplot (for SQL Workspace advanced features)
  // line, area, scatter are now plugin components (for reports)
  componentRegistry.register({
    metadata: ChartMetadata,
    parser: createChartParser(),
    renderer: createChartRenderer('chart')
  })
}
```

**File**: `src/plugins/data-display/index.ts`

```typescript
// Register plugin charts (Reports)
export function registerDataDisplayPlugins(registry: ComponentRegistry): void {
  registry.register(barChartRegistration)
  registry.register(pieChartRegistration)
  registry.register(lineChartRegistration)
  registry.register(areaChartRegistration)
  registry.register(scatterChartRegistration)
  // ... other plugin components
}
```

### Table Visibility (Schema-Based Filtering)

**File**: `src/core/database/duckdb.ts` and `src/core/connectors/compat.ts`

Use `information_schema.tables` to filter by schema:

```typescript
async listTables(): Promise<string[]> {
  // Only show tables from main schema (exclude report_data schema)
  const result = await this.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'main'
      AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `)
  return result.data.map((row: any) => row.table_name)
}
```

### Cleanup Utility

**File**: `src/core/database/duckdb.ts` and `src/core/connectors/compat.ts`

```typescript
async cleanupReportTables(): Promise<void> {
  // Get all tables in report_data schema
  const result = await this.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'report_data'
      AND table_type = 'BASE TABLE'
  `)

  // Drop each table (use full catalog.schema.table format)
  for (const row of result.data) {
    await this.query(`DROP TABLE IF EXISTS memory.report_data."${row.table_name}"`)
  }

  console.log(`Cleaned up ${result.data.length} report tables`)
}
```

---

## SQL Block References

Report SQL blocks can reference each other using block names:

```markdown
```sql base_data
SELECT * FROM users WHERE active = true
```

```sql filtered_data
SELECT * FROM base_data WHERE age > 21
-- base_data → chart_data_block_0 (automatic mapping)
```

<DataTable data={filtered_data} />
```

**Mapping**:
- `base_data` (block name) → `memory.report_data.chart_data_block_0` (fully qualified name)
- Stored in `tableMapping: Map<string, string>`
- Resolved by `resolveBlockReferences()` function
- Uses full catalog.schema.table format for DuckDB-WASM compatibility

---

## Visibility Matrix

| Table Type | Schema | Data Explorer | SHOW TABLES | Cross-Session | SQL Accessible | Chart Support |
|------------|--------|---------------|-------------|---------------|----------------|---------------|
| User (OPFS) | `main` | ✅ | ✅ | ✅ (OPFS) | ✅ | ✅ (both vgplot & plugin) |
| Report (Internal) | `report_data` | ❌ (filtered) | ✅ | ✅ (OPFS-ready) | ✅ (same session) | ✅ (plugin only) |
| Workspace (Memory) | `main` | ✅ | ✅ | ❌ | ✅ | ✅ (vgplot) |

---

## Common Scenarios

### Scenario 1: Upload CSV → Query → Report

1. User uploads `sales.csv` via Data Explorer
2. ✅ Table `sales.csv` appears in Data Explorer
3. User creates report with SQL block referencing `sales.csv`
4. ✅ Report can query `SELECT * FROM "sales.csv"`
5. ❌ Internal table `chart_data_block_0` NOT shown in Data Explorer

### Scenario 2: Report Execution

1. User clicks `▶ Execute` in Report editor
2. Database initializes `report_data` schema (if not exists)
3. SQL block creates table `memory.report_data.chart_data_block_0`
4. Chart component (plugin: BarChart, LineChart, etc.) reads JSON from SQL result
5. ✅ Chart displays correctly using Svelte+SVG
6. ❌ Table NOT visible in SQL Workspace Data Explorer (schema filtering)
7. ✅ Table visible via `SHOW TABLES FROM report_data` in SQL Editor

### Scenario 3: Cross-Block Reference

```markdown
```sql step1
SELECT id, revenue FROM sales WHERE year = 2024
```

```sql step2
SELECT SUM(revenue) as total FROM step1
-- Automatically resolved to: FROM memory.report_data.chart_data_block_0
```
```

1. `step1` creates `memory.report_data.chart_data_block_0`
2. `step2` references `step1` by name
3. ✅ Dependency graph resolves to full qualified name: `memory.report_data.chart_data_block_0`
4. ✅ `step2` successfully queries the table in `report_data` schema

---

## Troubleshooting

### Problem: "Table not found" in report cross-block reference

**Cause**: Missing catalog prefix in table name
**Error**: `Table with name chart_data_block_3 does not exist! Did you mean "memory.report_data.chart_data_block_3"?`
**Solution**: Verify `tableMapping` stores fully qualified names: `memory.report_data.chart_data_*`

### Problem: Report tables showing in Data Explorer

**Cause**: Tables created in wrong schema (main instead of report_data)
**Check**: Run `SELECT table_schema, table_name FROM information_schema.tables WHERE table_name LIKE 'chart_data%'`
**Solution**:
- Verify `sql-executor.ts` passes `{ schema: 'report_data' }` to `loadDataIntoTable()`
- Check SQL: should be `CREATE TABLE report_data."chart_data_block_0"` not `"report_data.chart_data_block_0"`
- Clear wrongly created tables: `DROP TABLE IF EXISTS "report_data.chart_data_*"`

### Problem: Cross-block reference not working

**Cause**: Incorrect table quoting or missing catalog prefix
**Check**: Browser console for `tableMapping` entries
**Solution**:
- Ensure `tableMapping` uses: `memory.report_data.chart_data_*`
- Verify dependency order in execution logs
- Check SQL generated by `resolveBlockReferences()`

### Problem: Plugin charts not rendering

**Cause**: Data transformation failed or component not registered
**Check**: Browser console for errors in `buildProps()` or `dataBinding()`
**Solution**:
- Verify SQL query returns expected columns
- Check component is registered in `data-display/index.ts`
- Ensure data transformation logic handles edge cases

### Problem: "Schema report_data does not exist"

**Cause**: Database not properly initialized
**Solution**:
- Check console logs for `Created report_data schema for report tables`
- Verify `duckdb.ts` or `compat.ts` runs `CREATE SCHEMA IF NOT EXISTS report_data`
- Hard refresh browser to reload initialization code

---

## Future Enhancements

### Potential Improvements

1. **OPFS Persistence**: Enable OPFS for report_data schema to persist across sessions
2. **Schema Inspector**: Add UI to view and manage tables in report_data schema
3. **Table Promotion**: Allow users to "promote" report tables to main schema
4. **Auto Cleanup**: Automatically cleanup old report tables (e.g., after 7 days)
5. **Chart Performance**: Optimize plugin chart rendering for large datasets (virtualization, sampling)
6. **Schema per Report**: Create separate schemas for each report (`report_<id>.chart_data_*`)

---

## References

### Documentation
- DuckDB TEMPORARY TABLE: https://duckdb.org/docs/sql/statements/create_table.html#temporary-tables
- Plugin Architecture: `docs/PLUGIN_ARCHITECTURE.md`

### Code Files
- SQL Executor: `src/core/markdown/sql-executor.ts`
- Table Loader: `src/core/database/table-loader.ts`
- DuckDB Manager: `src/core/database/duckdb.ts`
- Chart Init (vgplot): `src/bootstrap/init-charts.ts`
- Plugin Charts: `src/plugins/data-display/`

### Key Commits
- P2 Architecture Refactor: aa754f3 (Store Interfaces)
- Dependency Injection: fdf419e (P1 Implementation)
- Bootstrap Layer: e1721be (Clean Architecture)

---

**Maintained by**: Miaoshou Vision Team
**Last Updated**: December 26, 2025 (Schema Separation + Plugin Charts migration)
