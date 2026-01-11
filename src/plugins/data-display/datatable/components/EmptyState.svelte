<script lang="ts">
  interface Props {
    searchQuery: string
  }

  let { searchQuery }: Props = $props()
</script>

<div class="empty-state">
  {#if searchQuery}
    <p>No results found for "{searchQuery}"</p>
  {:else}
    <p>No data available</p>
  {/if}
</div>

<style>
  .empty-state {
    padding: 3rem 1rem;
    text-align: center;
    color: #D1D5DB;
  }

  .empty-state p {
    margin: 0;
    font-size: 0.875rem;
  }
</style>
