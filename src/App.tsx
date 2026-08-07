import { useState, useCallback } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import Layout from './components/Layout'
import MagicSplash from './components/MagicSplash'
import LoginPage from './pages/LoginPage'
import GradeSelectPage from './pages/GradeSelectPage'
import HomePage from './pages/HomePage'
import PracticePage from './pages/PracticePage'
import TestPage from './pages/TestPage'
import WrongBookPage from './pages/WrongBookPage'
import TextbookPage from './pages/TextbookPage'
import PetsPage from './pages/PetsPage'
import BadgesPage from './pages/BadgesPage'
import SettingsPage from './pages/SettingsPage'
import AdminDashboard from './pages/AdminDashboard'
import { useAuthStore } from './store/useAuthStore'

// 路由守卫：保护需要登录的页面
function RequireAuth({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuthStore()
  const location = useLocation()
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  return <>{children}</>
}

// 路由守卫：限制管理员只能访问后台，普通用户才看学习内容
function RequireUser({ children }: { children: React.ReactNode }) {
  const { currentUser, accounts } = useAuthStore()
  const location = useLocation()
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  // 管理员访问学习内容页 → 重定向到后台
  if (accounts[currentUser]?.role === 'admin') {
    return <Navigate to="/admin" replace />
  }
  return <>{children}</>
}

// 路由守卫：保护管理员页面（需要登录 + 管理员角色）
function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { currentUser, accounts } = useAuthStore()
  const location = useLocation()
  if (!currentUser) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }
  const account = accounts[currentUser]
  if (!account || account.role !== 'admin') {
    return <Navigate to="/" replace />
  }
  return <>{children}</>
}

// 应用路由配置
function App() {
  const [showSplash, setShowSplash] = useState(true)
  const handleSplashFinished = useCallback(() => setShowSplash(false), [])
  const { currentUser } = useAuthStore()

  return (
    <>
      {/* 魔法师开机特效 */}
      {showSplash && <MagicSplash onFinished={handleSplashFinished} />}
      <Routes>
        {/* 公开路由：登录页 */}
        <Route path="/login" element={<LoginPage />} />

        {/* 受保护路由：需要登录 */}
        <Route
          path="/grade-select"
          element={
            <RequireAuth>
              <GradeSelectPage />
            </RequireAuth>
          }
        />

        <Route
          path="/"
          element={
            <RequireUser>
              <Layout />
            </RequireUser>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="test" element={<TestPage />} />
          <Route path="wrongbook" element={<WrongBookPage />} />
          <Route path="textbook" element={<TextbookPage />} />
          <Route path="pets" element={<PetsPage />} />
          <Route path="badges" element={<BadgesPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* 管理员后台：独立路由，双重守卫（登录 + 管理员角色） */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <Layout />
            </RequireAdmin>
          }
        >
          <Route index element={<AdminDashboard />} />
        </Route>

        {/* 兜底：未匹配路由重定向 */}
        <Route
          path="*"
          element={
            <Navigate
              to={
                currentUser
                  ? useAuthStore.getState().isAdmin()
                    ? '/admin'
                    : '/'
                  : '/login'
              }
              replace
            />
          }
        />
      </Routes>
    </>
  )
}

export default App
