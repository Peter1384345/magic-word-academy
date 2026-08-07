import { useState } from 'react'
import { useUserStore } from '../store/useUserStore'
import { useProgressStore } from '../store/useProgressStore'
import MagicCard from '../components/MagicCard'
import MagicButton from '../components/MagicButton'

export default function SettingsPage() {
  const {
    userProfile,
    setUserName,
    setTodayGoal,
    completeOnboarding,
  } = useUserStore()
  const { resetProgress, clearWrongWords } = useProgressStore()

  const [name, setName] = useState(userProfile.name)
  const [goal, setGoal] = useState(userProfile.todayGoal)
  const [saved, setSaved] = useState(false)

  const handleSave = () => {
    setUserName(name.trim() || '小魔法师')
    setTodayGoal(Math.max(1, goal))
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const handleResetProgress = () => {
    if (confirm('确定要重置所有学习进度吗？错词本和已学记录将被清空，此操作不可恢复。')) {
      resetProgress()
      clearWrongWords()
      alert('进度已重置')
    }
  }

  const handleResetAll = () => {
    if (confirm('确定要重置所有数据吗？包括用户信息、等级、宠物等，将回到初始状态！')) {
      localStorage.removeItem('magic-word-academy-user')
      localStorage.removeItem('magic-word-academy-progress')
      location.reload()
    }
  }

  return (
    <div className="space-y-6 animate-pop-in max-w-2xl mx-auto">
      {/* 个人信息 */}
      <MagicCard className="p-6">
        <h2 className="text-xl font-magic font-bold text-gold-light mb-4">⚙️ 个人信息</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-rounded font-semibold text-cream/70 mb-1">
              用户名
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-white/70 border border-primary/40 rounded-xl px-4 py-2.5 font-rounded text-gold-light focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="输入你的名字"
            />
          </div>
          <div>
            <label className="block text-sm font-rounded font-semibold text-cream/70 mb-1">
              每日学习目标
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={1}
                max={200}
                value={goal}
                onChange={(e) => setGoal(Number(e.target.value))}
                className="w-24 bg-white/70 border border-primary/40 rounded-xl px-4 py-2.5 font-rounded text-gold-light focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <span className="text-sm text-cream/60">个单词 / 天</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MagicButton variant="primary" onClick={handleSave}>
              保存设置
            </MagicButton>
            {saved && <span className="text-sm text-mint-dark font-rounded">✓ 已保存</span>}
          </div>
        </div>
      </MagicCard>

      {/* 数据统计 */}
      <MagicCard className="p-6">
        <h2 className="text-xl font-magic font-bold text-gold-light mb-4">📊 我的成就</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white/50 rounded-xl p-4 text-center border border-gold/20">
            <p className="text-3xl font-magic font-bold text-gold-light">{userProfile.level}</p>
            <p className="text-xs text-cream/60 mt-1">当前等级</p>
          </div>
          <div className="bg-white/50 rounded-xl p-4 text-center border border-gold/20">
            <p className="text-3xl font-magic font-bold text-gold-light">{userProfile.streak}</p>
            <p className="text-xs text-cream/60 mt-1">连续打卡</p>
          </div>
          <div className="bg-white/50 rounded-xl p-4 text-center border border-gold/20">
            <p className="text-3xl font-magic font-bold text-gold-light">{userProfile.exp}</p>
            <p className="text-xs text-cream/60 mt-1">总经验值</p>
          </div>
          <div className="bg-white/50 rounded-xl p-4 text-center border border-gold/20">
            <p className="text-3xl font-magic font-bold text-gold-light">
              {userProfile.unlockedGrades.length}
            </p>
            <p className="text-xs text-cream/60 mt-1">已解锁年级</p>
          </div>
        </div>
      </MagicCard>

      {/* 数据管理 */}
      <MagicCard className="p-6">
        <h2 className="text-xl font-magic font-bold text-gold-light mb-4">🗑️ 数据管理</h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-rounded font-semibold text-gold-light">重置学习进度</p>
              <p className="text-xs text-cream/50">清空错词本和已学记录</p>
            </div>
            <MagicButton variant="ghost" onClick={handleResetProgress}>重置</MagicButton>
          </div>
          <div className="flex items-center justify-between border-t border-gold/10 pt-3">
            <div>
              <p className="font-rounded font-semibold text-gold-light">重置全部数据</p>
              <p className="text-xs text-cream/50">回到初始状态（不可恢复）</p>
            </div>
            <MagicButton variant="ghost" onClick={handleResetAll}>全部重置</MagicButton>
          </div>
          <div className="flex items-center justify-between border-t border-gold/10 pt-3">
            <div>
              <p className="font-rounded font-semibold text-gold-light">重新引导</p>
              <p className="text-xs text-cream/50">重新查看新手引导</p>
            </div>
            <MagicButton variant="ghost" onClick={completeOnboarding}>触发引导</MagicButton>
          </div>
        </div>
      </MagicCard>

      <p className="text-center text-xs text-cream/40 font-rounded">
        ✨ 魔法单词学院 · 用魔法点亮每一个单词
      </p>
    </div>
  )
}
