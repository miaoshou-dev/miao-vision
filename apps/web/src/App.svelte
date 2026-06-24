<script lang="ts">
  import LandingPage from './components/LandingPage.svelte'

  function handleNavigate(): void {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
</script>

<main>
  <LandingPage onNavigate={handleNavigate} />
</main>

<style>
  main {
    min-height: 100vh;
    background-color: #030712;
  }
</style>
