import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// 部署到 GitHub Pages 子路径（/magic-word-academy/）时需要设置 base
// 为了保证本地手动构建产物与 Pages 部署一致，固定使用 /magic-word-academy/ 作为 base
// 使用 HashRouter 后，即使在根路径本地开发也不受影响
const IS_PAGES_DEPLOY = true
export default defineConfig({
  base: IS_PAGES_DEPLOY ? '/magic-word-academy/' : '/',
  plugins: [react(), tailwindcss()],
  css: {
    // 禁用 PostCSS 自动查找，避免根目录旧版 Tailwind 3 干扰
    postcss: {
      plugins: [],
    },
  },
})
