# Feature Roadmap - Miao Vision

**Current Version**: v0.2.0 (Alpha - Bootstrap + 43 Components)
**Last Updated**: 2024-12-23

---

## 🎉 Current Status (v1.0)

### ✅ Core Architecture (Completed)

#### Clean Layered Architecture
- ✅ **5-Layer Architecture** - Bootstrap → Plugins/App → Core → Types
- ✅ **Dependency Injection** - Service container with DI pattern
- ✅ **Bootstrap Layer** - Composition root for clean initialization
- ✅ **Interface Isolation** - Core only depends on types/interfaces
- ✅ **P0-P2 Refactoring** - All architectural improvements completed

#### Multi-Source Connectors
- ✅ **WASM Connector** - DuckDB-WASM with OPFS persistence
- ✅ **MotherDuck Connector** - Cloud DuckDB support
- ✅ **HTTP Connector** - Remote database via HTTP proxy
- ✅ **Result Pattern** - Explicit error handling (no exceptions)
- ✅ **Connector Registry** - Pluggable data source system

### ✅ Component System (43 Components)

#### Input Components (8)
- ✅ Dropdown - Single/multi-select dropdowns
- ✅ ButtonGroup - Button-based selection
- ✅ TextInput - Text search with debounce
- ✅ Slider - Numeric range slider
- ✅ DateRange - Date range picker with presets
- ✅ Checkbox - Boolean/multi-checkbox input
- ✅ DimensionGrid - Multi-dimension selector

#### Data Display Components (22)
- ✅ BigValue - KPI cards with trends
- ✅ DataTable - Advanced table (sort/search/filter/export)
- ✅ Value - Inline value display
- ✅ Sparkline - Mini trend charts
- ✅ BarChart - Bar charts
- ✅ PieChart - Pie/donut charts
- ✅ Histogram - Distribution charts
- ✅ Delta - Change indicators
- ✅ Sankey - Flow diagrams
- ✅ Waterfall - Waterfall charts
- ✅ Progress - Progress bars
- ✅ BulletChart - Bullet charts
- ✅ BoxPlot - Box plots
- ✅ CalendarHeatmap - Calendar heatmaps
- ✅ Gauge - Gauge charts
- ✅ KPIGrid - KPI grid layout
- ✅ Heatmap - Heatmaps
- ✅ Radar - Radar charts
- ✅ Funnel - Funnel charts
- ✅ Treemap - Treemaps
- ✅ (2 more components)

#### Visualization (7 vgplot Charts)
- ✅ Chart - Generic chart
- ✅ Line - Line charts
- ✅ Bar - Bar charts
- ✅ Area - Area charts
- ✅ Scatter - Scatter plots
- ✅ Histogram - Histograms
- ✅ Pie - Pie charts

#### UI Components (6)
- ✅ Alert - Alert boxes
- ✅ Tabs - Tab navigation
- ✅ Accordion - Collapsible sections
- ✅ Tooltip - Tooltips
- ✅ Details - Details/summary
- ✅ Modal - Modal dialogs

#### Layout Components (1)
- ✅ Grid - Responsive grid layout

### ✅ Data Processing

#### SQL & Database
- ✅ **DuckDB-WASM v1.29** - High-performance SQL engine
- ✅ **OPFS Persistence** - Cross-session data retention
- ✅ **CSV/Parquet Import** - Drag-and-drop file loading
- ✅ **Table Management** - Create, load, query tables
- ✅ **Apache Arrow** - Efficient data transfer

#### Query Execution
- ✅ **Monaco Editor** - SQL editor with IntelliSense
- ✅ **Query Results UI** - Optimized result display
- ✅ **Error Handling** - Clear error messages
- ✅ **Query History** - Track executed queries

### ✅ Markdown Report System

#### Template Syntax
- ✅ **Variable Interpolation** - `${variable.field}`
- ✅ **Conditionals** - `{#if expression} {:else} {/if}`
- ✅ **Loops** - `{#each array as item} {/each}`
- ✅ **SQL Blocks** - ` ```sql name=query_name ``` `
- ✅ **Component Blocks** - ` ```dropdown name=filter ``` `

#### Markdown Processing
- ✅ **Unified/Remark Pipeline** - Standard Markdown processing
- ✅ **SQL Executor** - Execute embedded SQL
- ✅ **Conditional Processor** - Runtime conditionals
- ✅ **Loop Processor** - Iterate over data
- ✅ **Block Renderer** - Render components inline

#### Reactive Execution
- ✅ **Dependency Analysis** - Detect block dependencies
- ✅ **Topological Sort** - Correct execution order
- ✅ **Auto Re-execution** - Re-run on input changes
- ✅ **Incremental Updates** - Only re-run affected blocks

### ✅ UI/UX

#### Design System
- ✅ **Gemini Style** - Modern gradient design
- ✅ **Dark Mode** - Dark-first UI
- ✅ **Tailwind CSS** - Utility-first styling
- ✅ **Inter Font** - Modern UI typography
- ✅ **JetBrains Mono** - Code font with ligatures

#### Responsive Design
- ✅ **Mobile Support** - Responsive layouts
- ✅ **Tablet Support** - Optimized for tablets
- ✅ **Desktop Optimized** - Full-featured desktop UI
- ✅ **Accessibility** - WCAG 2.1 AA compliant

### ✅ Developer Experience

#### Development Tools
- ✅ **Vite 6** - Fast HMR and builds
- ✅ **TypeScript 5.7** - Full type safety (strict mode)
- ✅ **Svelte 5** - Runes mode
- ✅ **ESLint/Prettier** - Code quality tools

#### Testing & Quality
- ✅ **Vitest** - Unit testing framework
- ✅ **Pure Function Tests** - 23 test files
- ✅ **File Size Checks** - Max 500 lines enforcement
- ✅ **Type Checking** - `npm run check`

#### Documentation
- ✅ **ARCHITECTURE_OVERVIEW.md** - Complete architecture guide
- ✅ **DEPENDENCY_ARCHITECTURE.md** - Dependency rules
- ✅ **PLUGIN_ARCHITECTURE.md** - Plugin development guide
- ✅ **CLAUDE.md** - 939-line comprehensive guide
- ✅ **UI_DESIGN_SYSTEM.md** - Complete design system
- ✅ **COMPONENTS_QUICK_REFERENCE.md** - Component quick ref

---

## 🚀 Roadmap

### v1.1 - Enhanced Data Sources (Q1 2025)

**Priority: High** | **Effort: 2-3 weeks**

#### Data Connectors
- [ ] **PostgreSQL Connector** - Via WebSocket proxy
- [ ] **MySQL Connector** - Via WebSocket proxy
- [ ] **REST API Connector** - Fetch external APIs
- [ ] **Google Sheets Connector** - Google Sheets API integration

#### Connection Management
- [ ] **Connection UI** - Visual connection management
- [ ] **Secret Management** - Secure credential storage
- [ ] **Connection Testing** - Test before save
- [ ] **Connection Sharing** - Share connection configs

**Deliverables:**
- Connector plugins for PostgreSQL, MySQL, REST API
- Connection management UI in sidebar
- Secure credential storage using Web Crypto API
- Documentation for setting up proxies

---

### v1.2 - Advanced Components (Q1 2025)

**Priority: Medium** | **Effort: 2 weeks**

#### Map Components (High Value)
- [ ] **Choropleth Map** - Regional data visualization
- [ ] **Point Map** - Location markers
- [ ] **Bubble Map** - Sized bubbles on map
- [ ] **Heat Map** - Density visualization
- [ ] **GeoJSON Support** - Custom map regions

#### Additional Charts
- [ ] **Gantt Chart** - Timeline visualization
- [ ] **Network Graph** - Relationship visualization
- [ ] **Chord Diagram** - Circular relationship chart
- [ ] **Violin Plot** - Distribution comparison

#### Enhanced DataTable
- [ ] **Column Pinning** - Freeze columns
- [ ] **Column Resizing** - Adjustable column widths
- [ ] **Row Grouping** - Hierarchical grouping
- [ ] **Subtotals** - Automatic subtotal rows
- [ ] **Inline Editing** - Edit cells directly

**Deliverables:**
- 4-5 new map components using Leaflet or Mapbox
- 4 new chart types
- Enhanced DataTable with enterprise features

---

### v1.3 - Multi-Page Reports (Q2 2025)

**Priority: High** | **Effort: 3-4 weeks**

#### Page Management
- [ ] **File-Based Routing** - Pages from file structure
- [ ] **Navigation Menu** - Auto-generated from pages
- [ ] **Breadcrumbs** - Page hierarchy navigation
- [ ] **Page Templates** - Reusable page layouts

#### Page Features
- [ ] **Parameterized Pages** - Dynamic routes (`/product/[id]`)
- [ ] **Page Transitions** - Smooth page changes
- [ ] **Page Metadata** - SEO and social sharing
- [ ] **Page Index** - Automatic table of contents

**Deliverables:**
- Multi-page routing system
- Navigation sidebar with page tree
- Parameterized page support
- Page templates and layouts

---

### v1.4 - Export & Sharing (Q2 2025)

**Priority: High** | **Effort: 2 weeks**

#### Export Formats
- [ ] **Static HTML** - Single-file HTML export
- [ ] **PDF Export** - Print-ready PDF
- [ ] **Markdown Export** - Export as Markdown
- [ ] **Data Snapshot** - Include data in export

#### Sharing Features
- [ ] **Share Links** - Generate shareable URLs
- [ ] **Embed Code** - iframe embed snippets
- [ ] **Screenshot** - Page screenshot generation
- [ ] **Print Optimization** - CSS @media print

**Deliverables:**
- HTML/PDF/Markdown export functionality
- Share link generation with optional authentication
- Embed widget for external sites
- Print-optimized layouts

---

### v1.5 - Collaboration Features (Q3 2025)

**Priority: Medium** | **Effort: 4-5 weeks**

#### Real-Time Collaboration
- [ ] **Multi-User Editing** - Collaborative editing (CRDT)
- [ ] **Comments** - Add comments to reports
- [ ] **Version History** - Track report changes
- [ ] **Conflict Resolution** - Handle edit conflicts

#### User Management
- [ ] **User Accounts** - Authentication system
- [ ] **Permissions** - View/edit/admin roles
- [ ] **Sharing Controls** - Who can access what
- [ ] **Team Workspaces** - Shared team spaces

**Deliverables:**
- Real-time collaboration using WebRTC or WebSocket
- Comment system for reports
- Version control with diff view
- User management and permissions

---

### v1.6 - Performance & Scale (Q3 2025)

**Priority: Medium** | **Effort: 2-3 weeks**

#### Performance Optimization
- [ ] **Query Caching** - Cache query results (IndexedDB)
- [ ] **Virtual Scrolling** - Large dataset rendering
- [ ] **Lazy Loading** - On-demand component loading
- [ ] **Web Workers** - Offload heavy computations

#### Scalability
- [ ] **Large File Support** - Handle 100MB+ files
- [ ] **Streaming Queries** - Stream large results
- [ ] **Incremental Loading** - Load data progressively
- [ ] **Memory Management** - Optimize memory usage

**Deliverables:**
- Query result caching with cache invalidation
- Virtual scrolling for DataTable (1M+ rows)
- Lazy-loaded components and code splitting
- Performance monitoring dashboard

---

### v2.0 - Enterprise Features (Q4 2025)

**Priority: Low** | **Effort: 6-8 weeks**

#### Advanced Analytics
- [ ] **Calculated Fields** - Create derived columns
- [ ] **Custom Aggregations** - User-defined aggregates
- [ ] **Statistical Functions** - Advanced stats
- [ ] **ML Integration** - TensorFlow.js integration

#### Enterprise UI
- [ ] **Custom Themes** - White-label theming
- [ ] **Component Marketplace** - Share custom components
- [ ] **Template Library** - Pre-built report templates
- [ ] **Plugin SDK** - Third-party plugin development

#### Data Governance
- [ ] **Data Lineage** - Track data sources
- [ ] **Audit Logs** - Track all operations
- [ ] **Data Masking** - PII protection
- [ ] **Compliance Reports** - GDPR/HIPAA compliance

**Deliverables:**
- Advanced analytics features
- Enterprise-grade UI customization
- Data governance and compliance tools
- Plugin marketplace

---

## 🎯 Feature Comparison: Miaoshou vs Evidence.dev

| Feature | Evidence.dev | Miaoshou v1.0 | Target |
|---------|--------------|---------------|--------|
| **Components** | 50+ | **43** ✅ | v1.0 |
| **Data Sources** | 10+ | **3** (WASM, MotherDuck, HTTP) | v1.1 |
| **Maps** | ✅ | ❌ | v1.2 |
| **Multi-Page** | ✅ | ❌ | v1.3 |
| **Export** | ✅ HTML | ❌ | v1.4 |
| **Collaboration** | ✅ | ❌ | v1.5 |
| **Cloud Hosting** | ✅ Evidence Cloud | ❌ | v2.0 |
| **Local-First** | ❌ | ✅ **Unique** | ✅ |
| **OPFS Persistence** | ❌ | ✅ **Unique** | ✅ |
| **Clean Architecture** | ❌ | ✅ **Unique** | ✅ |
| **Open Source** | ✅ | ✅ | ✅ |

---

## 💡 Strategic Differentiation

### Our Unique Strengths

1. **Privacy-First Architecture**
   - ✅ All data processing in browser
   - ✅ No cloud storage required
   - ✅ OPFS for persistent storage
   - ✅ Perfect for sensitive data

2. **Clean Architecture**
   - ✅ 5-layer clean architecture
   - ✅ Dependency injection
   - ✅ Highly testable and maintainable
   - ✅ Plugin hot-swapping

3. **Local-First**
   - ✅ Works offline
   - ✅ No server costs
   - ✅ Fast performance
   - ✅ Cross-session persistence

### Target Use Cases

**Ideal For:**
- 📊 Personal data analysis
- 🔒 Sensitive/confidential data
- 🎓 Educational/teaching
- 🧪 Data exploration
- 📱 Offline analytics
- 🏢 On-premise deployments

**Not Ideal For:**
- ☁️ Cloud-first teams (use Evidence.dev)
- 👥 Large team collaboration (yet)
- 🗄️ Direct database connections (yet)
- 📈 Real-time dashboards (yet)

---

## 🔮 Long-Term Vision (2026+)

### Potential Features

- **AI-Powered Insights** - Auto-generate insights from data
- **Natural Language Queries** - SQL generation from text
- **AutoML Integration** - Built-in machine learning
- **Mobile Apps** - Native iOS/Android apps
- **Desktop Apps** - Electron-based desktop apps
- **Browser Extension** - Analyze web page data
- **API Mode** - Use as headless analytics engine

### Platform Expansion

- **Evidence Cloud Alternative** - Self-hosted cloud option
- **Plugin Marketplace** - Community plugins
- **Template Gallery** - Pre-built report templates
- **Education Platform** - Interactive tutorials
- **Enterprise Edition** - Advanced features for teams

---

## 📊 Development Metrics

### Current Stats (v1.0)

| Metric | Value |
|--------|-------|
| **Total Lines of Code** | ~15,000 |
| **Components** | 43 |
| **Test Files** | 23 |
| **Documentation** | 6,000+ lines |
| **Build Size** | ~2.5MB (gzipped) |
| **Load Time** | <2s |

### Quality Goals

- ✅ TypeScript strict mode
- ✅ 90%+ type coverage
- ⚠️ 50% test coverage (target: 80%)
- ✅ <500 lines per file
- ✅ WCAG 2.1 AA compliance

---

## 🤝 Contributing

We welcome contributions! Areas we need help:

### High-Priority Contributions

1. **Map Components** - Choropleth, point maps
2. **Database Connectors** - PostgreSQL, MySQL proxies
3. **Export Features** - PDF generation
4. **Performance** - Large dataset optimizations
5. **Documentation** - Tutorials and examples

### How to Contribute

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📅 Release Schedule

| Version | Target Date | Status |
|---------|-------------|--------|
| v1.0 | 2024-12-23 | ✅ Released |
| v1.1 | 2025-02-01 | 🚧 In Progress |
| v1.2 | 2025-03-01 | 📋 Planned |
| v1.3 | 2025-05-01 | 📋 Planned |
| v1.4 | 2025-06-01 | 📋 Planned |
| v1.5 | 2025-08-01 | 📋 Planned |
| v2.0 | 2025-11-01 | 💡 Conceptual |

---

## 🙋 FAQ

**Q: When will multi-page support be available?**
A: Planned for v1.3 (Q2 2025)

**Q: Can I connect to my PostgreSQL database?**
A: Not yet. v1.1 will add PostgreSQL support via HTTP proxy.

**Q: Is there a hosted version?**
A: Not yet. Focus is on local-first. Cloud hosting in v2.0+.

**Q: Can I customize the theme?**
A: Yes! See [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) for customization.

**Q: How do I create custom components?**
A: See [PLUGIN_ARCHITECTURE.md](./docs/PLUGIN_ARCHITECTURE.md)

---

**Maintained by**: Miao Vision Team
**Last Updated**: December 23, 2024
**Version**: 1.0.0
