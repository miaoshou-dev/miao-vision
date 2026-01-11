<script lang="ts">
  import type { ColumnDef } from '../types'
  import type { SummaryRow } from '../logic'

  interface Props {
    columns: ColumnDef[]
    summaryRow: SummaryRow | null
    selectable: boolean
  }

  let { columns, summaryRow, selectable }: Props = $props()
</script>

{#if summaryRow}
  <tfoot>
    <tr class="summary-row">
      {#if selectable}
        <td class="summary-cell select-cell" style="width: 50px;"></td>
      {/if}
      {#each columns as column}
        <td
          class="summary-cell"
          style:text-align={column.align || 'left'}
          style:width={column.width ? (typeof column.width === 'number' ? `${column.width}px` : column.width) : 'auto'}
        >
          {#if summaryRow[column.name]}
            <span class="summary-value">{summaryRow[column.name]}</span>
          {/if}
        </td>
      {/each}
    </tr>
  </tfoot>
{/if}

<style>
  tfoot {
    position: sticky;
    bottom: 0;
    z-index: 10;
    background: #374151;
    border-top: 2px solid #4B5563;
  }

  .summary-row {
    background: #374151;
  }

  .summary-cell {
    padding: 0.75rem 1rem;
    font-weight: 600;
    color: #F3F4F6;
    border-top: 2px solid #4B5563;
  }

  .summary-value {
    font-weight: 700;
    color: #F3F4F6;
  }

  .select-cell {
    text-align: center;
    padding: 0.5rem;
  }
</style>
