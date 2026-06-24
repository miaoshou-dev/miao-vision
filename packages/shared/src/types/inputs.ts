/**
 * Input Component Types
 *
 * Type definitions for interactive input components
 */

// ============================================================================
// Dropdown Input
// ============================================================================

export interface DropdownConfig {
  name: string                  // Input variable name (e.g., 'selected_region')
  data: string                  // SQL result name to use as data source
  value: string                 // Column name for option values
  label?: string                // Column name for option labels (default: same as value)
  title?: string                // Display title above dropdown
  placeholder?: string          // Placeholder text (default: "Select...")
  defaultValue?: string | null  // Default selected value
  multiple?: boolean            // Allow multiple selections (default: false)
}

export interface DropdownOption {
  value: string
  label: string
}

export interface DropdownData {
  config: DropdownConfig
  options: DropdownOption[]
}

// ============================================================================
// Date Range Input
// ============================================================================

export interface DateRangeConfig {
  name: string                  // Input variable name (e.g., 'date_range')
  title?: string                // Display title
  defaultStart?: string         // Default start date (ISO format)
  defaultEnd?: string           // Default end date (ISO format)
  minDate?: string              // Minimum selectable date
  maxDate?: string              // Maximum selectable date
}

export interface DateRangeValue {
  start: Date | null
  end: Date | null
}

// ============================================================================
// Button Group Input
// ============================================================================

export interface ButtonGroupConfig {
  name: string                  // Input variable name
  title?: string                // Display title
  data?: string                 // SQL data source name (alternative to inline options)
  value?: string                // Value column name (if using SQL data)
  label?: string                // Label column name (if using SQL data)
  options?: Array<{             // Inline options (alternative to SQL data)
    value: string
    label: string
  }>
  defaultValue?: string
}

export interface ButtonGroupData {
  config: ButtonGroupConfig
  options: DropdownOption[]  // Reuse DropdownOption type
}

// ============================================================================
// Checkbox Input
// ============================================================================

export interface CheckboxConfig {
  name: string                  // Input variable name
  label: string                 // Checkbox label
  defaultValue?: boolean
}

// ============================================================================
// Slider Input
// ============================================================================

export interface SliderConfig {
  name: string                  // Input variable name
  title?: string                // Display title
  min: number                   // Minimum value
  max: number                   // Maximum value
  step?: number                 // Step size (default: 1)
  defaultValue?: number         // Default value
  showValue?: boolean           // Show current value (default: true)
}

// ============================================================================
// Text Input
// ============================================================================

export interface TextInputConfig {
  name: string                  // Input variable name
  title?: string                // Display title
  placeholder?: string          // Placeholder text
  defaultValue?: string         // Default value
}
