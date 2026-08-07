import { useUserStore } from '../store/useUserStore'
import { useProgressStore } from '../store/useProgressStore'
import { AVAILABLE_GRADES } from '../store/useWordStore'
import MagicCard from '../components/MagicCard'

// 徽章定义
const BADGES = [
  { id: 'first-word', name: '初学咒语', icon: '🌱', desc: '学会第一个单词', check: (s: BadgeState) => s.totalLearned >= 1 },
  { id: 'ten-words', name: '勤学小徒', icon: '📚', desc: '学会 10 个单词', check: (s: BadgeState) => s.totalLearned >= 10 },
  { id: 'fifty-words', name: '魔法学徒', icon: '⭐', desc: '学会 50 个单词', check: (s: BadgeState) => s.totalLearned >= 50 },
  { id: 'hundred-words', name: '魔法达人', icon: '🏆', desc: '学会 100 个单词', check: (s: BadgeState) => s.totalLearned >= 100 },
  { id: 'streak-3', name: '坚持三天', icon: '🔥', desc: '连续打卡 3 天', check: (s: BadgeState) => s.streak >= 3 },
  { id: 'streak-7', name: '一周不辍', icon: '💪', desc: '连续打卡 7 天', check: (s: BadgeState) => s.streak >= 7 },
  { id: 'streak-30', name: '月度之星', icon: '🌙', desc: '连续打卡 30 天', check: (s: BadgeState) => s.streak >= 30 },
  { id: 'level-5', name: '初露锋芒', icon: '⚡', desc: '达到 Lv.5', check: (s: BadgeState) => s.level >= 5 },
  { id: 'level-10', name: '小有名气', icon: '🌟', desc: '达到 Lv.10', check: (s: BadgeState) => s.level >= 10 },
  { id: 'grade-2', name: '晋级二年级', icon: '🎖️', desc: '解锁年级 2', check: (s: BadgeState) => s.unlockedGrades >= 2 },
  { id: 'grade-3', name: '晋级三年级', icon: '🥇', desc: '解锁年级 3', check: (s: BadgeState) => s.unlockedGrades >= 3 },
  { id: 'wrong-master', name: '错词克星', icon: '🛡️', desc: '掌握 10 个错词', check: (s: BadgeState) => s.masteredWrong >= 10 },
]

interface BadgeState {
  totalLearned: number
  streak: number
  level: number
  unlockedGrades: number
  masteredWrong: number
}

export default function BadgesPage() {
  const { userProfile } = useUserStore()
  const { wrongWords, getLearnedCount } = useProgressStore()

  const totalLearned = AVAILABLE_GRADES.reduce((sum, g) => sum + getLearnedCount(g), 0)
  const masteredWrong = wrongWords.filter((w) => w.status === 'mastered').length

  const state: BadgeState = {
    totalLearned,
    streak: userProfile.streak,
    level: userProfile.level,
    unlockedGrades: userProfile.unlockedGrades.length,
    masteredWrong,
  }

  const earned = BADGES.filter((b) => b.check(state)).length

  return (
    <div className="space-y-6 animate-pop-in">
      <MagicCard className="p-6">
        <h2 className="text-2xl font-magic font-extrabold text-gold-light">🏅 徽章墙</h2>
        <p className="text-cream/60 mt-1">
          已获得 {earned} / {BADGES.length} 枚徽章
        </p>
        <div className="mt-3 h-2.5 bg-white/50 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-dark rounded-full transition-all"
            style={{ width: `${(earned / BADGES.length) * 100}%` }}
          />
        </div>
      </MagicCard>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
        {BADGES.map((badge) => {
          const obtained = badge.check(state)
          return (
            <MagicCard
              key={badge.id}
              className={`p-5 flex flex-col items-center text-center ${obtained ? '' : 'opacity-50'}`}
              glow={obtained}
            >
              <div className={`text-5xl mb-2 ${obtained ? 'animate-float' : 'grayscale'}`}>
                {obtained ? badge.icon : '🔒'}
              </div>
              <h3 className="font-magic font-bold text-gold-light text-sm">{badge.name}</h3>
              <p className="text-xs text-cream/60 mt-1">{badge.desc}</p>
              {obtained && (
                <span className="mt-2 text-[10px] bg-gold/30 text-gold-light px-2 py-0.5 rounded-full font-semibold">
                  ✓ 已获得
                </span>
              )}
            </MagicCard>
          )
        })}
      </div>
    </div>
  )
}
