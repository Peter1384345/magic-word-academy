import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useUserStore } from '../store/useUserStore'
import { useAuthStore, getCurrentAccount } from '../store/useAuthStore'
import { getTextbook } from '../data/textbooks'
import PageTransition from './PageTransition'

// 导航项配置
const NAV_ITEMS = [
  { to: '/', label: '首页', icon: '🏠', title: '魔法学院首页' },
  { to: '/practice', label: '单词背诵', icon: '📚', title: '单词背诵' },
  { to: '/test', label: '准入测试', icon: '✨', title: '准入测试' },
  { to: '/wrongbook', label: '错词本', icon: '📒', title: '错词本' },
  { to: '/textbook', label: '经典课文', icon: '📖', title: '经典课文' },
  { to: '/pets', label: '宠物乐园', icon: '🐰', title: '宠物乐园' },
  { to: '/badges', label: '徽章墙', icon: '🏅', title: '徽章墙' },
  { to: '/settings', label: '设置', icon: '⚙️', title: '设置' },
]

export default function Layout() {
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()
  const navigate = useNavigate()
  const { userProfile, currentPetId } = useUserStore()
  const { currentUser, accounts, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // 判断当前用户是否管理员
  const isAdminUser = !!currentUser && accounts[currentUser]?.role === 'admin'

  // 获取当前用户的年级与对应电子课本
  const currentAccount = getCurrentAccount()
  const userGrade = currentAccount?.currentGrade ?? userProfile.grade ?? 1
  const textbook = getTextbook(userGrade)

  // 打开电子课本
  const handleOpenTextbook = () => {
    if (textbook) {
      window.open(textbook.url, '_blank', 'noopener,noreferrer')
    }
  }

  // 管理员专属导航项（管理员只显示此入口，不显示学习内容）
  const ADMIN_NAV_ITEMS = [
    { to: '/admin', label: '后台管理', icon: '🛡️', title: '后台管理中心' },
  ]

  // 管理员只看后台管理；普通用户看学习内容
  const visibleNavItems = isAdminUser ? ADMIN_NAV_ITEMS : NAV_ITEMS
  const currentItem = visibleNavItems.find((item) =>
    item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to),
  ) ?? visibleNavItems[0]

  // 经验进度百分比
  const expPercent = Math.min(100, (userProfile.exp / userProfile.expToNext) * 100)
  // 今日学习进度百分比
  const todayPercent = Math.min(100, (userProfile.todayLearned / userProfile.todayGoal) * 100)

  const sidebarWidth = collapsed ? 'w-20' : 'w-64'

  return (
    <div className="flex min-h-screen relative z-10">
      {/* 移动端遮罩 */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-magic-purple/30 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* 左侧导航栏 */}
      <aside
        className={[
          'fixed md:sticky top-0 left-0 h-screen z-40',
          'flex flex-col transition-all duration-300',
          'glass-card rounded-none md:rounded-r-magic',
          'border-r border-gold/30',
          sidebarWidth,
          mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        ].join(' ')}
        style={{ background: 'rgba(26, 14, 46, 0.75)' }}
      >
        {/* Logo 区域 */}
        <div className="flex items-center gap-2 px-4 py-5 border-b border-gold/20">
          <span className="text-2xl animate-twinkle">✨</span>
          {!collapsed && (
            <span className="font-magic font-extrabold text-lg whitespace-nowrap"
              style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.5)' }}>
              魔法单词学院
            </span>
          )}
        </div>

        {/* 折叠按钮（桌面端） */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="hidden md:flex absolute -right-3 top-20 w-6 h-6 rounded-full bg-gold text-cosmos-deep items-center justify-center shadow-md hover:scale-110 transition-transform text-xs font-bold"
          aria-label="折叠导航栏"
        >
          {collapsed ? '▶' : '◀'}
        </button>

        {/* 导航项列表 */}
        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {visibleNavItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                  'font-rounded font-medium',
                  isActive
                    ? 'bg-gradient-to-r from-gold/40 to-primary/30 shadow-card-gold font-semibold'
                    : 'text-cream/70 hover:bg-gold/15 hover:text-gold-light',
                  collapsed ? 'justify-center' : '',
                ].join(' ')
              }
              title={collapsed ? item.label : undefined}
            >
              <span className="text-xl shrink-0">{item.icon}</span>
              {!collapsed && (
                <span className="whitespace-nowrap">{item.label}</span>
              )}
            </NavLink>
          ))}

          {/* 电子课本按钮（普通用户专属，根据当前年级直接跳转） */}
          {!isAdminUser && textbook && (
            <button
              onClick={handleOpenTextbook}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200',
                'font-rounded font-medium w-full',
                'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 border border-blue-400/30',
                'text-blue-200 hover:bg-blue-500/30 hover:border-blue-400/50',
                collapsed ? 'justify-center' : '',
              ].join(' ')}
              title={collapsed ? textbook.name : undefined}
            >
              <span className="text-xl shrink-0">📕</span>
              {!collapsed && (
                <div className="flex flex-col items-start min-w-0 flex-1">
                  <span className="whitespace-nowrap text-sm font-semibold">电子课本</span>
                  <span className="text-[10px] text-blue-300/70 truncate w-full text-left">
                    {textbook.name}
                  </span>
                </div>
              )}
              {!collapsed && (
                <span className="text-xs text-blue-300/60 shrink-0">↗</span>
              )}
            </button>
          )}
        </nav>

        {/* 底部：用户头像 + 身份信息 */}
        <div className="border-t border-gold/20 p-3">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            {/* 用户头像 */}
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-xl shadow-card-gold"
                style={{ boxShadow: '0 0 15px rgba(255,215,0,0.4)' }}>
                {isAdminUser ? '👑' : currentPetId === 'phoenix' ? '🧙' : '🧝'}
              </div>
              {isAdminUser ? (
                <span className="absolute -bottom-1 -right-1 bg-magic-pink text-cream text-[9px] font-bold px-1.5 py-0.5 rounded-full border border-gold-light shadow">
                  ADMIN
                </span>
              ) : (
                <span className="absolute -bottom-1 -right-1 bg-gold text-cosmos-deep text-[10px] font-bold px-1.5 py-0.5 rounded-full border border-gold-light shadow">
                  Lv.{userProfile.level}
                </span>
              )}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gold-light truncate">
                  {currentUser?.username ?? userProfile.name}
                </p>
                {isAdminUser ? (
                  <p className="text-[10px] text-magic-pink mt-0.5 font-semibold">
                    系统管理员
                  </p>
                ) : (
                  <>
                    {/* 经验条 */}
                    <div className="mt-1 h-1.5 bg-cosmos-deep/60 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-gold-light to-gold-dark rounded-full transition-all"
                        style={{ width: `${expPercent}%`, boxShadow: '0 0 8px rgba(255,215,0,0.5)' }}
                      />
                    </div>
                    <p className="text-[10px] text-cream/50 mt-0.5">
                      {userProfile.exp} / {userProfile.expToNext} EXP
                    </p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* 退出登录按钮 */}
          <button
            onClick={handleLogout}
            className={[
              'mt-3 w-full rounded-lg transition-all duration-200',
              'bg-magic-pink/20 hover:bg-magic-pink/40 text-magic-pink hover:text-magic-pink-light',
              'font-rounded font-medium',
              collapsed ? 'p-2 text-base' : 'py-2 text-sm',
            ].join(' ')}
            title={collapsed ? '退出登录' : undefined}
          >
            {collapsed ? '🚪' : '🚪 退出登录'}
          </button>
        </div>
      </aside>

      {/* 右侧主区域 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 顶部栏 */}
        <header
          className="sticky top-0 z-20 glass-card rounded-none border-b border-gold/20 px-4 md:px-6 py-3 flex items-center justify-between gap-4"
          style={{ background: 'rgba(26, 14, 46, 0.7)' }}
        >
          <div className="flex items-center gap-3 min-w-0">
            {/* 移动端菜单按钮 */}
            <button
              onClick={() => setMobileOpen(true)}
              className="md:hidden w-9 h-9 rounded-lg bg-gold/20 flex items-center justify-center text-gold-light"
              aria-label="打开菜单"
            >
              ☰
            </button>
            <h1 className="font-magic font-bold text-lg md:text-xl truncate"
              style={{ color: '#FFD700', textShadow: '0 0 10px rgba(255,215,0,0.4)' }}>
              {currentItem.icon} {currentItem.title}
            </h1>
          </div>

          {/* 管理员显示身份徽章；普通用户显示今日进度 */}
          {isAdminUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gold/20 border border-gold/40">
              <span className="text-sm">👑</span>
              <span className="text-xs font-bold text-gold-light">管理员模式</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0">
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-xs text-cream/60">今日进度</span>
                <span className="text-sm font-semibold text-gold-light">
                  {userProfile.todayLearned} / {userProfile.todayGoal}
                </span>
              </div>
              <div className="relative w-10 h-10">
                <svg className="w-10 h-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,215,0,0.15)" strokeWidth="4" />
                  <circle
                    cx="18" cy="18" r="15" fill="none" stroke="#FFD700" strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${(todayPercent / 100) * 94.2} 94.2`}
                    style={{ filter: 'drop-shadow(0 0 4px rgba(255,215,0,0.6))' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-gold-light">
                  {Math.round(todayPercent)}%
                </span>
              </div>
            </div>
          )}
        </header>

        {/* 主内容区：带魔法师跳转转场 */}
        <main className="flex-1 p-4 md:p-6 lg:p-8 overflow-x-hidden">
          <div className="max-w-6xl mx-auto">
            <PageTransition pathname={location.pathname}>
              <Outlet />
            </PageTransition>
          </div>
        </main>
      </div>
    </div>
  )
}
