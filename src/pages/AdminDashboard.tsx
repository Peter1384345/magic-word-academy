import { useState, useMemo } from 'react'
import {
  useAuthStore,
  type Account,
  ADMIN_USERNAME,
} from '../store/useAuthStore'
import { useUserStore, PETS, type TestResult } from '../store/useUserStore'
import { useWordStore } from '../store/useWordStore'
import MagicCard from '../components/MagicCard'
import MagicButton from '../components/MagicButton'
import type { Word } from '../types'

const GRADE_LABELS: Record<number, string> = {
  1: '一年级', 2: '二年级', 3: '三年级',
  4: '四年级', 5: '五年级', 6: '六年级',
  7: '初一', 8: '初二', 9: '初三',
  10: '高一', 11: '高二', 12: '高三',
  13: '四级', 14: '六级', 15: '雅思',
  16: '托福', 17: 'GRE',
}

// 格式化日期
function fmtDate(iso?: string): string {
  if (!iso) return '-'
  try {
    return new Date(iso).toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit',
    })
  } catch {
    return iso
  }
}

// 标签页类型
type Tab = 'overview' | 'users' | 'words' | 'settings'

export default function AdminDashboard() {
  const {
    accounts,
    isAdmin,
    adminDeleteUser,
    adminResetPassword,
    adminSetUserGrade,
    adminCreateUser,
    adminBatchResetPassword,
    adminBatchSetGrade,
    adminBatchDelete,
    adminClearAllUsers,
    error,
    clearError,
  } = useAuthStore()
  const userStore = useUserStore.getState()
  const { getWordsByGrade } = useWordStore()

  const [tab, setTab] = useState<Tab>('overview')

  // Toast 提示
  const [toast, setToast] = useState<string | null>(null)
  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 2000)
  }

  // 所有用户列表
  const userList = useMemo(
    () => Object.values(accounts).sort((a, b) => (a.createdAt > b.createdAt ? 1 : -1)),
    [accounts],
  )

  if (!isAdmin()) {
    return (
      <MagicCard className="p-8 text-center">
        <div className="text-5xl mb-3">🔒</div>
        <h2 className="text-2xl font-magic font-bold text-magic-pink mb-2">
          权限不足
        </h2>
        <p className="text-cream/60">仅管理员可访问后台管理页面。</p>
      </MagicCard>
    )
  }

  return (
    <div className="space-y-5 animate-pop-in">
      {/* Toast 提示 */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-mint text-cosmos-deep px-5 py-3 rounded-xl shadow-glow-gold font-bold animate-float">
          ✓ {toast}
        </div>
      )}

      {/* 标签页导航 */}
      <div className="flex gap-2 p-1 bg-cosmos-deep/40 rounded-xl overflow-x-auto">
        {([
          { key: 'overview', label: '📊 总览' },
          { key: 'users', label: '👥 用户管理' },
          { key: 'words', label: '📖 词库管理' },
          { key: 'settings', label: '⚙️ 系统设置' },
        ] as { key: Tab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 min-w-[120px] py-2.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              tab === t.key
                ? 'bg-gold text-cosmos-deep shadow-glow-gold font-bold'
                : 'text-cream/60 hover:text-cream hover:bg-gold/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 标签页内容 */}
      {tab === 'overview' && (
        <OverviewTab userList={userList} getWordsByGrade={getWordsByGrade} />
      )}
      {tab === 'users' && (
        <UsersTab
          userList={userList}
          onDelete={(u) => {
            if (confirm(`确定删除用户「${u}」？此操作不可撤销。`)) {
              if (adminDeleteUser(u)) showToast(`已删除 ${u}`)
              else if (error) { alert(error); clearError() }
            }
          }}
          onResetPwd={(u, p) => {
            if (adminResetPassword(u, p)) showToast(`已重置 ${u} 的密码`)
            else if (error) { alert(error); clearError() }
          }}
          onSetGrade={(u, g) => {
            if (adminSetUserGrade(u, g)) showToast(`已调整 ${u} 到 ${GRADE_LABELS[g]}`)
            else if (error) { alert(error); clearError() }
          }}
          onCreate={(u, p, g) => {
            if (adminCreateUser(u, p, g)) showToast(`已创建用户 ${u}`)
            else if (error) { alert(error); clearError() }
          }}
          onBatchReset={(us, p) => {
            const n = adminBatchResetPassword(us, p)
            showToast(`已批量重置 ${n} 个用户的密码`)
          }}
          onBatchSetGrade={(us, g) => {
            const n = adminBatchSetGrade(us, g)
            showToast(`已批量调整 ${n} 个用户到 ${GRADE_LABELS[g]}`)
          }}
          onBatchDelete={(us) => {
            if (!confirm(`确定批量删除 ${us.length} 个用户？不可撤销。`)) return
            const n = adminBatchDelete(us)
            showToast(`已删除 ${n} 个用户`)
          }}
          userStore={userStore}
        />
      )}
      {tab === 'words' && <WordsTab getWordsByGrade={getWordsByGrade} />}
      {tab === 'settings' && (
        <SettingsTab
          userList={userList}
          onClearAll={() => {
            if (!confirm('确定清空所有普通用户？仅保留管理员。不可撤销！')) return
            const n = adminClearAllUsers()
            showToast(`已清空 ${n} 个普通用户`)
          }}
          showToast={showToast}
        />
      )}
    </div>
  )
}

/* ============ 总览标签 ============ */
function OverviewTab({
  userList,
  getWordsByGrade,
}: {
  userList: Account[]
  getWordsByGrade: (g: number) => Word[]
}) {
  const stats = useMemo(() => {
    const total = userList.length
    const adminCount = userList.filter((u) => u.role === 'admin').length
    const userCount = total - adminCount
    const gradeDist: Record<number, number> = {}
    userList.forEach((u) => {
      gradeDist[u.currentGrade] = (gradeDist[u.currentGrade] ?? 0) + 1
    })
    const avgPassed = total > 0 ? userList.reduce((s, u) => s + u.passedGrade, 0) / total : 0
    const totalWords = Array.from({ length: 17 }, (_, i) => getWordsByGrade(i + 1).length).reduce((a, b) => a + b, 0)
    return { total, adminCount, userCount, gradeDist, avgPassed, totalWords }
  }, [userList, getWordsByGrade])

  return (
    <div className="space-y-5">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <MagicCard className="p-5 text-center">
          <div className="text-3xl mb-1">👥</div>
          <p className="text-xs text-cream/60">总用户数</p>
          <p className="text-3xl font-magic font-extrabold text-gold-light">{stats.total}</p>
        </MagicCard>
        <MagicCard className="p-5 text-center">
          <div className="text-3xl mb-1">🧙‍♂️</div>
          <p className="text-xs text-cream/60">管理员</p>
          <p className="text-3xl font-magic font-extrabold text-gold-light">{stats.adminCount}</p>
        </MagicCard>
        <MagicCard className="p-5 text-center">
          <div className="text-3xl mb-1">✨</div>
          <p className="text-xs text-cream/60">普通用户</p>
          <p className="text-3xl font-magic font-extrabold text-gold-light">{stats.userCount}</p>
        </MagicCard>
        <MagicCard className="p-5 text-center">
          <div className="text-3xl mb-1">📚</div>
          <p className="text-xs text-cream/60">平均通过年级</p>
          <p className="text-3xl font-magic font-extrabold text-gold-light">{stats.avgPassed.toFixed(1)}</p>
        </MagicCard>
        <MagicCard className="p-5 text-center">
          <div className="text-3xl mb-1">📖</div>
          <p className="text-xs text-cream/60">总词库量</p>
          <p className="text-3xl font-magic font-extrabold text-gold-light">{stats.totalWords}</p>
        </MagicCard>
      </div>

      {/* 年级分布 + 词库概况 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <MagicCard className="p-5">
          <h3 className="font-magic font-bold text-gold-light mb-4 flex items-center gap-2">
            📊 当前年级分布
          </h3>
          <div className="space-y-2">
            {Array.from({ length: 17 }, (_, i) => i + 1).map((g) => {
              const count = stats.gradeDist[g] ?? 0
              const max = Math.max(1, ...Object.values(stats.gradeDist))
              const percent = (count / max) * 100
              return (
                <div key={g} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-cream/70 text-right shrink-0">{GRADE_LABELS[g]}</span>
                  <div className="flex-1 h-4 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-primary to-gold rounded-full transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-10 text-xs font-semibold text-gold-light text-right shrink-0">{count}人</span>
                </div>
              )
            })}
          </div>
        </MagicCard>

        <MagicCard className="p-5">
          <h3 className="font-magic font-bold text-gold-light mb-4 flex items-center gap-2">
            📖 各年级词库量
          </h3>
          <div className="space-y-2">
            {Array.from({ length: 17 }, (_, i) => i + 1).map((g) => {
              const count = getWordsByGrade(g).length
              const max = Math.max(1, ...Array.from({ length: 17 }, (_, i2) => getWordsByGrade(i2 + 1).length))
              const percent = (count / max) * 100
              return (
                <div key={g} className="flex items-center gap-3">
                  <span className="w-16 text-xs text-cream/70 text-right shrink-0">{GRADE_LABELS[g]}</span>
                  <div className="flex-1 h-4 bg-white/50 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-mint to-gold rounded-full transition-all" style={{ width: `${percent}%` }} />
                  </div>
                  <span className="w-14 text-xs font-semibold text-gold-light text-right shrink-0">{count} 词</span>
                </div>
              )
            })}
          </div>
        </MagicCard>
      </div>
    </div>
  )
}

/* ============ 用户管理标签 ============ */
type SortKey = 'createdAt' | 'username' | 'currentGrade' | 'passedGrade'
type SortDir = 'asc' | 'desc'

function UsersTab({
  userList,
  onDelete,
  onResetPwd,
  onSetGrade,
  onCreate,
  onBatchReset,
  onBatchSetGrade,
  onBatchDelete,
  userStore,
}: {
  userList: Account[]
  onDelete: (u: string) => void
  onResetPwd: (u: string, p: string) => void
  onSetGrade: (u: string, g: number) => void
  onCreate: (u: string, p: string, g: number) => void
  onBatchReset: (us: string[], p: string) => void
  onBatchSetGrade: (us: string[], g: number) => void
  onBatchDelete: (us: string[]) => void
  userStore: ReturnType<typeof useUserStore.getState>
}) {
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'user'>('all')
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all')
  const [sortKey, setSortKey] = useState<SortKey>('createdAt')
  const [sortDir, setSortDir] = useState<SortDir>('asc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [newPwd, setNewPwd] = useState('')
  const [newGrade, setNewGrade] = useState(1)
  const [showCreate, setShowCreate] = useState(false)
  const [cuName, setCuName] = useState('')
  const [cuPwd, setCuPwd] = useState('')
  const [cuGrade, setCuGrade] = useState(1)
  const [batchPwd, setBatchPwd] = useState('')
  const [batchGrade, setBatchGrade] = useState(1)

  // 过滤+排序后的列表
  const filtered = useMemo(() => {
    let list = userList
    // 搜索
    if (search.trim()) {
      const s = search.trim().toLowerCase()
      list = list.filter((u) => u.username.toLowerCase().includes(s))
    }
    // 角色筛选
    if (roleFilter !== 'all') {
      list = list.filter((u) => u.role === roleFilter)
    }
    // 年级筛选
    if (gradeFilter !== 'all') {
      list = list.filter((u) => u.currentGrade === gradeFilter)
    }
    // 排序
    const sorted = [...list].sort((a, b) => {
      let cmp = 0
      if (sortKey === 'username') cmp = a.username.localeCompare(b.username)
      else if (sortKey === 'currentGrade') cmp = a.currentGrade - b.currentGrade
      else if (sortKey === 'passedGrade') cmp = a.passedGrade - b.passedGrade
      else cmp = a.createdAt.localeCompare(b.createdAt)
      return sortDir === 'asc' ? cmp : -cmp
    })
    return sorted
  }, [userList, search, roleFilter, gradeFilter, sortKey, sortDir])

  // 切换排序
  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc')
    } else {
      setSortKey(key)
      setSortDir('asc')
    }
  }

  // 全选/取消全选（仅当前过滤结果中的非管理员）
  const toggleSelectAll = () => {
    const selectable = filtered.filter((u) => u.role !== 'admin').map((u) => u.username)
    const allSelected = selectable.every((u) => selected.has(u))
    const next = new Set(selected)
    if (allSelected) {
      selectable.forEach((u) => next.delete(u))
    } else {
      selectable.forEach((u) => next.add(u))
    }
    setSelected(next)
  }

  const toggleSelect = (username: string) => {
    const next = new Set(selected)
    if (next.has(username)) next.delete(username)
    else next.add(username)
    setSelected(next)
  }

  const selectedList = Array.from(selected)

  const openEdit = (acc: Account) => {
    setEditingUser(acc.username)
    setNewGrade(acc.currentGrade)
    setNewPwd('')
  }

  const saveEdit = () => {
    if (!editingUser) return
    if (newPwd) onResetPwd(editingUser, newPwd)
    onSetGrade(editingUser, newGrade)
    setEditingUser(null)
  }

  const handleCreate = () => {
    onCreate(cuName, cuPwd, cuGrade)
    setShowCreate(false)
    setCuName('')
    setCuPwd('')
    setCuGrade(1)
  }

  const sortIcon = (key: SortKey) => {
    if (sortKey !== key) return '↕'
    return sortDir === 'asc' ? '↑' : '↓'
  }

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <MagicCard className="p-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* 搜索 */}
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40">🔍</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="搜索用户名..."
              className="w-full pl-9 pr-4 py-2 rounded-lg bg-cosmos-deep/50 border border-gold/20 text-cream placeholder:text-cream/30 focus:border-gold/60 focus:outline-none text-sm"
            />
          </div>
          {/* 角色筛选 */}
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as 'all' | 'admin' | 'user')}
            className="px-3 py-2 rounded-lg bg-cosmos-deep/50 border border-gold/20 text-cream text-sm"
          >
            <option value="all" className="bg-cosmos-deep">全部角色</option>
            <option value="admin" className="bg-cosmos-deep">管理员</option>
            <option value="user" className="bg-cosmos-deep">普通用户</option>
          </select>
          {/* 年级筛选 */}
          <select
            value={gradeFilter}
            onChange={(e) => setGradeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))}
            className="px-3 py-2 rounded-lg bg-cosmos-deep/50 border border-gold/20 text-cream text-sm"
          >
            <option value="all" className="bg-cosmos-deep">全部年级</option>
            {Array.from({ length: 17 }, (_, i) => i + 1).map((g) => (
              <option key={g} value={g} className="bg-cosmos-deep">{GRADE_LABELS[g]}</option>
            ))}
          </select>
          {/* 新建用户 */}
          <MagicButton variant="primary" onClick={() => setShowCreate(true)}>➕ 新建用户</MagicButton>
        </div>

        {/* 批量操作栏 */}
        {selectedList.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gold/20 flex flex-wrap items-center gap-2">
            <span className="text-sm text-gold-light font-semibold">
              已选 {selectedList.length} 个用户
            </span>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={batchPwd}
                onChange={(e) => setBatchPwd(e.target.value)}
                placeholder="批量密码"
                className="w-28 px-2 py-1 rounded bg-cosmos-deep/50 border border-gold/20 text-cream text-xs"
              />
              <button
                onClick={() => {
                  if (!batchPwd) return alert('请输入批量密码')
                  onBatchReset(selectedList, batchPwd)
                  setBatchPwd('')
                  setSelected(new Set())
                }}
                className="text-xs px-2.5 py-1 rounded bg-gold/20 text-gold-light hover:bg-gold/40"
              >批量重置密码</button>
            </div>
            <div className="flex items-center gap-1">
              <select
                value={batchGrade}
                onChange={(e) => setBatchGrade(Number(e.target.value))}
                className="px-2 py-1 rounded bg-cosmos-deep/50 border border-gold/20 text-cream text-xs"
              >
                {Array.from({ length: 17 }, (_, i) => i + 1).map((g) => (
                  <option key={g} value={g} className="bg-cosmos-deep">{GRADE_LABELS[g]}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  onBatchSetGrade(selectedList, batchGrade)
                  setSelected(new Set())
                }}
                className="text-xs px-2.5 py-1 rounded bg-gold/20 text-gold-light hover:bg-gold/40"
              >批量调整年级</button>
            </div>
            <button
              onClick={() => {
                onBatchDelete(selectedList)
                setSelected(new Set())
              }}
              className="text-xs px-2.5 py-1 rounded bg-magic-pink/20 text-magic-pink hover:bg-magic-pink/40"
            >批量删除</button>
            <button
              onClick={() => setSelected(new Set())}
              className="text-xs px-2.5 py-1 rounded bg-white/30 text-cream/70 hover:bg-white/50"
            >取消选择</button>
          </div>
        )}
      </MagicCard>

      {/* 用户表格 */}
      <MagicCard className="p-5" glow>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-magic font-bold text-gold-light">
            👥 用户列表（{filtered.length} / {userList.length}）
          </h3>
          <button
            onClick={toggleSelectAll}
            className="text-xs px-3 py-1 rounded bg-gold/20 text-gold-light hover:bg-gold/40"
          >
            {filtered.filter((u) => u.role !== 'admin').every((u) => selected.has(u.username)) ? '取消全选' : '全选非管理员'}
          </button>
        </div>

        <div className="overflow-x-auto -mx-1">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-cream/60 border-b border-gold/20">
                <th className="text-left py-2 px-2 w-8">
                  <span className="block text-center">#</span>
                </th>
                <th className="text-left py-2 px-2 cursor-pointer hover:text-gold-light" onClick={() => toggleSort('username')}>
                  用户名 <span className="text-gold-light">{sortIcon('username')}</span>
                </th>
                <th className="text-left py-2 px-2">角色</th>
                <th className="text-left py-2 px-2 cursor-pointer hover:text-gold-light" onClick={() => toggleSort('currentGrade')}>
                  当前年级 <span className="text-gold-light">{sortIcon('currentGrade')}</span>
                </th>
                <th className="text-left py-2 px-2 cursor-pointer hover:text-gold-light" onClick={() => toggleSort('passedGrade')}>
                  最高通过 <span className="text-gold-light">{sortIcon('passedGrade')}</span>
                </th>
                <th className="text-left py-2 px-2">已解锁宠物</th>
                <th className="text-left py-2 px-2">最后测试</th>
                <th className="text-left py-2 px-2 cursor-pointer hover:text-gold-light" onClick={() => toggleSort('createdAt')}>
                  注册时间 <span className="text-gold-light">{sortIcon('createdAt')}</span>
                </th>
                <th className="text-right py-2 px-2">操作</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-cream/40">
                    🔍 没有匹配的用户
                  </td>
                </tr>
              )}
              {filtered.map((acc) => {
                const isAdminAcc = acc.role === 'admin'
                const lastResult: TestResult | undefined = userStore.lastTestResult[acc.currentGrade]
                const unlockedPets = PETS.filter(
                  (p) => p.unlockedGrade <= acc.passedGrade || userStore.unlockedPets.includes(p.id),
                ).length
                return (
                  <tr key={acc.username} className="border-b border-gold/10 hover:bg-gold/5 transition-colors">
                    <td className="py-3 px-2 text-center">
                      {!isAdminAcc && (
                        <input
                          type="checkbox"
                          checked={selected.has(acc.username)}
                          onChange={() => toggleSelect(acc.username)}
                          className="w-4 h-4 accent-gold cursor-pointer"
                        />
                      )}
                    </td>
                    <td className="py-3 px-2 font-semibold text-cream">
                      <span className="flex items-center gap-1.5">
                        {isAdminAcc && <span title="管理员">👑</span>}
                        {acc.username}
                      </span>
                    </td>
                    <td className="py-3 px-2">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${isAdminAcc ? 'bg-gold/30 text-gold-light' : 'bg-primary/30 text-primary-light'}`}>
                        {isAdminAcc ? '管理员' : '用户'}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-cream/80">{GRADE_LABELS[acc.currentGrade] ?? acc.currentGrade}</td>
                    <td className="py-3 px-2 text-mint font-semibold">
                      {acc.passedGrade > 0 ? GRADE_LABELS[acc.passedGrade] ?? acc.passedGrade : '未通过'}
                    </td>
                    <td className="py-3 px-2 text-gold-light">{unlockedPets} / {PETS.length}</td>
                    <td className="py-3 px-2 text-xs text-cream/60">
                      {lastResult ? (
                        <div>
                          <div>{lastResult.score}/{lastResult.total}（{lastResult.passed ? <span className="text-mint">通过</span> : <span className="text-magic-pink">未通过</span>}）</div>
                          <div className="text-cream/40 mt-0.5">{fmtDate(lastResult.date)}</div>
                        </div>
                      ) : <span className="text-cream/30">暂无</span>}
                    </td>
                    <td className="py-3 px-2 text-xs text-cream/60 whitespace-nowrap">{fmtDate(acc.createdAt)}</td>
                    <td className="py-3 px-2 text-right space-x-2 whitespace-nowrap">
                      {!isAdminAcc && (
                        <>
                          <button onClick={() => openEdit(acc)} className="text-xs px-2.5 py-1 rounded-lg bg-gold/20 text-gold-light hover:bg-gold/40">编辑</button>
                          <button onClick={() => onDelete(acc.username)} className="text-xs px-2.5 py-1 rounded-lg bg-magic-pink/20 text-magic-pink hover:bg-magic-pink/40">删除</button>
                        </>
                      )}
                      {isAdminAcc && <span className="text-xs text-cream/30">不可操作</span>}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </MagicCard>

      {/* 编辑弹窗 */}
      {editingUser && (
        <div className="fixed inset-0 bg-cosmos-deep/70 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setEditingUser(null)}>
          <MagicCard className="w-full max-w-md p-6 animate-pop-in" glow onClick={(e) => e.stopPropagation()}>
            <h3 className="font-magic font-bold text-xl text-gold-light mb-4">✏️ 编辑用户：{editingUser}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-cream/70 block mb-1.5">重置密码（留空则不改）</label>
                <input type="text" value={newPwd} onChange={(e) => setNewPwd(e.target.value)} placeholder="至少 4 位"
                  className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gold/30 focus:border-gold focus:outline-none text-cream placeholder:text-cream/30" />
              </div>
              <div>
                <label className="text-sm text-cream/70 block mb-1.5">修改当前年级</label>
                <select value={newGrade} onChange={(e) => setNewGrade(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gold/30 focus:border-gold focus:outline-none text-cream">
                  {Array.from({ length: 17 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g} className="bg-cosmos-deep">{GRADE_LABELS[g]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <MagicButton variant="ghost" className="flex-1" onClick={() => setEditingUser(null)}>取消</MagicButton>
                <MagicButton variant="primary" className="flex-1" onClick={saveEdit}>保存</MagicButton>
              </div>
            </div>
          </MagicCard>
        </div>
      )}

      {/* 新建用户弹窗 */}
      {showCreate && (
        <div className="fixed inset-0 bg-cosmos-deep/70 backdrop-blur-sm z-40 flex items-center justify-center p-4" onClick={() => setShowCreate(false)}>
          <MagicCard className="w-full max-w-md p-6 animate-pop-in" glow onClick={(e) => e.stopPropagation()}>
            <h3 className="font-magic font-bold text-xl text-gold-light mb-4">➕ 新建用户</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-cream/70 block mb-1.5">用户名</label>
                <input type="text" value={cuName} onChange={(e) => setCuName(e.target.value)} placeholder="至少 2 位"
                  className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gold/30 focus:border-gold focus:outline-none text-cream placeholder:text-cream/30" />
              </div>
              <div>
                <label className="text-sm text-cream/70 block mb-1.5">密码</label>
                <input type="text" value={cuPwd} onChange={(e) => setCuPwd(e.target.value)} placeholder="至少 4 位"
                  className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gold/30 focus:border-gold focus:outline-none text-cream placeholder:text-cream/30" />
              </div>
              <div>
                <label className="text-sm text-cream/70 block mb-1.5">初始年级</label>
                <select value={cuGrade} onChange={(e) => setCuGrade(Number(e.target.value))}
                  className="w-full px-4 py-2 rounded-xl bg-white/50 border border-gold/30 focus:border-gold focus:outline-none text-cream">
                  {Array.from({ length: 17 }, (_, i) => i + 1).map((g) => (
                    <option key={g} value={g} className="bg-cosmos-deep">{GRADE_LABELS[g]}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <MagicButton variant="ghost" className="flex-1" onClick={() => setShowCreate(false)}>取消</MagicButton>
                <MagicButton variant="primary" className="flex-1" onClick={handleCreate}>创建</MagicButton>
              </div>
            </div>
          </MagicCard>
        </div>
      )}
    </div>
  )
}

/* ============ 词库管理标签 ============ */
function WordsTab({ getWordsByGrade }: { getWordsByGrade: (g: number) => Word[] }) {
  const [selectedGrade, setSelectedGrade] = useState<number>(1)
  const [wordSearch, setWordSearch] = useState('')

  const words = getWordsByGrade(selectedGrade)
  const filteredWords = useMemo(() => {
    if (!wordSearch.trim()) return words
    const s = wordSearch.trim().toLowerCase()
    return words.filter(
      (w) =>
        w.word.toLowerCase().includes(s) ||
        w.translation.includes(s) ||
        (w.pos && w.pos.includes(s)),
    )
  }, [words, wordSearch])

  // 各年级词数统计
  const gradeStats = useMemo(
    () => Array.from({ length: 17 }, (_, i) => ({
      grade: i + 1,
      count: getWordsByGrade(i + 1).length,
    })),
    [getWordsByGrade],
  )
  const totalWords = gradeStats.reduce((s, g) => s + g.count, 0)

  return (
    <div className="space-y-4">
      {/* 年级选择卡片 */}
      <MagicCard className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-magic font-bold text-gold-light">📖 词库总览（共 {totalWords} 词）</h3>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-9 gap-2">
          {gradeStats.map((g) => (
            <button
              key={g.grade}
              onClick={() => { setSelectedGrade(g.grade); setWordSearch('') }}
              className={`p-2 rounded-lg text-center transition-all ${
                selectedGrade === g.grade
                  ? 'bg-gold text-cosmos-deep shadow-glow-gold font-bold'
                  : 'bg-cosmos-deep/40 text-cream/70 hover:bg-gold/15'
              }`}
            >
              <div className="text-[10px] leading-tight">{GRADE_LABELS[g.grade]}</div>
              <div className="text-sm font-bold mt-0.5">{g.count}</div>
            </button>
          ))}
        </div>
      </MagicCard>

      {/* 选中年级的词表 */}
      <MagicCard className="p-5" glow>
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h3 className="font-magic font-bold text-gold-light">
            📚 {GRADE_LABELS[selectedGrade]} 词库（{filteredWords.length} / {words.length}）
          </h3>
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-cream/40">🔍</span>
            <input
              type="text"
              value={wordSearch}
              onChange={(e) => setWordSearch(e.target.value)}
              placeholder="搜索单词/释义/词性..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-cosmos-deep/50 border border-gold/20 text-cream placeholder:text-cream/30 focus:border-gold/60 focus:outline-none text-sm"
            />
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-cosmos-deep/80 backdrop-blur">
              <tr className="text-xs text-cream/60 border-b border-gold/20">
                <th className="text-left py-2 px-2 w-12">#</th>
                <th className="text-left py-2 px-2">单词</th>
                <th className="text-left py-2 px-2">音标(美)</th>
                <th className="text-left py-2 px-2">词性</th>
                <th className="text-left py-2 px-2">释义</th>
              </tr>
            </thead>
            <tbody>
              {filteredWords.length === 0 && (
                <tr><td colSpan={5} className="py-8 text-center text-cream/40">🔍 没有匹配的单词</td></tr>
              )}
              {filteredWords.map((w, i) => (
                <tr key={`${w.word}-${i}`} className="border-b border-gold/10 hover:bg-gold/5">
                  <td className="py-2 px-2 text-cream/40 text-xs">{i + 1}</td>
                  <td className="py-2 px-2 font-semibold text-gold-light">{w.word}</td>
                  <td className="py-2 px-2 text-xs text-cream/60 italic">{w.phonetic_us || '-'}</td>
                  <td className="py-2 px-2 text-xs text-cream/60">{w.pos || '-'}</td>
                  <td className="py-2 px-2 text-cream/80">{w.translation}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MagicCard>
    </div>
  )
}

/* ============ 系统设置标签 ============ */
function SettingsTab({
  userList,
  onClearAll,
  showToast,
}: {
  userList: Account[]
  onClearAll: () => void
  showToast: (msg: string) => void
}) {
  // 导出所有用户数据为 JSON
  const exportUsers = () => {
    const data = JSON.stringify(userList, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    showToast('已导出用户数据 JSON')
  }

  // 导出为 CSV
  const exportCSV = () => {
    const headers = ['用户名', '角色', '当前年级', '最高通过年级', '注册时间']
    const rows = userList.map((u) => [
      u.username,
      u.role === 'admin' ? '管理员' : '用户',
      GRADE_LABELS[u.currentGrade] ?? u.currentGrade,
      u.passedGrade > 0 ? GRADE_LABELS[u.passedGrade] ?? u.passedGrade : '未通过',
      u.createdAt,
    ])
    const csv = '\uFEFF' + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `users-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    showToast('已导出 CSV 表格')
  }

  return (
    <div className="space-y-5">
      {/* 数据导出 */}
      <MagicCard className="p-5">
        <h3 className="font-magic font-bold text-gold-light mb-4 flex items-center gap-2">
          📤 数据导出
        </h3>
        <p className="text-sm text-cream/60 mb-4">
          导出当前所有用户数据，用于备份或外部分析。
        </p>
        <div className="flex flex-wrap gap-3">
          <MagicButton variant="primary" onClick={exportUsers}>📦 导出 JSON</MagicButton>
          <MagicButton variant="secondary" onClick={exportCSV}>📊 导出 CSV</MagicButton>
        </div>
      </MagicCard>

      {/* 管理员账号信息 */}
      <MagicCard className="p-5">
        <h3 className="font-magic font-bold text-gold-light mb-4 flex items-center gap-2">
          👑 管理员账号
        </h3>
        <div className="bg-cosmos-deep/40 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-cream/60">默认账号</span>
            <span className="text-gold-light font-semibold">{ADMIN_USERNAME}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-cream/60">默认密码</span>
            <span className="text-gold-light font-semibold">admin123</span>
          </div>
          <div className="text-xs text-cream/40 mt-2 pt-2 border-t border-gold/10">
            ⚠️ 为安全起见，请在生产环境中修改默认密码。
          </div>
        </div>
      </MagicCard>

      {/* 危险操作区 */}
      <MagicCard className="p-5 border border-magic-pink/30">
        <h3 className="font-magic font-bold text-magic-pink mb-4 flex items-center gap-2">
          ⚠️ 危险操作
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <p className="text-sm text-cream font-semibold">清空所有普通用户</p>
              <p className="text-xs text-cream/50 mt-0.5">
                删除除管理员外的所有用户账户，不可撤销。
              </p>
            </div>
            <MagicButton variant="ghost" onClick={onClearAll} className="border border-magic-pink/40 text-magic-pink hover:bg-magic-pink/20">
              🗑️ 清空用户
            </MagicButton>
          </div>
        </div>
      </MagicCard>

      {/* 系统信息 */}
      <MagicCard className="p-5">
        <h3 className="font-magic font-bold text-gold-light mb-4 flex items-center gap-2">
          ℹ️ 系统信息
        </h3>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="bg-cosmos-deep/40 rounded-lg p-3">
            <p className="text-xs text-cream/50">应用名称</p>
            <p className="text-gold-light font-semibold mt-1">魔法单词学院</p>
          </div>
          <div className="bg-cosmos-deep/40 rounded-lg p-3">
            <p className="text-xs text-cream/50">数据存储</p>
            <p className="text-gold-light font-semibold mt-1">浏览器本地存储</p>
          </div>
          <div className="bg-cosmos-deep/40 rounded-lg p-3">
            <p className="text-xs text-cream/50">年级数量</p>
            <p className="text-gold-light font-semibold mt-1">17 个等级</p>
          </div>
          <div className="bg-cosmos-deep/40 rounded-lg p-3">
            <p className="text-xs text-cream/50">当前用户数</p>
            <p className="text-gold-light font-semibold mt-1">{userList.length} 个账户</p>
          </div>
        </div>
      </MagicCard>
    </div>
  )
}
