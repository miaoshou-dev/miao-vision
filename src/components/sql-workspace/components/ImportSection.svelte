<script lang="ts">
  /**
   * Import Section Component
   *
   * File drop zone for uploading CSV, Parquet, JSON files.
   */
  import { SUPPORTED_FILE_EXTENSIONS } from '../logic/data-explorer'

  interface Props {
    isUploading: boolean
    uploadError: string | null
    onUpload: (files: FileList) => Promise<void>
  }

  let { isUploading, uploadError, onUpload }: Props = $props()

  let fileInput: HTMLInputElement
  let dragOver = $state(false)

  function openFileDialog() {
    fileInput?.click()
  }

  async function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement
    if (target.files && target.files.length > 0) {
      await onUpload(target.files)
    }
  }

  async function handleDrop(event: DragEvent) {
    event.preventDefault()
    dragOver = false
    if (event.dataTransfer?.files && event.dataTransfer.files.length > 0) {
      await onUpload(event.dataTransfer.files)
    }
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault()
    dragOver = true
  }

  function handleDragLeave() {
    dragOver = false
  }
</script>

<div class="import-section">
  <div
    class="drop-zone"
    class:drag-over={dragOver}
    class:uploading={isUploading}
    ondrop={handleDrop}
    ondragover={handleDragOver}
    ondragleave={handleDragLeave}
    onclick={openFileDialog}
    onkeydown={(e) => e.key === 'Enter' && openFileDialog()}
    role="button"
    tabindex="0"
  >
    {#if isUploading}
      <span class="upload-status">Uploading...</span>
    {:else}
      <span class="drop-icon">+</span>
      <span class="drop-text">Import Data</span>
    {/if}
  </div>
  <div class="file-hint">{SUPPORTED_FILE_EXTENSIONS.map(e => e.toUpperCase()).join(', ')}</div>

  <input
    bind:this={fileInput}
    type="file"
    accept={SUPPORTED_FILE_EXTENSIONS.map(e => `.${e}`).join(',')}
    multiple
    onchange={handleFileSelect}
    style="display: none;"
  />

  {#if uploadError}
    <div class="upload-error">{uploadError}</div>
  {/if}
</div>

<style>
  .import-section {
    padding: 0.75rem;
    border-bottom: 1px solid #1F2937;
  }

  .drop-zone {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 0.75rem;
    background: #1F2937;
    border: 1px dashed #374151;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .drop-zone:hover {
    border-color: #4285F4;
    background: rgba(66, 133, 244, 0.1);
  }

  .drop-zone.drag-over {
    border-color: #4285F4;
    background: rgba(66, 133, 244, 0.15);
    border-style: solid;
  }

  .drop-zone.uploading {
    opacity: 0.7;
    cursor: wait;
  }

  .drop-icon {
    font-size: 1rem;
    font-weight: 600;
    color: #4285F4;
  }

  .drop-text {
    font-size: 0.8125rem;
    font-weight: 500;
    color: #E5E7EB;
  }

  .upload-status {
    font-size: 0.8125rem;
    color: #9CA3AF;
  }

  .file-hint {
    margin-top: 0.375rem;
    text-align: center;
    font-size: 0.6875rem;
    color: #6B7280;
  }

  .upload-error {
    margin-top: 0.5rem;
    padding: 0.5rem;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    border-radius: 6px;
    font-size: 0.75rem;
    color: #FCA5A5;
  }
</style>
