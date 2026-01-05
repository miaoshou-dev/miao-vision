<script lang="ts">
  import type { BigValueData } from './types'
  import { getTrendIcon, getTrendColor, formatPercent } from './formatter'

  interface Props {
    data: BigValueData
  }

  let { data }: Props = $props()
</script>

<div class="bigvalue-card">
  <!-- Title -->
  {#if data.title}
    <div class="bigvalue-title">{data.title}</div>
  {/if}

  <!-- Main Value -->
  <div class="bigvalue-value" style={data.color ? `color: ${data.color}` : ''}>{data.formatted}</div>

  <!-- Comparison (if available) -->
  {#if data.comparison}
    <div class="bigvalue-comparison {getTrendColor(data.comparison.trend)}">
      <span class="trend-icon">{getTrendIcon(data.comparison.trend)}</span>
      <span class="trend-percent">{formatPercent(Math.abs(data.comparison.percent))}</span>
      {#if data.comparison.label}
        <span class="trend-label">{data.comparison.label}</span>
      {/if}
    </div>
  {/if}
</div>

<style>
  .bigvalue-card {
    background: #1F2937;
    border: 1px solid #4B5563;
    border-radius: 8px;
    padding: 1.5rem;
    text-align: center;
    min-width: 200px;
    margin: 2rem 0;
  }

  .bigvalue-title {
    font-size: 0.875rem;
    color: #9CA3AF;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.5rem;
    font-weight: 500;
  }

  .bigvalue-value {
    font-size: 3rem;
    font-weight: 600;
    color: #F3F4F6;
    line-height: 1.2;
    margin: 0.5rem 0;
  }

  .bigvalue-comparison {
    font-size: 0.875rem;
    margin-top: 0.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.25rem;
    font-weight: 500;
  }

  .trend-icon {
    font-size: 1rem;
    font-weight: bold;
  }

  .trend-percent {
    font-weight: 600;
  }

  .trend-label {
    opacity: 0.8;
    margin-left: 0.25rem;
  }

  /* Trend colors (Tailwind-like) */
  :global(.text-green-600) {
    color: #10B981;
  }

  :global(.text-red-600) {
    color: #EF4444;
  }

  :global(.text-gray-500) {
    color: #6B7280;
  }

  /* Responsive */
  @media (max-width: 640px) {
    .bigvalue-card {
      padding: 1rem;
      min-width: 150px;
    }

    .bigvalue-value {
      font-size: 2rem;
    }

    .bigvalue-title {
      font-size: 0.75rem;
    }

    .bigvalue-comparison {
      font-size: 0.75rem;
    }
  }
</style>
