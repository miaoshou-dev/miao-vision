import cliPackage from '../../../packages/miao-viz-cli/package.json'
import compatibility from '../../../skills/miao-vision/cli-compatibility.json'

export type HostId = 'codex' | 'claude-code' | 'openclaw' | 'cli'

export interface InstallOption {
  host: HostId
  recommended: boolean
  title: string
  description: string
  commands: string[]
  downloadUrl?: string
  verifyCommand: string
  requiresAgent: boolean
  requiresApproval: boolean
}

export interface ExamplePackage {
  id: string
  title: string
  artifactUrl: string
  sampleDataUrl: string
  prompt: string
  artifactKind: 'report'
  features: string[]
  cliVersion: string
  offline: boolean
  evidencePanel: boolean
}

const cliVersion = cliPackage.version
const releaseUrl = `https://github.com/miaoshou-dev/miao-vision/releases/download/${compatibility.releaseTag}`

export const installManifest = {
  schemaVersion: 1 as const,
  cliVersion,
  requiredCliRange: `>=${compatibility.minimumCliVersion} <${compatibility.maximumCliVersionExclusive}`,
  releaseTag: compatibility.releaseTag,
  releaseUrl,
  hosts: [
    {
      host: 'codex' as const, recommended: true, title: 'Codex Plugin',
      description: '推荐给 Codex 用户。核心产物调用本地 CLI；可选本地 Review Viewer 用于查看进度和 artifact 预览，媒体能力需要 Node.js 22+、ai-cli、Gateway Key 和独立费用。',
      commands: ['下载 miao-vision-plugin.zip，并通过 Codex Plugin 面板安装'],
      downloadUrl: `${releaseUrl}/miao-vision-plugin.zip`, verifyCommand: 'miao-viz --version',
      requiresAgent: true, requiresApproval: true
    },
    {
      host: 'claude-code' as const, recommended: true, title: 'Claude Code Plugin',
      description: '推荐给 Claude Code 用户。核心 Report 保持本地；可选本地 Review Viewer 用于查看进度和 artifact 预览，媒体能力需单独配置并逐次确认费用。',
      commands: ['claude plugin marketplace add miaoshou-dev/miao-vision', 'claude plugin install miao-vision@miao-vision'],
      downloadUrl: `${releaseUrl}/miao-vision-plugin.zip`, verifyCommand: 'miao-viz --version',
      requiresAgent: true, requiresApproval: true
    },
    {
      host: 'openclaw' as const, recommended: true, title: 'OpenClaw Skill',
      description: '推荐给 OpenClaw 用户。安装 Skill，CLI 缺失时按提示授权获取匹配版本。',
      commands: ['下载并安装 miao-vision-skill.zip', 'miao-viz --version'],
      downloadUrl: `${releaseUrl}/miao-vision-skill.zip`, verifyCommand: 'miao-viz --version',
      requiresAgent: true, requiresApproval: true
    },
    {
      host: 'cli' as const, recommended: true, title: 'npx Skill',
      description: '通过 npx 安装兼容 Skill，使用目标 Agent 调用本地执行引擎。',
      commands: ['npx skills add miaoshou-dev/miao-vision -g -a codex -y'],
      verifyCommand: 'miao-viz --version', requiresAgent: true, requiresApproval: true
    }
  ] satisfies InstallOption[],
  example: {
    id: 'sales-report', title: '销售经营 Report', artifactUrl: '/examples/report.html',
    sampleDataUrl: '/examples/sales.csv',
    prompt: '使用 sales.csv 创建销售经营 Report：总结销售额、区域表现和月度趋势，输出自包含 HTML。所有数字必须基于数据证据，并保留证据说明。',
    artifactKind: 'report' as const, features: ['离线可打开', '自包含 HTML', '证据说明'],
    cliVersion, offline: true, evidencePanel: true
  } satisfies ExamplePackage
}

export type InstallManifest = typeof installManifest
