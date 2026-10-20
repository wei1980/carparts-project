import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  optimizeDeps: {
    // recharts 只被 Dashboard.jsx 以 React.lazy 動態載入。發現式預打包趕不上
    // 首次進入 /admin 的載入時序，會回 504 Outdated Optimize Dep 並讓錯誤邊界
    // 顯示「發生錯誤」。明確列出讓 dev server 啟動時就完成預打包。
    include: ['recharts'],
  },
  esbuild: {
    drop: ['debugger'],
    pure: ['console.log', 'console.info', 'console.debug'],
  },
  server: {
    port: 5173,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        // 支援 cookie 傳遞 (CSRF, session)
        cookieDomainRewrite: { 'localhost': '' },
        // 關鍵：防止 Vite proxy 截斷長 Authorization header
        // 使用 configure + proxyReq 在請求發送前明確設定 header
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, req, _res) => {
            const authorization = req.headers.authorization;
            const xRequestId = req.headers['x-request-id'];
            const csrfToken = req.headers['x-csrf-token'];
            const cookie = req.headers.cookie;
            if (authorization) {
              console.info('[VITE_PROXY] forwarding Authorization', {
                requestId: xRequestId || 'unknown',
                authorizationLength: authorization.length,
                hasBearer: authorization.startsWith('Bearer '),
                target: 'http://localhost:3000',
              });
              // 明確設定 proxyReq 的 Authorization header，避免預設截斷
              proxyReq.setHeader('Authorization', authorization);
            }
            if (xRequestId) {
              proxyReq.setHeader('X-Request-Id', xRequestId);
            }
            if (csrfToken) {
              proxyReq.setHeader('X-CSRF-Token', csrfToken);
            }
            // 轉發 cookie (CSRF cookie)
            if (cookie) {
              proxyReq.setHeader('Cookie', cookie);
            }
            // 增加 header 大小限制
            if (proxyReq.setMaxHeaderSize) {
              proxyReq.setMaxHeaderSize(16384); // 16KB
            }
          });
          proxy.on('error', (err, req, _res) => {
            console.error('[VITE_PROXY] proxy error', { url: req.url, message: err.message });
          });
          proxy.on('proxyRes', (proxyRes, req, _res) => {
            // 處理 Set-Cookie header (CSRF cookie)
            const setCookie = proxyRes.headers['set-cookie'];
            if (setCookie) {
              // 確保 cookie domain 正確
              proxyRes.headers['set-cookie'] = (setCookie || [])
                .filter(c => typeof c === 'string')
                .map(c => c.replace(/Domain=localhost/gi, 'Domain=')) || [];
            }
          });
        },
      },
      '/media': 'http://localhost:3000',
      '/health': 'http://localhost:3000',
    }
  }
})
