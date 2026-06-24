<script lang="ts">
  let skillUrl = $state('')
  $effect(() => { skillUrl = `${window.location.origin}/SKILL.md` })
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
      <pre><code>npm install -g @miao-vision/cli
miao-viz catalog</code></pre>
    </article>

    <article class="install-card">
      <h3>Install the Claude skill</h3>
      <p>URL install is instant. ZIP install works offline and ships the reference files locally.</p>
      <div class="install-methods">
        <div class="install-method">
          <span class="method-label">URL install</span>
          <pre><code>Read {skillUrl} and follow the instructions
to install or upgrade miao-viz for your AI agent</code></pre>
        </div>
        <div class="install-method">
          <span class="method-label">ZIP install</span>
          <pre><code>curl -L https://github.com/maishou-dev/miao-vision/releases/latest/download/miao-vision-skill.zip -o skill.zip
mkdir -p ~/.claude/skills && unzip skill.zip -d ~/.claude/skills/</code></pre>
        </div>
      </div>
    </article>

    <article class="install-card">
      <h3>Install the Codex skill</h3>
      <p>URL install is instant. ZIP install works offline and ships the reference files locally.</p>
      <div class="install-methods">
        <div class="install-method">
          <span class="method-label">URL install</span>
          <pre><code>Read {skillUrl} and follow the instructions
to install or upgrade miao-viz for your AI agent</code></pre>
        </div>
        <div class="install-method">
          <span class="method-label">ZIP install</span>
          <pre><code>curl -L https://github.com/maishou-dev/miao-vision/releases/latest/download/miao-vision-skill.zip -o skill.zip
mkdir -p ~/.codex/skills && unzip skill.zip -d ~/.codex/skills/</code></pre>
        </div>
      </div>
    </article>
  </div>
</section>
