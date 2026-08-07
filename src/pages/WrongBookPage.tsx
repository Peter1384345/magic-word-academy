import { useState, useMemo } from 'react'
import { useProgressStore, REVIEW_STAGE_LABELS, REVIEW_INTERVALS_MS } from '../store/useProgressStore'
import { AVAILABLE_GRADES } from '../store/useWordStore'
import MagicCard from '../components/MagicCard'
import MagicButton from '../components/MagicButton'
import { playWord, playSentence } from '../utils/pronunciation'
import type { Accent } from '../utils/pronunciation'
import type { WrongWord } from '../types'

// 一周毫秒数
const ONE_WEEK_MS = 7 * 24 * 60 * 60 * 1000

// 主筛选类型
type FilterKind = 'all' | 'today' | 'week'

// 计算距今天数描述
function daysAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))
  if (days <= 0) return '今天'
  if (days === 1) return '昨天'
  return `${days} 天前`
}

// 判断错词是否今日待复习
function isTodayReview(w: WrongWord): boolean {
  return w.status === 'pending' && new Date(w.nextReview).getTime() <= Date.now()
}

// 判断错词是否本周待复习
function isWeekReview(w: WrongWord): boolean {
  if (w.status !== 'pending') return false
  const next = new Date(w.nextReview).getTime()
  return next <= Date.now() + ONE_WEEK_MS
}

export default function WrongBookPage() {
  const { wrongWords, reviewWrongWord, skipWrongWord, clearWrongWords, getTodayReviewWords } =
    useProgressStore()

  const [filter, setFilter] = useState<FilterKind>('all')
  const [gradeFilter, setGradeFilter] = useState<number | 'all'>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  // 复习模式状态
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [reviewStats, setReviewStats] = useState({ correct: 0, wrong: 0, skipped: 0 })

  // 今日待复习列表（复习模式使用）
  const todayReviewList = useMemo(() => getTodayReviewWords(), [getTodayReviewWords, wrongWords])

  // 统计数据
  const stats = useMemo(() => {
    const total = wrongWords.length
    const todayCount = wrongWords.filter(isTodayReview).length
    const mastered = wrongWords.filter((w) => w.status === 'mastered').length
    // 各复习阶段数量
    const stageCounts = REVIEW_INTERVALS_MS.map((_, stage) =>
      wrongWords.filter((w) => w.status === 'pending' && w.reviewStage === stage).length,
    )
    return { total, todayCount, mastered, stageCounts }
  }, [wrongWords])

  // 过滤后的列表
  const filtered = useMemo(() => {
    return wrongWords.filter((w) => {
      // 主筛选
      if (filter === 'today' && !isTodayReview(w)) return false
      if (filter === 'week' && !isWeekReview(w)) return false
      // 年级筛选
      if (gradeFilter !== 'all' && w.word.grade !== gradeFilter) return false
      return true
    })
  }, [wrongWords, filter, gradeFilter])

  // 切换展开
  const toggleExpand = (word: string) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(word)) next.delete(word)
      else next.add(word)
      return next
    })
  }

  // 进入复习模式
  const startReview = () => {
    if (todayReviewList.length === 0) return
    setReviewMode(true)
    setReviewIndex(0)
    setReviewStats({ correct: 0, wrong: 0, skipped: 0 })
  }

  // 退出复习模式
  const exitReview = () => {
    setReviewMode(false)
    setReviewIndex(0)
  }

  // 复习模式中处理一个词
  const handleReviewAction = (word: string, action: 'correct' | 'wrong' | 'skip') => {
    if (action === 'correct') {
      reviewWrongWord(word, true)
      setReviewStats((s) => ({ ...s, correct: s.correct + 1 }))
    } else if (action === 'wrong') {
      reviewWrongWord(word, false)
      setReviewStats((s) => ({ ...s, wrong: s.wrong + 1 }))
    } else {
      skipWrongWord(word)
      setReviewStats((s) => ({ ...s, skipped: s.skipped + 1 }))
    }
    setReviewIndex((i) => i + 1)
  }

  // ===================== 复习模式 =====================
  if (reviewMode) {
    // 复习完成
    if (reviewIndex >= todayReviewList.length) {
      return (
        <div className="space-y-6 animate-pop-in">
          <MagicCard className="p-8 text-center" glow>
            <div className="text-6xl mb-4">🌟</div>
            <h2 className="text-2xl font-magic font-extrabold text-gold-light">
              今日复习完成！
            </h2>
            <div className="mt-4 flex justify-center gap-4 flex-wrap">
              <div className="bg-mint/40 rounded-xl px-5 py-3">
                <p className="text-2xl font-magic font-bold text-gold-light">
                  {reviewStats.correct}
                </p>
                <p className="text-xs text-cream/60">已掌握 🟢</p>
              </div>
              <div className="bg-gold/30 rounded-xl px-5 py-3">
                <p className="text-2xl font-magic font-bold text-gold-light">
                  {reviewStats.wrong}
                </p>
                <p className="text-xs text-cream/60">再复习 🟡</p>
              </div>
              <div className="bg-magic-pink/30 rounded-xl px-5 py-3">
                <p className="text-2xl font-magic font-bold text-gold-light">
                  {reviewStats.skipped}
                </p>
                <p className="text-xs text-cream/60">跳过 🔴</p>
              </div>
            </div>
            <div className="flex gap-3 mt-6 justify-center">
              <MagicButton variant="primary" onClick={exitReview}>
                返回错词本
              </MagicButton>
            </div>
          </MagicCard>
        </div>
      )
    }

    const current = todayReviewList[reviewIndex]
    return (
      <div className="space-y-5 animate-pop-in">
        <MagicCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-magic font-bold text-gold-light">
              🔄 复习中 · 第 {reviewIndex + 1} / {todayReviewList.length} 个
            </span>
            <button
              onClick={exitReview}
              className="text-sm text-cream/60 hover:text-gold-light underline"
            >
              退出复习
            </button>
          </div>
          <div className="h-3 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-light to-gold-dark rounded-full transition-all duration-500"
              style={{ width: `${(reviewIndex / todayReviewList.length) * 100}%` }}
            />
          </div>
        </MagicCard>

        <ReviewCard
          wrongWord={current}
          onAction={(action) => handleReviewAction(current.word.word, action)}
        />
      </div>
    )
  }

  // ===================== 列表模式 =====================
  return (
    <div className="space-y-5 animate-pop-in">
      {/* 顶部统计卡片 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="总错词数" value={stats.total} icon="📒" />
        <StatCard
          label="今日待复习"
          value={stats.todayCount}
          icon="⏰"
          highlight={stats.todayCount > 0}
        />
        <StatCard label="已掌握错词" value={stats.mastered} icon="✅" />
        <MagicCard className="p-4">
          <p className="text-xs text-cream/60 mb-2">📊 艾宾浩斯复习轮次</p>
          {/* 6 阶段进度图 */}
          <div className="flex items-end justify-between gap-1">
            {REVIEW_STAGE_LABELS.map((label, stage) => {
              const count = stats.stageCounts[stage]
              const maxCount = Math.max(...stats.stageCounts, 1)
              const height = Math.max(8, (count / maxCount) * 40)
              return (
                <div key={stage} className="flex flex-col items-center gap-1 flex-1">
                  <span className="text-[10px] font-bold text-gold-light">{count}</span>
                  <div
                    className={[
                      'w-full rounded-t-md transition-all',
                      stage === 0 ? 'bg-magic-pink' : 'bg-gradient-to-t from-primary to-gold',
                    ].join(' ')}
                    style={{ height: `${height}px` }}
                    title={`${label}：${count} 个`}
                  />
                  <span className="text-[9px] text-cream/50 whitespace-nowrap">
                    {label}
                  </span>
                </div>
              )
            })}
          </div>
        </MagicCard>
      </div>

      {/* 筛选 + 开始复习按钮 */}
      <MagicCard className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-magic font-bold text-gold-light text-sm">🔍 筛选：</span>
          {(['all', 'today', 'week'] as FilterKind[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={[
                'px-3 py-1.5 rounded-lg text-sm font-rounded font-medium transition-all',
                filter === f
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white'
                  : 'bg-white/50 text-cream/70 hover:bg-primary/20',
              ].join(' ')}
            >
              {f === 'all' ? '全部' : f === 'today' ? '今日复习' : '本周复习'}
            </button>
          ))}
          {/* 年级筛选 */}
          <select
            value={gradeFilter}
            onChange={(e) =>
              setGradeFilter(e.target.value === 'all' ? 'all' : Number(e.target.value))
            }
            className="bg-white/70 border border-primary/40 rounded-lg px-3 py-1.5 text-sm font-rounded text-gold-light focus:outline-none focus:ring-2 focus:ring-primary cursor-pointer"
          >
            <option value="all">全部年级</option>
            {AVAILABLE_GRADES.map((g) => (
              <option key={g} value={g}>
                年级 {g}
              </option>
            ))}
          </select>
        </div>

        {/* 开始今日复习按钮 */}
        <MagicButton
          variant="primary"
          onClick={startReview}
          disabled={todayReviewList.length === 0}
          icon="🔄"
          className="shrink-0"
        >
          开始今日复习（{todayReviewList.length}）
        </MagicButton>
      </MagicCard>

      {/* 错词列表 */}
      {filtered.length === 0 ? (
        <MagicCard className="p-12 text-center">
          <div className="text-5xl mb-3">🌈</div>
          <p className="text-cream/60 font-rounded">
            {filter === 'today'
              ? '当前没有待复习的错词，继续保持！'
              : filter === 'week'
                ? '本周没有待复习的错词～'
                : '还没有错词记录哦～'}
          </p>
        </MagicCard>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((w) => (
            <WrongWordCard
              key={w.word.word}
              wrongWord={w}
              expanded={expanded.has(w.word.word)}
              onToggleExpand={() => toggleExpand(w.word.word)}
              onReview={reviewWrongWord}
              onSkip={skipWrongWord}
            />
          ))}
        </div>
      )}

      {/* 底部清空按钮 */}
      {wrongWords.length > 0 && (
        <div className="flex justify-center">
          <MagicButton
            variant="ghost"
            onClick={() => {
              if (confirm('确定要清空所有错词记录吗？此操作不可恢复。')) {
                clearWrongWords()
              }
            }}
          >
            清空错词本
          </MagicButton>
        </div>
      )}
    </div>
  )
}

// ===================== 子组件 =====================

// 统计小卡片
function StatCard({
  label,
  value,
  icon,
  highlight = false,
}: {
  label: string
  value: number
  icon: string
  highlight?: boolean
}) {
  return (
    <MagicCard className={`p-4 flex flex-col items-center justify-center ${highlight ? 'glow-gold-border' : ''}`}>
      <span className="text-2xl mb-1">{icon}</span>
      <p className={`text-2xl font-magic font-extrabold ${highlight ? 'text-gold-dark' : 'text-gold-light'}`}>
        {value}
      </p>
      <p className="text-xs text-cream/60">{label}</p>
    </MagicCard>
  )
}

// 错词卡片
function WrongWordCard({
  wrongWord,
  expanded,
  onToggleExpand,
  onReview,
  onSkip,
}: {
  wrongWord: WrongWord
  expanded: boolean
  onToggleExpand: () => void
  onReview: (word: string, correct: boolean) => void
  onSkip: (word: string) => void
}) {
  const [accent, setAccent] = useState<Accent>('us')
  const w = wrongWord.word
  const today = isTodayReview(wrongWord)
  const weekReview = isWeekReview(wrongWord)

  // 右上角复习阶段标签
  const stageLabel =
    wrongWord.status === 'mastered'
      ? { text: '已掌握 ✅', color: 'bg-mint/50 text-gold-light' }
      : wrongWord.status === 'skipped'
        ? { text: '已跳过', color: 'bg-white/50 text-cream/50' }
        : today
          ? { text: '今日复习 ⏰', color: 'bg-magic-pink/50 text-gold-light' }
          : weekReview
            ? { text: '本周复习', color: 'bg-gold/40 text-gold-light' }
            : { text: `第 ${wrongWord.reviewStage + 1} 轮`, color: 'bg-primary/40 text-gold-light' }

  return (
    <MagicCard className="p-5">
      <div className="flex items-start justify-between mb-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-xl font-magic font-bold text-gold-light">{w.word}</h3>
            <button
              onClick={() => playWord(w.word, accent)}
              className="text-sm hover:scale-110 transition-transform"
              title="播放发音"
              aria-label="播放发音"
            >
              🔊
            </button>
          </div>
          <p className="text-xs text-cream/50">
            🇺🇸 {w.phonetic_us} · 🇬🇧 {w.phonetic_uk}
          </p>
        </div>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold whitespace-nowrap ${stageLabel.color}`}>
          {stageLabel.text}
        </span>
      </div>

      {/* 词性 + 中文释义 */}
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs bg-gold/30 text-gold-light px-2 py-0.5 rounded-full font-semibold">
          {w.pos}
        </span>
        <p className="text-sm text-cream/80">{w.translation}</p>
      </div>

      {/* 错误历史 */}
      <div className="text-xs text-cream/60 space-y-1 mb-3">
        <p>❌ 错误次数：{wrongWord.errorCount} · 上次错误：{daysAgo(wrongWord.lastError)}</p>
        <p>🔄 复习轮次：{wrongWord.reviewStage} / {REVIEW_INTERVALS_MS.length}</p>
      </div>

      {/* 展开区域 */}
      {expanded && (
        <div className="space-y-2 mb-3 animate-pop-in">
          {w.high_freq_points && (
            <div className="bg-mint/30 rounded-lg p-2.5 text-xs text-cream/80">
              <p className="font-semibold mb-0.5">💡 高频考点</p>
              <p>{w.high_freq_points}</p>
            </div>
          )}
          {w.sentence_analysis && (
            <div className="bg-primary/20 rounded-lg p-2.5 text-xs text-cream/80">
              <p className="font-semibold mb-0.5">📝 长难句解析</p>
              <p>{w.sentence_analysis}</p>
            </div>
          )}
          {/* 例句 */}
          <div className="bg-white/50 rounded-lg p-2.5 text-xs">
            <div className="flex items-center justify-between mb-0.5">
              <p className="text-gold-light italic">"{w.example_en}"</p>
              <button
                onClick={() => playSentence(w.example_en, accent)}
                className="text-xs hover:scale-110 transition-transform"
                title="朗读例句"
                aria-label="朗读例句"
              >
                🔊
              </button>
            </div>
            <p className="text-cream/60">{w.example_cn}</p>
          </div>
          {/* 用户错误拼写记录 */}
          {wrongWord.userInputs.length > 0 && (
            <div className="bg-magic-pink/20 rounded-lg p-2.5 text-xs text-cream/80">
              <p className="font-semibold mb-0.5">✏️ 你的错误拼写记录</p>
              <div className="flex flex-wrap gap-1.5">
                {wrongWord.userInputs.map((inp, i) => (
                  <span
                    key={i}
                    className="bg-white/60 border border-magic-pink/40 rounded px-1.5 py-0.5 line-through"
                  >
                    {inp}
                  </span>
                ))}
              </div>
            </div>
          )}
          {/* 美音/英音切换 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-cream/50">发音口音：</span>
            <button
              onClick={() => setAccent('us')}
              className={`text-[11px] px-2 py-0.5 rounded-full ${accent === 'us' ? 'bg-gold/40 font-bold' : 'bg-white/50'} text-gold-light`}
            >
              🇺🇸 美音
            </button>
            <button
              onClick={() => setAccent('uk')}
              className={`text-[11px] px-2 py-0.5 rounded-full ${accent === 'uk' ? 'bg-gold/40 font-bold' : 'bg-white/50'} text-gold-light`}
            >
              🇬🇧 英音
            </button>
          </div>
        </div>
      )}

      {/* 底部操作区 */}
      <div className="flex items-center gap-2">
        {wrongWord.status === 'pending' && (
          <>
            <button
              onClick={() => onReview(w.word, true)}
              className="flex-1 text-xs py-2 rounded-xl bg-mint/50 text-gold-light font-semibold hover:bg-mint/70 transition-all border border-mint-dark/40"
              title="已掌握"
            >
              🟢 已掌握
            </button>
            <button
              onClick={() => onReview(w.word, false)}
              className="flex-1 text-xs py-2 rounded-xl bg-gold/40 text-gold-light font-semibold hover:bg-gold/60 transition-all border border-gold-dark/40"
              title="再复习一次"
            >
              🟡 再复习
            </button>
            <button
              onClick={() => onSkip(w.word)}
              className="flex-1 text-xs py-2 rounded-xl bg-magic-pink/40 text-gold-light font-semibold hover:bg-magic-pink/60 transition-all border border-magic-pink/40"
              title="太难跳过"
            >
              🔴 跳过
            </button>
          </>
        )}
        <button
          onClick={onToggleExpand}
          className="text-xs py-2 px-3 rounded-xl bg-white/50 text-cream/70 hover:bg-primary/20 transition-all"
        >
          {expanded ? '收起 ▲' : '展开 ▼'}
        </button>
      </div>
    </MagicCard>
  )
}

// 复习模式卡片
function ReviewCard({
  wrongWord,
  onAction,
}: {
  wrongWord: WrongWord
  onAction: (action: 'correct' | 'wrong' | 'skip') => void
}) {
  const [showAnswer, setShowAnswer] = useState(false)
  const [accent, setAccent] = useState<Accent>('us')
  const w = wrongWord.word

  return (
    <MagicCard className="p-6 md:p-8" glow>
      <div className="flex flex-col items-center text-center mb-5">
        <span className="text-xs bg-gold/30 text-gold-light px-3 py-1 rounded-full font-semibold mb-3">
          {w.pos} · 第 {wrongWord.reviewStage + 1} 轮复习
        </span>
        <h2 className="text-4xl font-magic font-extrabold text-gold-light mb-2">{w.word}</h2>
        <div className="flex items-center gap-3 mb-2">
          <div className="inline-flex rounded-full bg-white/60 border border-gold/30 overflow-hidden">
            <button
              onClick={() => setAccent('us')}
              className={`px-2.5 py-1 text-xs ${accent === 'us' ? 'bg-gold/40 font-bold' : ''} text-gold-light`}
            >
              🇺🇸 美
            </button>
            <button
              onClick={() => setAccent('uk')}
              className={`px-2.5 py-1 text-xs ${accent === 'uk' ? 'bg-gold/40 font-bold' : ''} text-gold-light`}
            >
              🇬🇧 英
            </button>
          </div>
          <button
            onClick={() => playWord(w.word, accent)}
            className="text-xl hover:scale-110 transition-transform"
            title="播放发音"
            aria-label="播放发音"
          >
            🔊
          </button>
        </div>
        <p className="text-sm text-cream/60 font-rounded">
          {accent === 'us' ? w.phonetic_us : w.phonetic_uk}
        </p>
      </div>

      {/* 显示/隐藏释义 */}
      <div className="text-center mb-5">
        {!showAnswer ? (
          <button
            onClick={() => setShowAnswer(true)}
            className="text-sm text-cream/60 hover:text-gold-light underline decoration-dotted"
          >
            点击显示释义 ▼
          </button>
        ) : (
          <div className="animate-pop-in">
            <p className="text-2xl font-magic font-bold text-gold-light mb-2">{w.translation}</p>
            <p className="text-sm text-cream/60 italic">"{w.example_en}"</p>
            <p className="text-xs text-cream/50 mt-1">{w.example_cn}</p>
            {w.high_freq_points && (
              <p className="mt-3 text-xs bg-mint/30 rounded-lg px-3 py-1.5 inline-block text-gold-light">
                💡 {w.high_freq_points}
              </p>
            )}
          </div>
        )}
      </div>

      {/* 三态按钮 */}
      <div className="flex items-center justify-center gap-3 flex-wrap">
        <button
          onClick={() => onAction('correct')}
          className="px-5 py-2.5 rounded-xl bg-mint/50 text-gold-light font-semibold hover:bg-mint/70 transition-all border border-mint-dark/40"
        >
          🟢 已掌握
        </button>
        <button
          onClick={() => onAction('wrong')}
          className="px-5 py-2.5 rounded-xl bg-gold/40 text-gold-light font-semibold hover:bg-gold/60 transition-all border border-gold-dark/40"
        >
          🟡 再复习一次
        </button>
        <button
          onClick={() => onAction('skip')}
          className="px-5 py-2.5 rounded-xl bg-magic-pink/40 text-gold-light font-semibold hover:bg-magic-pink/60 transition-all border border-magic-pink/40"
        >
          🔴 太难跳过
        </button>
      </div>
    </MagicCard>
  )
}
