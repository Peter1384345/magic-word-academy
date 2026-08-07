import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// 使用 HashRouter 替代 BrowserRouter
// GitHub Pages 不支持 SPA 的 history 模式（刷新会 404），HashRouter 无需服务端配置即可正常工作
import { HashRouter } from 'react-router-dom'
import './index.css'
import './styles/magic-theme.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <HashRouter>
      <App />
    </HashRouter>
  </StrictMode>,
)
