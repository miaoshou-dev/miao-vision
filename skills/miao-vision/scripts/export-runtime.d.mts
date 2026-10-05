import type { Browser, BrowserType } from 'playwright-core'
export interface RuntimeOptions { env?: NodeJS.ProcessEnv; cwd?: string; home?: string; host?: string; hostRoot?: string }
export interface RuntimeStatus { ok: boolean; code?: string; message?: string; source?: string; root?: string; version?: string; browserPath?: string }
export class ExportRuntimeError extends Error { result: { ok: false; code: string; message: string; [key: string]: unknown }; constructor(code: string, message: string, details?: Record<string, unknown>) }
export const playwrightVersion: string
export function exportRoots(options?: RuntimeOptions): Array<{ root: string; source: string }>
export function resolvePlaywright(options?: RuntimeOptions): { root: string; source: string; module: { chromium: BrowserType<Browser> }; name: string; version: string; entry: string; cli: string }
export function exportRuntimeStatus(options?: RuntimeOptions): RuntimeStatus
export function launchExportBrowser(options?: RuntimeOptions): Promise<Browser>
