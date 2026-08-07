import { useNavigate } from 'react-router-dom'
import { useUserStore, PETS } from '../store/useUserStore'
import { useProgressStore } from '../store/useProgressStore'
import { useWordStore, AVAILABLE_GRADES } from '../store/useWordStore'
import MagicCard from '../components/MagicCard'
import MagicButton from '../components/MagicButton'
import PetCompanion from '../components/PetCompanion'

// 快捷功能项
const QUICK_ACTIONS = [
  { label: '开始背诵', desc: '学习新单词', icon: '📚', path: '/practice', variant: 'primary' as const },
  { label: '做准入测试', desc: '解锁新年级', icon: '✨', path: '/test', variant: 'secondary' as const },
  { label: '复习错词', desc: '巩固薄弱点', icon: '📒', path: '/wrongbook', variant: 'secondary' as const },
  { label: '读课文', desc: '语境中记忆', icon: '📖', path: '/textbook', variant: 'ghost' as const },
]

export default function HomePage() {
  const navigate = useNavigate()
  const { userProfile, currentPetId, setUserGrade } = useUserStore()
  const { getTodayReviewWords, getLearnedCount } = useProgressStore()
  const { currentGrade, getGradeTotal } = useWordStore()

  const todayReview = getTodayReviewWords()
  const todayPercent = Math.min(100, (userProfile.todayLearned / userProfile.todayGoal) * 100)
  const expPercent = Math.min(100, (userProfile.exp / userProfile.expToNext) * 100)
  const learnedCount = getLearnedCount(currentGrade)
  const gradeTotal = getGradeTotal(currentGrade)
  const gradePercent = gradeTotal > 0 ? Math.min(100, (learnedCount / gradeTotal) * 100) : 0

  const currentPet = PETS.find((p) => p.id === currentPetId) ?? PETS[0]

  return (
    <div className="space-y-6 animate-pop-in">
      {/* 欢迎卡片 */}
      <MagicCard className="p-6 md:p-8" glow>
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl md:text-3xl font-magic font-extrabold text-gold-light">
              ✨ {userProfile.name}，欢迎回到魔法学院！
            </h2>
            <p className="text-cream/60 mt-1 font-rounded">
              今天也要元气满满地学习单词哦～
            </p>
          </div>
          <div className="flex gap-3 shrink-0">
            {/* 今日已学 */}
            <div className="bg-white/50 rounded-2xl px-5 py-3 text-center border border-gold/30">
              <p className="text-2xl font-magic font-bold text-gold-light">
                {userProfile.todayLearned}
                <span className="text-base text-cream/50">/{userProfile.todayGoal}</span>
              </p>
              <p className="text-xs text-cream/60 mt-0.5">今日已学</p>
            </div>
            {/* 连续打卡 */}
            <div className="bg-white/50 rounded-2xl px-5 py-3 text-center border border-magic-pink/40">
              <p className="text-2xl font-magic font-bold text-gold-light">
                {userProfile.streak}
                <span className="text-base text-cream/50">天</span>
              </p>
              <p className="text-xs text-cream/60 mt-0.5">连续打卡</p>
            </div>
          </div>
        </div>
      </MagicCard>

      {/* 当前年级卡片 + 宠物展示 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 当前年级卡片 */}
        <MagicCard className="p-6 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-magic font-bold text-gold-light">📖 当前年级</h3>
            <select
              value={currentGrade}
              onChange={(e) => setUserGrade(Number(e.target.value))}
              className="bg-white/70 border border-primary/40 rounded-xl px-4 py-2 font-rounded font-semibold text-gold-light focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
            >
              {AVAILABLE_GRADES.map((g) => (
                <option key={g} value={g}>
                  年级 {g}
                </option>
              ))}
            </select>
          </div>
          {/* 年级进度条 */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm font-rounded">
              <span className="text-cream/70">已掌握单词</span>
              <span className="font-semibold text-gold-light">
                {learnedCount} / {gradeTotal}
              </span>
            </div>
            <div className="h-3 bg-white/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-mint to-mint-dark rounded-full transition-all duration-500"
                style={{ width: `${gradePercent}%` }}
              />
            </div>
            <p className="text-xs text-cream/50">
              完成 {Math.round(gradePercent)}% ，继续加油！
            </p>
          </div>
        </MagicCard>

        {/* 宠物展示区 */}
        <MagicCard className="p-6 flex flex-col items-center justify-center">
          <PetCompanion petId={currentPetId} size="lg" />
          <div className="mt-3 w-full">
            <p className="text-center font-magic font-bold text-gold-light text-lg">
              {currentPet.name}
            </p>
            <p className="text-center text-xs text-cream/60 mb-2">
              {currentPet.description}
            </p>
            {/* 经验条 */}
            <div className="mt-2">
              <div className="flex justify-between text-xs font-rounded text-cream/70 mb-1">
                <span>Lv.{userProfile.level}</span>
                <span>{userProfile.exp}/{userProfile.expToNext}</span>
              </div>
              <div className="h-2.5 bg-white/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-gold to-gold-dark rounded-full transition-all duration-500"
                  style={{ width: `${expPercent}%` }}
                />
              </div>
            </div>
          </div>
        </MagicCard>
      </div>

      {/* 4 个快捷功能卡片 */}
      <div>
        <h3 className="text-xl font-magic font-bold text-gold-light mb-4">🪄 快捷功能</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {QUICK_ACTIONS.map((action) => (
            <MagicCard key={action.path} className="p-5 flex flex-col items-center text-center">
              <div className="text-4xl mb-3 animate-float" style={{ animationDelay: `${Math.random()}s` }}>
                {action.icon}
              </div>
              <h4 className="font-magic font-bold text-gold-light text-lg">{action.label}</h4>
              <p className="text-xs text-cream/60 mb-4">{action.desc}</p>
              <MagicButton
                variant={action.variant}
                onClick={() => navigate(action.path)}
                className="w-full text-sm"
              >
                前往
              </MagicButton>
            </MagicCard>
          ))}
        </div>
      </div>

      {/* 底部：今日进度圆环 + 艾宾浩斯复习提醒 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* 今日进度圆环 */}
        <MagicCard className="p-6 flex items-center gap-6">
          <div className="relative w-24 h-24 shrink-0">
            <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="4" />
              <circle
                cx="18" cy="18" r="15" fill="none" stroke="#A8E6CF" strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray={`${(todayPercent / 100) * 94.2} 94.2`}
                style={{ transition: 'stroke-dasharray 0.5s ease' }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-magic font-bold text-gold-light">
                {Math.round(todayPercent)}%
              </span>
              <span className="text-[10px] text-cream/60">完成</span>
            </div>
          </div>
          <div>
            <h4 className="font-magic font-bold text-gold-light text-lg">今日学习进度</h4>
            <p className="text-sm text-cream/60 mt-1">
              已学 {userProfile.todayLearned} 个，目标 {userProfile.todayGoal} 个
            </p>
            <p className="text-xs text-cream/50 mt-2">
              {todayPercent >= 100 ? '🎉 今日目标已完成，太棒了！' : '继续努力，距离目标越来越近啦～'}
            </p>
          </div>
        </MagicCard>

        {/* 艾宾浩斯复习提醒 */}
        <MagicCard
          className="p-6 cursor-pointer"
          onClick={() => navigate('/wrongbook')}
        >
          <div className="flex items-start justify-between mb-3">
            <h4 className="font-magic font-bold text-gold-light text-lg">⏰ 艾宾浩斯复习</h4>
            <span className="bg-magic-pink/40 text-gold-light text-xs font-bold px-2.5 py-1 rounded-full">
              {todayReview.length} 个待复习
            </span>
          </div>
          <p className="text-sm text-cream/60 mb-3">
            根据遗忘曲线，以下单词到了最佳复习时间：
          </p>
          {todayReview.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {todayReview.slice(0, 6).map((w) => (
                <span
                  key={w.word.word}
                  className="bg-white/60 border border-gold/30 rounded-lg px-2.5 py-1 text-sm font-rounded text-gold-light"
                >
                  {w.word.word}
                </span>
              ))}
              {todayReview.length > 6 && (
                <span className="text-sm text-cream/50 self-center">
                  等 {todayReview.length} 个...
                </span>
              )}
            </div>
          ) : (
            <p className="text-sm text-mint-dark font-rounded">
              ✅ 当前没有需要复习的单词，继续保持！
            </p>
          )}
        </MagicCard>
      </div>
    </div>
  )
}
