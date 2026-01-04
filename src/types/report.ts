/**
 * Report Types and Interfaces
 *
 * Defines the data structures for Markdown-driven reports
 */

import type { QueryResult } from './database'
import type { ChartConfig } from './chart'

/**
 * Type of content block in a report
 */
export type BlockType = 'markdown' | 'sql' | 'chart'

/**
 * Execution status of a block
 */
export type BlockStatus = 'pending' | 'executing' | 'success' | 'error'

/**
 * Individual block within a report
 */
export interface ReportBlock {
  id: string
  type: BlockType
  content: string
  // For SQL blocks
  sqlResult?: QueryResult
  // For chart blocks
  chartConfig?: ChartConfig
  // Metadata (e.g., SQL block name)
  metadata?: any
  // Execution state
  status: BlockStatus
  error?: string
  executionTime?: number // milliseconds
  // Dependencies tracking (for reactive execution)
  dependencies?: {
    inputs: string[]      // Input variables this block depends on (e.g., ['region', 'date'])
    blocks: string[]      // Other blocks this block depends on (e.g., ['block_0'])
  }
}

/**
 * Report type: single page or multi-page
 */
export type ReportType = 'single' | 'multi-page'

/**
 * Individual page in a multi-page report
 */
export interface ReportPage {
  id: string
  title: string
  slug: string  // URL-friendly identifier
  content: string  // Markdown content for this page
  parentId?: string  // Parent page ID for hierarchical structure
  order: number  // Display order among siblings
  createdAt: Date
  lastModified: Date
}

/**
 * Front matter metadata for reports
 */
export interface ReportMetadata {
  title?: string
  author?: string
  date?: string
  description?: string
  tags?: string[]
  // Data sources required by this report (for AI-generated reports)
  dataSources?: string[]
  // Custom variables for template interpolation
  variables?: Record<string, any>
  // Internal: processed content after conditional evaluation
  _processedContent?: string
}

/**
 * Complete report document
 */
export interface Report {
  id: string
  name: string
  type: ReportType  // 'single' or 'multi-page'
  content: string // Raw markdown content (for single-page reports)
  metadata: ReportMetadata
  blocks: ReportBlock[]

  /**
   * Pages for multi-page reports
   * Empty for single-page reports
   */
  pages?: ReportPage[]

  /**
   * Current active page ID (for multi-page reports)
   */
  currentPageId?: string

  /**
   * Embedded data snapshots for self-contained reports
   * Used when Report is executed with Memory DB for sharing/distribution
   * Key: table name, Value: { columns, data }
   */
  embeddedData?: {
    [tableName: string]: {
      columns: string[]
      data: any[]
    }
  }

  createdAt: Date
  lastModified: Date
  lastExecuted?: Date
}

/**
 * Report execution result
 */
export interface ReportExecutionResult {
  success: boolean
  executedBlocks: number
  failedBlocks: number
  totalTime: number
  errors: Array<{
    blockId: string
    message: string
  }>
}

/**
 * Report state for store management
 */
export interface ReportState {
  // Current report being edited/viewed
  currentReport: Report | null
  // All saved reports
  reports: Report[]
  // Execution state
  isExecuting: boolean
  executionProgress: number // 0-100
  // Table mapping for chart data sources
  tableMapping: Map<string, string>
  // UI state
  isEditing: boolean
  showPreview: boolean
  // Error state
  error: string | null
}

/**
 * Chart block configuration (simplified syntax)
 */
export interface ChartBlockConfig {
  type: 'bar' | 'line' | 'scatter' | 'histogram' | 'area' | 'pie' | 'boxplot' | 'heatmap' | 'funnel'
  data: string // Table name or query result reference
  x: string
  y?: string  // Optional for histogram
  group?: string
  title?: string
  width?: number
  height?: number
  xLabel?: string
  yLabel?: string
  bins?: number  // For histogram
  fillOpacity?: number  // For area chart
  curve?: 'linear' | 'step' | 'basis' | 'monotone'  // For line/area chart
  stacked?: boolean  // For area chart
  normalized?: boolean  // For area chart
  xScaleType?: 'point' | 'linear' | 'log' | 'sqrt' | 'time' | 'utc'  // X-axis scale type
  // Pie chart specific options
  innerRadius?: number  // Inner radius (0 for pie, > 0 for donut)
  outerRadius?: number  // Outer radius
  padAngle?: number  // Padding between slices
  cornerRadius?: number  // Corner radius for slices
  showLabels?: boolean  // Show labels on slices
  showPercentages?: boolean  // Show percentages in labels
  // Heatmap specific options
  color?: string  // Column for color encoding (defaults to y or group)
}

/**
 * SQL block metadata
 */
export interface SQLBlockMetadata {
  // Optional name for the query result
  // Can be referenced by other blocks
  name?: string
  // Whether to show the result table
  showResult?: boolean
  // Maximum rows to display
  limit?: number
}

/**
 * Parsed code block with metadata
 */
export interface ParsedCodeBlock {
  id: string
  language: string
  content: string
  meta?: string
  metadata?: SQLBlockMetadata | ChartBlockConfig
}

/**
 * Template variable context
 */
export interface TemplateContext {
  // Front matter variables
  metadata: ReportMetadata
  // Query results (keyed by block name)
  results: Map<string, QueryResult>
  // Computed values
  computed: Record<string, any>
}

/**
 * Report rendering options
 */
export interface ReportRenderOptions {
  // Whether to execute SQL queries
  executeSQL: boolean
  // Whether to render charts
  renderCharts: boolean
  // Whether to interpolate variables
  interpolateVariables: boolean
  // Maximum execution time per block (ms)
  maxExecutionTime?: number
}

/**
 * Default report template
 */
export const DEFAULT_REPORT_TEMPLATE = `---
title: Untitled Report
author:
date: ${new Date().toISOString().split('T')[0]}
---

# {title}

**Author**: {author}
**Date**: {date}

## Introduction

Write your analysis here.

## Key Metrics

\`\`\`sql total_sales
SELECT SUM(amount) as total_amount FROM your_table
\`\`\`

\`\`\`bigvalue
query: total_sales
value: total_amount
title: Total Revenue
format: currency
\`\`\`

## Data Analysis

\`\`\`sql data_sample
SELECT * FROM your_table LIMIT 100
\`\`\`

### Interactive Table

\`\`\`datatable
query: data_sample
columns:
  - name: column_name
    label: Column Label
    format: text
    align: left
searchable: true
sortable: true
exportable: true
\`\`\`

## Visualization

\`\`\`chart
type: bar
data: query_result
x: column_x
y: column_y
title: Your Chart Title
\`\`\`

## Distribution Analysis

\`\`\`histogram
type: histogram
data: query_result
x: numeric_column
bins: 20
title: Value Distribution
\`\`\`

## Conclusion

Summary of findings.
`

/**
 * Default multi-page report template (Home page content)
 */
export const DEFAULT_MULTIPAGE_HOME_TEMPLATE = `---
title: Untitled Multi-Page Report
author:
date: ${new Date().toISOString().split('T')[0]}
---

# {title}

**Author**: {author}
**Date**: {date}

## Welcome

This is a multi-page report. Use the sidebar to navigate between pages.

## Overview

Add your report content here.
`

/**
 * Report storage key for localStorage
 */
export const REPORTS_STORAGE_KEY = 'miao-vision:reports'

/**
 * Maximum number of reports to store
 */
export const MAX_REPORTS = 50
