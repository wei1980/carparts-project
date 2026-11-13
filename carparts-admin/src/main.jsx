// C:\carparts\carparts-admin\src\main.jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

// 這是 React 應用程式的標準入口
// 我們將路由邏輯都統一放在 App.jsx 中管理
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)