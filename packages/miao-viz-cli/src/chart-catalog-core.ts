import type { ChartCatalogItem } from "./chart-catalog-types"

export const CHART_CATALOG: ChartCatalogItem[] = [
  {
    id: 'bar',
    displayName: 'Bar Chart',
    compactFor: 'rank,compare',
    requires: 'dim(2-30)+measure',
    transformRecipe: 'agg>sort(desc)>limit(10)',
    avoid: 'dim>30,time>=3',
    insightPattern: 'top {dimension} by {measure}',
    requiredEncodings: ['x', 'y'],
    allowedTransforms: ['aggregate', 'sort', 'limit', 'derive-month'],
    bestFor: ['ranking by category', 'comparison across dimensions', 'top-N with limit', 'grouped/stacked multi-series via encoding.color'],
    antiPatterns: ['time series with many periods (use line)', 'more than 12 categories without top-N limit'],
    rules: [
      {
        code: 'X_MUST_BE_DIMENSION',
        severity: 'error',
        expression: 'encoding.x.type === "temporal"',
        message: 'Bar chart x-axis must be a dimension (nominal/ordinal), not temporal. Use line or area for time series.',
        validate: (chart) => {
          if (chart.encoding?.x?.type === 'temporal') {
            return {
              code: 'X_MUST_BE_DIMENSION',
              severity: 'error',
              message: `Bar chart${chart.id ? ` '${chart.id}'` : ''}: x.type='temporal' is invalid. Use line/area for time series, or set x.type='nominal'/'ordinal'.`,
              chartId: chart.id
            }
          }
          return null
        }
      },
      {
        code: 'BAR_NO_AGGREGATE',
        severity: 'warning',
        expression: 'encoding.y.aggregate not set and no aggregate transform',
        message: "bar will plot one bar per raw row — unsorted and unaggregated. Add encoding.y.aggregate or data.transform aggregate + sort + limit.",
        validate: (chart) => {
          const hasAggTransform = (chart.data?.transform ?? []).some(t => t.type === 'aggregate')
          const hasEncodingAgg = !!chart.encoding?.y?.aggregate
          if (!hasAggTransform && !hasEncodingAgg) {
            return {
              code: 'BAR_NO_AGGREGATE',
              severity: 'warning',
              message: `bar${chart.id ? ` '${chart.id}'` : ''}: no aggregation — will plot one bar per raw row (unsorted, unaggregated). Add encoding.y.aggregate (sum/avg/count) or data.transform: aggregate + sort + limit.`,
              chartId: chart.id
            }
          }
          return null
        }
      },
      {
        code: 'TOO_MANY_CATEGORIES',
        severity: 'warning',
        expression: 'ctx.fields[encoding.x.field].distinctCount > 12',
        message: 'More than 12 bar categories. Add a limit transform (top 10) or switch to table.',
        validate: (chart, ctx) => {
          if (!ctx) return null
          const xField = chart.encoding?.x?.field
          if (!xField) return null
          const field = ctx.fields.find(f => f.name === xField)
          if (field?.distinctCount !== undefined && field.distinctCount > 12) {
            return {
              code: 'TOO_MANY_CATEGORIES',
              severity: 'warning',
              message: `Bar chart${chart.id ? ` '${chart.id}'` : ''}: '${xField}' has ${field.distinctCount} distinct values (>12). Add { type: 'limit', value: 10 } or use table.`,
              chartId: chart.id
            }
          }
          return null
        }
      }
    ]
  },

  {
    id: 'line',
    displayName: 'Line Chart',
    compactFor: 'trend',
    requires: 'time(>=3)+measure',
    transformRecipe: 'agg(time)>sort(asc)',
    avoid: 'time<3,nominal_x',
    insightPattern: '{measure} over {time}',
    requiredEncodings: ['x', 'y'],
    allowedTransforms: ['aggregate', 'sort', 'derive-month'],
    bestFor: ['time series trends', 'continuous data over ordered axis', 'multi-series comparison via encoding.color'],
    antiPatterns: ['nominal x-axis (use bar)', 'fewer than 3 data points (use bigvalue)'],
    minDataPoints: 3,
    rules: [
      {
        code: 'X_MUST_BE_TEMPORAL',
        severity: 'error',
        expression: 'encoding.x.type === "nominal"',
        message: "Line chart x-axis must be temporal or ordinal, not nominal. A nominal x gives undefined line order.",
        validate: (chart) => {
          if (chart.encoding?.x?.type === 'nominal') {
            return {
              code: 'X_MUST_BE_TEMPORAL',
              severity: 'error',
              message: `Line chart${chart.id ? ` '${chart.id}'` : ''}: x.type='nominal' is invalid — line order is undefined. Use x.type='temporal' or 'ordinal', or switch to bar chart.`,
              chartId: chart.id
            }
          }
          return null
        }
      },
      {
        code: 'MISSING_SORT_TRANSFORM',
        severity: 'warning',
        expression: 'no sort transform present',
        message: "Line chart without a sort transform — x-axis order may be wrong. Add { type: 'sort', field: <xField>, order: 'asc' }.",
        validate: (chart) => {
          const transforms = chart.data?.transform ?? []
          const hasSort = transforms.some(t => t.type === 'sort')
          if (!hasSort && chart.encoding?.x?.field) {
            const xField = chart.encoding.x.field
            return {
              code: 'MISSING_SORT_TRANSFORM',
              severity: 'warning',
              message: `Line chart${chart.id ? ` '${chart.id}'` : ''}: no sort transform. Add { type: 'sort', field: '${xField}', order: 'asc' } to ensure correct time order.`,
              chartId: chart.id,
              patchHint: { type: 'sort', field: xField, order: 'asc' }
            }
          }
          return null
        }
      }
    ]
  },

  {
    id: 'area',
    displayName: 'Area Chart',
    compactFor: 'trend,magnitude',
    requires: 'time(>=3)+measure',
    transformRecipe: 'agg(time)>sort(asc)',
    avoid: 'time<3,negative_values,nominal_x',
    requiredEncodings: ['x', 'y'],
    allowedTransforms: ['aggregate', 'sort', 'derive-month'],
    bestFor: ['cumulative trends', 'filled time series with visual mass', 'stacked multi-series via encoding.color'],
    antiPatterns: ['nominal x-axis (use bar)', 'negative values (area fill misleads)'],
    minDataPoints: 3,
    rules: [
      {
        code: 'X_MUST_BE_TEMPORAL',
        severity: 'error',
        expression: 'encoding.x.type === "nominal"',
        message: "Area chart x-axis must be temporal or ordinal, not nominal.",
        validate: (chart) => {
          if (chart.encoding?.x?.type === 'nominal') {
            return {
              code: 'X_MUST_BE_TEMPORAL',
              severity: 'error',
              message: `Area chart${chart.id ? ` '${chart.id}'` : ''}: x.type='nominal' is invalid. Use x.type='temporal' or 'ordinal'.`,
              chartId: chart.id
            }
          }
          return null
        }
      },
      {
        code: 'MISSING_SORT_TRANSFORM',
        severity: 'warning',
        expression: 'no sort transform present',
        message: "Area chart without a sort transform — x-axis order may be wrong. Add { type: 'sort', field: <xField>, order: 'asc' }.",
        validate: (chart) => {
          const transforms = chart.data?.transform ?? []
          const hasSort = transforms.some(t => t.type === 'sort')
          if (!hasSort && chart.encoding?.x?.field) {
            const xField = chart.encoding.x.field
            return {
              code: 'MISSING_SORT_TRANSFORM',
              severity: 'warning',
              message: `Area chart${chart.id ? ` '${chart.id}'` : ''}: no sort transform. Add { type: 'sort', field: '${xField}', order: 'asc' }.`,
              chartId: chart.id,
              patchHint: { type: 'sort', field: xField, order: 'asc' }
            }
          }
          return null
        }
      }
    ]
  },

  {
    id: 'pie',
    displayName: 'Pie Chart',
    compactFor: 'share,composition',
    requires: 'dim(2-7)+measure',
    transformRecipe: 'agg>sort(desc)>limit(7)',
    avoid: 'dim>7,non_whole_values',
    insightPattern: '{dimension} share of {measure}',
    requiredEncodings: ['label', 'value'],
    allowedTransforms: ['aggregate', 'sort', 'limit'],
    bestFor: ['part-to-whole proportions', 'share distribution with ≤7 categories', 'donut via style.innerRadius'],
    antiPatterns: ['more than 7 slices (use bar)', 'values that do not sum to a meaningful whole'],
    rules: [
      {
        code: 'PIE_NO_AGGREGATE',
        severity: 'warning',
        expression: 'encoding.value.aggregate not set and no aggregate transform',
        message: "pie will show one slice per raw row. Add encoding.value.aggregate or data.transform aggregate + sort + limit.",
        validate: (chart) => {
          const hasAggTransform = (chart.data?.transform ?? []).some(t => t.type === 'aggregate')
          const hasEncodingAgg = !!chart.encoding?.value?.aggregate
          if (!hasAggTransform && !hasEncodingAgg) {
            return {
              code: 'PIE_NO_AGGREGATE',
              severity: 'warning',
              message: `pie${chart.id ? ` '${chart.id}'` : ''}: no aggregation — will show one slice per raw row (too many slices, wrong values). Add encoding.value.aggregate (sum/avg/count) or data.transform: aggregate + sort + limit.`,
              chartId: chart.id
            }
          }
          return null
        }
      },
      {
        code: 'TOO_MANY_SLICES',
        severity: 'warning',
        expression: 'ctx.fields[encoding.label.field].distinctCount > 7',
        message: 'Pie chart has more than 7 slices. Use bar chart or add a top-N limit transform.',
        validate: (chart, ctx) => {
          if (!ctx) return null
          const labelField = chart.encoding?.label?.field
          if (!labelField) return null
          const field = ctx.fields.find(f => f.name === labelField)
          if (field?.distinctCount !== undefined && field.distinctCount > 7) {
            return {
              code: 'TOO_MANY_SLICES',
              severity: 'warning',
              message: `Pie chart${chart.id ? ` '${chart.id}'` : ''}: '${labelField}' has ${field.distinctCount} values (>7). Use bar chart instead.`,
              chartId: chart.id
            }
          }
          return null
        }
      }
    ]
  },

  {
    id: 'scatter',
    displayName: 'Scatter Chart',
    compactFor: 'relationship,correlation',
    requires: 'measure+measure',
    transformRecipe: 'raw_or_limit',
    avoid: 'single_measure,categorical_axis',
    requiredEncodings: ['x', 'y'],
    allowedTransforms: ['sort', 'limit'],
    bestFor: ['correlation between two measures', 'distribution of two quantitative variables'],
    antiPatterns: ['one categorical axis (use bar)', 'time series (use line)'],
    rules: []
  },

  {
    id: 'histogram',
    displayName: 'Histogram',
    compactFor: 'distribution',
    requires: 'measure+rows(>=20)',
    transformRecipe: 'bin(numeric)>count',
    avoid: 'rows<20,categorical_field',
    insightPattern: '{measure} distribution',
    requiredEncodings: ['x'],
    allowedTransforms: ['derive-month'],
    bestFor: ['distribution of a single numeric field', 'frequency across value bins'],
    antiPatterns: ['categorical fields (use bar)', 'fewer than 20 rows (distribution unreliable)'],
    minDataPoints: 20,
    rules: []
  },

  {
    id: 'heatmap',
    displayName: 'Heatmap',
    compactFor: 'matrix,density',
    requires: 'dim+dim+measure',
    transformRecipe: 'agg(dim,dim)>encode(value)',
    avoid: 'single_dimension,sparse_matrix',
    insightPattern: '{measure} by {x_dimension} and {y_dimension}',
    requiredEncodings: ['x', 'y', 'value'],
    allowedTransforms: ['aggregate'],
    bestFor: ['matrix of two dimensions vs one measure', 'calendar-style density maps'],
    antiPatterns: ['only one dimension (use bar)', 'sparse matrix with many nulls'],
    rules: []
  },

  {
    id: 'table',
    displayName: 'Data Table',
    compactFor: 'detail,high-cardinality,export',
    requires: 'any_fields',
    transformRecipe: 'sort_or_limit_optional',
    avoid: 'too_many_columns_without_selection',
    requiredEncodings: [],
    allowedTransforms: ['aggregate', 'sort', 'limit', 'derive-month'],
    bestFor: ['high-cardinality dimension detail', 'multi-measure comparison', 'data export'],
    antiPatterns: ['too many columns (>8) without pinning', 'as the only chart in a report'],
    rules: []
  },

  {
    id: 'bigvalue',
    displayName: 'Big Value (KPI Card)',
    compactFor: 'kpi,summary',
    requires: 'measure',
    transformRecipe: 'agg(measure)>single_value',
    avoid: 'raw_row_value,too_many_cards',
    insightPattern: 'total {measure}',
    requiredEncodings: ['value'],
    allowedTransforms: ['aggregate'],
    bestFor: ['single top-level KPI', 'summary metric with optional delta'],
    antiPatterns: ['more than 4 bigvalue cards per report (use kpigrid)', 'showing a dimension value without a measure'],
    rules: [
      {
        code: 'BIGVALUE_NO_REDUCTION',
        severity: 'warning',
        expression: 'no aggregate transform and encoding.value.aggregate not set',
        message: "bigvalue will show rows[0] raw value. Add encoding.value.aggregate or data.transform aggregate + limit: 1.",
        validate: (chart) => {
          const hasAggTransform = (chart.data?.transform ?? []).some(t => t.type === 'aggregate')
          const hasEncodingAgg = !!chart.encoding?.value?.aggregate
          if (!hasAggTransform && !hasEncodingAgg) {
            const field = chart.encoding?.value?.field ?? 'value'
            return {
              code: 'BIGVALUE_NO_REDUCTION',
              severity: 'warning',
              message: `bigvalue${chart.id ? ` '${chart.id}'` : ''}: no aggregation — will display rows[0].${field} (a raw row value, almost always wrong). Add encoding.value.aggregate (max/sum/avg/min/count) or data.transform: aggregate + limit: 1.`,
              chartId: chart.id
            }
          }
          return null
        }
      }
    ]
  },
]
