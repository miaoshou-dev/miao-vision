# Quick Start Guide

Get up and running with Miaoshou Vision in 5 minutes.

## Prerequisites

- Node.js 18+
- npm 9+

## Installation

```bash
# Clone the repository
git clone https://github.com/guming/miao-vision.git
cd miao-vision

# Install dependencies
npm install

# Start development server
npm run dev
```

Open http://localhost:5173 in your browser.

## Core Concepts

### 1. SQL Workspace

Interactive SQL environment powered by DuckDB-WASM:

- **Import Data**: CSV, JSON, Parquet, Excel files
- **Write SQL**: Full SQL support with Monaco editor
- **Visualize**: 27+ chart types from query results
- **Export**: Download results as CSV/JSON

### 2. BI Report

Create data-driven documents with Markdown + SQL:

````markdown
# Sales Report

```sql sales_data
SELECT region, SUM(revenue) as total
FROM sales
GROUP BY region
```

```bar-chart
data: sales_data
x: region
y: total
```
````

### 3. AI Report Generator

Auto-generate reports from your data:

1. Select data sources
2. Enter a prompt describing what you want
3. AI generates complete Markdown report
4. Edit and customize as needed

## Key Commands

```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run check        # Type checking
npm run test         # Run tests
```

## Next Steps

- [Full Getting Started Guide](./GETTING_STARTED.md)
- [Architecture Overview](../architecture/ARCHITECTURE_OVERVIEW.md)
- [Component Reference](../api/COMPONENTS_QUICK_REFERENCE.md)
- [Create a Plugin](../guides/create-plugin.md)
