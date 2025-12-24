import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // 設定前端呼叫這些路徑時，自動轉發到後端 (localhost:3000)
      '/health': 'http://localhost:3000',      // ✅ 修復 Admin 404
      '/parts': 'http://localhost:3000',
      '/admin': 'http://localhost:3000',
      '/media': 'http://localhost:3000',
      '/categories': 'http://localhost:3000',
      '/makes': 'http://localhost:3000',
      '/models': 'http://localhost:3000',
      '/generations': 'http://localhost:3000', // ✅ 補上：VehicleSelector 會用到
      '/variants': 'http://localhost:3000',
      '/orders': 'http://localhost:3000',      // ✅ 補上：Checkout 會用到
    }
  }
})