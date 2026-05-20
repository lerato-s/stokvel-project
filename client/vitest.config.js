import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/setup.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov', 'json'],
      reportsDirectory: './test-coverage',
      clean: false,
      cleanOnRerun: false,
      reportOnFailure: true,
      exclude: [
        // Exclude CSS files
        "**/*.css",
        "**/*.scss",
        "**/*.sass",
        "**/*.less",
        
        // Exclude other non-testable files
        "src/setup.js",
        "src/main.jsx",
        "src/**/*.test.{js,jsx}",
        "src/**/*.spec.{js,jsx}",
        "node_modules/",
        "tests/",
        
        // Exclude page CSS files
        "src/pages/**/*.css",
        
        // Expose but don't track coverage for certain files
        "**/index.js",
        "**/*.config.js",
        "**/*.config.ts",
      ],
    },
  },
})