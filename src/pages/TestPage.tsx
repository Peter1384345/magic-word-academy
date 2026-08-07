import { useState, useRef, useEffect, useMemo, useCallback, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWordStore } from '../store/useWordStore'
import { useUserStore, PETS } from '../store/useUserStore'
import { useAuthStore } from '../store/useAuthStore'
import MagicCard from '../components/MagicCard'
import MagicButton from '../components/MagicButton'
import { playWord } from '../utils/pronunciation'
import type { Word } from '../types'

// 测试题目总数
const TOTAL_QUESTIONS = 20
// 通过线（70%）
const PASS_THRESHOLD = 0.7
// 最大尝试次数
const MAX_ATTEMPTS = 3

// 测试阶段
type Phase = 'testing' | 'feedback' | 'result'
// 结果类型
type ResultKind = 'pass' | 'fail' | 'downgrade'

// 小女巫对话气泡内容
function witchMessage(phase: Phase, lastCorrect: boolean, resultKind: ResultKind | null, attempt: number): string {
  if (phase === 'result') {
    if (resultKind === 'pass') return '恭喜通过！魔法宠物在等你哦～🎉'
    if (resultKind === 'downgrade') return '没关系，退一步海阔天空，加油！💪'
    return `别灰心，还剩 ${MAX_ATTEMPTS - attempt} 次机会！`
  }
  if (phase === 'feedback') {
    return lastCorrect ? '太棒了！✨' : '别灰心，下一题加油！'
  }
  return '勇敢的小魔法师，开始挑战吧！🧙'
}

// 洗牌
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 生成测试题（不足 20 题时循环补足）
function buildQuiz(words: Word[]): Word[] {
  if (words.length === 0) return []
  if (words.length >= TOTAL_QUESTIONS) return shuffle(words).slice(0, TOTAL_QUESTIONS)
  // 不足则循环抽样补足（允许重复题目）
  const quiz: Word[] = []
  const pool = shuffle(words)
  let p = 0
  while (quiz.length < TOTAL_QUESTIONS) {
    quiz.push(pool[p % pool.length])
    p++
  }
  return quiz
}

export default function TestPage() {
  const navigate = useNavigate()
  const { getWordsByGrade, currentGrade } = useWordStore()
  const {
    userProfile,
    unlockGrade,
    addExp,
    setUserGrade,
    unlockPet,
    testAttempts,
    lastTestResult,
    recordTestResult,
    resetTestAttempts,
  } = useUserStore()
  const { setPassedGrade, downgradeGrade } = useAuthStore()

  const allWords = getWordsByGrade(currentGrade)
  // 本轮测试题
  const quiz = useMemo(() => buildQuiz(allWords), [allWords, currentGrade])
  const total = quiz.length

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('testing')
  const [lastCorrect, setLastCorrect] = useState(false)
  // 每题对错记录（用于星星阵列）
  const [results, setResults] = useState<boolean[]>([])
  const [resultKind, setResultKind] = useState<ResultKind | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 当前年级已用尝试次数（1-3）
  const attemptsUsed = testAttempts[currentGrade] ?? 0
  const lastResult = lastTestResult[currentGrade]

  const current = quiz[index]
  const correctCount = results.filter(Boolean).length
  const progress = total > 0 ? (index / total) * 100 : 0

  // 自动聚焦
  useEffect(() => {
    if (phase === 'testing') inputRef.current?.focus()
  }, [phase, index])

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // 完成测试，计算结果
  const finishTest = useCallback(
    (finalResults: boolean[]) => {
      const correct = finalResults.filter(Boolean).length
      const passed = total > 0 && correct / total >= PASS_THRESHOLD
      const nextGrade = currentGrade + 1
      // 记录结果（累加尝试次数）
      recordTestResult(currentGrade, correct, total, passed)

      if (passed) {
        // 通过：解锁下一年级 + 经验 + 宠物
        unlockGrade(nextGrade)
        addExp(50)
        // 解锁对应年级的宠物
        PETS.filter((p) => p.unlockedGrade === nextGrade).forEach((p) => unlockPet(p.id))
        // 重置下一年级的尝试次数，便于将来挑战
        resetTestAttempts(nextGrade)
        // 同步到 authStore：记录通过年级
        setPassedGrade(nextGrade)
        setResultKind('pass')
      } else {
        // 不通过：判断是否需降级
        const newAttempts = attemptsUsed + 1
        if (newAttempts >= MAX_ATTEMPTS) {
          // 3 次都不通过：降级一个年级
          if (currentGrade > 1) {
            setUserGrade(currentGrade - 1)
            resetTestAttempts(currentGrade)
            // 同步到 authStore：降级
            downgradeGrade()
          }
          setResultKind('downgrade')
        } else {
          setResultKind('fail')
        }
      }
      setPhase('result')
    },
    [total, currentGrade, recordTestResult, unlockGrade, addExp, unlockPet, resetTestAttempts, attemptsUsed, setUserGrade, setPassedGrade, downgradeGrade],
  )

  // 提交当前题
  const handleSubmit = () => {
    if (phase !== 'testing' || !current) return
    const ok = input.trim().toLowerCase() === current.word.toLowerCase()
    setLastCorrect(ok)
    setResults((r) => [...r, ok])
    if (ok) playWord(current.word, 'us')
    setPhase('feedback')
    // 1.5 秒后进入下一题或结算
    timerRef.current = setTimeout(() => {
      const nextIndex = index + 1
      const nextResults = [...results, ok]
      if (nextIndex >= total) {
        finishTest(nextResults)
      } else {
        setIndex(nextIndex)
        setInput('')
        setPhase('testing')
      }
    }, 1500)
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 重新开始一轮测试
  const restart = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIndex(0)
    setInput('')
    setResults([])
    setPhase('testing')
    setResultKind(null)
    inputRef.current?.focus()
  }

  // 词库不足提示
  if (total === 0) {
    return (
      <MagicCard className="p-8 text-center">
        <p className="text-2xl mb-2">📭</p>
        <p className="text-cream/60">当前年级词库为空，无法生成测试题。</p>
      </MagicCard>
    )
  }

  // 结果页
  if (phase === 'result') {
    const correct = results.filter(Boolean).length
    const percent = Math.round((correct / total) * 100)
    const nextGrade = currentGrade + 1
    return (
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-6 animate-pop-in">
        <MagicCard className="p-8 text-center" glow>
          {resultKind === 'pass' ? (
            <>
              <div className="text-7xl mb-4 animate-float">🎉</div>
              <h2 className="text-3xl font-magic font-extrabold text-gold-light">
                测试通过！
              </h2>
              <p className="text-cream/60 mt-2">
                答对 {correct} / {total} 题，正确率 {percent}%
              </p>
              <div className="mt-4 bg-mint/40 rounded-xl p-4 text-gold-light text-sm space-y-1">
                <p>✨ 已解锁年级 {nextGrade}</p>
                <p>💰 获得 50 EXP 奖励</p>
                {PETS.filter((p) => p.unlockedGrade === nextGrade).map((p) => (
                  <p key={p.id}>🐣 解锁魔法宠物：{p.emoji} {p.name}</p>
                ))}
              </div>
              <div className="flex gap-3 mt-6 justify-center flex-wrap">
                <MagicButton variant="primary" onClick={() => navigate('/')}>
                  🏠 返回首页
                </MagicButton>
                <MagicButton variant="secondary" onClick={() => navigate('/practice')}>
                  📚 去背单词
                </MagicButton>
              </div>
            </>
          ) : resultKind === 'downgrade' ? (
            <>
              <div className="text-7xl mb-4">💫</div>
              <h2 className="text-3xl font-magic font-extrabold text-gold-light">
                3 次未通过
              </h2>
              <p className="text-cream/60 mt-2">
                答对 {correct} / {total} 题，正确率 {percent}%
              </p>
              <p className="mt-4 bg-magic-pink/30 rounded-xl p-4 text-gold-light text-sm">
                {currentGrade > 1
                  ? `已自动降级到年级 ${currentGrade - 1}，多练习后再来挑战吧！`
                  : '已在最低年级，多多练习后再来挑战！'}
              </p>
              <div className="flex gap-3 mt-6 justify-center flex-wrap">
                <MagicButton variant="primary" onClick={() => navigate('/')}>
                  🏠 返回首页
                </MagicButton>
                <MagicButton variant="secondary" onClick={() => navigate('/practice')}>
                  📚 继续学习
                </MagicButton>
              </div>
            </>
          ) : (
            <>
              <div className="text-7xl mb-4">💪</div>
              <h2 className="text-3xl font-magic font-extrabold text-gold-light">
                再接再厉！
              </h2>
              <p className="text-cream/60 mt-2">
                答对 {correct} / {total} 题，正确率 {percent}%（需 70% 通过）
              </p>
              <p className="mt-4 bg-gold/20 rounded-xl p-4 text-gold-light text-sm">
                已用 {attemptsUsed + 1} / {MAX_ATTEMPTS} 次机会，还剩 {MAX_ATTEMPTS - attemptsUsed - 1} 次
              </p>
              <div className="flex gap-3 mt-6 justify-center flex-wrap">
                <MagicButton variant="primary" onClick={restart}>
                  🔄 再测一次
                </MagicButton>
                <MagicButton variant="ghost" onClick={() => navigate('/practice')}>
                  📚 先去练习
                </MagicButton>
              </div>
            </>
          )}
        </MagicCard>

        {/* 小女巫 */}
        <WitchBubble message={witchMessage(phase, lastCorrect, resultKind, attemptsUsed + 1)} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_auto] gap-5 animate-pop-in">
      {/* 左侧信息面板 */}
      <MagicCard className="p-5 space-y-4 h-fit">
        <div>
          <h3 className="font-magic font-bold text-gold-light mb-1">✨ 准入测试</h3>
          <p className="text-xs text-cream/60">年级 {currentGrade} → {currentGrade + 1}</p>
        </div>

        {/* 当前尝试次数 */}
        <div className="bg-white/50 rounded-xl p-3">
          <p className="text-xs text-cream/60 mb-1">当前尝试</p>
          <p className="font-magic font-bold text-gold-light">
            第 {attemptsUsed + 1} / {MAX_ATTEMPTS} 次
          </p>
          <p className="text-[11px] text-magic-pink mt-1">
            💡 3 次不通过将自动降级一个年级
          </p>
        </div>

        {/* 已答对题数：金色星星阵列 */}
        <div>
          <p className="text-xs text-cream/60 mb-2">
            已答对 {correctCount} / {total}
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: total }, (_, i) => (
              <span
                key={i}
                className={[
                  'text-base text-center transition-all',
                  i < results.length
                    ? results[i]
                      ? 'opacity-100 scale-100'
                      : 'opacity-30 scale-90'
                    : 'opacity-20',
                ].join(' ')}
              >
                {i < results.length ? (results[i] ? '⭐' : '💫') : '·'}
              </span>
            ))}
          </div>
        </div>

        {/* 上次成绩 */}
        {lastResult && (
          <div className="bg-white/50 rounded-xl p-3">
            <p className="text-xs text-cream/60 mb-1">上次成绩</p>
            <p className="text-sm font-semibold text-gold-light">
              {lastResult.score} / {lastResult.total}（{Math.round((lastResult.score / lastResult.total) * 100)}%）
            </p>
            <p className="text-[11px] mt-0.5">
              {lastResult.passed ? (
                <span className="text-mint-dark">✓ 已通过</span>
              ) : (
                <span className="text-magic-pink">✗ 未通过</span>
              )}
            </p>
          </div>
        )}

        {/* 今日学习目标提示 */}
        <p className="text-[11px] text-cream/40 text-center">
          小魔法师 {userProfile.name}，加油！
        </p>
      </MagicCard>

      {/* 中间主答题区 */}
      <div className="space-y-4">
        {/* 顶部进度 */}
        <MagicCard className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="font-magic font-bold text-gold-light">
              第 {Math.min(index + 1, total)} / {total} 题
            </span>
            <span className="text-sm text-cream/60">
              已答对 {correctCount} 题
            </span>
          </div>
          <div className="h-3 bg-white/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-gold-light to-gold-dark rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </MagicCard>

        {/* 题目卡片 */}
        <MagicCard className="p-6 md:p-8" glow>
          <p className="text-xs text-cream/50 text-center mb-2">请写出对应的英文单词</p>
          <div className="flex flex-col items-center text-center mb-6">
            <span className="text-xs bg-gold/30 text-gold-light px-3 py-1 rounded-full font-semibold mb-3">
              {current.pos}
            </span>
            <h2 className="text-4xl md:text-5xl font-magic font-extrabold text-gold-light mb-2">
              {current.translation}
            </h2>
            <p className="text-sm text-cream/50 font-rounded">
              {current.phonetic_us}
            </p>
          </div>

          {/* 输入框 */}
          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={phase !== 'testing'}
              placeholder="输入英文单词，按回车提交"
              className={[
                'w-full px-5 py-3.5 rounded-2xl font-rounded text-lg text-gold-light',
                'bg-white/70 border-2 transition-all duration-300 outline-none',
                'placeholder:text-cream/30',
                phase === 'feedback'
                  ? lastCorrect
                    ? 'border-mint-dark bg-mint/20'
                    : 'border-magic-pink bg-magic-pink/10'
                  : 'border-gold/50 focus:border-gold focus:shadow-glow-gold',
              ].join(' ')}
            />
            <MagicButton
              variant="primary"
              onClick={handleSubmit}
              disabled={phase !== 'testing' || !input.trim()}
              className="shrink-0"
              icon="✓"
            >
              提交
            </MagicButton>
          </div>

          {/* 反馈 */}
          {phase === 'feedback' && (
            <div className="mt-5 text-center animate-pop-in">
              {lastCorrect ? (
                <p className="text-2xl font-magic font-bold text-mint-dark">✓ 答对了！</p>
              ) : (
                <div>
                  <p className="text-2xl font-magic font-bold text-magic-pink">✗ 答错了</p>
                  <p className="text-gold-light mt-1">
                    正确答案：<span className="font-magic font-bold">{current.word}</span>
                  </p>
                </div>
              )}
            </div>
          )}
        </MagicCard>
      </div>

      {/* 右侧小女巫 */}
      <WitchBubble message={witchMessage(phase, lastCorrect, resultKind, attemptsUsed + 1)} />
    </div>
  )
}

// 小女巫对话气泡组件
function WitchBubble({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center gap-2 h-fit">
      <div className="relative bg-white/70 border-2 border-primary/40 rounded-2xl px-4 py-3 max-w-[200px] shadow-card">
        <p className="text-sm font-rounded text-gold-light text-center">{message}</p>
        {/* 气泡尖角 */}
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white/70 border-r-2 border-b-2 border-primary/40 rotate-45" />
      </div>
      <div className="text-6xl animate-float" aria-hidden>
        🧙‍♀️
      </div>
    </div>
  )
}
