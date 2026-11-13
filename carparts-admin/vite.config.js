import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 已退役。請改用 C:\carparts\carparts-web。
// 僅供 npm run dev:legacy 看舊畫面，port 刻意避開 5173。
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5179,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
      '/media': 'http://localhost:3000',
      '/parts': 'http://localhost:3000',
      '/categories': 'http://localhost:3000',
      '/makes': 'http://localhost:3000',
      '/models': 'http://localhost:3000',
      '/generations': 'http://localhost:3000',
      '/variants': 'http://localhost:3000',
      '/orders': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
    }
  }
})
