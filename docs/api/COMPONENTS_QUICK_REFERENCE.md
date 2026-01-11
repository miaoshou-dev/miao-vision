# Components Quick Reference

> Fast lookup guide for Miao Vision UI components

## 🎨 Colors

```css
/* Backgrounds */
bg-gray-950  #030712  Main background
bg-gray-900  #111827  Cards, panels
bg-gray-800  #1F2937  Hover states

/* Text */
text-gray-100  #F3F4F6  Primary text
text-gray-400  #9CA3AF  Secondary text
text-gray-500  #6B7280  Disabled, hints

/* Gemini Gradient */
bg-gemini-primary         /* Blue → Purple → Pink */
bg-gemini-text            /* Text gradient */
gemini-text-gradient      /* Utility class */
```

## 🔘 Buttons

### Basic Usage

```html
<!-- Primary -->
<button class="btn btn-md btn-primary">Submit</button>

<!-- Secondary -->
<button class="btn btn-md btn-secondary">Cancel</button>

<!-- Ghost -->
<button class="btn btn-md btn-ghost">Learn More</button>

<!-- Danger -->
<button class="btn btn-md btn-danger">Delete</button>

<!-- Outline -->
<button class="btn btn-md btn-outline">Export</button>
```

### Sizes

```html
<button class="btn btn-sm btn-primary">Small</button>
<button class="btn btn-md btn-primary">Medium</button>
<button class="btn btn-lg btn-primary">Large</button>
```

### Icon Buttons

```html
<!-- Regular -->
<button class="btn btn-icon btn-ghost">
  <svg>...</svg>
</button>

<!-- Small -->
<button class="btn btn-icon-sm btn-ghost">
  <svg>...</svg>
</button>
```

### States

```html
<!-- Disabled -->
<button class="btn btn-primary" disabled>Disabled</button>

<!-- Loading (add your own spinner) -->
<button class="btn btn-primary" disabled>
  <span class="spinner"></span>
  Loading...
</button>
```

## 📝 Forms

### Input

```html
<!-- Basic -->
<input type="text" class="form-input" placeholder="Enter text" />

<!-- With Label -->
<label class="form-label" for="name">Name</label>
<input type="text" id="name" class="form-input" />

<!-- With Hint -->
<input type="text" class="form-input" />
<span class="form-hint">Helper text here</span>

<!-- With Error -->
<input type="text" class="form-input" />
<span class="form-error">Error message</span>

<!-- Sizes -->
<input type="text" class="form-input form-input-sm" />
<input type="text" class="form-input" />
<input type="text" class="form-input form-input-lg" />
```

### Select

```html
<select class="form-select">
  <option>Option 1</option>
  <option>Option 2</option>
</select>
```

### Textarea

```html
<textarea class="form-textarea" rows="4"></textarea>
```

### Form Group

```html
<div class="form-group">
  <label class="form-label" for="email">Email</label>
  <input type="email" id="email" class="form-input" />
  <span class="form-hint">We'll never share your email</span>
</div>
```

## 🧭 Navigation

### Sidebar Nav Item

```html
<!-- Default -->
<button class="nav-item">
  <span class="nav-label">Upload Data</span>
</button>

<!-- Active -->
<button class="nav-item active">
  <span class="nav-label">Query Data</span>
</button>

<!-- Disabled -->
<button class="nav-item" disabled>
  <span class="nav-label">Visualize</span>
</button>
```

### Report List Item

```html
<button class="report-item">
  <span class="report-name">Q4 Sales Report</span>
  <span class="btn-delete-report" role="button" tabindex="0">×</span>
</button>

<!-- Active -->
<button class="report-item active">
  <span class="report-name">Current Report</span>
</button>
```

## 🃏 Cards

```html
<!-- Basic Card -->
<div class="evidence-card">
  <h3>Card Title</h3>
  <p>Card content</p>
</div>

<!-- Gemini Card (with gradient overlay) -->
<div class="gemini-card">
  <h3>Featured Content</h3>
  <p>With subtle gradient</p>
</div>
```

## 📐 Layout

### Spacing

```html
<!-- Padding -->
p-1   0.25rem  (4px)
p-2   0.5rem   (8px)
p-3   0.75rem  (12px)
p-4   1rem     (16px)
p-6   1.5rem   (24px)
p-8   2rem     (32px)

<!-- Margin -->
m-1   0.25rem  (4px)
m-2   0.5rem   (8px)
m-3   0.75rem  (12px)
m-4   1rem     (16px)
m-6   1.5rem   (24px)
m-8   2rem     (32px)

<!-- Gap (Flexbox/Grid) -->
gap-1  0.25rem  (4px)
gap-2  0.5rem   (8px)
gap-3  0.75rem  (12px)
gap-4  1rem     (16px)
```

### Border Radius

```html
rounded-sm   0.125rem  (2px)
rounded      0.25rem   (4px)
rounded-md   0.375rem  (6px)
rounded-lg   0.5rem    (8px)
rounded-xl   0.75rem   (12px)
rounded-2xl  1rem      (16px)
rounded-3xl  1.5rem    (24px)
rounded-full 9999px
```

### Common Layouts

```html
<!-- Flex Row -->
<div class="flex gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Flex Column -->
<div class="flex flex-col gap-4">
  <div>Item 1</div>
  <div>Item 2</div>
</div>

<!-- Grid 2 Columns -->
<div class="grid grid-cols-2 gap-4">
  <div>Col 1</div>
  <div>Col 2</div>
</div>

<!-- Centered Content -->
<div class="flex items-center justify-center">
  <div>Centered</div>
</div>

<!-- Space Between -->
<div class="flex items-center justify-between">
  <div>Left</div>
  <div>Right</div>
</div>
```

## ✍️ Typography

### Font Sizes

```html
text-xs    0.6875rem  (11px)
text-sm    0.875rem   (14px)
text-base  1rem       (16px)
text-lg    1.125rem   (18px)
text-xl    1.25rem    (20px)
text-2xl   1.5rem     (24px)
text-3xl   1.875rem   (30px)
text-4xl   2.25rem    (36px)
```

### Font Weights

```html
font-normal    400
font-medium    500
font-semibold  600
font-bold      700
```

### Text Colors

```html
text-gray-100   #F3F4F6  Primary
text-gray-200   #E5E7EB  Secondary
text-gray-300   #D1D5DB  Tertiary
text-gray-400   #9CA3AF  Muted
text-gray-500   #6B7280  Disabled
```

### Gradient Text

```html
<h1 class="gemini-text-gradient">
  Gradient Text
</h1>
```

## 🎭 Utility Classes

### Glassmorphism

```html
<div class="gemini-glass">
  Glass effect background
</div>
```

### Gradient Button

```html
<button class="gemini-button-gradient">
  Gradient Button
</button>
```

### Gradient Border

```html
<div class="gemini-border-gradient">
  Content with gradient border
</div>
```

### Scrollbar Styling

```html
<div class="evidence-scrollbar">
  Scrollable content with styled scrollbar
</div>
```

## 📱 Responsive

### Breakpoints

```html
<!-- Show/Hide at breakpoints -->
hidden md:block        <!-- Hidden on mobile, visible on tablet+ -->
block md:hidden        <!-- Visible on mobile, hidden on tablet+ -->

<!-- Responsive Padding -->
p-4 md:p-6 lg:p-8     <!-- 16px → 24px → 32px -->

<!-- Responsive Grid -->
grid-cols-1 md:grid-cols-2 lg:grid-cols-3
```

### Breakpoint Sizes

```
sm:   640px   Small mobile
md:   768px   Tablet
lg:   1024px  Desktop
xl:   1280px  Large desktop
2xl:  1536px  Extra large
```

## 🎨 Animations

### Tailwind Animations

```html
<!-- Fade In -->
<div class="animate-fade-in">Content</div>

<!-- Slide In -->
<div class="animate-slide-in">Content</div>

<!-- Spin -->
<div class="animate-spin">Loading...</div>
```

### Transitions

```html
<!-- All Properties -->
<div class="transition-all duration-200">Hover me</div>

<!-- Specific Properties -->
<div class="transition-colors duration-200">Color change</div>
<div class="transition-transform duration-200">Transform</div>

<!-- Hover Effects -->
<div class="hover:scale-105 transition-transform">Scale on hover</div>
<div class="hover:-translate-y-1 transition-transform">Lift on hover</div>
```

## ♿ Accessibility

### Focus States

```html
<!-- Always visible focus -->
<button class="focus:outline-none focus:ring-2 focus:ring-blue-500">
  Button
</button>

<!-- Visible only for keyboard navigation -->
<button class="focus-visible:ring-2 focus-visible:ring-blue-500">
  Button
</button>
```

### ARIA Labels

```html
<!-- Icon button -->
<button aria-label="Close">×</button>

<!-- Loading state -->
<button aria-busy="true">Loading...</button>

<!-- Disabled state -->
<button disabled aria-disabled="true">Submit</button>
```

### Skip Links

```html
<a href="#main" class="skip-link">
  Skip to main content
</a>
```

## 🔍 Common Patterns

### Modal Dialog

```html
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
  <div class="evidence-card max-w-md w-full">
    <h2 class="text-xl font-semibold mb-4">Dialog Title</h2>
    <p class="text-gray-400 mb-6">Dialog content...</p>
    <div class="flex gap-3">
      <button class="btn btn-md btn-primary">Confirm</button>
      <button class="btn btn-md btn-ghost">Cancel</button>
    </div>
  </div>
</div>
```

### Loading Spinner

```html
<div class="flex items-center gap-2">
  <div class="w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
  <span>Loading...</span>
</div>
```

### Empty State

```html
<div class="text-center py-12">
  <div class="text-gray-400 mb-2">
    <svg class="w-16 h-16 mx-auto">...</svg>
  </div>
  <h3 class="text-lg font-medium text-gray-300 mb-2">
    No data yet
  </h3>
  <p class="text-sm text-gray-500 mb-4">
    Get started by uploading your first file
  </p>
  <button class="btn btn-md btn-primary">
    Upload File
  </button>
</div>
```

### Badge

```html
<!-- Gemini Badge -->
<span class="gemini-badge">New</span>

<!-- Custom Badge -->
<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-900 text-blue-200">
  Beta
</span>
```

### Alert/Toast

```html
<!-- Success -->
<div class="bg-green-900 border border-green-700 rounded-lg p-4">
  <p class="text-green-100">Successfully saved!</p>
</div>

<!-- Error -->
<div class="bg-red-900 border border-red-700 rounded-lg p-4">
  <p class="text-red-100">An error occurred</p>
</div>

<!-- Info -->
<div class="bg-blue-900 border border-blue-700 rounded-lg p-4">
  <p class="text-blue-100">Information message</p>
</div>
```

### Tooltip

```html
<div class="relative group">
  <button class="btn btn-icon btn-ghost">?</button>
  <div class="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-sm text-white rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
    Tooltip text
  </div>
</div>
```

---

# Evidence.dev-Style Components (43 Total)

> Components for data-driven reports in Markdown

---

## 📊 Input Components (8)

### Dropdown

```markdown
\`\`\`dropdown
name: region
data: regions_query
value: region_code
label: region_name
title: Select Region
defaultValue: US
\`\`\`
```

**Props:**
- `name` (required) - Input variable name
- `data` (required) - Query name or data source
- `value` - Column for option values
- `label` - Column for option labels
- `title` - Dropdown title
- `defaultValue` - Initial selection

### ButtonGroup

```markdown
\`\`\`buttongroup
name: time_period
title: Time Period
options: Day, Week, Month, Year
defaultValue: Month
\`\`\`
```

**Props:**
- `name` (required) - Input variable name
- `options` (required) - Comma-separated options
- `title` - Button group title
- `defaultValue` - Initial selection

### TextInput

```markdown
\`\`\`textinput
name: search
title: Search Products
placeholder: Enter product name...
debounce: 300
\`\`\`
```

**Props:**
- `name` (required) - Input variable name
- `title` - Input label
- `placeholder` - Placeholder text
- `debounce` - Debounce delay (ms)

### Slider

```markdown
\`\`\`slider
name: price_max
title: Maximum Price
min: 0
max: 1000
step: 10
defaultValue: 500
format: currency
\`\`\`
```

**Props:**
- `name` (required) - Input variable name
- `min` - Minimum value
- `max` - Maximum value
- `step` - Step increment
- `format` - Display format (currency, percent, number)

### DateRange

```markdown
\`\`\`daterange
name: date_filter
title: Date Range
presets: true
defaultValue: Last 30 Days
\`\`\`
```

**Props:**
- `name` (required) - Input variable name
- `title` - DateRange title
- `presets` - Show preset options (true/false)
- `defaultValue` - Initial range

### Checkbox

```markdown
\`\`\`checkbox
name: show_inactive
title: Show Inactive Users
defaultValue: false
\`\`\`
```

**Props:**
- `name` (required) - Input variable name
- `title` - Checkbox label
- `defaultValue` - Initial checked state

### DimensionGrid

```markdown
\`\`\`dimensiongrid
name: category
data: categories_query
title: Select Category
\`\`\`
```

**Props:**
- `name` (required) - Input variable name
- `data` (required) - Query name with categories
- `title` - Grid title

---

## 📈 Data Display Components (22)

### BigValue

```markdown
\`\`\`bigvalue
query: total_revenue
value: revenue
title: Total Revenue
format: currency
comparison: last_month
comparisonLabel: vs Last Month
sparkline: true
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `value` (required) - Value column
- `title` - Card title
- `format` - number, currency, percent, compact
- `comparison` - Comparison query name
- `sparkline` - Show trend line (true/false)

### DataTable

```markdown
\`\`\`datatable
query: sales_data
search: true
downloadable: true
rowsPerPage: 25
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `search` - Enable search (true/false)
- `downloadable` - Enable CSV/Excel export
- `rowsPerPage` - Rows per page (10, 25, 50, 100)
- `sortable` - Enable sorting (true/false)

### Value

```markdown
Revenue: \`\`\`value query=summary field=total_revenue format=currency\`\`\`
```

**Props:**
- `query` (required) - Query name
- `field` (required) - Field to display
- `format` - Display format

### Sparkline

```markdown
\`\`\`sparkline
query: daily_sales
value: revenue
type: line
color: #10B981
height: 40
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `value` (required) - Value column
- `type` - line, area, bar
- `color` - Line color
- `height` - Chart height (px)

### BarChart

```markdown
\`\`\`bar-chart
query: category_sales
x: category
y: revenue
title: Sales by Category
orientation: vertical
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `x` (required) - X-axis column
- `y` (required) - Y-axis column
- `title` - Chart title
- `orientation` - vertical, horizontal

### PieChart

```markdown
\`\`\`pie-chart
query: market_share
category: company
value: share
title: Market Share
donut: true
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `category` (required) - Category column
- `value` (required) - Value column
- `donut` - Donut style (true/false)

### Histogram

```markdown
\`\`\`histogram
query: age_distribution
value: age
bins: 10
title: Age Distribution
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `value` (required) - Value column
- `bins` - Number of bins
- `title` - Chart title

### Delta

```markdown
\`\`\`delta
query: kpi
value: current_value
comparison: previous_value
format: percent
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `value` (required) - Current value column
- `comparison` (required) - Comparison value column
- `format` - Display format

### Sankey

```markdown
\`\`\`sankey
query: flow_data
source: from_state
target: to_state
value: count
title: User Flow
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `source` (required) - Source column
- `target` (required) - Target column
- `value` (required) - Flow value column

### Waterfall

```markdown
\`\`\`waterfall
query: cash_flow
category: month
value: amount
title: Cash Flow Analysis
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `category` (required) - Category column
- `value` (required) - Value column

### Progress

```markdown
\`\`\`progress
query: goal_progress
value: current
max: target
title: Goal Progress
format: percent
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `value` (required) - Current value column
- `max` (required) - Max value column
- `format` - Display format

### BulletChart

```markdown
\`\`\`bullet-chart
query: performance
value: actual
target: goal
title: Sales Performance
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `value` (required) - Actual value column
- `target` (required) - Target value column

### BoxPlot

```markdown
\`\`\`boxplot
query: salary_distribution
category: department
value: salary
title: Salary by Department
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `category` - Grouping column
- `value` (required) - Value column

### CalendarHeatmap

```markdown
\`\`\`calendar-heatmap
query: daily_commits
date: commit_date
value: count
year: 2024
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `date` (required) - Date column
- `value` (required) - Value column
- `year` - Year to display

### Gauge

```markdown
\`\`\`gauge
query: cpu_usage
value: usage_percent
min: 0
max: 100
thresholds: 60, 80
colors: green, yellow, red
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `value` (required) - Value column
- `min`, `max` - Range
- `thresholds` - Threshold values
- `colors` - Color ranges

### KPIGrid

```markdown
\`\`\`kpigrid
query: kpi_metrics
metrics: revenue, users, conversion
format: currency, number, percent
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `metrics` (required) - Columns to display
- `format` - Format for each metric

### Heatmap

```markdown
\`\`\`heatmap
query: activity_matrix
x: hour
y: day
value: count
title: Activity Heatmap
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `x` (required) - X-axis column
- `y` (required) - Y-axis column
- `value` (required) - Value column

### Radar

```markdown
\`\`\`radar
query: skill_assessment
dimension: skill
value: score
title: Skill Assessment
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `dimension` (required) - Dimension column
- `value` (required) - Value column

### Funnel

```markdown
\`\`\`funnel
query: conversion_funnel
stage: step
value: users
title: Conversion Funnel
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `stage` (required) - Stage column
- `value` (required) - Value column

### Treemap

```markdown
\`\`\`treemap
query: product_sales
category: product
value: revenue
title: Product Revenue
\`\`\`
```

**Props:**
- `query` (required) - Query name
- `category` (required) - Category column
- `value` (required) - Value column

---

## 📊 vgplot Charts (7)

### Chart (Generic)

```markdown
\`\`\`chart
data: sales_data
x: date
y: revenue
type: line
\`\`\`
```

### Line Chart

```markdown
\`\`\`line
data: time_series
x: date
y: value
title: Time Series
\`\`\`
```

### Area Chart

```markdown
\`\`\`area
data: cumulative_sales
x: month
y: total
fill: #4285F4
\`\`\`
```

### Scatter Plot

```markdown
\`\`\`scatter
data: correlation_data
x: temperature
y: sales
size: 5
color: #EC4899
\`\`\`
```

---

## 🎨 UI Components (6)

### Alert

```markdown
\`\`\`alert
type: warning
title: Important Notice

This is a warning message that users should pay attention to.
\`\`\`
```

**Types:** `info`, `warning`, `error`, `success`

### Tabs

```markdown
\`\`\`tabs
tabs: Overview, Details, Analytics

# Overview Content
Overview tab content here...

# Details Content
Details tab content here...

# Analytics Content
Analytics tab content here...
\`\`\`
```

### Accordion

```markdown
\`\`\`accordion
title: FAQ Section

## Question 1?
Answer to question 1...

## Question 2?
Answer to question 2...
\`\`\`
```

### Tooltip

```markdown
Hover over \`\`\`tooltip text="This is a tooltip"\`\`\` for more info.
```

### Details

```markdown
\`\`\`details
summary: Click to expand

Hidden content that shows when expanded.
\`\`\`
```

### Modal

```markdown
\`\`\`modal
buttonText: View Details
title: Detailed Information

Modal content here...
\`\`\`
```

---

## 📐 Layout Components (1)

### Grid

```markdown
\`\`\`grid
columns: 3
gap: 4

<BigValue ... />
<BigValue ... />
<BigValue ... />
\`\`\`
```

**Props:**
- `columns` - Number of columns (1-4)
- `gap` - Gap size (1-8)

---

## 💡 Usage Examples

### Complete Dashboard Example

```markdown
# Sales Dashboard

## Filters

\`\`\`daterange
name: date_range
title: Select Date Range
presets: true
\`\`\`

\`\`\`dropdown
name: region
data: regions
value: region_code
label: region_name
title: Region
\`\`\`

## KPIs

\`\`\`grid
columns: 4
gap: 4

\`\`\`bigvalue
query: total_revenue
value: revenue
title: Total Revenue
format: currency
\`\`\`

\`\`\`bigvalue
query: total_orders
value: orders
title: Total Orders
format: number
\`\`\`

\`\`\`bigvalue
query: avg_order_value
value: aov
title: Avg Order Value
format: currency
\`\`\`

\`\`\`bigvalue
query: conversion_rate
value: rate
title: Conversion Rate
format: percent
\`\`\`
\`\`\`

## Trends

\`\`\`line
data: daily_revenue
x: date
y: revenue
title: Daily Revenue Trend
\`\`\`

## Top Products

\`\`\`datatable
query: top_products
search: true
downloadable: true
\`\`\`
```

### Report with Conditionals

```markdown
# Monthly Report

\`\`\`sql name=summary
SELECT
  SUM(revenue) as total_revenue,
  COUNT(*) as order_count
FROM sales
WHERE month = '${inputs.month}'
\`\`\`

{#if ${summary.total_revenue} > 100000}
## 🎉 Excellent Performance!

Revenue exceeded $100K this month.

\`\`\`bigvalue
query: summary
value: total_revenue
title: Monthly Revenue
format: currency
\`\`\`
{:else}
## 📊 Performance Update

\`\`\`alert
type: info
title: Revenue Below Target

Current revenue is $${summary.total_revenue}. Target is $100,000.
\`\`\`
{/if}
```

---

## 📚 Full Documentation

For complete documentation, examples, and guidelines, see:
- [PLUGIN_ARCHITECTURE.md](./docs/PLUGIN_ARCHITECTURE.md) - Plugin development guide
- [UI_DESIGN_SYSTEM.md](./UI_DESIGN_SYSTEM.md) - Complete design system
- [CLAUDE.md](./CLAUDE.md) - Comprehensive development guide
- [tailwind.config.js](./tailwind.config.js) - Theme configuration
- [src/app.css](./src/app.css) - Component styles

---

**Quick Tips**:
- Use browser DevTools to inspect existing components and see which classes are being used
- All components support template variables: `${inputs.variable_name}`
- Chain components with SQL: `query: previous_query_name`
- Test components in isolation before adding to complex reports

**Last Updated**: December 23, 2024
**Total Components**: 43 (8 inputs + 22 data display + 7 charts + 6 UI + 1 layout)
