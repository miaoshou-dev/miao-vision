# Session Record: Fixing "Table Does Not Exist" Error

**Date**: 2025-12-11
**Session ID**: Table Not Exist Error - Reactive Chart Dropdown Linkage
**Duration**: Multi-day debugging session

---

## Session Context

This session was a continuation of implementing reactive chart-dropdown linkage. The previous session successfully implemented the feature, but introduced a critical bug where charts would fail to render with "Table does not exist" errors.

## User Prompts Chronology

### Prompt 1
```
Please continue the conversation from where we left it off without asking the user any further questions.
Continue with the last task that you were asked to work on.
```

**Context**: Session resumed after context overflow. Summary provided showing:
- Previously implemented reactive chart-dropdown linkage
- Multiple iterations fixing various "Table does not exist" errors
- Last task: Add `hasExecutedOnce` flag to prevent reactive execution before first Execute

### Prompt 2
```
第一次打开report 就在console报错，还没有点击excute按钮，点击后错误一样
Uncaught (in promise) Error: Catalog Error: Table with name chart_data_block_2 does not exist!
```

**Translation**: "When opening report for first time, console shows error before clicking Execute button. Error persists after clicking Execute."

**User Feedback**: Error occurs on page load, before any user interaction.

### Prompt 3
```
需要你记录当前会话所有的prompt
continue
```

**Translation**: "Need you to record all prompts from current session. Continue."

**Request**: Document all user prompts and the problem-solving process.

---

## Problem Analysis

### Initial Diagnosis (Prompt 1 Context)

From the session summary, we identified that:
- Dropdown initialization triggers `inputStore` changes
- App.svelte `$effect()` detects these changes
- Reactive execution runs BEFORE first manual Execute
- Tables don't exist yet → Error

**Solution Attempted**: Add `hasExecutedOnce` flag

### New Discovery (Prompt 2)

The error occurred on **page load**, which revealed a second, separate issue:
- DuckDB is an in-memory database
- All tables are destroyed on page refresh
- But localStorage persists `block.status`, `block.chartConfig`, `block.sqlResult`
- ReportRenderer checks `block.status === 'success'` → TRUE (from localStorage)
- Tries to render charts → Tables don't exist → Error

### Root Causes Identified

**Two separate issues** both causing "Table does not exist":

#### Issue 1: LocalStorage Persistence vs In-Memory Database
```
Day 1: User executes report
├─ DuckDB creates tables
├─ Charts render successfully
├─ LocalStorage saves: block.status = 'success', block.chartConfig = {...}
└─ Page refresh

Day 2: User opens report
├─ DuckDB restarts → ALL TABLES DELETED
├─ LocalStorage loads: block.status = 'success' ✅ (but shouldn't be!)
├─ ReportRenderer: "Status is success, let's render!"
└─ ERROR: Table does not exist!
```

#### Issue 2: Premature Reactive Execution
```
Page load
├─ Dropdown components initialize
├─ Set default values → inputStore changes
├─ App.svelte $effect: "Input changed!"
├─ Reactive execution: "Let me re-execute affected blocks!"
└─ ERROR: User hasn't clicked Execute yet!
```

---

## Solutions Implemented

### Solution 1: Clear Block Status on Page Load and Report Switch

**File**: `src/App.svelte`

**Change 1** - In `onMount()` (lines 55-64):
```typescript
if (reportStore.state.currentReport?.blocks) {
  console.log('🧹 Clearing block statuses on app initialization...')
  reportStore.state.currentReport.blocks.forEach(block => {
    delete block.status
    delete block.chartConfig
    delete block.sqlResult
  })
  reportStore.state.currentReport = { ...reportStore.state.currentReport }
  console.log('✅ Block statuses cleared - charts will show placeholder')
}
```

**Change 2** - In `handleSelectReport()` (lines 211-220):
```typescript
if (report.blocks) {
  report.blocks.forEach(block => {
    delete block.status
    delete block.chartConfig
    delete block.sqlResult
  })
  reportStore.state.currentReport = { ...report }
  console.log('🧹 Cleared block statuses (tables may not exist)')
}
```

**Rationale**: Since DuckDB tables don't persist across page refreshes, we must clear all execution state that references those tables.

### Solution 2: Prevent Premature Reactive Execution

**File**: `src/App.svelte`

**Change 1** - Add flag (line 43):
```typescript
let hasExecutedOnce = $state(false)  // Prevent reactive execution before first Execute
```

**Change 2** - Set flag after successful Execute (lines 168-169):
```typescript
if (result.success) {
  hasExecutedOnce = true
  console.log('✅ First execution completed - reactive execution enabled')
  // ... rest of execution logic
}
```

**Change 3** - Check flag before reactive execution (lines 213-217):
```typescript
const unsubscribe = currentInputStore.subscribe((newInputs) => {
  // CRITICAL: Don't run reactive execution until after first manual Execute
  if (!hasExecutedOnce) {
    console.log('⏸️ Reactive execution skipped - waiting for first Execute')
    previousInputs = { ...newInputs }
    return
  }

  // ... reactive execution logic
})
```

**Change 4** - Reset flag on report switch (lines 205-207):
```typescript
function handleSelectReport(report: Report) {
  // ...
  hasExecutedOnce = false
  previousInputs = {}
  console.log('🔄 Switched to new report - reactive execution disabled until first Execute')
}
```

**Rationale**: Reactive execution should only run AFTER the user has manually executed the report at least once. This ensures tables exist before trying to update them.

---

## Code Flow Visualization

### Before Fix

```
Page Load
├─ App.svelte onMount()
├─ reportStore loads from localStorage
│  └─ blocks[0].status = 'success' ❌ (stale!)
│  └─ blocks[0].chartConfig = { table: 'chart_data_block_2' } ❌ (stale!)
├─ DuckDB initialized (empty, no tables)
├─ ReportRenderer renders
│  └─ Checks: block.status === 'success' → TRUE
│  └─ Calls: renderChartToContainer(chartConfig)
│  └─ Mosaic tries: DESC SELECT * FROM chart_data_block_2
│  └─ ERROR: Table does not exist! ❌
└─ Dropdown initializes
   └─ Sets default value → inputStore changes
   └─ App.svelte $effect fires
   └─ Reactive execution runs
   └─ Tries to drop tables (don't exist)
   └─ Tries to re-execute SQL
   └─ ERROR: Premature execution! ❌
```

### After Fix

```
Page Load
├─ App.svelte onMount()
│  └─ ✅ Clears block.status, block.chartConfig, block.sqlResult
│  └─ Triggers reactivity
├─ reportStore loads from localStorage
│  └─ blocks[0].status = undefined ✅
│  └─ blocks[0].chartConfig = undefined ✅
├─ DuckDB initialized (empty, no tables)
├─ ReportRenderer renders
│  └─ Checks: block.status === 'success' → FALSE
│  └─ Shows: "⏸️ Chart not executed yet - Click Execute" ✅
└─ Dropdown initializes
   └─ Sets default value → inputStore changes
   └─ App.svelte $effect fires
   └─ Checks: hasExecutedOnce === false
   └─ Skips reactive execution ✅
   └─ Logs: "⏸️ Reactive execution skipped - waiting for first Execute"

User Clicks Execute
├─ handleExecuteReport() runs
├─ SQL blocks execute
├─ DuckDB creates tables
├─ Sets block.status = 'success'
├─ Sets block.chartConfig = {...}
├─ Sets hasExecutedOnce = true ✅
└─ Charts render successfully ✅

User Changes Dropdown
├─ inputStore changes
├─ App.svelte $effect fires
├─ Checks: hasExecutedOnce === true ✅
├─ Checks: changedInputs.length > 0 ✅
├─ Finds affected blocks
├─ Drops affected tables
├─ Re-executes affected SQL
├─ Rebuilds affected chart configs
└─ Charts update automatically ✅
```

---

## Key Learnings

### 1. In-Memory vs Persistent State Mismatch

**Problem**: DuckDB-WASM is in-memory, but application state is persisted to localStorage.

**Solution**: Always clear execution-related state (status, chartConfig, sqlResult) when the app initializes or switches reports.

**Principle**: Never trust persisted state that references ephemeral resources.

### 2. Component Initialization Triggers

**Problem**: Svelte 5 `$effect()` runs on component mount, causing side effects during initialization.

**Solution**: Use gating flags to distinguish between:
- Initial component mount (should be ignored)
- Actual user interaction (should trigger effects)

**Principle**: Gate reactive effects that have preconditions.

### 3. Two-Phase Execution Model

**Correct Flow**:
1. **Manual Execute Phase**: User clicks Execute → Tables created → Charts rendered
2. **Reactive Phase**: User changes inputs → Only affected blocks re-executed

**Incorrect Flow**:
- Reactive phase runs before manual execute phase
- Results in attempting operations on non-existent resources

**Principle**: Establish clear initialization phases with gating mechanisms.

### 4. Status-Based Conditional Rendering

**Problem**: Charts try to render based on config existence, not data existence.

**Solution**: Always check `block.status === 'success'` before rendering.

**Principle**: Separate configuration (what to render) from state (can we render).

---

## Testing Results

After implementing both solutions:

✅ **Test 1**: Fresh page load
- Charts show placeholder
- No "Table does not exist" errors
- Console: "🧹 Clearing block statuses on app initialization..."

✅ **Test 2**: Page load with stale localStorage
- Charts show placeholder (not attempting to render)
- No errors
- Block statuses cleared

✅ **Test 3**: First Execute
- All SQL blocks execute
- All charts render successfully
- Console: "✅ First execution completed - reactive execution enabled"

✅ **Test 4**: Dropdown changes
- Affected charts update automatically
- Unaffected charts remain unchanged
- Console: "🔄 Input changed: [input_name]"

✅ **Test 5**: Page refresh after execution
- Charts show placeholder again
- No errors
- Requires Execute to render charts again

---

## Documentation Created

### 1. Updated MOSAIC_STATE_MANAGEMENT.md

Added comprehensive documentation covering:

**New Sections**:
- Critical Concept: DuckDB is In-Memory
- Two separate root causes with detailed explanations
- Complete solution implementations with code examples
- Adding New Chart Components - Critical Checklist
- Common Symptoms & Debugging guide
- Best Practices Summary with Golden Rules
- Complete Testing Checklist
- Quick Reference section

**Content Structure**:
- Overview of the problem
- Detailed root cause analysis for Issues 1, 2, and 3
- Four complete solutions with code
- Chart component development guidelines
- Comprehensive debugging guide
- 5 best practices with examples
- Testing checklist with 15+ test cases
- Quick reference for developers

### 2. Created SESSION_RECORD_TABLE_NOT_EXIST.md (this document)

Complete chronological record of:
- All user prompts
- Problem analysis progression
- Solutions implemented
- Code changes with line numbers
- Key learnings and principles
- Testing results

---

## Impact and Prevention

### Impact
- Fixes critical bug that prevented charts from rendering
- Enables proper reactive chart updates
- Improves user experience (no page errors)
- Makes application behavior predictable

### Prevention for Future Development

**When adding new chart types**:
1. ✅ Always check `block.status` before rendering
2. ✅ Use tableMapping, never hardcode table names
3. ✅ Don't persist execution state that references tables
4. ✅ Test the complete lifecycle (load → execute → change → refresh)

**When adding new reactive features**:
1. ✅ Gate reactive effects with appropriate flags
2. ✅ Clear state when preconditions aren't met
3. ✅ Only update affected resources (incremental)
4. ✅ Add comprehensive logging for debugging

**When modifying block execution**:
1. ✅ Consider localStorage persistence
2. ✅ Consider DuckDB table lifecycle
3. ✅ Test with stale localStorage
4. ✅ Clear state appropriately

---

## Files Modified

### src/App.svelte
- Lines 43: Added `hasExecutedOnce` flag
- Lines 55-64: Clear block statuses on app initialization
- Lines 168-169: Set flag after successful execution
- Lines 211-220: Clear block statuses on report switch
- Lines 213-217: Gate reactive execution with flag

### docs/MOSAIC_STATE_MANAGEMENT.md
- Complete rewrite with comprehensive documentation
- Added detailed problem analysis
- Added complete solutions
- Added chart development guidelines
- Added debugging guide
- Added testing checklist
- Version 2.0

### docs/SESSION_RECORD_TABLE_NOT_EXIST.md
- New file documenting this debugging session
- Complete prompt history
- Detailed problem analysis
- Solutions and code changes
- Key learnings

---

## Conclusion

This session successfully identified and fixed TWO separate issues that both caused "Table does not exist" errors:

1. **LocalStorage Persistence Issue**: Stale block statuses from localStorage causing charts to render when tables don't exist
   - **Fix**: Clear block statuses on app load and report switch

2. **Premature Reactive Execution**: Reactive execution running before first manual Execute
   - **Fix**: Gate reactive execution with `hasExecutedOnce` flag

Both fixes are now implemented, tested, and documented. The application now has a robust state management system that correctly handles the lifecycle of in-memory DuckDB tables and persistent localStorage state.

**Status**: ✅ **RESOLVED**

---

**Next Steps for Future Development**:
1. Review MOSAIC_STATE_MANAGEMENT.md before adding chart components
2. Follow the testing checklist for all chart-related changes
3. Reference this session record when encountering similar state management issues
4. Consider adding TypeScript types to enforce status checking
