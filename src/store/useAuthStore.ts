import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// 角色类型
export type UserRole = 'admin' | 'user'

// 用户账户信息（不含密码，用于运行时）
export interface Account {
  username: string
  // 简单密码哈希（仅做演示，非安全用途）
  passwordHash: string
  // 角色：admin 管理员 / user 普通用户
  role: UserRole
  // 该用户已通过测试的最高年级
  passedGrade: number
  // 该用户当前所在年级
  currentGrade: number
  // 注册时间
  createdAt: string
}

// 管理员默认账号密码
export const ADMIN_USERNAME = 'admin'
export const ADMIN_PASSWORD = 'admin123'

// 简单字符串哈希（非加密用途，仅避免明文存储）
function simpleHash(s: string): string {
  let h = 0
  for (let i = 0; i < s.length; i++) {
    h = ((h << 5) - h) + s.charCodeAt(i)
    h |= 0
  }
  return 'h' + Math.abs(h).toString(36)
}

interface AuthState {
  // 所有已注册账户
  accounts: Record<string, Account>
  // 当前登录用户名（null 表示未登录）
  currentUser: string | null
  // 错误信息
  error: string | null

  // 注册新账户
  register: (username: string, password: string) => boolean
  // 登录
  login: (username: string, password: string) => boolean
  // 退出登录
  logout: () => void
  // 清除错误
  clearError: () => void
  // 更新当前用户的通过年级
  setPassedGrade: (grade: number) => void
  // 更新当前用户的当前年级
  setCurrentGrade: (grade: number) => void
  // 降级（3次测试不通过）
  downgradeGrade: () => void
  // 判断当前用户是否管理员
  isAdmin: () => boolean
  // 管理员：删除用户
  adminDeleteUser: (username: string) => boolean
  // 管理员：重置用户密码
  adminResetPassword: (username: string, newPassword: string) => boolean
  // 管理员：修改用户年级
  adminSetUserGrade: (username: string, grade: number) => boolean
  // 管理员：手动创建用户（指定用户名/密码/年级）
  adminCreateUser: (username: string, password: string, grade: number) => boolean
  // 管理员：批量重置密码（返回成功数）
  adminBatchResetPassword: (usernames: string[], newPassword: string) => number
  // 管理员：批量调整年级
  adminBatchSetGrade: (usernames: string[], grade: number) => number
  // 管理员：批量删除用户（返回成功数）
  adminBatchDelete: (usernames: string[]) => number
  // 管理员：清空所有普通用户（保留管理员）
  adminClearAllUsers: () => number
}

// 内置管理员种子账户
const seedAdmin: Account = {
  username: ADMIN_USERNAME,
  passwordHash: simpleHash(ADMIN_PASSWORD),
  role: 'admin',
  passedGrade: 17,
  currentGrade: 17,
  createdAt: '2024-01-01T00:00:00.000Z',
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      accounts: { [ADMIN_USERNAME]: seedAdmin },
      // currentUser 不持久化：刷新页面后强制重新登录
      // 确保用户每次进入都需验证账户密码
      currentUser: null,
      error: null,

      register: (username, password) => {
        const u = username.trim()
        if (u.length < 2) {
          set({ error: '用户名至少需要 2 个字符' })
          return false
        }
        if (password.length < 4) {
          set({ error: '密码至少需要 4 个字符' })
          return false
        }
        if (u.toLowerCase() === ADMIN_USERNAME) {
          set({ error: '该用户名保留，请使用其他名称' })
          return false
        }
        const accounts = get().accounts
        if (accounts[u]) {
          set({ error: '该用户名已被注册' })
          return false
        }
        const account: Account = {
          username: u,
          passwordHash: simpleHash(password),
          role: 'user',
          passedGrade: 0,
          currentGrade: 1,
          createdAt: new Date().toISOString(),
        }
        set({
          accounts: { ...accounts, [u]: account },
          currentUser: u,
          error: null,
        })
        return true
      },

      login: (username, password) => {
        const u = username.trim()
        const accounts = get().accounts
        // 确保种子管理员存在（兼容老数据）
        let allAccounts = accounts
        if (!allAccounts[ADMIN_USERNAME]) {
          allAccounts = { ...allAccounts, [ADMIN_USERNAME]: seedAdmin }
        }
        const account = allAccounts[u]
        if (!account) {
          set({ error: '用户名不存在，请先注册' })
          return false
        }
        if (account.passwordHash !== simpleHash(password)) {
          set({ error: '密码错误' })
          return false
        }
        set({ currentUser: u, accounts: allAccounts, error: null })
        return true
      },

      logout: () => set({ currentUser: null, error: null }),
      clearError: () => set({ error: null }),

      isAdmin: () => {
        const { currentUser, accounts } = get()
        if (!currentUser) return false
        return accounts[currentUser]?.role === 'admin'
      },

      setPassedGrade: (grade) => {
        const { currentUser, accounts } = get()
        if (!currentUser) return
        const account = accounts[currentUser]
        if (!account) return
        const newPassed = Math.max(account.passedGrade, grade)
        set({
          accounts: {
            ...accounts,
            [currentUser]: { ...account, passedGrade: newPassed, currentGrade: grade },
          },
        })
      },

      setCurrentGrade: (grade) => {
        const { currentUser, accounts } = get()
        if (!currentUser) return
        const account = accounts[currentUser]
        if (!account) return
        set({
          accounts: {
            ...accounts,
            [currentUser]: { ...account, currentGrade: grade },
          },
        })
      },

      downgradeGrade: () => {
        const { currentUser, accounts } = get()
        if (!currentUser) return
        const account = accounts[currentUser]
        if (!account) return
        if (account.currentGrade > 1) {
          set({
            accounts: {
              ...accounts,
              [currentUser]: { ...account, currentGrade: account.currentGrade - 1 },
            },
          })
        }
      },

      adminDeleteUser: (username) => {
        if (!get().isAdmin()) {
          set({ error: '仅管理员可执行此操作' })
          return false
        }
        if (username === ADMIN_USERNAME) {
          set({ error: '无法删除管理员账户' })
          return false
        }
        const accounts = { ...get().accounts }
        delete accounts[username]
        set({ accounts, error: null })
        return true
      },

      adminResetPassword: (username, newPassword) => {
        if (!get().isAdmin()) {
          set({ error: '仅管理员可执行此操作' })
          return false
        }
        if (newPassword.length < 4) {
          set({ error: '密码至少需要 4 个字符' })
          return false
        }
        const accounts = get().accounts
        const account = accounts[username]
        if (!account) {
          set({ error: '用户不存在' })
          return false
        }
        set({
          accounts: {
            ...accounts,
            [username]: { ...account, passwordHash: simpleHash(newPassword) },
          },
          error: null,
        })
        return true
      },

      adminSetUserGrade: (username, grade) => {
        if (!get().isAdmin()) {
          set({ error: '仅管理员可执行此操作' })
          return false
        }
        const accounts = get().accounts
        const account = accounts[username]
        if (!account) {
          set({ error: '用户不存在' })
          return false
        }
        if (grade < 1 || grade > 17) {
          set({ error: '年级范围需在 1-17 之间' })
          return false
        }
        set({
          accounts: {
            ...accounts,
            [username]: {
              ...account,
              currentGrade: grade,
              passedGrade: Math.max(account.passedGrade, grade - 1),
            },
          },
          error: null,
        })
        return true
      },

      adminCreateUser: (username, password, grade) => {
        if (!get().isAdmin()) {
          set({ error: '仅管理员可执行此操作' })
          return false
        }
        const u = username.trim()
        if (u.length < 2) {
          set({ error: '用户名至少需要 2 个字符' })
          return false
        }
        if (password.length < 4) {
          set({ error: '密码至少需要 4 个字符' })
          return false
        }
        if (u.toLowerCase() === ADMIN_USERNAME) {
          set({ error: '该用户名保留' })
          return false
        }
        const accounts = get().accounts
        if (accounts[u]) {
          set({ error: '该用户名已存在' })
          return false
        }
        const g = Math.max(1, Math.min(17, grade))
        const account: Account = {
          username: u,
          passwordHash: simpleHash(password),
          role: 'user',
          passedGrade: Math.max(0, g - 1),
          currentGrade: g,
          createdAt: new Date().toISOString(),
        }
        set({
          accounts: { ...accounts, [u]: account },
          error: null,
        })
        return true
      },

      adminBatchResetPassword: (usernames, newPassword) => {
        if (!get().isAdmin()) {
          set({ error: '仅管理员可执行此操作' })
          return 0
        }
        if (newPassword.length < 4) {
          set({ error: '密码至少需要 4 个字符' })
          return 0
        }
        const accounts = { ...get().accounts }
        let count = 0
        for (const u of usernames) {
          if (u === ADMIN_USERNAME) continue
          if (accounts[u]) {
            accounts[u] = { ...accounts[u], passwordHash: simpleHash(newPassword) }
            count++
          }
        }
        set({ accounts, error: null })
        return count
      },

      adminBatchSetGrade: (usernames, grade) => {
        if (!get().isAdmin()) {
          set({ error: '仅管理员可执行此操作' })
          return 0
        }
        if (grade < 1 || grade > 17) {
          set({ error: '年级范围需在 1-17 之间' })
          return 0
        }
        const accounts = { ...get().accounts }
        let count = 0
        for (const u of usernames) {
          if (u === ADMIN_USERNAME) continue
          if (accounts[u]) {
            accounts[u] = {
              ...accounts[u],
              currentGrade: grade,
              passedGrade: Math.max(accounts[u].passedGrade, grade - 1),
            }
            count++
          }
        }
        set({ accounts, error: null })
        return count
      },

      adminBatchDelete: (usernames) => {
        if (!get().isAdmin()) {
          set({ error: '仅管理员可执行此操作' })
          return 0
        }
        const accounts = { ...get().accounts }
        let count = 0
        for (const u of usernames) {
          if (u === ADMIN_USERNAME) continue
          if (accounts[u]) {
            delete accounts[u]
            count++
          }
        }
        set({ accounts, error: null })
        return count
      },

      adminClearAllUsers: () => {
        if (!get().isAdmin()) {
          set({ error: '仅管理员可执行此操作' })
          return 0
        }
        const accounts = get().accounts
        const kept: Record<string, Account> = {}
        let count = 0
        for (const [u, acc] of Object.entries(accounts)) {
          if (acc.role === 'admin') {
            kept[u] = acc
          } else {
            count++
          }
        }
        set({ accounts: kept, error: null })
        return count
      },
    }),
    {
      name: 'magic-word-academy-auth',
      // 仅持久化账户列表（accounts），currentUser 每次刷新重置为 null
      // 保证刷新后必须重新输入密码登录
      partialize: (state) => ({ accounts: state.accounts }),
      // 反序列化时保证种子管理员存在
      onRehydrateStorage: () => (state) => {
        if (state && !state.accounts[ADMIN_USERNAME]) {
          state.accounts[ADMIN_USERNAME] = seedAdmin
        }
        // 反序列化后清除登录态，强制重新登录
        if (state) {
          state.currentUser = null
          state.error = null
        }
      },
    },
  ),
)

// 获取当前登录的账户信息
export function getCurrentAccount(): Account | null {
  const { currentUser, accounts } = useAuthStore.getState()
  if (!currentUser) return null
  return accounts[currentUser] ?? null
}
