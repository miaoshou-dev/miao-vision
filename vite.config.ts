import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
  root: path.resolve(__dirname, 'apps/web'),
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'apps/web/src')
    }
  }
})
