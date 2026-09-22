#!/usr/bin/env node
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const read = (file) => JSON.parse(readFileSync(resolve(root, file), 'utf8'))
const cli = read('packages/miao-viz-cli/package.json')
const compatibility = read('skills/miao-vision/cli-compatibility.json')
if (cli.version !== compatibility.recommendedCliVersion) {
  throw new Error(`CLI ${cli.version} does not match recommended ${compatibility.recommendedCliVersion}.`)
}
const releaseUrl = `https://github.com/miaoshou-dev/miao-vision/releases/download/${compatibility.releaseTag}`
const hosts = [
  { host: 'codex', recommended: true, title: 'Codex Plugin', description: '推荐给 Codex 用户。核心产物调用本地 CLI；可选本地 Review Viewer 用于查看进度和 artifact 预览，媒体能力需要 Node.js 22+、ai-cli、Gateway Key 和独立费用。', commands: ['下载 miao-vision-plugin.zip，并通过 Codex Plugin 面板安装'], downloadUrl: `${releaseUrl}/miao-vision-plugin.zip`, verifyCommand: 'miao-viz --version', requiresAgent: true, requiresApproval: true },
  { host: 'claude-code', recommended: true, title: 'Claude Code Plugin', description: '推荐给 Claude Code 用户。核心 Report 保持本地；可选本地 Review Viewer 用于查看进度和 artifact 预览，媒体能力需单独配置并逐次确认费用。', commands: ['claude plugin marketplace add miaoshou-dev/miao-vision', 'claude plugin install miao-vision@miao-vision'], downloadUrl: `${releaseUrl}/miao-vision-plugin.zip`, verifyCommand: 'miao-viz --version', requiresAgent: true, requiresApproval: true },
  { host: 'openclaw', recommended: true, title: 'OpenClaw Skill', commands: ['下载并安装 miao-vision-skill.zip', 'miao-viz --version'], downloadUrl: `${releaseUrl}/miao-vision-skill.zip`, verifyCommand: 'miao-viz --version', requiresAgent: true, requiresApproval: true },
  { host: 'cli', recommended: true, title: 'npx Skill', commands: ['npx skills add miaoshou-dev/miao-vision -g -a codex -y'], verifyCommand: 'miao-viz --version', requiresAgent: true, requiresApproval: true }
]
const manifest = {
  schemaVersion: 1, cliVersion: cli.version,
  requiredCliRange: `>=${compatibility.minimumCliVersion} <${compatibility.maximumCliVersionExclusive}`,
  releaseTag: compatibility.releaseTag, releaseUrl, hosts,
  example: { id: 'sales-report', artifactUrl: '/examples/report.html', sampleDataUrl: '/examples/sales.csv', cliVersion: cli.version }
}
const output = resolve(root, 'apps/web/public/install-manifest.json')
mkdirSync(resolve(root, 'apps/web/public'), { recursive: true })
writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`)
console.log(`Generated ${output}`)
