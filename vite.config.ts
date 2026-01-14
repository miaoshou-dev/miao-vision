import { defineConfig } from 'vite'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
      '@app': path.resolve(__dirname, './src/app')
    }
  },
  optimizeDeps: {
    exclude: ['@duckdb/duckdb-wasm'],
    esbuildOptions: {
      target: 'esnext'
    }
  },
  worker: {
    format: 'es'
  },
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'credentialless'
    },
    proxy: {
      // Proxy DeepSeek API to bypass CORS
      '/api/deepseek': {
        target: 'https://api.deepseek.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/deepseek/, ''),
        secure: true
      },
      // Proxy OpenAI API (optional)
      '/api/openai': {
        target: 'https://api.openai.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/openai/, ''),
        secure: true
      }
    }
  }
})
