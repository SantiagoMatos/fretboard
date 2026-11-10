import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [svelte()],
  // Relative paths, so the build works at any URL (e.g. GitHub Pages' /<repo>/ subfolder).
  base: './',
})
