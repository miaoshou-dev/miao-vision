# Report Memory Isolation Test Plan

## Overview
This document outlines the testing approach for verifying that Report Memory DB instances are properly isolated from the SQL Workspace DB.

## Architecture Summary

### SQL Workspace
- Uses `workspaceDB` (singleton DuckDBManager instance)
- Persistent storage (OPFS) - planned for future
- Tables created here persist across sessions
- Accessed via:
  - File uploads: `databaseStore.uploadFile()`
  - SQL queries: `databaseStore.executeQuery()`

### Report Execution
- Uses `reportDB` (new DuckDBManager instance per report)
- Memory storage (temporary, non-persistent)
- Tables created here exist only during report session
- Each report gets its own isolated DB instance
- Accessed via:
  - Initial execution: `reportExecutionService.executeReport()` → `createReportDB()`
  - Reactive execution: Uses stored `reportDB` from `reportDatabases` Map

## Data Flow Verification

### Initial Report Execution
```
executeReport()
  ├─ createReportDB() → new DuckDBManager instance
  ├─ reportDatabases.set(reportId, reportDB)
  └─ executeReportSQL(blocks, reportDB)
       └─ executeSQLBlock(block, mapping, context, db: reportDB)
            └─ loadDataIntoTable(..., { db: reportDB })
```

### Reactive Report Execution (Input Changes)
```
executeReactiveUpdate()
  ├─ reportDB = reportDatabases.get(reportId)
  └─ reExecuteAffectedBlocks(..., db: reportDB)
       └─ executeSQLBlock(block, mapping, context, db: reportDB)
            └─ loadDataIntoTable(..., { db: reportDB })
```

## Test Scenarios

### Test 1: Report Cannot Access SQL Workspace Tables ✅

**Setup:**
1. Upload a CSV file in SQL Workspace (creates table `my_data` in workspaceDB)
2. Create a Report with SQL query: `SELECT * FROM my_data`

**Expected Result:**
- Report execution should fail with error: "Catalog Error: Table with name my_data does not exist"
- This proves Report's Memory DB is isolated from SQL Workspace

**Why This Works:**
- SQL Workspace loads data into `workspaceDB`
- Report creates its own `reportDB` instance
- The two DuckDB instances are completely separate

### Test 2: SQL Workspace Cannot Access Report Tables ✅

**Setup:**
1. Create a Report with SQL block that creates table:
   ```sql my_report_data
   SELECT 1 as id, 'test' as name
   ```
2. Execute the Report (creates `report_data.my_report_data` in reportDB)
3. Try to query from SQL Workspace: `SELECT * FROM report_data.my_report_data`

**Expected Result:**
- SQL Workspace query should fail: "Schema with name report_data does not exist"
- This proves SQL Workspace cannot access Report's Memory DB

**Why This Works:**
- Report loads data into `reportDB` (Memory instance)
- SQL Workspace uses `workspaceDB` (different instance)
- The two DuckDB instances are completely separate

### Test 3: Multiple Reports Are Isolated From Each Other ✅

**Setup:**
1. Create Report A with SQL block:
   ```sql shared_name
   SELECT 1 as value
   ```
2. Create Report B with SQL block trying to reference Report A's table:
   ```sql
   SELECT * FROM report_data.shared_name
   ```

**Expected Result:**
- Report B should fail: "Catalog Error: Table with name shared_name does not exist"
- Each report has its own isolated Memory DB

**Why This Works:**
- Report A gets `reportDB_A = createReportDB()`
- Report B gets `reportDB_B = createReportDB()`
- Two separate DuckDB instances

### Test 4: Reactive Execution Uses Correct DB Instance ✅

**Setup:**
1. Create a Report with input: `{input.region}`
2. SQL block with template: `SELECT '${inputs.region}' as region`
3. Execute Report (stores reportDB in reportDatabases Map)
4. Change input value

**Expected Result:**
- Reactive execution should use the same reportDB instance
- Console logs should show: "Re-executing with Memory DB"
- No cross-contamination with workspaceDB

**Code Verification:**
```typescript
// In executeReactiveUpdate()
const reportDB = this.reportDatabases.get(report.id)
await reExecuteAffectedBlocks(..., reportDB)
```

## Code Changes Summary

### Files Modified

1. **`src/core/database/duckdb.ts`**
   - Removed singleton pattern
   - Added `workspaceDB` global instance
   - Added `createReportDB()` factory function

2. **`src/core/database/table-loader.ts`**
   - Added `db?: DuckDBManager` to `LoadTableOptions`
   - Updated functions to use provided DB or default to `workspaceDB`

3. **`src/core/markdown/sql-executor.ts`**
   - Added `db?: DuckDBManager` parameter to:
     - `executeSQLBlock()`
     - `executeReportSQL()`
     - `executeReport()`

4. **`src/core/engine/reactive-executor.ts`**
   - Added `db?: DuckDBManager` parameter to `reExecuteAffectedBlocks()`
   - Passes DB to `executeSQLBlock()`

5. **`src/core/engine/report-execution.service.ts`**
   - Added `reportDatabases` Map to store Memory DB instances
   - Creates `reportDB` in `executeReport()`
   - Retrieves and passes `reportDB` in `executeReactiveUpdate()`
   - Cleanup in `cleanup()` method

6. **`src/types/report.ts`**
   - Added `embeddedData` field for future data snapshot feature

## Verification Checklist

- [x] Initial execution creates separate reportDB
- [x] reportDB stored in reportDatabases Map
- [x] Initial execution passes reportDB to executeSQLBlock
- [x] Reactive execution retrieves reportDB from Map
- [x] Reactive execution passes reportDB to reExecuteAffectedBlocks
- [x] reExecuteAffectedBlocks passes reportDB to executeSQLBlock
- [x] loadDataIntoTable uses provided db parameter
- [x] Cleanup closes all reportDB instances

## Benefits of Memory Isolation

1. **Easy Report Sharing**
   - Reports are self-contained (no dependency on persistent DB)
   - Future: Can embed data snapshots in Report JSON
   - Can be exported/imported without data loss

2. **Clean Separation**
   - SQL Workspace for persistent data exploration
   - Reports for temporary, shareable analysis
   - No namespace conflicts

3. **Performance**
   - Memory DB is faster than OPFS
   - Each report has dedicated resources
   - No contention with Workspace DB

4. **Lifecycle Management**
   - Report DB lives only during report session
   - Automatic cleanup when report closed
   - No stale data accumulation

## Future Enhancements

1. **Data Snapshot Extraction** (Optional)
   - After report execution, extract all tables from reportDB
   - Store in `report.embeddedData` field
   - Enable true "self-contained" reports

2. **Report Export/Import** (Optional)
   - Export Report + embeddedData as JSON
   - Import on another machine, restore data to new reportDB
   - No external data dependencies

## Conclusion

The Report Memory isolation architecture successfully separates:
- SQL Workspace → `workspaceDB` (persistent, OPFS in future)
- Reports → `reportDB` (temporary, Memory, one per report)

All execution paths (initial + reactive) correctly use the appropriate DB instance.
