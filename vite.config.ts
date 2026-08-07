import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  // GitHub Pages 部署需要设置 base 为仓库名
  // 本地开发时为 '/'，生产构建时为 '/magic-word-academy/'
  base: process.env.GITHUB_ACTIONS ? '/magic-word-academy/' : '/',
  plugins: [react(), tailwindcss()],
  css: {
    // 禁用 PostCSS 自动查找，避免根目录旧版 Tailwind 3 干扰
    postcss: {
      plugins: [],
    },
  },
})
