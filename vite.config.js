import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Saat development, request ke /api diteruskan ke server Express lokal (port 3001).
// Di Vercel, /api ditangani langsung oleh serverless function di folder api/.
export default defineConfig({
  plugins: [react()],
  server: {
    allowedHosts: ['.vercel.run'],
    proxy: { '/api': 'http://localhost:3001' },
  },
})
