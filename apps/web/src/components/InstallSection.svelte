<script lang="ts">
  import { Check, Copy, Download, ExternalLink } from '@lucide/svelte'
  import { installManifest, type HostId } from '../install-manifest'
import { recordFunnelEvent } from '../funnel-events'

  interface Props { lang?: 'zh' | 'en' }
  let { lang = 'zh' }: Props = $props()

  let selectedHost = $state<HostId>('codex')
  let copied = $state<string | null>(null)
  let copyError = $state<string | null>(null)
  const selected = $derived(installManifest.hosts.find(option => option.host === selectedHost) ?? installManifest.hosts[0])
  const labels = $derived(lang === 'zh' ? {
    kicker: '安装与验证', title: '选择环境，沿一条路径完成安装', intro: `当前兼容版本 v${installManifest.cliVersion} · Node.js 20+ · macOS / Linux / Windows。插件提供 Agent 接口，CLI 负责本地执行，数据不会上传。`, recommended: '推荐路径', installSteps: '安装步骤', verify: '验证安装', verifyCopy: '确认 CLI 版本和绝对路径：', approval: '需要授权：', firstReport: '首次报告', firstCopy: 'Agent 会按分析、编写、验证、渲染完成流程，无需手写 YAML。', release: '下载版本包', stable: '查看稳定版本与校验和', copied: '已复制', fallback: '剪贴板不可用，请选中上方代码复制。'
  } : {
    kicker: 'Install and verify', title: 'Choose an environment and follow one path', intro: `Compatible CLI v${installManifest.cliVersion} · Node.js 20+ · macOS / Linux / Windows. Plugins provide the agent interface, while the CLI runs locally.`, recommended: 'Recommended path', installSteps: 'Install steps', verify: 'Verify installation', verifyCopy: 'Confirm the CLI version and absolute path:', approval: 'Authorization: ', firstReport: 'First report', firstCopy: 'The agent runs analysis, spec, validation, and rendering with no hand-written YAML.', release: 'Download release', stable: 'View stable release and checksum', copied: 'Copied', fallback: 'Clipboard unavailable. Select the code above to copy.'
  })
  const description = $derived(lang === 'zh' ? ({ codex: '推荐给 Codex 用户。插件提供智能代理接口，并按兼容性契约调用本地 CLI。', 'claude-code': '推荐给 Claude Code 用户。安装插件后即可用自然语言驱动本地报告工作流。', openclaw: '推荐给 OpenClaw 用户。安装技能，CLI 缺失时按提示授权获取匹配版本。', cli: '通过 npx 安装兼容 Skill，使用目标 Agent 调用本地执行引擎。' } as Record<HostId, string>)[selected.host] : ({ codex: 'For Codex users. The plugin provides the agent interface and calls the local CLI.', 'claude-code': 'For Claude Code users. Install the plugin to drive local reports with natural language.', openclaw: 'For OpenClaw users. Install the skill and authorize a matching CLI when needed.', cli: 'Install the compatible Skill with npx, then use your target agent to run the local engine.' } as Record<HostId, string>)[selected.host])
  const hostTitle = $derived(lang === 'zh' ? ({ codex: 'Codex 插件', 'claude-code': 'Claude Code 插件', openclaw: 'OpenClaw 技能', cli: 'npx 技能' } as Record<HostId, string>)[selected.host] : selected.title)
  const prompt = $derived(lang === 'zh' ? installManifest.example.prompt : 'Use sales.csv to create a sales report: summarize revenue, regional performance, and monthly trends. Output a self-contained HTML file with evidence for every number.')
  const displayCommands = $derived(lang === 'zh' ? selected.commands : ({
    codex: ['Download miao-vision-plugin.zip, then install it from the Codex Plugin panel'],
    'claude-code': ['claude plugin marketplace add miaoshou-dev/miao-vision', 'claude plugin install miao-vision@miao-vision'],
    openclaw: ['Download and install miao-vision-skill.zip', 'miao-viz --version'],
    cli: ['npx skills add miaoshou-dev/miao-vision -g -a codex -y']
  } as Record<HostId, string[]>)[selected.host])

  async function copy(text: string, key: string): Promise<void> {
    copyError = null
    try {
      if (!navigator.clipboard) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(text)
      copied = key
      window.setTimeout(() => { if (copied === key) copied = null }, 2000)
    } catch { copyError = key }
  }

  function selectHost(host: HostId): void {
    selectedHost = host
    recordFunnelEvent('install_click', host, host === 'cli' ? 'npm' : host === 'openclaw' ? 'skill' : 'plugin')
  }
</script>

<section id="install" class="install-section" aria-labelledby="install-title">
  <div class="section-heading">
    <p class="section-kicker">{labels.kicker}</p>
    <h2 id="install-title">{labels.title}</h2>
    <p class="install-intro">{labels.intro}</p>
  </div>
  <div class="host-tabs" role="tablist" aria-label="安装环境">
    {#each installManifest.hosts as option}
      <button
        type="button"
        id={`install-tab-${option.host}`}
        class:active={selectedHost === option.host}
        role="tab"
        aria-selected={selectedHost === option.host}
        aria-controls="install-option"
        onclick={() => selectHost(option.host)}
      >{lang === 'zh' ? ({ codex: 'Codex 插件', 'claude-code': 'Claude Code 插件', openclaw: 'OpenClaw 技能', cli: 'npx 技能' } as Record<HostId, string>)[option.host] : ({ codex: 'Codex Plugin', 'claude-code': 'Claude Code Plugin', openclaw: 'OpenClaw Skill', cli: 'npx Skill' } as Record<HostId, string>)[option.host]}</button>
    {/each}
  </div>
  {#key selectedHost}
  <div id="install-option" class="install-card install-router" role="tabpanel" aria-labelledby={`install-tab-${selectedHost}`}>
    <div class="install-card-heading">
      <div><p class="install-recommended">{labels.recommended}</p><h3>{hostTitle}</h3></div>
      {#if selected.downloadUrl}<a class="download-link" href={selected.downloadUrl} target="_blank" rel="noopener noreferrer" onclick={() => recordFunnelEvent('install_click', selected.host, selected.host === 'openclaw' ? 'skill' : 'plugin')}><Download size={16} /> {labels.release}</a>{/if}
    </div>
    <p>{description}</p>
    <div class="install-steps-panel">
      <strong>{labels.installSteps}</strong>
        {#each displayCommands as command, index}
          <div class="install-step"><span class="step-badge">{index + 1}</span><div class="code-block">
            <button class="copy-btn" onclick={() => copy(command, `${selected.host}-${index}`)} aria-label={lang === 'zh' ? `复制第 ${index + 1} 条命令` : `Copy command ${index + 1}`}>{#if copied === `${selected.host}-${index}`}<Check size={14} />{:else}<Copy size={14} />{/if}</button>
            <pre><code>{command}</code></pre>
          </div></div>
        {/each}
    </div>
  </div>
  {#if copyError}<p class="copy-fallback" role="status">{labels.fallback}</p>{:else if copied}<p class="copy-success" role="status">{labels.copied}</p>{/if}
  {/key}
  <article class="first-report-panel" id="first-report"><div><p class="section-kicker">{lang === 'zh' ? '首次报告' : 'First report'}</p><h3>{labels.firstReport}</h3><p>{labels.firstCopy}</p></div><div class="prompt-example"><code>{prompt}</code><button class="copy-btn" onclick={() => copy(prompt, 'first-prompt')} aria-label="Copy first report prompt">{#if copied === 'first-prompt'}<Check size={14} />{:else}<Copy size={14} />{/if}</button></div></article>
  <p class="install-footer-link"><a href={installManifest.releaseUrl} target="_blank" rel="noopener noreferrer">{labels.stable} <ExternalLink size={14} /></a></p>
</section>
