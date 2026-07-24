<script lang="ts">
  import { Copy, Check } from '@lucide/svelte'

  let copied = $state<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      copied = key
      setTimeout(() => { copied = null }, 2000)
    })
  }

  let npmText = 'npm install -g @miao-vision/cli'
  let npxText = 'npx skills add miaoshou-dev/miao-vision -g -a codex -y\n# Claude Code: replace codex with claude-code'
  let claudeZipText = 'curl -L https://github.com/miaoshou-dev/miao-vision/releases/latest/download/miao-vision-skill.zip -o skill.zip\nmkdir -p ~/.claude/skills && unzip skill.zip -d ~/.claude/skills/'
  let codexZipText = 'curl -L https://github.com/miaoshou-dev/miao-vision/releases/latest/download/miao-vision-skill.zip -o skill.zip\nmkdir -p ~/.codex/skills && unzip skill.zip -d ~/.codex/skills/'
  let promptExamples = [
    'Analyze this sales spreadsheet and create an HTML report with key metrics and charts.',
    'Export this report as a printable A4 PDF.',
    'Use this week’s new data to update last week’s report with the same metrics and layout.'
  ]
</script>

<section id="install" class="install-section" aria-labelledby="install-title">
  <div class="section-heading">
    <p class="section-kicker">Install</p>
    <h2 id="install-title">Install the CLI, then give your agent the skill</h2>
  </div>
  <div class="install-grid">
    <article class="install-card">
      <h3>Quick Install &mdash; Codex / Claude</h3>
      <p>One-line CLI install plus an explicit global skill target. Naming the agent avoids selecting project-only targets such as PromptScript.</p>
      <div class="install-steps">
        <div class="install-step">
          <span class="step-badge">1</span>
          <div class="code-block">
            <button class="copy-btn" onclick={() => copy(npmText, 'npm')} aria-label="Copy">
              {#if copied === 'npm'}<Check size={14} />{:else}<Copy size={14} />{/if}
            </button>
            <pre><code>{npmText}</code></pre>
          </div>
        </div>
        <div class="install-step">
          <span class="step-badge">2</span>
          <div class="code-block">
            <button class="copy-btn" onclick={() => copy(npxText, 'npx')} aria-label="Copy">
              {#if copied === 'npx'}<Check size={14} />{:else}<Copy size={14} />{/if}
            </button>
            <pre><code>{npxText}</code></pre>
          </div>
        </div>
      </div>
    </article>

    <article class="install-card">
      <h3>For Claude</h3>
      <p>Offline ZIP install. Ships the skill file and reference docs directly to <code>~/.claude/skills/</code>.</p>
      <div class="code-block">
        <button class="copy-btn" onclick={() => copy(claudeZipText, 'claude-zip')} aria-label="Copy">
          {#if copied === 'claude-zip'}<Check size={14} />{:else}<Copy size={14} />{/if}
        </button>
        <pre><code>{claudeZipText}</code></pre>
      </div>
    </article>

    <article class="install-card">
      <h3>For Codex</h3>
      <p>Offline ZIP install. Ships the skill file and reference docs directly to <code>~/.codex/skills/</code>.</p>
      <div class="code-block">
        <button class="copy-btn" onclick={() => copy(codexZipText, 'codex-zip')} aria-label="Copy">
          {#if copied === 'codex-zip'}<Check size={14} />{:else}<Copy size={14} />{/if}
        </button>
        <pre><code>{codexZipText}</code></pre>
      </div>
    </article>
  </div>
  <div class="try-panel">
    <div class="try-panel-copy">
      <p class="section-kicker">Try it</p>
      <h3>Attach your file, then ask naturally</h3>
      <p>No CLI commands needed. Copy a prompt into Codex or Claude and let the skill handle the workflow.</p>
    </div>
    <div class="prompt-examples">
      {#each promptExamples as prompt, index}
        <div class="prompt-example">
          <span>{prompt}</span>
          <button class="copy-btn" onclick={() => copy(prompt, `prompt-${index}`)} aria-label={`Copy example ${index + 1}`}>
            {#if copied === `prompt-${index}`}<Check size={14} />{:else}<Copy size={14} />{/if}
          </button>
        </div>
      {/each}
    </div>
  </div>
</section>
