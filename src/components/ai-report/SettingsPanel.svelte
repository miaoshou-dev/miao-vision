<script lang="ts">
  interface Props {
    apiKey: string
    onSave: (apiKey: string) => void
    onCancel: () => void
  }

  let { apiKey, onSave, onCancel }: Props = $props()

  let apiKeyInput = $state(apiKey)
</script>

<div class="settings-panel">
  <div class="settings-header">
    <h3>API Settings</h3>
    <span class="settings-hint">Configure your DeepSeek API key to use AI features</span>
  </div>
  <div class="settings-form">
    <label class="settings-label" for="api-key-input">DeepSeek API Key</label>
    <input
      id="api-key-input"
      type="password"
      class="settings-input"
      placeholder="sk-..."
      bind:value={apiKeyInput}
    />
    <div class="settings-actions">
      <button class="btn btn-secondary" onclick={onCancel}>Cancel</button>
      <button class="btn btn-primary" onclick={() => onSave(apiKeyInput)} disabled={!apiKeyInput.trim()}>Save</button>
    </div>
    <p class="settings-note">
      Get your API key from <a href="https://platform.deepseek.com" target="_blank" rel="noopener noreferrer">platform.deepseek.com</a>
    </p>
  </div>
</div>

<style>
  .settings-panel {
    padding: 24px;
    flex: 1;
  }

  .settings-header {
    margin-bottom: 20px;
  }

  .settings-header h3 {
    margin: 0 0 4px;
    font-size: 16px;
    font-weight: 600;
    color: #e0e0e0;
  }

  .settings-hint {
    font-size: 13px;
    color: #9ca3af;
  }

  .settings-form {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .settings-label {
    font-size: 13px;
    font-weight: 500;
    color: #e0e0e0;
  }

  .settings-input {
    width: 100%;
    padding: 10px 12px;
    background: #1e1e1e;
    border: 1px solid #333;
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 14px;
    transition: border-color 0.2s;
  }

  .settings-input:focus {
    outline: none;
    border-color: #60a5fa;
  }

  .settings-input::placeholder {
    color: #6b7280;
  }

  .settings-actions {
    display: flex;
    justify-content: flex-end;
    gap: 8px;
    margin-top: 8px;
  }

  .settings-note {
    margin: 8px 0 0;
    font-size: 12px;
    color: #6b7280;
  }

  .settings-note a {
    color: #60a5fa;
    text-decoration: none;
  }

  .settings-note a:hover {
    text-decoration: underline;
  }

  .btn {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-secondary {
    background: #333;
    color: #e0e0e0;
  }

  .btn-secondary:hover {
    background: #404040;
  }

  .btn-primary {
    background: linear-gradient(135deg, #60a5fa, #a78bfa);
    color: white;
  }

  .btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(96, 165, 250, 0.3);
  }

  .btn-primary:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
</style>
