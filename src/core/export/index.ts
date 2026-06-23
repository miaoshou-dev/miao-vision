/**
 * Export Module
 *
 * Provides report export and sharing functionality.
 *
 * @module core/export
 */

// HTML Export
export { exportToHTML, htmlExportService } from './html-exporter'
export type { ExportOptions } from './html-exporter'

// Report Sharing
export {
  shareService,
  shareReport,
  generateShareableHTML,
  isWebShareSupported
} from './share-service'
export type { ShareOptions, ShareResult } from './share-service'

// Static Site Export
export {
  staticSiteExporter,
  generateStaticSite,
  downloadStaticSiteZip,
  generateSelfContainedHTML
} from './static-site-exporter'
export type {
  StaticSiteOptions,
  StaticSiteFile,
  StaticSiteBundle
} from './static-site-exporter'

// Interactive Runtime (for embedded exports)
export {
  generateInteractiveRuntime,
  generateInteractiveStyles
} from './interactive-runtime'

// MVR (MiaoVision Report) Format
export {
  reportPackageService,
  exportToMVR,
  parseMVR,
  importMVR,
  mvrToReport
} from './report-package-service'
export type {
  MVRReport,
  MVRMetadata,
  MVRDataBlock,
  MVRInputConfig,
  MVRExportOptions,
  MVRImportOptions,
  MVRParseResult,
  MVRImportResult,
  MVRColumnMeta
} from './mvr-types'
export { MVR_VERSION, MVR_EXTENSION, MVR_DATA_MARKERS } from './mvr-types'
