import { defineConfig } from 'vite'

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    cssCodeSplit: false,
    lib: {
      entry: 'src/widget-entry.ts',
      name: 'PokecharmWidgetBundle',
      formats: ['iife'],
      fileName: () => 'widget.js',
    },
  },
})
