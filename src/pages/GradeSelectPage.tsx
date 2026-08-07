import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore, getCurrentAccount } from '../store/useAuthStore'
import { useUserStore } from '../store/useUserStore'
import { useWordStore } from '../store/useWordStore'
import { getTextbook } from '../data/textbooks'
import MagicCard from '../components/MagicCard'
import MagicButton from '../components/MagicButton'

const GRADE_GROUPS = [
  { title: '小学', icon: '🌸', grades: [1, 2, 3, 4, 5, 6] },
  { title: '初中', icon: '📚', grades: [7, 8, 9] },
  { title: '高中', icon: '🎓', grades: [10, 11, 12] },
  { title: '大学及以上', icon: '🏆', grades: [13, 14, 15, 16, 17] },
]

const GRADE_LABELS: Record<number, string> = {
  1: '一年级', 2: '二年级', 3: '三年级',
  4: '四年级', 5: '五年级', 6: '六年级',
  7: '初一', 8: '初二', 9: '初三',
  10: '高一', 11: '高二', 12: '高三',
  13: '四级', 14: '六级', 15: '雅思',
  16: '托福', 17: 'GRE',
}

export default function GradeSelectPage() {
  const navigate = useNavigate()
  const { currentUser, setCurrentGrade } = useAuthStore()
  const { setUserGrade, setUserName } = useUserStore()
  const { setGrade: setWordGrade } = useWordStore()
  const [selected, setSelected] = useState<number | null>(null)

  // 未登录保护
  if (!currentUser) {
    navigate('/login')
    return null
  }

  const account = getCurrentAccount()

  const handleStartTest = () => {
    if (selected === null) return
    // 同步到 authStore 和 userStore
    setCurrentGrade(selected)
    setUserGrade(selected)
    setWordGrade(selected)
    if (account) {
      setUserName(account.username)
    }
    // 跳转到测试页
    navigate('/test')
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-3xl">
        {/* 标题 */}
        <div className="text-center mb-8">
          <div className="text-6xl mb-3 animate-float">🧙‍♂️</div>
          <h1 className="text-3xl font-magic font-extrabold text-gold mb-2">
            选择你的年级
          </h1>
          <p className="text-cream/60 text-sm">
            欢迎回来，<span className="text-gold-light font-bold">{account?.username}</span>！
            选择对应年级后，需通过入学测试才能进入学院
          </p>
          {account && account.passedGrade > 0 && (
            <p className="text-xs text-mint mt-2">
              ✓ 你已通过的最高年级：{GRADE_LABELS[account.passedGrade] || account.passedGrade}
            </p>
          )}
        </div>

        {/* 年级选择网格 */}
        <div className="space-y-5">
          {GRADE_GROUPS.map((group) => (
            <MagicCard key={group.title} className="p-5">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{group.icon}</span>
                <h3 className="font-magic font-bold text-gold text-lg">{group.title}</h3>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                {group.grades.map((grade) => {
                  const isPassed = account && grade <= account.passedGrade
                  const isCurrent = account && grade === account.currentGrade
                  const isSelected = selected === grade
                  const tb = getTextbook(grade)
                  return (
                    <div key={grade} className="relative">
                      <button
                        onClick={() => setSelected(grade)}
                        className={`relative w-full py-3 px-2 rounded-xl text-sm font-medium transition-all border-2 ${
                          isSelected
                            ? 'bg-gold text-cosmos-deep border-gold shadow-glow-gold scale-105'
                            : isPassed
                            ? 'bg-mint/20 text-mint border-mint/40 hover:bg-mint/30'
                            : 'bg-cosmos-deep/40 text-cream/70 border-gold/20 hover:border-gold/50 hover:text-cream'
                        }`}
                      >
                        {GRADE_LABELS[grade]}
                        {isPassed && !isSelected && (
                          <span className="absolute -top-1 -right-1 text-xs">✓</span>
                        )}
                        {isCurrent && !isSelected && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 text-[9px] text-gold-light whitespace-nowrap">
                            当前
                          </span>
                        )}
                      </button>
                      {/* 电子课本链接 */}
                      {tb && (
                        <a
                          href={tb.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title={`查看电子课本：${tb.name}`}
                          className="absolute -bottom-1.5 -right-1.5 flex items-center justify-center w-5 h-5 rounded-full bg-blue-500/90 hover:bg-blue-400 text-white text-[10px] shadow-md transition-all hover:scale-110 z-10"
                        >
                          📖
                        </a>
                      )}
                    </div>
                  )
                })}
              </div>
            </MagicCard>
          ))}
        </div>

        {/* 开始测试按钮 */}
        <div className="mt-8 flex flex-col items-center gap-3">
          <MagicButton
            variant="primary"
            onClick={handleStartTest}
            disabled={selected === null}
            icon="🧪"
            className="px-10 py-3 text-base"
          >
            开始入学测试
          </MagicButton>
          <div className="text-center text-xs text-cream/50 max-w-md">
            <p>📋 测试规则：共 20 题，答对 70% 即通过</p>
            <p>⚠️ 3 次未通过将自动降 1 个年级</p>
          </div>
          {/* 电子课本提示 */}
          <div className="mt-2 text-center text-[11px] text-blue-300/70 max-w-md">
            <p>📖 点击年级按钮右下角的蓝色图标可查看对应电子课本</p>
            <p>（3-9年级：人教版PEP/Go for it! · 10-12年级：人教版2019新课标）</p>
          </div>
        </div>
      </div>
    </div>
  )
}
