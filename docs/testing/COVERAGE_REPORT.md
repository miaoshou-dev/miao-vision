# Test Coverage Report

**Generated**: 2024-12-24
**Total Tests**: 819 tests ✅ (100% passing)

---

## 📊 Overall Coverage

| Metric | Current | Threshold | Status |
|--------|---------|-----------|--------|
| **Lines** | 20.02% | 25% | ⚠️ Below target |
| **Functions** | 18.78% | 25% | ⚠️ Below target |
| **Branches** | 15.05% | 20% | ⚠️ Below target |
| **Statements** | 19.67% | 25% | ⚠️ Below target |

**Note**: Thresholds set at current baseline + 5% for incremental improvement

---

## ✅ High Coverage Areas (>90%)

### Core Pure Functions (94.62%)
- ✅ `block-utils.ts` - 85.88%
- ✅ `contracts.ts` - 100%
- ✅ `dependency-analysis.ts` - 96.18%
- ✅ `template-utils.ts` - 96.10%

### Core Connectors (73.85%)
- ✅ `errors.ts` - 100%
- ✅ `manager.ts` - 96.29%
- ✅ `registry.ts` - 91.66%
- ✅ `result.ts` - 100%
- ✅ `secrets.ts` - 100%

### Chart Component Schemas (100%)
- ✅ Boxplot, Bullet Chart, Calendar Heatmap
- ✅ Funnel, Gauge, Heatmap, Histogram
- ✅ Radar, Sankey, Treemap, Waterfall

### App Stores (73.68%)
- ✅ `report-inputs.ts` - 73.68%

---

## ❌ Zero Coverage Areas (0%)

### 🔴 Critical Business Logic (Need Urgent Tests)

#### Core Database Layer
- ❌ `duckdb.ts` - DuckDB WASM manager
- ❌ `mosaic.ts` - Mosaic integration
- ❌ `table-loader.ts` - Data loading
- ❌ `template.ts` - Query templates

#### Core Engine Layer
- ❌ `block-renderer.ts` - Component rendering (423 lines)
- ❌ `dependency-graph.ts` - Dependency resolution
- ❌ `execution.service.ts` - Execution orchestration
- ❌ `drilldown-service.ts` - Drilldown handling

#### Core Markdown Processing
- ❌ `parser.ts` - Markdown parsing (238 lines)
- ❌ `sql-executor.ts` - SQL execution (401 lines)
- ❌ `conditional-processor.ts` - Conditionals (299 lines)
- ❌ `placeholder.ts` - Template placeholders

#### Core Registry System
- ❌ `component-registry.ts` - Component registration
- ❌ `config-parser.ts` - Config parsing (347 lines)
- ❌ `data-resolver.ts` - Data resolution (390 lines)
- ❌ `wrapper-factory.ts` - Wrapper creation

---

### 🟡 Important Components (Need Tests Soon)

#### DataTable (0%)
- ❌ `export.ts` - Export logic (CSV/Excel/JSON) - **Recently fixed bugs here!**
- ❌ `formatter.ts` - Value formatting
- ❌ `operations.ts` - Sort/filter operations

#### Connector Implementations (0%)
- ❌ `http/connector.ts` - HTTP connector (376 lines)
- ❌ `motherduck/connector.ts` - MotherDuck connector (319 lines)
- ❌ `rest/connector.ts` - REST connector (601 lines)
- ❌ `wasm/connector.ts` - WASM connector (522 lines)

#### Maps (0%)
- ❌ `area-map/colors.ts` - Color mapping
- ❌ `area-map/processor.ts` - Data processing

#### Other Components (0%)
- ❌ `bigvalue/formatter.ts` - Value formatting
- ❌ `shared/formatter.ts` - Shared formatting
- ❌ `inputs/use-defaults.ts` - Input defaults
- ❌ `viz/data-adapter.ts` - Data transformation (172 lines)
- ❌ `viz/chart-builder.ts` - Chart building

---

## 📈 Coverage Trend Goals

### Phase 1 (Week 1-2): Foundation
**Target: 20% → 35%**
- [ ] Fix BubbleChart (add unit tests)
- [ ] Test DataTable export/formatter/operations
- [ ] Test core markdown parser basics

**Expected Coverage After Phase 1**: ~35%

---

### Phase 2 (Week 3-4): Core Components
**Target: 35% → 50%**
- [ ] Test core registry system
- [ ] Test connector implementations (mocked)
- [ ] Test remaining chart components
- [ ] Test input components

**Expected Coverage After Phase 2**: ~50%

---

### Phase 3 (Week 5-6): Advanced Features
**Target: 50% → 65%**
- [ ] Test database layer (mocked DuckDB)
- [ ] Test engine layer
- [ ] Test stores (database, chart, inputs)
- [ ] Test export/drilldown services

**Expected Coverage After Phase 3**: ~65%

---

### Phase 4 (Long-term): Excellence
**Target: 65% → 75%+**
- [ ] Component testing with Svelte Testing Library
- [ ] Integration tests
- [ ] E2E test expansion
- [ ] Edge case coverage

**Expected Coverage After Phase 4**: 75%+

---

## 🎯 Immediate Action Items

### This Week (P0)
1. ✅ **DONE**: Fix coverage configuration
2. ⏳ **TODO**: Add BubbleChart unit tests (~40 tests expected)
3. ⏳ **TODO**: Add DataTable export tests (test the recent bug fixes!)

### Next Week (P1)
4. ⏳ Test markdown parser basic functionality
5. ⏳ Test data-resolver and config-parser
6. ⏳ Test connector base functionality (with mocks)

---

## 📝 Coverage Report Files

- **HTML Report**: `coverage/index.html` (open in browser for detailed view)
- **JSON Summary**: `coverage/coverage-summary.json`
- **Text Report**: Shown in terminal after `npm run test:coverage`

---

## 🔧 Running Coverage

```bash
# Full coverage report with HTML
npm run test:coverage

# Open HTML report (macOS)
open coverage/index.html

# View specific file coverage
npm run test:coverage -- src/core/connectors/manager.ts
```

---

## 📚 Coverage Legend

- **90-100%**: ✅ Excellent (maintain)
- **70-89%**: 🟢 Good (minor gaps)
- **50-69%**: 🟡 Fair (needs improvement)
- **30-49%**: 🟠 Poor (significant gaps)
- **0-29%**: ❌ Critical (urgent attention needed)

---

**Last Updated**: 2024-12-24
**Next Review**: Weekly (every Monday)
