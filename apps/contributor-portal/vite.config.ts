import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  base: '/',
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) {
            return
          }

          if (id.includes('xlsx')) {
            return 'vendor-xlsx'
          }

          if (id.includes('@tiptap') || id.includes('prosemirror')) {
            return 'vendor-tiptap'
          }

          if (id.includes('react-day-picker')) {
            return 'vendor-day-picker'
          }

          if (id.includes('react-advanced-cropper') || id.includes('react-easy-crop')) {
            return 'vendor-cropper'
          }

          if (id.includes('i18next') || id.includes('react-i18next')) {
            return 'vendor-i18n'
          }
        },
      },
    },
  },
})
