# Mosaic Coordinator & DuckDB State Management Guide

## Overview

This document covers critical state management issues when using Mosaic visualization framework with DuckDB-WASM in a Svelte 5 application. Understanding these concepts is **essential** when adding new chart components or implementing reactive features.

## Critical Concept: DuckDB is In-Memory

**⚠️ MOST IMPORTANT**: DuckDB-WASM runs entirely in browser memory. This means:

- All tables are **destroyed** when the page refreshes
- Data does **NOT** persist across sessions
- But localStorage **DOES** persist `block.status`, `block.chartConfig`, `block.sqlResult`

This mismatch is the root cause of most "Table does not exist" errors.

## Problem Overview

When implementing reactive chart-dropdown linkage or adding new chart components, charts fail to render with error:
```
Catalog Error: Table with name chart_data_block_X does not exist!
Did you mean "pragma_database_list"?
```

This error can happen in two scenarios:
1. **On page load** - Before clicking Execute button
2. **During reactive execution** - When dropdown values change

## Root Cause Analysis

There are **TWO SEPARATE** issues that both cause "Table does not exist" errors:

### Issue 1: LocalStorage Persistence vs In-Memory Database

**The Lifecycle Problem:**

```
Day 1: User executes report
├─ SQL blocks execute successfully
├─ DuckDB creates tables: chart_data_block_2, chart_data_block_8, etc.
├─ Charts render successfully
├─ reportStore saves to localStorage:
│  └─ blocks[0].status = 'success'
│  └─ blocks[0].chartConfig = { table: 'chart_data_block_2', ... }
│  └─ blocks[0].sqlResult = { data: [...] }
└─ Page refresh

Day 2: User opens the same report
├─ DuckDB restarts → ALL TABLES DELETED (in-memory!)
├─ reportStore loads from localStorage:
│  └─ blocks[0].status = 'success' ✅ (but shouldn't be!)
│  └─ blocks[0].chartConfig = { table: 'chart_data_block_2', ... } ❌
├─ ReportRenderer checks: block.status === 'success' → TRUE
├─ ReportRenderer calls: renderChartToContainer(chartConfig)
├─ Mosaic vgplot tries: DESC SELECT * FROM chart_data_block_2
└─ ERROR: Table with name chart_data_block_2 does not exist!
```

**The Core Problem:**
- `block.status`, `block.chartConfig`, and `block.sqlResult` are persisted to localStorage
- DuckDB tables are NOT persisted (in-memory database)
- On page load, blocks appear "executed" but their tables don't exist
- Mosaic tries to render charts with stale table references

### Issue 2: Premature Reactive Execution

**The Initialization Problem:**

```
Page loads report
├─ Report selected → currentInputStore created
├─ Dropdown components mount
│  └─ $effect() runs → sets default value in inputStore
│  └─ inputStore emits change event
├─ App.svelte $effect() detects change
│  └─ Thinks: "Input changed! Need to re-execute!"
│  └─ Calls reactive execution logic
│  └─ Tries to find affected blocks
│  └─ Tries to drop old tables (that don't exist yet!)
│  └─ Tries to re-execute SQL blocks
└─ ERROR: User hasn't clicked Execute yet!
```

**The Core Problem:**
- Dropdown initialization triggers inputStore changes
- App.svelte reactive $effect doesn't distinguish between:
  - Initial component mount (should be ignored)
  - Actual user input changes (should trigger re-execution)
- Reactive execution runs before first manual Execute
- Tries to operate on non-existent tables

### Issue 3: Mosaic Coordinator Caching

**The Stale State Problem:**

- Mosaic coordinator caches:
  - Query results
  - Table schemas
  - Client DOM bindings
- When tables are dropped without clearing Mosaic state:
  - Mosaic keeps references to old table names
  - Charts try to render using cached queries
  - Queries reference tables that may not exist
  - Result: "Table does not exist" error

## Complete Solution

### Solution 1: Clear Block Status on Page Load and Report Switch

**File: `src/App.svelte`**

**Problem:** LocalStorage persists block states, but DuckDB tables are deleted on page refresh.

**Fix:** Clear all block statuses when app initializes or when switching reports.

```typescript
// In onMount() - Clear status on app initialization
onMount(async () => {
  await databaseStore.initialize()
  await initializeMosaic()

  // CRITICAL: Clear all block statuses on page load
  // DuckDB is in-memory, tables don't persist across refreshes
  // But localStorage saves block statuses, causing stale references
  if (reportStore.state.currentReport?.blocks) {
    console.log('🧹 Clearing block statuses on app initialization...')
    reportStore.state.currentReport.blocks.forEach(block => {
      delete block.status
      delete block.chartConfig
      delete block.sqlResult
    })
    // Trigger reactivity
    reportStore.state.currentReport = { ...reportStore.state.currentReport }
    console.log('✅ Block statuses cleared - charts will show placeholder')
  }
})

// In handleSelectReport() - Clear status when switching reports
function handleSelectReport(report: Report) {
  currentInputStore = getInputStore(report.id)
  hasExecutedOnce = false
  previousInputs = {}

  // CRITICAL: Reset all block statuses and clear chartConfigs
  // This prevents rendering charts with stale data
  if (report.blocks) {
    report.blocks.forEach(block => {
      delete block.status
      delete block.chartConfig
      delete block.sqlResult
    })
    reportStore.state.currentReport = { ...report }
    console.log('🧹 Cleared block statuses (tables may not exist)')
  }
}
```

### Solution 2: Prevent Premature Reactive Execution

**Problem:** Dropdown initialization triggers reactive execution before first manual Execute.

**Fix:** Use a `hasExecutedOnce` flag to gate reactive execution.

```typescript
// Add flag to track first execution
let hasExecutedOnce = $state(false)

// Set flag to true after first successful Execute
async function handleExecuteReport() {
  // ... execute report logic ...

  if (result.success) {
    // Enable reactive execution now that first Execute completed
    hasExecutedOnce = true
    console.log('✅ First execution completed - reactive execution enabled')
  }
}

// Check flag before running reactive execution
$effect(() => {
  const unsubscribe = currentInputStore.subscribe((newInputs) => {
    // CRITICAL: Don't run reactive execution until after first manual Execute
    if (!hasExecutedOnce) {
      console.log('⏸️ Reactive execution skipped - waiting for first Execute')
      previousInputs = { ...newInputs }
      return
    }

    // Skip if this is the first subscription
    if (Object.keys(previousInputs).length === 0) {
      previousInputs = { ...newInputs }
      return
    }

    // Now safe to run reactive execution
    // ...
  })

  return () => unsubscribe()
})
```

### Solution 3: Status-Based Chart Rendering

**File: `src/components/ReportRenderer.svelte`**

**Problem:** Charts try to render even when their source data tables don't exist.

**Fix:** Only render charts when `block.status === 'success'`.

```typescript
if (block.chartConfig) {
  const chartContainer = document.createElement('div')
  chartContainer.className = 'chart-block'

  // Check if the block has been successfully executed
  if (block.status !== 'success') {
    // Not executed yet - show placeholder
    chartContainer.innerHTML = `
      <div style="padding: 2rem; text-align: center;">
        <div style="font-size: 2rem;">⏸️</div>
        <div>Chart not executed yet</div>
        <div>Click "Execute" to run the query</div>
      </div>
    `
    placeholder.replaceWith(chartContainer)
  } else {
    // Status is 'success' - proceed with rendering
    await renderChartToContainer(chartContainer, block.chartConfig)
    placeholder.replaceWith(chartContainer)
  }
}
```

### Solution 4: Only Drop Affected Tables (Not All)

**Problem:** Dropping all chart tables breaks unaffected charts.

**Fix:** Only drop tables for blocks that are actually being re-executed.

```typescript
// Get affected block IDs
const affectedBlockIds = new Set(affectedBlocks.map(b => b.id))
const tablesToDrop: string[] = []

// Only collect tables for affected blocks
for (const blockId of affectedBlockIds) {
  const tableName = currentTableMapping.get(blockId)
  if (tableName) {
    tablesToDrop.push(tableName)
  }
}

// Drop only affected tables (NOT all tables)
// NOTE: Do NOT call coord.clear() to preserve unaffected charts
for (const tableName of tablesToDrop) {
  await coord.exec(`DROP TABLE IF EXISTS "${tableName}"`)
}
```

## Adding New Chart Components - Critical Checklist

When adding new chart types or visualization components, follow this checklist to avoid state management issues:

### 1. Chart Component Registration

**File: Block registry (e.g., `src/lib/blocks/chart-blocks.ts`)**

```typescript
// Example: Adding a new chart type
blockRegistry.register('newchart', {
  parser: (block, context) => {
    // Parse block configuration
    return {
      type: 'newchart',
      config: { ... }
    }
  },
  renderer: async (container, data, context) => {
    // Render the chart
  }
})
```

### 2. Always Use `block.status` Check

**⚠️ CRITICAL**: Never render a chart without checking if its data exists.

```typescript
// ✅ CORRECT - Check status before rendering
if (block.chartConfig) {
  if (block.status !== 'success') {
    // Show placeholder - data doesn't exist yet
    container.innerHTML = `<div>⏸️ Chart not executed yet</div>`
  } else {
    // Safe to render - data exists
    await renderChart(block.chartConfig)
  }
}

// ❌ WRONG - Renders immediately without checking
if (block.chartConfig) {
  await renderChart(block.chartConfig)  // May fail if table doesn't exist!
}
```

### 3. Handle Table References Correctly

**⚠️ CRITICAL**: Always reference tables through the tableMapping.

```typescript
// ✅ CORRECT - Use table from mapping
const chartConfig = {
  type: 'bar',
  data: {
    table: tableMapping.get(blockId),  // Use mapped table name
    x: 'category',
    y: 'value'
  }
}

// ❌ WRONG - Hardcoded table name
const chartConfig = {
  type: 'bar',
  data: {
    table: 'my_data',  // Won't work with reactive execution!
    x: 'category',
    y: 'value'
  }
}
```

### 4. Don't Persist Execution State

**⚠️ CRITICAL**: Don't save chart-specific execution state that references tables.

```typescript
// ✅ CORRECT - Only persist configuration
const chartConfig = {
  type: 'bar',
  data: {
    x: 'category',  // Column name - OK to persist
    y: 'value',     // Column name - OK to persist
    // table name will be resolved at render time from tableMapping
  }
}

// ❌ WRONG - Persisting table references
const chartConfig = {
  type: 'bar',
  data: {
    table: 'chart_data_block_2',  // This table won't exist after refresh!
    x: 'category',
    y: 'value'
  }
}
```

### 5. Clear State When Implementing New Features

When adding features that modify how blocks execute:

```typescript
// After making changes that affect block execution:
// 1. Clear localStorage (or increment schema version)
localStorage.clear()

// 2. Add migration logic in reportStore
if (report.schemaVersion < 2) {
  report.blocks.forEach(block => {
    delete block.status
    delete block.chartConfig
    delete block.sqlResult
  })
  report.schemaVersion = 2
}
```

### 6. Test the Complete Lifecycle

For every new chart component, test:

```typescript
// Test Checklist:
// 1. Fresh page load (no localStorage)
//    → Charts show placeholder ✅
//
// 2. Click Execute
//    → Charts render successfully ✅
//
// 3. Change input (e.g., dropdown)
//    → Affected charts update ✅
//    → Unaffected charts remain ✅
//
// 4. Refresh page
//    → Charts show placeholder again ✅
//    → No console errors ✅
//
// 5. Click Execute again
//    → Charts render successfully ✅
```

## Code Locations

### Primary Files

1. **`src/App.svelte`**
   - Lines 45-79: App initialization and block status clearing
   - Lines 99-186: Execute report handler with `hasExecutedOnce` flag
   - Lines 199-223: Report selection handler with status reset
   - Lines 225-340: Reactive execution logic with gating

2. **`src/components/inputs/Dropdown.svelte`**
   - Lines 25-42: `$effect()` subscriptions that sync with inputStore
   - Triggers reactive execution on value changes

3. **`src/lib/viz/mosaic-connector.ts`**
   - Mosaic coordinator singleton management
   - Table data loading functions

4. **`src/components/ReportRenderer.svelte`**
   - Lines 362-404: Chart rendering logic with status-based checks
   - Status-based placeholder display

5. **`src/lib/execution/reactive-executor.ts`**
   - `findAffectedBlocks()`: Determines which blocks need re-execution
   - `reExecuteAffectedBlocks()`: Handles incremental re-execution
   - `getChangedInputs()`: Detects input changes

## Complete Reactive Execution Pattern

When implementing reactive execution with Mosaic:

```typescript
// 1. Add execution gate flag
let hasExecutedOnce = $state(false)

// 2. Set flag after first successful Execute
async function handleExecuteReport() {
  const result = await executeReport(...)

  if (result.success) {
    hasExecutedOnce = true  // ✅ Enable reactive execution
    currentParsedBlocks = parsed.codeBlocks
    currentTableMapping = result.tableMapping
    previousInputs = { ...inputValues }
  }
}

// 3. Implement gated reactive execution
$effect(() => {
  const unsubscribe = inputStore.subscribe(async (newInputs) => {
    // Gate 1: Wait for first Execute
    if (!hasExecutedOnce) {
      console.log('⏸️ Reactive execution skipped - waiting for first Execute')
      previousInputs = { ...newInputs }
      return
    }

    // Gate 2: Skip first subscription
    if (Object.keys(previousInputs).length === 0) {
      previousInputs = { ...newInputs }
      return
    }

    // Detect changes
    const changedInputs = getChangedInputs(newInputs, previousInputs)
    if (changedInputs.length === 0) return

    // Find affected blocks
    const affectedBlocks = findAffectedBlocks(
      reportStore.state.currentReport!.blocks,
      changedInputs
    )
    if (affectedBlocks.length === 0) return

    // Drop only affected tables (preserve unaffected charts)
    const { coordinator } = await import('@/lib/viz/mosaic-connector')
    const coord = coordinator()

    const affectedBlockIds = new Set(affectedBlocks.map(b => b.id))
    const tablesToDrop: string[] = []

    for (const blockId of affectedBlockIds) {
      const tableName = currentTableMapping.get(blockId)
      if (tableName) tablesToDrop.push(tableName)
    }

    // NOTE: Do NOT call coord.clear() - preserves unaffected charts
    for (const tableName of tablesToDrop) {
      await coord.exec(`DROP TABLE IF EXISTS "${tableName}"`)
    }

    // Re-execute affected blocks
    const templateContext = {
      inputs: newInputs,
      metadata: reportStore.state.currentReport!.metadata
    }

    await reExecuteAffectedBlocks(
      affectedBlocks,
      currentParsedBlocks,
      currentTableMapping,
      templateContext,
      (blockId, result, dependencies) => {
        const report = reportStore.state.currentReport!
        const blockIndex = report.blocks.findIndex(b => b.id === blockId)

        if (blockIndex !== -1 && result) {
          report.blocks[blockIndex] = {
            ...report.blocks[blockIndex],
            sqlResult: result,
            dependencies,
            status: 'success'
          }
          reportStore.state.currentReport = { ...report }
        }
      }
    )

    // Rebuild chart configs ONLY for affected blocks
    const affectedChartBlocks = currentParsedBlocks.filter(pb =>
      affectedBlockIds.has(pb.id) &&
      (pb.language === 'chart' || pb.language === 'histogram')
    )

    for (const parsedBlock of affectedChartBlocks) {
      const chartConfig = buildChartFromBlock(parsedBlock, currentTableMapping)

      if (chartConfig) {
        const blockIndex = report.blocks.findIndex(b => b.id === parsedBlock.id)
        if (blockIndex !== -1) {
          report.blocks[blockIndex] = {
            ...report.blocks[blockIndex],
            chartConfig,
            status: 'success'
          }
        }
      }
    }

    // Trigger reactivity and save state
    reportStore.state.currentReport = { ...report }
    previousInputs = { ...newInputs }
  })

  return () => unsubscribe()
})
```

## Common Symptoms & Debugging

### 1. "Table does not exist" on Page Load

**Symptom:**
```
Catalog Error: Table with name chart_data_block_X does not exist!
```
Happens immediately when opening a report, before clicking Execute.

**Diagnosis:**
- Check browser console for error timing
- Look for `block.status === 'success'` in localStorage
- Check if tables exist: `SHOW TABLES` in DuckDB

**Root Cause:**
- LocalStorage persisted block statuses from previous session
- DuckDB tables were cleared on page refresh (in-memory)
- ReportRenderer tries to render charts based on stale status

**Solution:**
- Ensure `onMount()` clears block statuses (Solution 1)
- Ensure `handleSelectReport()` clears block statuses (Solution 1)

### 2. "Table does not exist" After Dropdown Change

**Symptom:**
Error occurs when changing dropdown value, charts were working before.

**Diagnosis:**
- Check console for "🔄 Input changed" logs
- Check if reactive execution is running
- Look for "hasExecutedOnce" flag value

**Root Cause:**
- Reactive execution triggered before first Execute (Issue 2)
- OR: Mosaic coordinator has stale cached state (Issue 3)

**Solution:**
- Ensure `hasExecutedOnce` flag is working (Solution 2)
- Only drop affected tables, not all (Solution 4)
- Don't call `coord.clear()` during reactive execution

### 3. Charts Show Placeholder After Execute

**Symptom:**
Click Execute, SQL runs successfully, but charts don't appear.

**Diagnosis:**
- Check: Are tables being created? (Look for "Data loaded into table: ...")
- Check: Is `block.status` set to 'success'?
- Check: Does `block.chartConfig` exist?

**Root Cause:**
- Chart configs not being built after SQL execution
- `block.status` not being set to 'success'

**Solution:**
- Ensure `executeReport()` builds chart configs
- Ensure blocks are updated with `status: 'success'`
- Trigger reactivity: `reportStore.state.currentReport = { ...report }`

### 4. Dropdown Changes Don't Update Charts

**Symptom:**
Charts don't update when dropdown value changes.

**Diagnosis:**
- Check console for "🔄 Input changed" logs
- Check if `$effect()` in App.svelte is firing
- Check if affected blocks are identified: "Affected blocks: X, Y, Z"

**Root Cause:**
- Reactive execution not triggering
- Affected blocks not identified correctly
- Chart configs not being rebuilt

**Solution:**
- Verify `hasExecutedOnce === true` after first Execute
- Check dependency tracking in SQL blocks
- Ensure chart configs are rebuilt for affected blocks only

### 5. Unaffected Charts Disappear

**Symptom:**
When dropdown changes, charts that shouldn't be affected also disappear.

**Diagnosis:**
- Check logs: "Dropping X chart tables"
- Check if `coord.clear()` is being called

**Root Cause:**
- All tables are being dropped instead of only affected ones
- OR: Mosaic coordinator is being cleared (affects all charts)

**Solution:**
- Only drop tables for affected blocks (Solution 4)
- Don't call `coord.clear()` during reactive execution
- Only rebuild configs for affected chart blocks

## Best Practices Summary

### 1. State Lifecycle Management

**⚠️ GOLDEN RULE**: DuckDB tables are ephemeral, localStorage is persistent

```typescript
// ✅ ALWAYS clear block states when tables might not exist
onMount(() => {
  // Clear on app initialization
  report.blocks.forEach(b => delete b.status, delete b.chartConfig)
})

handleSelectReport(report) {
  // Clear on report switch
  report.blocks.forEach(b => delete b.status, delete b.chartConfig)
}
```

### 2. Reactive Execution Gating

**⚠️ GOLDEN RULE**: Never run reactive execution before first manual Execute

```typescript
// ✅ ALWAYS gate reactive execution with hasExecutedOnce flag
let hasExecutedOnce = $state(false)

$effect(() => {
  inputStore.subscribe(newInputs => {
    if (!hasExecutedOnce) return  // Gate 1: Wait for first Execute
    if (isEmpty(previousInputs)) return  // Gate 2: Skip initialization

    // Now safe to run reactive execution
  })
})
```

### 3. Incremental Updates Only

**⚠️ GOLDEN RULE**: Only update affected blocks, preserve unaffected ones

```typescript
// ✅ CORRECT - Only drop affected tables
const affectedBlockIds = new Set(affectedBlocks.map(b => b.id))
for (const blockId of affectedBlockIds) {
  const tableName = tableMapping.get(blockId)
  if (tableName) await coord.exec(`DROP TABLE IF EXISTS "${tableName}"`)
}

// ❌ WRONG - Drops all tables or clears all Mosaic state
coord.clear()  // This breaks ALL charts!
```

### 4. Status-Based Rendering

**⚠️ GOLDEN RULE**: Always check `block.status` before rendering charts

```typescript
// ✅ CORRECT
if (block.chartConfig) {
  if (block.status !== 'success') {
    showPlaceholder()  // Data doesn't exist yet
  } else {
    renderChart()  // Safe to render
  }
}

// ❌ WRONG - Renders without checking
if (block.chartConfig) {
  renderChart()  // May fail if table doesn't exist!
}
```

### 5. Logging for Debugging

Add comprehensive logging to track state transitions:

```typescript
// App initialization
console.log('🧹 Clearing block statuses on app initialization...')

// First Execute
console.log('✅ First execution completed - reactive execution enabled')

// Reactive execution
console.log('⏸️ Reactive execution skipped - waiting for first Execute')
console.log('🔄 Input changed:', changedInputs)
console.log('📊 Found X chart tables to drop')

// Chart rendering
console.log('⏸️ Chart not executed yet (status: pending)')
console.log('✅ Chart mounted successfully')
```

## Complete Testing Checklist

Test every change that affects chart rendering or reactive execution:

### Initial Load Tests
- [ ] **Fresh Load (No LocalStorage)**
  - Clear localStorage: `localStorage.clear()`
  - Refresh page
  - Charts should show "⏸️ Chart not executed yet" placeholder
  - Console should show: "🧹 Clearing block statuses"
  - Console should have NO "Table does not exist" errors

- [ ] **Load with Stale LocalStorage**
  - Execute report once, refresh page
  - Charts should show placeholder (not attempt to render)
  - Console should show: "🧹 Clearing block statuses"
  - Console should have NO "Table does not exist" errors

### Execution Tests
- [ ] **First Execute**
  - Click Execute button
  - All SQL blocks should execute successfully
  - All charts should render
  - Console should show: "✅ First execution completed - reactive execution enabled"
  - No errors in console

- [ ] **Re-Execute**
  - Click Execute again without changing inputs
  - Charts should re-render successfully
  - No errors in console

### Reactive Execution Tests
- [ ] **Single Dropdown Change**
  - Execute report first
  - Change dropdown value
  - Console should show: "🔄 Input changed: [input_name]"
  - Affected charts should update automatically
  - Unaffected charts should remain unchanged
  - No errors in console

- [ ] **Multiple Dropdown Changes**
  - Change dropdown multiple times rapidly
  - Charts should update each time
  - Consistent behavior, no errors

- [ ] **Switch Inputs Back and Forth**
  - Change dropdown A → charts update
  - Change dropdown B → charts update
  - Change dropdown A back → charts update
  - All charts render correctly

### Edge Cases
- [ ] **Report Switch**
  - Execute Report A
  - Switch to Report B (don't execute)
  - Charts in Report B show placeholder
  - Console: "🔄 Switched to new report - reactive execution disabled"

- [ ] **Page Refresh After Execution**
  - Execute report
  - Refresh page
  - Charts show placeholder (not rendered)
  - No "Table does not exist" errors

- [ ] **Multiple Reports**
  - Execute Report A
  - Execute Report B
  - Switch back to Report A
  - Charts in Report A show placeholder (cleared)

### Performance Tests
- [ ] **Many Charts (10+)**
  - All charts render successfully
  - Reactive execution only updates affected charts
  - Unaffected charts don't flicker/re-render

- [ ] **Large Data Sets**
  - Charts render without lag
  - No console warnings about performance

## Related Concepts

- **Svelte 5 Reactivity**: `$state()`, `$effect()`, `$derived`
- **Store Patterns**: Writable stores, derived stores, custom stores
- **DuckDB WASM**: In-memory database, table lifecycle
- **Mosaic Framework**: Coordinator pattern, client registration, DOM binding
- **LocalStorage**: Persistence vs ephemeral state

## Quick Reference

### Key Files
- `src/App.svelte` - Main app logic, reactive execution
- `src/components/ReportRenderer.svelte` - Chart rendering
- `src/lib/execution/reactive-executor.ts` - Reactive execution helpers
- `src/lib/markdown/chart-builder.ts` - Chart config building

### Key Flags
- `hasExecutedOnce` - Gates reactive execution until first Execute
- `block.status` - Tracks execution state ('success', 'error', undefined)
- `isRendering` - Prevents concurrent rendering in ReportRenderer

### Key Lifecycle Events
1. Page load → Clear block statuses
2. Report select → Clear block statuses
3. First Execute → Set hasExecutedOnce = true
4. Input change → Reactive execution (if hasExecutedOnce)
5. Page refresh → Back to step 1

## References

- [Mosaic Documentation](https://uwdata.github.io/mosaic/)
- [DuckDB-WASM API](https://duckdb.org/docs/api/wasm)
- [Svelte 5 Reactivity](https://svelte.dev/docs/svelte/$effect)
- [Evidence.dev](https://evidence.dev/) - Similar framework for inspiration

---

**Last Updated**: 2025-12-11
**Version**: 2.0
**Contributors**: Development team fixing reactive chart-dropdown linkage
