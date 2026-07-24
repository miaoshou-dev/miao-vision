export interface PdfExportOptions {
  mode: 'report' | 'deck'
  pageSize?: 'A4' | 'Letter'
  orientation?: 'portrait' | 'landscape'
  margin?: string
  timeout?: number
  keepTemp?: boolean
}

export interface PdfLayoutIssue {
  code: 'PDF_LAYOUT_OVERFLOW' | 'PDF_HORIZONTAL_OVERFLOW' | 'PDF_CONTENT_DENSE'
  elementId?: string
  page?: number
  direction?: string
  message: string
  suggestion: string
}
