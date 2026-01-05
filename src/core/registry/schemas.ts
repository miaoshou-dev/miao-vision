/**
 * Component Configuration Schemas
 *
 * Pre-defined schemas for all component types.
 * These schemas drive the ConfigParser to validate and parse component configurations.
 */

import type { ConfigSchema } from './config-parser'

/**
 * Dropdown component schema
 *
 * Example:
 * ```dropdown
 * name: category_filter
 * data: categories_query
 * value: category_id
 * label: category_name
 * defaultValue: all
 * ```
 */
export const DropdownSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'data', type: 'string', required: true },
    { name: 'value', type: 'string', required: true },
    { name: 'label', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'defaultValue', type: 'string' }
  ]
}

/**
 * ButtonGroup component schema
 *
 * Example with static options:
 * ```buttongroup
 * name: time_range
 * defaultValue: 7d
 * options:
 *   - 1d: Last Day
 *   - 7d: Last Week
 *   - 30d: Last Month
 * ```
 *
 * Example with dynamic data:
 * ```buttongroup
 * name: region_filter
 * data: regions_query
 * value: region_code
 * label: region_name
 * ```
 */
export const ButtonGroupSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'data', type: 'string' },
    { name: 'value', type: 'string' },
    { name: 'label', type: 'string' },
    { name: 'defaultValue', type: 'string' },
    { name: 'title', type: 'string' }
  ],
  sections: [
    {
      name: 'options',
      itemFields: [
        { name: 'value', type: 'string', required: true },
        { name: 'label', type: 'string' }
      ]
    }
  ]
}

/**
 * BigValue component schema
 *
 * Example:
 * ```bigvalue
 * query: total_sales
 * value: sum_amount
 * title: Total Revenue
 * format: currency
 * comparison: last_month_sales
 * comparisonLabel: vs last month
 * ```
 */
export const BigValueSchema: ConfigSchema = {
  fields: [
    { name: 'query', type: 'string', required: true },
    { name: 'value', type: 'string', required: true },
    { name: 'title', type: 'string' },
    {
      name: 'format',
      type: 'enum',
      enum: ['number', 'currency', 'percent'],
      default: 'number'
    },
    { name: 'comparison', type: 'string' },
    { name: 'comparisonLabel', type: 'string' },
    { name: 'color', type: 'string' },
    { name: 'palette', type: 'string' }
  ]
}

/**
 * Value component schema
 *
 * Example:
 * ```value
 * query: metrics
 * column: active_users
 * format: number
 * prefix: $
 * suffix: USD
 * ```
 */
export const ValueSchema: ConfigSchema = {
  fields: [
    { name: 'query', type: 'string', required: true },
    { name: 'column', type: 'string', required: true },
    { name: 'row', type: 'number', default: 0 },
    { name: 'format', type: 'enum', enum: ['number', 'currency', 'percent', 'date', 'text'] },
    { name: 'prefix', type: 'string' },
    { name: 'suffix', type: 'string' },
    { name: 'placeholder', type: 'string', default: '-' }
  ]
}

/**
 * DataTable component schema
 *
 * Example:
 * ```datatable
 * query: sales_data
 * searchable: true
 * sortable: true
 * exportable: true
 * rowHeight: 36
 * maxHeight: 600
 * columns:
 *   - name: order_id
 *     label: Order ID
 *     align: left
 *   - name: amount
 *     label: Amount
 *     format: currency
 *     align: right
 *   - name: created_at
 *     label: Date
 *     format: date
 * ```
 */
export const DataTableSchema: ConfigSchema = {
  fields: [
    { name: 'query', type: 'string', required: true },
    { name: 'searchable', type: 'boolean', default: true },
    { name: 'sortable', type: 'boolean', default: true },
    { name: 'exportable', type: 'boolean', default: true },
    { name: 'paginate', type: 'boolean', default: true },
    { name: 'pageSize', type: 'number', default: 10 },
    { name: 'rowHeight', type: 'number', default: 36 },
    { name: 'maxHeight', type: 'number', default: 600 },
    { name: 'columnSelector', type: 'boolean', default: false },
    { name: 'filterable', type: 'boolean', default: false },
    { name: 'summaryRow', type: 'boolean', default: false },
    { name: 'selectable', type: 'boolean', default: false },
    // NEW: Advanced features
    { name: 'resizableColumns', type: 'boolean', default: false },
    { name: 'groupBy', type: 'string' },
    { name: 'showSubtotals', type: 'boolean', default: false },
    { name: 'groupCollapsible', type: 'boolean', default: true }
  ],
  sections: [
    {
      name: 'columns',
      itemFields: [
        { name: 'name', type: 'string', required: true },
        { name: 'label', type: 'string' },
        {
          name: 'format',
          type: 'enum',
          enum: ['number', 'currency', 'percent', 'date', 'text']
        },
        { name: 'align', type: 'enum', enum: ['left', 'right', 'center'] },
        { name: 'width', type: 'string' },
        { name: 'visible', type: 'boolean', default: true },
        { name: 'resizable', type: 'boolean', default: true },
        { name: 'summary', type: 'enum', enum: ['sum', 'avg', 'count', 'min', 'max', 'none'], default: 'none' },
        // NEW: Advanced column features
        { name: 'contentType', type: 'enum', enum: ['text', 'image', 'html'], default: 'text' },
        { name: 'frozen', type: 'string' }
        // Note: imageConfig is a nested object handled by YAML parser, not declared here
      ]
    }
  ]
}

/**
 * Alert component schema
 *
 * Example:
 * ```alert
 * type: warning
 * title: Important Notice
 * ```
 * This is the alert message content.
 */
export const AlertSchema: ConfigSchema = {
  fields: [
    {
      name: 'type',
      type: 'enum',
      enum: ['info', 'success', 'warning', 'error'],
      default: 'info'
    },
    { name: 'title', type: 'string' }
  ]
}

/**
 * Slider input schema
 *
 * Example:
 * ```slider
 * name: price_range
 * title: Maximum Price
 * min: 0
 * max: 1000
 * step: 10
 * defaultValue: 500
 * format: currency
 * ```
 */
export const SliderSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'min', type: 'number', default: 0 },
    { name: 'max', type: 'number', default: 100 },
    { name: 'step', type: 'number', default: 1 },
    { name: 'defaultValue', type: 'number' },
    { name: 'showValue', type: 'boolean', default: true },
    { name: 'showMinMax', type: 'boolean', default: true },
    { name: 'format', type: 'enum', enum: ['number', 'currency', 'percent'], default: 'number' }
  ]
}

/**
 * Checkbox input schema
 *
 * Example:
 * ```checkbox
 * name: include_inactive
 * label: Include inactive items
 * defaultValue: false
 * ```
 */
export const CheckboxSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'label', type: 'string' },
    { name: 'defaultValue', type: 'boolean', default: false }
  ]
}

/**
 * TextInput schema
 *
 * Example:
 * ```textinput
 * name: search_query
 * title: Search Products
 * placeholder: Search...
 * debounce: 300
 * ```
 */
export const TextInputSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'placeholder', type: 'string' },
    { name: 'defaultValue', type: 'string', default: '' },
    { name: 'debounce', type: 'number', default: 300 },
    { name: 'minLength', type: 'number', default: 0 },
    { name: 'maxLength', type: 'number' },
    { name: 'inputType', type: 'enum', enum: ['text', 'search', 'email', 'url', 'tel'], default: 'text' }
  ]
}

/**
 * DateRange input schema
 *
 * Example:
 * ```daterange
 * name: date_filter
 * title: Select Date Range
 * startDefault: 2024-01-01
 * endDefault: 2024-12-31
 * presets: true
 * ```
 */
export const DateRangeSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'startDefault', type: 'string' },
    { name: 'endDefault', type: 'string' },
    { name: 'minDate', type: 'string' },
    { name: 'maxDate', type: 'string' },
    { name: 'presets', type: 'boolean', default: false }
  ]
}

/**
 * Chart component schema (generic)
 *
 * Example:
 * ```chart
 * data: sales_by_month
 * x: month
 * y: revenue
 * type: line
 * ```
 */
export const ChartSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'x', type: 'string', required: true },
    { name: 'y', type: 'string', required: true },
    {
      name: 'type',
      type: 'enum',
      enum: ['line', 'bar', 'area', 'scatter', 'pie'],
      default: 'line'
    },
    { name: 'color', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'xLabel', type: 'string' },
    { name: 'yLabel', type: 'string' }
  ]
}

/**
 * DimensionGrid input schema
 *
 * Example:
 * ```dimensiongrid
 * name: selected_category
 * title: Select Category
 * columns: 4
 * multiple: false
 * showCounts: true
 * items:
 *   - label: Sales
 *     value: sales
 *     icon: 💰
 *     count: 1250
 * ```
 */
export const DimensionGridSchema: ConfigSchema = {
  fields: [
    { name: 'name', type: 'string', required: true },
    { name: 'title', type: 'string' },
    { name: 'columns', type: 'number', default: 4 },
    { name: 'multiple', type: 'boolean', default: false },
    { name: 'showCounts', type: 'boolean', default: false },
    { name: 'defaultValue', type: 'string' },
    { name: 'gap', type: 'string', default: '0.75rem' }
  ],
  sections: [
    {
      name: 'items',
      itemFields: [
        { name: 'label', type: 'string', required: true },
        { name: 'value', type: 'string', required: true },
        { name: 'icon', type: 'string' },
        { name: 'count', type: 'number' },
        { name: 'color', type: 'string' }
      ]
    }
  ]
}

/**
 * Delta component schema
 *
 * Example:
 * ```delta
 * data: revenue_comparison
 * column: current
 * comparison: previous
 * format: percent
 * positiveIsGood: true
 * ```
 */
export const DeltaSchema: ConfigSchema = {
  fields: [
    { name: 'data', type: 'string', required: true },
    { name: 'column', type: 'string', required: true },
    { name: 'comparison', type: 'string' },
    { name: 'row', type: 'number', default: 0 },
    { name: 'comparisonRow', type: 'number' },
    { name: 'format', type: 'enum', enum: ['absolute', 'percent'], default: 'percent' },
    { name: 'decimals', type: 'number', default: 1 },
    { name: 'showSymbol', type: 'boolean', default: true },
    { name: 'showArrow', type: 'boolean', default: true },
    { name: 'positiveIsGood', type: 'boolean', default: true },
    { name: 'chip', type: 'boolean', default: false },
    { name: 'prefix', type: 'string' },
    { name: 'suffix', type: 'string' },
    { name: 'neutralText', type: 'string', default: '—' }
  ]
}

/**
 * AreaMap (Choropleth) component schema
 *
 * Example:
 * ```areamap
 * query: sales_by_state
 * areaId: state_code
 * value: total_sales
 * areaName: state_name
 * geoJson: /data/us-states.geojson
 * geoJsonKey: STATE
 * title: Sales by State
 * colorScheme: Blues
 * colorBuckets: 5
 * format: currency
 * height: 500
 * ```
 */
export const AreaMapSchema: ConfigSchema = {
  fields: [
    { name: 'query', type: 'string', required: true },
    { name: 'areaId', type: 'string', required: true },
    { name: 'value', type: 'string', required: true },
    { name: 'geoJson', type: 'string', required: true },
    { name: 'areaName', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'geoJsonKey', type: 'string', default: 'id' },
    {
      name: 'colorScale',
      type: 'enum',
      enum: ['sequential', 'diverging', 'categorical'],
      default: 'sequential'
    },
    { name: 'colorScheme', type: 'string', default: 'Blues' },
    { name: 'colorBuckets', type: 'number', default: 5 },
    { name: 'colors', type: 'array' },
    {
      name: 'format',
      type: 'enum',
      enum: ['number', 'currency', 'percent', 'compact'],
      default: 'number'
    },
    { name: 'height', type: 'number', default: 500 },
    { name: 'showLegend', type: 'boolean', default: true },
    {
      name: 'legendPosition',
      type: 'enum',
      enum: ['topright', 'topleft', 'bottomright', 'bottomleft'],
      default: 'topright'
    },
    { name: 'showTooltip', type: 'boolean', default: true },
    { name: 'tooltipTemplate', type: 'string', default: '{areaName}: {formatted}' },
    { name: 'tilesUrl', type: 'string' },
    { name: 'attribution', type: 'string' }
  ]
}

/**
 * PointMap component schema
 *
 * Example:
 * ```pointmap
 * query: store_locations
 * latitude: lat
 * longitude: lon
 * name: store_name
 * title: Store Locations
 * markerColor: blue
 * height: 600
 * ```
 */
export const PointMapSchema: ConfigSchema = {
  fields: [
    { name: 'query', type: 'string', required: true },
    { name: 'latitude', type: 'string', required: true },
    { name: 'longitude', type: 'string', required: true },
    { name: 'name', type: 'string' },
    { name: 'value', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'color', type: 'string' },
    { name: 'icon', type: 'string' },
    {
      name: 'markerColor',
      type: 'enum',
      enum: ['blue', 'red', 'green', 'orange', 'yellow', 'violet', 'grey', 'black'],
      default: 'blue'
    },
    {
      name: 'markerSize',
      type: 'enum',
      enum: ['small', 'medium', 'large'],
      default: 'medium'
    },
    { name: 'height', type: 'number', default: 500 },
    { name: 'zoom', type: 'number', default: 10 },
    { name: 'center', type: 'array' },
    { name: 'cluster', type: 'boolean', default: false },
    { name: 'clusterRadius', type: 'number', default: 80 },
    { name: 'showTooltip', type: 'boolean', default: true },
    { name: 'tooltipTemplate', type: 'string' },
    { name: 'tilesUrl', type: 'string' },
    { name: 'attribution', type: 'string' }
  ]
}

/**
 * BubbleMap component schema
 *
 * Example:
 * ```bubblemap
 * query: sales_by_city
 * latitude: lat
 * longitude: lon
 * size: total_sales
 * name: city_name
 * title: Sales by City
 * ```
 */
export const BubbleMapSchema: ConfigSchema = {
  fields: [
    { name: 'query', type: 'string', required: true },
    { name: 'latitude', type: 'string', required: true },
    { name: 'longitude', type: 'string', required: true },
    { name: 'size', type: 'string', required: true },
    { name: 'name', type: 'string' },
    { name: 'color', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'minSize', type: 'number', default: 5 },
    { name: 'maxSize', type: 'number', default: 30 },
    { name: 'fillOpacity', type: 'number', default: 0.6 },
    { name: 'strokeColor', type: 'string', default: '#ffffff' },
    { name: 'strokeWidth', type: 'number', default: 2 },
    { name: 'colorScheme', type: 'string', default: '#4287f5' },
    { name: 'height', type: 'number', default: 500 },
    { name: 'zoom', type: 'number', default: 10 },
    { name: 'center', type: 'array' },
    { name: 'showTooltip', type: 'boolean', default: true },
    { name: 'tooltipTemplate', type: 'string' },
    { name: 'tilesUrl', type: 'string' },
    { name: 'attribution', type: 'string' }
  ]
}

/**
 * Image component schema
 *
 * Example:
 * ```image
 * src: /images/logo.png
 * alt: Company Logo
 * width: 200
 * align: center
 * ```
 */
export const ImageSchema: ConfigSchema = {
  fields: [
    { name: 'src', type: 'string', required: true },
    { name: 'alt', type: 'string' },
    { name: 'title', type: 'string' },
    { name: 'caption', type: 'string' },
    { name: 'width', type: 'string' },
    { name: 'height', type: 'string' },
    { name: 'link', type: 'string' },
    {
      name: 'align',
      type: 'enum',
      enum: ['left', 'center', 'right'],
      default: 'center'
    },
    {
      name: 'fit',
      type: 'enum',
      enum: ['contain', 'cover', 'fill', 'scale-down'],
      default: 'contain'
    },
    { name: 'rounded', type: 'boolean', default: false },
    { name: 'shadow', type: 'boolean', default: false }
  ]
}

/**
 * Schema registry - maps component types to their schemas
 */
export const SchemaRegistry: Record<string, ConfigSchema> = {
  dropdown: DropdownSchema,
  buttongroup: ButtonGroupSchema,
  bigvalue: BigValueSchema,
  value: ValueSchema,
  delta: DeltaSchema,
  datatable: DataTableSchema,
  alert: AlertSchema,
  slider: SliderSchema,
  checkbox: CheckboxSchema,
  textinput: TextInputSchema,
  daterange: DateRangeSchema,
  chart: ChartSchema,
  dimensiongrid: DimensionGridSchema,
  areamap: AreaMapSchema,
  pointmap: PointMapSchema,
  bubblemap: BubbleMapSchema,
  image: ImageSchema
}

/**
 * Get schema by component type
 */
export function getSchema(componentType: string): ConfigSchema | undefined {
  return SchemaRegistry[componentType.toLowerCase()]
}

/**
 * Check if a schema exists for a component type
 */
export function hasSchema(componentType: string): boolean {
  return componentType.toLowerCase() in SchemaRegistry
}
