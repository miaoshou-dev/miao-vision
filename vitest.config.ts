import { defineConfig } from 'vitest/config'
import { svelte } from '@sveltejs/vite-plugin-svelte'
import path from 'path'

export default defineConfig({
  plugins: [svelte({ hot: false })],
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json-summary'],
      include: [
        'src/core/**/*.ts',
        'src/plugins/**/*.ts',
        'src/app/**/*.ts'
      ],
      exclude: [
        '**/*.test.ts',
        '**/*.spec.ts',
        '**/*.d.ts',
        '**/index.ts',
        '**/types.ts',
        '**/metadata.ts',
        '**/definition.ts',
        '**/*.svelte'
      ],
      thresholds: {
        // Global thresholds
        lines: 25,
        functions: 25,
        branches: 20,
        statements: 25,
        // Higher thresholds for pure function modules
        'src/core/shared/pure/**/*.ts': {
          lines: 70,
          functions: 70,
          branches: 60,
          statements: 70
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
      '@core': path.resolve(__dirname, './src/core'),
      '@plugins': path.resolve(__dirname, './src/plugins'),
      '@app': path.resolve(__dirname, './src/app')
    }
  }
})
