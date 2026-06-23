<script lang="ts">
  interface Props {
    value?: string
    onChange?: (value: string, reportId: string) => void
    readOnly?: boolean
    height?: string
    reportId?: string
  }

  let {
    value = '',
    onChange,
    readOnly = false,
    height = '600px',
    reportId = ''
  }: Props = $props()

  let textarea: HTMLTextAreaElement
  let localValue = $state('')
  let lastKnownReportId = $state('')

  $effect(() => {
    if (reportId !== lastKnownReportId || value !== localValue) {
      localValue = value
      lastKnownReportId = reportId
    }
  })

  function handleInput() {
    localValue = textarea.value

    onChange?.(localValue, lastKnownReportId)
  }

  function insertAtSelection(text: string) {
    if (!textarea) return

    const start = textarea.selectionStart ?? localValue.length
    const end = textarea.selectionEnd ?? start
    localValue = `${localValue.slice(0, start)}${text}${localValue.slice(end)}`
    onChange?.(localValue, lastKnownReportId)

    queueMicrotask(() => {
      textarea.focus()
      const cursor = start + text.length
      textarea.setSelectionRange(cursor, cursor)
    })
  }

  export function insertText(text: string) {
    insertAtSelection(text)
  }

  export function insertSQLBlock(name?: string) {
    const sqlBlock = name
      ? `\n\`\`\`sql ${name}\nSELECT * FROM your_table LIMIT 10\n\`\`\`\n`
      : `\n\`\`\`sql\nSELECT * FROM your_table LIMIT 10\n\`\`\`\n`
    insertText(sqlBlock)
  }

  export function insertChartBlock() {
    const chartBlock = `\n\`\`\`chart
type: bar
data: query_result
x: column_x
y: column_y
title: Your Chart Title
\`\`\`\n`
    insertText(chartBlock)
  }

  export function insertVariable(name: string) {
    insertText(`{${name}}`)
  }

  export function getCursorPosition() {
    if (!textarea) return null

    const textBeforeCursor = localValue.slice(0, textarea.selectionStart)
    const lines = textBeforeCursor.split('\n')

    return {
      lineNumber: lines.length,
      column: lines[lines.length - 1].length + 1
    }
  }

  export function formatDocument() {
    const formatted = localValue
      .split('\n')
      .map(line => line.trimEnd())
      .join('\n')

    if (formatted !== localValue) {
      localValue = formatted
      onChange?.(localValue, lastKnownReportId)
    }
  }
</script>

<div class="markdown-editor" style="height: {height}">
  <textarea
    bind:this={textarea}
    bind:value={localValue}
    class="editor-textarea"
    spellcheck="false"
    {readOnly}
    oninput={handleInput}
  ></textarea>
</div>

<style>
  .markdown-editor {
    width: 100%;
    min-height: 12rem;
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    overflow: hidden;
    background-color: #1E1E1E;
  }

  .editor-textarea {
    width: 100%;
    height: 100%;
    display: block;
    padding: 1rem;
    resize: none;
    border: 0;
    outline: 0;
    background: #1E1E1E;
    color: #D4D4D4;
    font-family: 'JetBrains Mono', Monaco, Consolas, 'Courier New', monospace;
    font-size: 0.875rem;
    line-height: 1.6;
    tab-size: 2;
  }

  .editor-textarea:read-only {
    color: #9CA3AF;
    cursor: default;
  }
</style>
