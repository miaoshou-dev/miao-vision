import { exportRuntimeStatus } from '../../../skills/miao-vision/scripts/export-runtime.mjs'
import { accessSync, constants, existsSync } from 'node:fs'
import { dirname, extname, resolve } from 'node:path'
import { agentError } from './errors'
import packageJson from '../package.json'
import type { AgentResult } from './types'

export const diagnosticCodes = [
  'CLI_NOT_FOUND', 'CLI_VERSION_INCOMPATIBLE', 'NODE_VERSION_UNSUPPORTED',
  'HOST_PLUGIN_UNAVAILABLE', 'FILE_NOT_FOUND', 'FILE_PERMISSION_DENIED',
  'OUTPUT_NOT_WRITABLE', 'PDF_DEPENDENCY_MISSING', 'EXPORT_PLAYWRIGHT_MISSING', 'EXPORT_MODULE_LOAD_FAILED', 'EXPORT_BROWSER_MISSING', 'EXPORT_BROWSER_LAUNCH_FAILED'
] as const
export type DiagnosticCode = typeof diagnosticCodes[number]
export type DiagnosticHost = 'codex' | 'claude-code' | 'openclaw' | 'pi' | 'cli' | 'unknown'

export interface DiagnosticResult {
  ok: boolean
  code?: DiagnosticCode
  executable: string
  cliVersion: string
  requiredCliVersion: string
  nodeVersion: string
  host: DiagnosticHost
  input?: { path: string; format?: string; readable: boolean }
  output?: { path: string; writable: boolean }
  exportRuntime?: ReturnType<typeof exportRuntimeStatus>
  checks: Array<{ name: string; ok: boolean; code?: DiagnosticCode }>
  nextActions: Array<{ label: string; command?: string; safeToRetry: boolean }>
}

interface DiagnosticOptions { input?: string; output?: string; host?: string; requirePdf?: boolean; minimumCliVersion?: string }

export function diagnoseEnvironment(options: DiagnosticOptions = {}): AgentResult<DiagnosticResult> {
  const nodeVersion = process.versions.node
  const cliVersion = readCliVersion()
  const minimumCliVersion = options.minimumCliVersion ?? packageJson.version
  const checks: DiagnosticResult['checks'] = []
  const nextActions: DiagnosticResult['nextActions'] = []
  let failure: { code: DiagnosticCode; message: string } | undefined
  const fail = (code: DiagnosticCode, message: string, action: DiagnosticResult['nextActions'][number]) => {
    checks.push({ name: code, ok: false, code })
    if (!failure) failure = { code, message }
    nextActions.push(action)
  }

  const nodeOk = Number(process.versions.node.split('.')[0]) >= 20
  if (!nodeOk) fail('NODE_VERSION_UNSUPPORTED', `Node.js ${nodeVersion} is unsupported; Node.js 20+ is required.`, { label: '升级到 Node.js 20 或更高版本', command: 'node --version', safeToRetry: true })
  else checks.push({ name: 'node', ok: true })

  const executable = resolve(process.argv[1]?.includes('$bunfs') || process.argv[1]?.includes('~BUN') ? process.execPath : process.argv[1] ?? 'miao-viz')
  if (!cliVersion) fail('CLI_NOT_FOUND', 'The current miao-viz executable could not report a version.', { label: '安装匹配版本的 @miao-vision/cli', command: `npm install -g @miao-vision/cli@${minimumCliVersion}`, safeToRetry: true })
  else if (compareVersions(cliVersion, minimumCliVersion) < 0) fail('CLI_VERSION_INCOMPATIBLE', `miao-viz ${cliVersion} is older than required ${minimumCliVersion}.`, { label: '升级 miao-viz CLI', command: `npm install -g @miao-vision/cli@${minimumCliVersion}`, safeToRetry: true })
  else checks.push({ name: 'cli', ok: true })

  const host = normalizeHost(options.host)
  if (host !== 'cli' && host !== 'unknown') {
    const envKey = `${host.toUpperCase().replace('-', '_')}_PLUGIN_AVAILABLE`
    if (process.env[envKey] === 'false') fail('HOST_PLUGIN_UNAVAILABLE', `${host} plugin is not available in this environment.`, { label: `安装或启用 ${host} Plugin`, safeToRetry: true })
    else checks.push({ name: 'host-plugin', ok: true })
  }

  let input: DiagnosticResult['input']
  if (options.input) {
    const path = resolve(options.input)
    const format = extname(path).slice(1).toLowerCase() || undefined
    if (!existsSync(path)) fail('FILE_NOT_FOUND', `Input file does not exist: ${path}`, { label: '检查输入文件路径', safeToRetry: true })
    else {
      try { accessSync(path, constants.R_OK); input = { path, format, readable: true }; checks.push({ name: 'input', ok: true }) }
      catch { input = { path, format, readable: false }; fail('FILE_PERMISSION_DENIED', `Input file is not readable: ${path}`, { label: '检查文件权限或选择可读文件', safeToRetry: true }) }
    }
  }

  const outputPath = resolve(options.output ?? process.cwd())
  try { accessSync(outputPath, constants.W_OK); checks.push({ name: 'output', ok: true }) }
  catch { fail('OUTPUT_NOT_WRITABLE', `Output location is not writable: ${outputPath}`, { label: '选择可写的输出目录', command: `mkdir -p "${dirname(outputPath)}"`, safeToRetry: true }) }
  const output = { path: outputPath, writable: checks.some(check => check.name === 'output' && check.ok) }

  const exportRuntime = options.requirePdf ? exportRuntimeStatus({ host }) : undefined
  if (exportRuntime && !exportRuntime.ok) {
    fail(exportRuntime.code as DiagnosticCode, exportRuntime.message ?? 'Export environment is unavailable',
      { label: 'Run /miao-viewer setup in Pi, or the bundled setup-export.mjs after approval.', safeToRetry: true })
  } else if (exportRuntime) checks.push({ name: 'export-runtime', ok: true })
  if (!failure) nextActions.push({ label: '运行首次 Report 工作流', command: 'miao-viz data analyze <file> --intent "business report"', safeToRetry: true })
  const result: DiagnosticResult = {
    ok: !failure, ...(failure ? { code: failure.code } : {}), executable, cliVersion, requiredCliVersion: minimumCliVersion,
    nodeVersion, host, ...(input ? { input } : {}), output, checks, nextActions, ...(exportRuntime ? { exportRuntime } : {})
  }
  return failure ? agentError(failure.code, failure.message, { ...result }) : { ok: true, value: result }
}

function readCliVersion(): string {
  const match = /^\d+\.\d+\.\d+/.exec(packageJson.version)
  return match?.[0] ?? ''
}
function normalizeHost(value?: string): DiagnosticHost {
  return value === 'codex' || value === 'claude-code' || value === 'openclaw' || value === 'pi' || value === 'cli' ? value : 'unknown'
}
function compareVersions(a: string, b: string): number {
  const left = a.split('.').map(Number), right = b.split('.').map(Number)
  for (let i = 0; i < 3; i += 1) if ((left[i] ?? 0) !== (right[i] ?? 0)) return (left[i] ?? 0) - (right[i] ?? 0)
  return 0
}
