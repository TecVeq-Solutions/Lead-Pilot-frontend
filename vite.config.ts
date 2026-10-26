import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('@xyflow')) {
              return 'vendor-xyflow'
            }
            if (id.includes('laravel-echo') || id.includes('pusher-js')) {
              return 'vendor-realtime'
            }
            if (id.includes('lucide-react')) {
              return 'vendor-icons'
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react'
            }
            if (id.includes('axios') || id.includes('zustand') || id.includes('clsx') || id.includes('tailwind-merge')) {
              return 'vendor-utils'
            }
          }
        },
      },
    },
  },
})
