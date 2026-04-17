import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: './',
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('@supabase')) return 'supabase'
          if (id.includes('@base-ui') || id.includes('@floating-ui')) return 'ui-vendor'
          if (id.includes('react-router') || id.includes('react-dom') || id.includes('/node_modules/react/')) return 'react-vendor'
        },
      },
    },
  },
  optimizeDeps: {
    exclude: ['pdfjs-dist'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
