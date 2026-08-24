# Magic Word Academy

> 魔法学院主题英语单词学习应用 · 游戏化背单词

![License](https://img.shields.io/badge/license-MIT-blue)
![Status](https://img.shields.io/badge/status-in_development-yellow)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript)
![Tailwind](https://img.shields.io/badge/Tailwind-4-38bdf8?logo=tailwindcss)

## 项目简介

Magic Word Academy 是一款以**魔法学院**为主题的英语单词学习应用。将背单词融入魔法学院的游戏化场景，通过宠物养成、徽章收集、等级晋升等机制，让单词学习更有趣。

## 在线访问

**GitHub Pages:** https://peter1384345.github.io/magic-word-academy/

## 功能模块

### 核心学习
- 🔮 **单词练习** — 多种练习模式，循序渐进巩固记忆
- 📝 **测试模式** — 阶段性检测学习效果
- 📕 **错题本** — 自动收录错题，针对性复习
- 📖 **教材同步** — 按教材单元分组学习

### 游戏化系统
- 🐾 **宠物伙伴** — 魔法宠物陪伴学习，成长进化
- 🏆 **徽章系统** — 达成成就解锁精美徽章
- ⭐ **等级晋升** — 从魔法学徒到大魔导师的进阶之路

### 用户系统
- 🔐 **登录注册** — 本地账号系统
- 📊 **个人仪表盘** — 学习数据统计与可视化
- ⚙️ **个性化设置** — 主题、难度、每日目标等

### 管理功能
- 👑 **管理员面板** — 用户管理、数据统计、内容配置

## 技术栈

| 层级 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 路由 | React Router 7 |
| 状态管理 | Zustand 5 |
| 代码检查 | Oxlint |

## 项目结构

`
magic-word-academy/
├── src/
│   ├── pages/              # 页面组件
│   │   ├── HomePage.tsx          # 首页
│   │   ├── PracticePage.tsx      # 练习页
│   │   ├── TestPage.tsx          # 测试页
│   │   ├── WrongBookPage.tsx     # 错题本
│   │   ├── TextbookPage.tsx      # 教材页
│   │   ├── PetsPage.tsx          # 宠物页
│   │   ├── BadgesPage.tsx        # 徽章页
│   │   ├── SettingsPage.tsx      # 设置页
│   │   ├── LoginPage.tsx         # 登录页
│   │   ├── GradeSelectPage.tsx   # 年级选择
│   │   └── AdminDashboard.tsx    # 管理员面板
│   ├── components/         # 通用组件
│   │   ├── Layout.tsx
│   │   ├── MagicButton.tsx
│   │   ├── MagicCard.tsx
│   │   ├── MagicSplash.tsx
│   │   ├── ParticleEffect.tsx
│   │   ├── PetCompanion.tsx
│   │   └── WordImage.tsx
│   ├── store/              # Zustand 状态管理
│   │   ├── useAuthStore.ts
│   │   ├── useProgressStore.ts
│   │   ├── useUserStore.ts
│   │   └── useWordStore.ts
│   ├── App.tsx             # 应用入口与路由
│   └── main.tsx            # React 挂载点
├── data/
│   └── textbooks/          # 教材词库数据
├── public/                 # 静态资源
├── vite.config.ts          # Vite 配置
├── tsconfig.json           # TypeScript 配置
└── package.json
`

## 快速开始

`ash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build

# 预览生产构建
npm run preview

# 代码检查
npm run lint
`

## 开发计划

- [ ] 完整单词词库导入
- [ ] 多种练习模式（拼写/选择/听力）
- [ ] 宠物养成系统
- [ ] 徽章与成就系统
- [ ] 学习数据统计与分析
- [ ] 移动端适配优化
- [ ] PWA 离线支持

## License

[MIT](LICENSE)