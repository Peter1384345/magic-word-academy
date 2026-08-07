import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/useAuthStore'
import { useUserStore } from '../store/useUserStore'

type Mode = 'login' | 'register'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, register, error, clearError } = useAuthStore()
  const { setUserName } = useUserStore()

  const [mode, setMode] = useState<Mode>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    clearError()
    const ok = mode === 'login' ? login(username, password) : register(username, password)
    if (ok) {
      // 同步用户名到 userStore
      setUserName(username.trim())
      // 管理员直接进入后台管理页，不展示学习内容
      const isAdmin = useAuthStore.getState().isAdmin()
      if (isAdmin) {
        navigate('/admin')
      } else {
        // 普通用户：跳转年级选择进行测试
        navigate('/grade-select')
      }
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      {/* 背景魔法阵装饰 */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full border-2 border-gold/10 animate-spin-slow" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full border border-primary/20 animate-spin-slow" style={{ animationDirection: 'reverse' }} />
      </div>

      <div className="relative w-full max-w-md">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="text-7xl mb-3 animate-float">🧙‍♂️</div>
          <h1 className="text-3xl font-magic font-extrabold bg-gradient-to-r from-gold via-gold-light to-gold bg-clip-text text-transparent">
            魔法单词学院
          </h1>
          <p className="text-cream/60 mt-2 text-sm">
            {mode === 'login' ? '欢迎回来，小魔法师' : '开启你的魔法之旅'}
          </p>
        </div>

        {/* 登录卡片 */}
        <div className="bg-cosmos/60 backdrop-blur-xl rounded-3xl p-8 border border-gold/30 shadow-card-gold">
          {/* 模式切换 */}
          <div className="flex gap-2 mb-6 p-1 bg-cosmos-deep/40 rounded-xl">
            <button
              type="button"
              onClick={() => { setMode('login'); clearError() }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'login'
                  ? 'bg-gold text-cosmos-deep shadow-glow-gold'
                  : 'text-cream/60 hover:text-cream'
              }`}
            >
              登录
            </button>
            <button
              type="button"
              onClick={() => { setMode('register'); clearError() }}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                mode === 'register'
                  ? 'bg-gold text-cosmos-deep shadow-glow-gold'
                  : 'text-cream/60 hover:text-cream'
              }`}
            >
              注册
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 用户名 */}
            <div>
              <label className="block text-xs text-cream/60 mb-1.5">账户名称</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40">👤</span>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入用户名"
                  autoComplete="username"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-cosmos-deep/50 border border-gold/20 text-cream placeholder:text-cream/30 focus:border-gold/60 focus:outline-none focus:shadow-glow-gold transition-all"
                />
              </div>
            </div>

            {/* 密码 */}
            <div>
              <label className="block text-xs text-cream/60 mb-1.5">密码</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40">🔒</span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  className="w-full pl-10 pr-10 py-3 rounded-xl bg-cosmos-deep/50 border border-gold/20 text-cream placeholder:text-cream/30 focus:border-gold/60 focus:outline-none focus:shadow-glow-gold transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-cream/40 hover:text-cream/70"
                >
                  {showPwd ? '🙈' : '👁️'}
                </button>
              </div>
            </div>

            {/* 错误提示 */}
            {error && (
              <div className="bg-magic-pink/20 border border-magic-pink/40 rounded-xl px-4 py-2.5 text-sm text-magic-pink flex items-center gap-2 animate-shake">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {/* 提交按钮 */}
            <button
              type="submit"
              disabled={!username.trim() || !password}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-gold to-gold-dark text-cosmos-deep font-bold text-base shadow-glow-gold hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:scale-100"
            >
              {mode === 'login' ? '✨ 进入学院' : '🎯 注册新账户'}
            </button>
          </form>

          {/* 提示 */}
          <p className="text-center text-xs text-cream/40 mt-5">
            {mode === 'login'
              ? '还没有账户？点击上方"注册"创建新账户'
              : '已有账户？点击上方"登录"直接进入'}
          </p>
        </div>

        {/* 底部装饰 */}
        <div className="text-center mt-6 text-xs text-cream/30">
          <p>✨ Magic Word Academy ✨</p>
        </div>
      </div>
    </div>
  )
}
