<script lang="ts">
  import { Copy, Check } from '@lucide/svelte'

  let skillUrl = $state('')
  $effect(() => { skillUrl = `${window.location.origin}/SKILL.md` })

  let copied = $state<string | null>(null)

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text).then(() => {
      copied = key
      setTimeout(() => { copied = null }, 2000)
    })
  }

  let cliText = 'npm install -g @miao-vision/cli\nmiao-viz catalog'
  let claudeUrlText = $derived(`Read ${skillUrl} and follow the instructions\nto install or upgrade miao-viz for your AI agent`)
  let claudeZipText = 'curl -L https://github.com/maishou-dev/miao-vision/releases/latest/download/miao-vision-skill.zip -o skill.zip\nmkdir -p ~/.claude/skills && unzip skill.zip -d ~/.claude/skills/'
  let codexUrlText = $derived(`Read ${skillUrl} and follow the instructions\nto install or upgrade miao-viz for your AI agent`)
  let codexZipText = 'curl -L https://github.com/maishou-dev/miao-vision/releases/latest/download/miao-vision-skill.zip -o skill.zip\nmkdir -p ~/.codex/skills && unzip skill.zip -d ~/.codex/skills/'
</script>

<section id="install" class="install-section" aria-labelledby="install-title">
  <div class="section-heading">
    <p class="section-kicker">Install</p>
    <h2 id="install-title">Install the CLI, then give your agent the skill</h2>
  </div>
  <div class="install-grid">
    <article class="install-card">
      <h3>Install the CLI</h3>
      <p>Put miao-viz on PATH so agents can profile, validate, render, and build decks.</p>
      <div class="code-block">
        <button class="copy-btn" onclick={() => copy(cliText, 'cli')} aria-label="Copy">
          {#if copied === 'cli'}<Check size={14} />{:else}<Copy size={14} />{/if}
        </button>
        <pre><code>{cliText}</code></pre>
      </div>
    </article>

    <article class="install-card">
      <h3>Install the Claude skill</h3>
      <p>URL install is instant. ZIP install works offline and ships the reference files locally.</p>
      <div class="install-methods">
        <div class="install-method">
          <span class="method-label">URL install</span>
          <div class="code-block">
            <button class="copy-btn" onclick={() => copy(claudeUrlText, 'claude-url')} aria-label="Copy">
              {#if copied === 'claude-url'}<Check size={14} />{:else}<Copy size={14} />{/if}
            </button>
            <pre><code>Read {skillUrl} and follow the instructions
to install or upgrade miao-viz for your AI agent</code></pre>
          </div>
        </div>
        <div class="install-method">
          <span class="method-label">ZIP install</span>
          <div class="code-block">
            <button class="copy-btn" onclick={() => copy(claudeZipText, 'claude-zip')} aria-label="Copy">
              {#if copied === 'claude-zip'}<Check size={14} />{:else}<Copy size={14} />{/if}
            </button>
            <pre><code>{claudeZipText}</code></pre>
          </div>
        </div>
      </div>
    </article>

    <article class="install-card">
      <h3>Install the Codex skill</h3>
      <p>URL install is instant. ZIP install works offline and ships the reference files locally.</p>
      <div class="install-methods">
        <div class="install-method">
          <span class="method-label">URL install</span>
          <div class="code-block">
            <button class="copy-btn" onclick={() => copy(codexUrlText, 'codex-url')} aria-label="Copy">
              {#if copied === 'codex-url'}<Check size={14} />{:else}<Copy size={14} />{/if}
            </button>
            <pre><code>Read {skillUrl} and follow the instructions
to install or upgrade miao-viz for your AI agent</code></pre>
          </div>
        </div>
        <div class="install-method">
          <span class="method-label">ZIP install</span>
          <div class="code-block">
            <button class="copy-btn" onclick={() => copy(codexZipText, 'codex-zip')} aria-label="Copy">
              {#if copied === 'codex-zip'}<Check size={14} />{:else}<Copy size={14} />{/if}
            </button>
            <pre><code>{codexZipText}</code></pre>
          </div>
        </div>
      </div>
    </article>
  </div>
</section>
