<script lang="ts">
  import type { ColumnDef } from '../types'
  import type { ColumnWidths, VisibleRange, IconInfo } from '../logic'
  import {
    getCellValue,
    getCellStyle,
    getDataBarWidth,
    getColorScaleBackground,
    getIconForValue,
    getFrozenOffset
  } from '../logic'

  interface Props {
    visibleRows: Record<string, unknown>[]
    allRows: Record<string, unknown>[]
    columns: ColumnDef[]
    visibleRange: VisibleRange
    rowHeight: number
    totalHeight: number
    offsetY: number
    selectable: boolean
    selectedRows: Set<number>
    drilldownEnabled: boolean
    drilldownCursor: string
    drilldownHighlight: boolean
    drilldownTooltip: string
    columnWidths: ColumnWidths
    onRowClick: (row: Record<string, unknown>, index: number) => void
    onToggleRowSelection: (index: number) => void
  }

  let {
    visibleRows,
    allRows,
    columns,
    visibleRange,
    rowHeight,
    totalHeight,
    offsetY,
    selectable,
    selectedRows,
    drilldownEnabled,
    drilldownCursor,
    drilldownHighlight,
    drilldownTooltip,
    columnWidths,
    onRowClick,
    onToggleRowSelection
  }: Props = $props()

  function handleRowClick(row: Record<string, unknown>, index: number) {
    if (drilldownEnabled) {
      onRowClick(row, index)
    }
  }

  function getCellIconInfo(row: Record<string, unknown>, column: ColumnDef): IconInfo | null {
    return getIconForValue(row, column, allRows)
  }

  function getCellDataBarWidth(row: Record<string, unknown>, column: ColumnDef): number {
    return getDataBarWidth(row, column, allRows)
  }

  function getCellColorScale(row: Record<string, unknown>, column: ColumnDef): string {
    return getColorScaleBackground(row, column, allRows)
  }
</script>

<tbody>
  <tr style="height: {totalHeight}px;">
    <td colspan={columns.length + (selectable ? 1 : 0)}></td>
  </tr>

  <tr style="position: absolute; top: 0; left: 0; right: 0; transform: translateY({offsetY}px);">
    <td colspan={columns.length + (selectable ? 1 : 0)} style="padding: 0;">
      <table style="width: 100%; table-layout: fixed;">
        <colgroup>
          {#if selectable}
            <col style="width: 50px" />
          {/if}
          {#each columns as column}
            <col style:width={column.width ? (typeof column.width === 'number' ? `${column.width}px` : column.width) : 'auto'} />
          {/each}
        </colgroup>
        <tbody>
          {#each visibleRows as row, idx}
            {@const actualIndex = visibleRange.start + idx}
            <tr
              class="data-row"
              class:selected={selectedRows.has(actualIndex)}
              class:drilldown-enabled={drilldownEnabled}
              class:drilldown-highlight={drilldownEnabled && drilldownHighlight}
              style="height: {rowHeight}px; {drilldownEnabled ? `cursor: ${drilldownCursor}` : ''}"
              onclick={() => handleRowClick(row, actualIndex)}
              title={drilldownEnabled ? drilldownTooltip : undefined}
            >
              {#if selectable}
                <td class="data-cell select-cell">
                  <input
                    type="checkbox"
                    checked={selectedRows.has(actualIndex)}
                    onchange={() => onToggleRowSelection(actualIndex)}
                    onclick={(e) => e.stopPropagation()}
                    class="select-checkbox"
                  />
                </td>
              {/if}
              {#each columns as column}
                {@const colorScaleBg = getCellColorScale(row, column)}
                {@const iconInfo = getCellIconInfo(row, column)}
                {@const frozenOffset = getFrozenOffset(column, columns, columnWidths, selectable)}
                {@const cellStyle = [
                  getCellStyle(row, column),
                  colorScaleBg ? `background-color: ${colorScaleBg}` : '',
                  column.frozen === 'left' ? `left: ${frozenOffset}px` : '',
                  column.frozen === 'right' ? `right: ${frozenOffset}px` : ''
                ].filter(Boolean).join('; ')}
                <td
                  class="data-cell"
                  class:has-data-bar={column.showDataBar}
                  class:has-color-scale={!!colorScaleBg}
                  class:frozen-left={column.frozen === 'left'}
                  class:frozen-right={column.frozen === 'right'}
                  style:text-align={column.align || 'left'}
                  style={cellStyle}
                >
                  {#if column.contentType === 'image'}
                    {@const imageUrl = row[column.name]}
                    {@const imgWidth = column.imageConfig?.width || 50}
                    {@const imgHeight = column.imageConfig?.height || 50}
                    {@const imgFit = column.imageConfig?.fit || 'contain'}
                    {@const imgRounded = column.imageConfig?.rounded || false}
                    <div
                      class="cell-image-wrapper"
                      style="min-height: {typeof imgHeight === 'number' ? `${imgHeight}px` : imgHeight};"
                    >
                      <img
                        src={String(imageUrl)}
                        alt=""
                        loading="eager"
                        decoding="async"
                        style="width: {typeof imgWidth === 'number' ? `${imgWidth}px` : imgWidth}; height: {typeof imgHeight === 'number' ? `${imgHeight}px` : imgHeight}; object-fit: {imgFit}; {imgRounded ? 'border-radius: 4px;' : ''}"
                        onerror={(e) => { (e.target as HTMLElement).style.display = 'none' }}
                      />
                    </div>
                  {:else if column.contentType === 'html'}
                    {@html row[column.name]}
                  {:else if column.showDataBar}
                    <div class="cell-with-bar">
                      <div class="data-bar" style="width: {getCellDataBarWidth(row, column)}%"></div>
                      <span class="cell-value">{getCellValue(row, column)}</span>
                    </div>
                  {:else if iconInfo}
                    <span class="cell-with-icon">
                      <span class="cell-icon" style="color: {iconInfo.color}">{iconInfo.icon}</span>
                      {#if column.iconSet?.showValue !== false}
                        <span class="cell-value">{getCellValue(row, column)}</span>
                      {/if}
                    </span>
                  {:else}
                    {getCellValue(row, column)}
                  {/if}
                </td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </td>
  </tr>
</tbody>

<style>
  tbody {
    background: #1F2937;
    position: relative;
  }

  .data-row {
    border-bottom: 1px solid #374151;
    transition: background 0.2s;
  }

  .data-row:hover {
    background: #374151;
  }

  .data-row.selected {
    background: #1E3A5F;
  }

  .data-row.selected:hover {
    background: #2E4A6F;
  }

  /* Drill-down styles */
  .data-row.drilldown-enabled {
    cursor: pointer;
  }

  .data-row.drilldown-highlight:hover {
    background: #3B82F6 !important;
    box-shadow: inset 0 0 0 1px #60A5FA;
  }

  .data-row.drilldown-highlight:hover .data-cell {
    color: #FFFFFF;
  }

  .data-row.drilldown-enabled:active {
    background: #2563EB !important;
  }

  .data-cell {
    padding: 0.75rem 1rem;
    color: #F3F4F6;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .select-cell {
    text-align: center;
    padding: 0.5rem;
  }

  .select-checkbox {
    cursor: pointer;
    width: 16px;
    height: 16px;
  }

  .data-cell.has-data-bar {
    padding: 0;
  }

  .cell-with-bar {
    position: relative;
    padding: 0.75rem 1rem;
    overflow: visible;
  }

  .data-bar {
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    background: linear-gradient(90deg, #3B82F6 0%, #60A5FA 100%);
    opacity: 0.2;
    z-index: 0;
    transition: width 0.3s ease;
  }

  .cell-value {
    position: relative;
    z-index: 1;
  }

  /* Color scale cells */
  .data-cell.has-color-scale {
    transition: background-color 0.2s ease;
  }

  /* Icon set cells */
  .cell-with-icon {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .cell-icon {
    font-size: 0.875rem;
    font-weight: 600;
    flex-shrink: 0;
  }

  /* Image column styles */
  .cell-image-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 4px 0;
  }

  .cell-image-wrapper img {
    display: block;
    max-width: 100%;
  }

  /* Frozen column styles */
  .data-cell.frozen-left {
    position: sticky;
    z-index: 5;
    background: #1F2937;
    will-change: transform;
  }

  .data-cell.frozen-right {
    position: sticky;
    z-index: 5;
    background: #1F2937;
    will-change: transform;
  }

  .frozen-left::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 8px;
    pointer-events: none;
    box-shadow: inset -8px 0 8px -8px rgba(0, 0, 0, 0.3);
  }

  .frozen-right::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    bottom: 0;
    width: 8px;
    pointer-events: none;
    box-shadow: inset 8px 0 8px -8px rgba(0, 0, 0, 0.3);
  }
</style>
