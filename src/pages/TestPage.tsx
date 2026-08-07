import { useState, useRef, useEffect, useMemo, useCallback, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWordStore } from '../store/useWordStore'
import { useUserStore, PETS } from '../store/useUserStore'
import { useAuthStore } from '../store/useAuthStore'
import MagicCard from '../components/MagicCard'
import MagicButton from '../components/MagicButton'
import { playWord, initSpeech } from '../utils/pronunciation'
import {
  PROFICIENCY_LABEL,
  PROFICIENCY_EMOJI,
  PROFICIENCY_SCORE,
  type Word,
  type ProficiencyLevel,
} from '../types'

// 测试题目总数
const TOTAL_QUESTIONS = 20
// 通过线（70%，基于熟练度加权分数：熟悉1分/不熟悉0.5分/不知道0分）
const PASS_THRESHOLD = 0.7
// 最大尝试次数
const MAX_ATTEMPTS = 3
// 熟练度选项
const PROFICIENCY_OPTIONS: ProficiencyLevel[] = ['familiar', 'unfamiliar', 'unknown']

// 测试阶段
type Phase = 'testing' | 'feedback' | 'result'
// 结果类型
type ResultKind = 'pass' | 'fail' | 'downgrade'

// 单题记录（包含用户熟练度选择与拼写正确性）
interface AnswerRecord {
  correct: boolean // 拼写正确？
  proficiency: ProficiencyLevel // 用户选择的熟练度
  score: number // 加权得分（0 / 0.5 / 1）
}

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
    recordWordProficiency,
  } = useUserStore()
  const { setPassedGrade, downgradeGrade, currentUser } = useAuthStore()

  const allWords = getWordsByGrade(currentGrade)
  // 本轮测试题
  const quiz = useMemo(() => buildQuiz(allWords), [allWords, currentGrade])
  const total = quiz.length

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [phase, setPhase] = useState<Phase>('testing')
  const [lastCorrect, setLastCorrect] = useState(false)
  const [lastProficiency, setLastProficiency] = useState<ProficiencyLevel | null>(null)
  // 每题记录（用于结算）
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [resultKind, setResultKind] = useState<ResultKind | null>(null)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // 当前年级已用尝试次数（1-3）
  const attemptsUsed = testAttempts[currentGrade] ?? 0
  const lastResult = lastTestResult[currentGrade]

  const current = quiz[index]
  const correctCount = answers.filter((a) => a.correct).length
  const weightedScore = answers.reduce((s, a) => s + a.score, 0)
  const weightedPercent = total > 0 ? weightedScore / total : 0
  const progress = total > 0 ? (index / total) * 100 : 0

  // 切题 / 首次进入：自动发音当前单词
  useEffect(() => {
    if (phase === 'testing' && current) {
      // 尝试解锁语音（首次用户交互后）
      try { initSpeech() } catch {}
      // 短延迟播放，避免与上一题卡顿叠加
      const t = setTimeout(() => {
        playWord(current.word, 'us')
      }, 200)
      return () => clearTimeout(t)
    }
  }, [phase, index, current])

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
    (finalAnswers: AnswerRecord[]) => {
      // 基于熟练度加权分计算是否通过
      const score = finalAnswers.reduce((s, a) => s + a.score, 0)
      const correct = finalAnswers.filter((a) => a.correct).length
      const passed = total > 0 && score / total >= PASS_THRESHOLD
      const nextGrade = currentGrade + 1
      // 记录结果（累加尝试次数）- 这里 score 保存熟练度加权分的整数分（向上取整展示）
      recordTestResult(currentGrade, correct, total, passed)

      if (passed) {
        unlockGrade(nextGrade)
        addExp(50)
        PETS.filter((p) => p.unlockedGrade === nextGrade).forEach((p) => unlockPet(p.id))
        resetTestAttempts(nextGrade)
        setPassedGrade(nextGrade)
        setResultKind('pass')
      } else {
        const newAttempts = attemptsUsed + 1
        if (newAttempts >= MAX_ATTEMPTS) {
          if (currentGrade > 1) {
            setUserGrade(currentGrade - 1)
            resetTestAttempts(currentGrade)
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

  // 选择熟练度：直接记录这一题，触发feedback，再进入下一题
  const handleSelectProficiency = useCallback((level: ProficiencyLevel) => {
    if (phase !== 'testing' || !current) return
    // 1. 判定拼写正确性
    const ok = input.trim().toLowerCase() === current.word.toLowerCase()
    // 2. 熟练度得分
    const score = PROFICIENCY_SCORE[level]
    const record: AnswerRecord = { correct: ok, proficiency: level, score }

    // 3. 若用户已登录，同步到全局熟练度记录
    if (currentUser) {
      recordWordProficiency(currentUser, current.word, level)
    }

    setLastCorrect(ok)
    setLastProficiency(level)
    setAnswers((r) => [...r, record])

    // 不管拼写正确与否，都重新发音一次（加深记忆）
    playWord(current.word, 'us')

    setPhase('feedback')
    timerRef.current = setTimeout(() => {
      const nextIndex = index + 1
      const nextAnswers = [...answers, record]
      if (nextIndex >= total) {
        finishTest(nextAnswers)
      } else {
        setIndex(nextIndex)
        setInput('')
        setLastProficiency(null)
        setPhase('testing')
      }
    }, 1700)
  }, [phase, current, input, currentUser, recordWordProficiency, index, answers, total, finishTest])

  // Enter 提交：如果用户没选熟练度，给出默认逻辑
  // （若拼写正确按"熟悉"计分，否则按"不知道"计分）
  const handleSubmit = () => {
    if (phase !== 'testing' || !current) return
    const ok = input.trim().toLowerCase() === current.word.toLowerCase()
    handleSelectProficiency(ok ? 'familiar' : 'unknown')
  }

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 主动点击发音按钮
  const handlePlay = (accent: 'us' | 'uk') => {
    if (!current) return
    playWord(current.word, accent)
  }

  // 重新开始一轮测试
  const restart = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setIndex(0)
    setInput('')
    setAnswers([])
    setPhase('testing')
    setResultKind(null)
    setLastProficiency(null)
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
    const correct = answers.filter((a) => a.correct).length
    const score = answers.reduce((s, a) => s + a.score, 0)
    const percent = Math.round((score / total) * 100)
    const nextGrade = currentGrade + 1
    // 各熟练度分布
    const familiarCount = answers.filter((a) => a.proficiency === 'familiar').length
    const unfamiliarCount = answers.filter((a) => a.proficiency === 'unfamiliar').length
    const unknownCount = answers.filter((a) => a.proficiency === 'unknown').length
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
                拼写正确 {correct} / {total}，熟练度得分 {Math.round(score)} / {total}（{percent}%）
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs mb-4">
                <div className="bg-mint/30 rounded-xl p-3 text-mint-dark font-bold">🌟 熟悉 {familiarCount}</div>
                <div className="bg-gold/20 rounded-xl p-3 text-gold-light font-bold">💭 不熟 {unfamiliarCount}</div>
                <div className="bg-magic-pink/20 rounded-xl p-3 text-magic-pink font-bold">❓ 未知 {unknownCount}</div>
              </div>
              <div className="mt-2 bg-mint/40 rounded-xl p-4 text-gold-light text-sm space-y-1">
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
                熟练度得分 {Math.round(score)} / {total}（{percent}%，需 70%）
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs mb-4">
                <div className="bg-mint/30 rounded-xl p-3 text-mint-dark font-bold">🌟 熟悉 {familiarCount}</div>
                <div className="bg-gold/20 rounded-xl p-3 text-gold-light font-bold">💭 不熟 {unfamiliarCount}</div>
                <div className="bg-magic-pink/20 rounded-xl p-3 text-magic-pink font-bold">❓ 未知 {unknownCount}</div>
              </div>
              <p className="mt-2 bg-magic-pink/30 rounded-xl p-4 text-gold-light text-sm">
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
                熟练度得分 {Math.round(score)} / {total}（{percent}%，需 70% 通过）
              </p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs mb-4">
                <div className="bg-mint/30 rounded-xl p-3 text-mint-dark font-bold">🌟 熟悉 {familiarCount}</div>
                <div className="bg-gold/20 rounded-xl p-3 text-gold-light font-bold">💭 不熟 {unfamiliarCount}</div>
                <div className="bg-magic-pink/20 rounded-xl p-3 text-magic-pink font-bold">❓ 未知 {unknownCount}</div>
              </div>
              <p className="mt-2 bg-gold/20 rounded-xl p-4 text-gold-light text-sm">
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

        {/* 进度：基于熟练度得分（加权） */}
        <div>
          <p className="text-xs text-cream/60 mb-2">
            熟练度得分：{Math.round(weightedScore)} / {total}（{Math.round(weightedPercent * 100)}%）
          </p>
          <div className="grid grid-cols-5 gap-1.5">
            {Array.from({ length: total }, (_, i) => {
              const a = answers[i]
              return (
                <span
                  key={i}
                  title={a ? `${PROFICIENCY_LABEL[a.proficiency]}${a.correct ? '·拼写对' : '·拼写错'}` : '未作答'}
                  className={[
                    'text-base text-center transition-all flex items-center justify-center aspect-square rounded-md',
                    i < answers.length
                      ? 'opacity-100 scale-100'
                      : 'opacity-20',
                  ].join(' ')}
                >
                  {a ? (
                    <span>
                      {PROFICIENCY_EMOJI[a.proficiency]}
                    </span>
                  ) : (
                    <span className="text-cream/30">·</span>
                  )}
                </span>
              )
            })}
          </div>
          <p className="text-[11px] text-cream/40 mt-2">
            拼写正确：{correctCount} / {total}
          </p>
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
              熟练度分 {Math.round(weightedScore)} / {total}
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
          <p className="text-xs text-cream/50 text-center mb-2">请写出对应的英文单词，然后选择你对它的熟悉度</p>
          <div className="flex flex-col items-center text-center mb-6">
            <span className="text-xs bg-gold/30 text-gold-light px-3 py-1 rounded-full font-semibold mb-3">
              {current.pos}
            </span>
            <h2 className="text-4xl md:text-5xl font-magic font-extrabold text-gold-light mb-2">
              {current.translation}
            </h2>
            {/* 音标 + 发音按钮 */}
            <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-cream/60 font-rounded">
              <button
                type="button"
                onClick={() => handlePlay('us')}
                className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 hover:bg-white/80 border border-gold/40 hover:border-gold transition-all"
                title="美式发音"
              >
                <span>🇺🇸</span>
                <span>{current.phonetic_us}</span>
                <span className="text-gold-dark group-hover:scale-110 transition-transform">🔊</span>
              </button>
              {current.phonetic_uk && (
                <button
                  type="button"
                  onClick={() => handlePlay('uk')}
                  className="group inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/50 hover:bg-white/80 border border-indigo-400/40 hover:border-indigo-400 transition-all"
                  title="英式发音"
                >
                  <span>🇬🇧</span>
                  <span>{current.phonetic_uk}</span>
                  <span className="text-indigo-500 group-hover:scale-110 transition-transform">🔊</span>
                </button>
              )}
            </div>
          </div>

          {/* 输入框 + 提交 */}
          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-2xl mx-auto">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={phase !== 'testing'}
              placeholder="输入英文单词，按回车或选择熟练度提交"
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
              disabled={phase !== 'testing'}
              className="shrink-0"
              icon="✓"
            >
              提交
            </MagicButton>
          </div>

          {/* 熟练度选择（三按钮） */}
          <div className="grid grid-cols-3 gap-3 max-w-2xl mx-auto mt-5">
            {PROFICIENCY_OPTIONS.map((lv) => {
              const selected = phase === 'feedback' && lastProficiency === lv
              const label = PROFICIENCY_LABEL[lv]
              const emoji = PROFICIENCY_EMOJI[lv]
              const score = PROFICIENCY_SCORE[lv]
              const baseBtn = [
                'py-3 px-2 rounded-2xl font-magic font-bold text-sm md:text-base transition-all duration-200 border-2',
                'flex flex-col items-center gap-1',
                phase !== 'testing' && !selected ? 'opacity-60 cursor-not-allowed' : '',
              ].join(' ')
              const variants: Record<ProficiencyLevel, string> = {
                familiar:
                  selected
                    ? 'bg-mint/40 border-mint-dark text-mint-dark scale-105 shadow-lg shadow-mint/20'
                    : 'bg-mint/20 hover:bg-mint/35 border-mint-dark/50 hover:border-mint-dark text-mint-dark hover:-translate-y-0.5',
                unfamiliar:
                  selected
                    ? 'bg-gold/40 border-gold-dark text-gold-dark scale-105 shadow-lg shadow-gold/20'
                    : 'bg-gold/15 hover:bg-gold/30 border-gold-dark/50 hover:border-gold-dark text-gold-dark hover:-translate-y-0.5',
                unknown:
                  selected
                    ? 'bg-magic-pink/40 border-magic-pink text-magic-pink scale-105 shadow-lg shadow-magic-pink/20'
                    : 'bg-magic-pink/15 hover:bg-magic-pink/30 border-magic-pink/50 hover:border-magic-pink text-magic-pink hover:-translate-y-0.5',
              }
              return (
                <button
                  key={lv}
                  type="button"
                  disabled={phase !== 'testing'}
                  onClick={() => handleSelectProficiency(lv)}
                  className={[baseBtn, variants[lv]].join(' ')}
                  title={`记为：${label}（${score} 分）`}
                >
                  <span className="text-2xl">{emoji}</span>
                  <span>{label}</span>
                  <span className="text-[10px] opacity-70 font-rounded">
                    {score === 1 ? '+1 分' : score === 0.5 ? '+0.5 分' : '+0 分'}
                  </span>
                </button>
              )
            })}
          </div>

          {/* 反馈 */}
          {phase === 'feedback' && (
            <div className="mt-5 text-center animate-pop-in">
              {lastCorrect && lastProficiency === 'familiar' ? (
                <p className="text-2xl font-magic font-bold text-mint-dark">✓ 熟悉且正确，太棒了！</p>
              ) : lastCorrect ? (
                <p className="text-2xl font-magic font-bold text-gold-dark">
                  拼写对啦，熟练度：{lastProficiency ? PROFICIENCY_LABEL[lastProficiency] : ''}
                </p>
              ) : (
                <div>
                  <p className="text-2xl font-magic font-bold text-magic-pink">
                    ✗ 熟练度：{lastProficiency ? PROFICIENCY_LABEL[lastProficiency] : ''}
                  </p>
                  <p className="text-gold-light mt-1">
                    正确答案：<span className="font-magic font-bold text-xl">{current.word}</span>
                  </p>
                  {/* 错词发音按钮（多听几遍） */}
                  <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handlePlay('us')}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-magic-pink/20 hover:bg-magic-pink/30 border border-magic-pink/40 text-magic-pink text-sm transition-all"
                    >
                      🔊 再听一次（美）
                    </button>
                    {current.phonetic_uk && (
                      <button
                        type="button"
                        onClick={() => handlePlay('uk')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-400/40 text-indigo-500 text-sm transition-all"
                      >
                        🔊 再听一次（英）
                      </button>
                    )}
                  </div>
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
