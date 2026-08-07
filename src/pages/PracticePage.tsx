import { useState, useRef, useEffect, useMemo, type KeyboardEvent } from 'react'
import { useWordStore } from '../store/useWordStore'
import { useProgressStore } from '../store/useProgressStore'
import { useUserStore } from '../store/useUserStore'
import MagicCard from '../components/MagicCard'
import MagicButton from '../components/MagicButton'
import ParticleEffect from '../components/ParticleEffect'
import WordImage from '../components/WordImage'
import { playWord, playSentence, initSpeech } from '../utils/pronunciation'
import type { Accent } from '../utils/pronunciation'
import type { PracticeMode, Word } from '../types'

// 三种练习模式配置
const MODE_CONFIG: Record<PracticeMode, { label: string; icon: string; hint: string }> = {
  'cn-to-en': { label: '中→英', icon: '🇨🇳→🇬🇧', hint: '看中文释义，拼写出英文单词' },
  'listen': { label: '听音拼写', icon: '🎧', hint: '听发音，拼写出英文单词' },
  'en-to-cn': { label: '英→中', icon: '🇬🇧→🇨🇳', hint: '看英文单词，写出中文释义' },
}

// 每个会话的题目数量
const SESSION_SIZE = 20

// 鼓励文字池
const ENCOURAGE_WORDS = [
  '加油哦，小魔法师！',
  '你真棒，继续努力！',
  '每一个单词都是一颗星星✨',
  '魔法的力量在你手中！',
  '今天也要元气满满！',
]

// 答题状态
type AnswerState = 'idle' | 'correct' | 'wrong'

// 洗牌函数
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

// 检查答案是否正确
function checkAnswer(input: string, current: Word, mode: PracticeMode): boolean {
  const clean = input.trim().toLowerCase()
  if (!clean) return false
  if (mode === 'en-to-cn') {
    // 中文释义：按 ;；、/ 分隔多个义项，任一匹配即可
    const variants = current.translation
      .toLowerCase()
      .split(/[；;、/]/)
      .map((v) => v.trim())
      .filter(Boolean)
    return variants.some((v) => v === clean || (v.length > 1 && (v.includes(clean) || clean.includes(v))))
  }
  // 英文拼写：忽略大小写精确匹配
  return clean === current.word.toLowerCase()
}

export default function PracticePage() {
  const { getCurrentWords, currentGrade, practiceMode, setPracticeMode } = useWordStore()
  const { addLearnedWord, addWrongWord, toggleFavorite, isFavorite } = useProgressStore()
  const { addExp, addLearnedWord: addTodayLearned, currentPetId } = useUserStore()

  // 生成本次会话的题目序列
  const sessionWords = useMemo(() => {
    const all = getCurrentWords()
    if (all.length === 0) return []
    return shuffle(all).slice(0, Math.min(SESSION_SIZE, all.length))
  }, [getCurrentWords, currentGrade])

  const [index, setIndex] = useState(0)
  const [input, setInput] = useState('')
  const [answerState, setAnswerState] = useState<AnswerState>('idle')
  const [accent, setAccent] = useState<Accent>('us')
  const [showExample, setShowExample] = useState(false)
  const [showHighFreq, setShowHighFreq] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(false)
  // 会话统计
  const [correctCount, setCorrectCount] = useState(0)
  const [answeredCount, setAnsweredCount] = useState(0)

  const inputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const current = sessionWords[index]
  const fav = current ? isFavorite(current.word) : false
  const accuracy = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0
  const sessionProgress = sessionWords.length > 0 ? (index / sessionWords.length) * 100 : 0

  // 鼓励语（随题目变化）
  const encourage = useMemo(
    () => ENCOURAGE_WORDS[index % ENCOURAGE_WORDS.length],
    [index],
  )

  // 自动聚焦输入框
  useEffect(() => {
    if (answerState === 'idle') {
      inputRef.current?.focus()
    }
  }, [answerState, index])

  // 听音模式：新题自动播放发音（需用户已交互过，否则浏览器autoplay策略会阻止）
  const [userInteracted, setUserInteracted] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  useEffect(() => {
    if (current && practiceMode === 'listen' && answerState === 'idle' && userInteracted) {
      const t = setTimeout(() => {
        setIsPlaying(true)
        playWord(current.word, accent)
        // 1.5秒后恢复按钮状态
        setTimeout(() => setIsPlaying(false), 1500)
      }, 400)
      return () => clearTimeout(t)
    }
  }, [current, practiceMode, accent, answerState, index, userInteracted])

  // 统一的发音播放函数（带可视化反馈）
  const handlePlay = (word: string) => {
    setUserInteracted(true)
    initSpeech() // 确保首次交互时初始化 voices
    setIsPlaying(true)
    playWord(word, accent)
    setTimeout(() => setIsPlaying(false), 1500)
  }

  // 清理定时器
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  // 切换题目后重置展开状态
  useEffect(() => {
    setShowExample(false)
    setShowHighFreq(false)
    setShowAnalysis(false)
  }, [index])

  // 进入下一题
  const goNext = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current)
      timerRef.current = null
    }
    setAnswerState('idle')
    setInput('')
    setIndex((i) => (i + 1) % sessionWords.length)
  }

  // 提交答案
  const handleSubmit = () => {
    if (answerState !== 'idle' || !current) return
    const ok = checkAnswer(input, current, practiceMode)
    setAnsweredCount((n) => n + 1)
    if (ok) {
      setAnswerState('correct')
      setCorrectCount((n) => n + 1)
      // 答对：播放发音 + 加经验 + 记录已学
      setUserInteracted(true)
      initSpeech()
      playWord(current.word, accent)
      addLearnedWord(currentGrade, current.word)
      addExp(10)
      addTodayLearned(1)
      timerRef.current = setTimeout(goNext, 2000)
    } else {
      setAnswerState('wrong')
      // 答错：加入错词本
      addWrongWord(current, input.trim())
      timerRef.current = setTimeout(goNext, 3000)
    }
  }

  // 键盘回车提交
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSubmit()
    }
  }

  // 空词库提示
  if (sessionWords.length === 0) {
    return (
      <MagicCard className="p-8 text-center">
        <p className="text-2xl mb-2">📭</p>
        <p className="text-cream/60">当前年级暂无词库数据</p>
      </MagicCard>
    )
  }

  return (
    <div className="space-y-5 animate-pop-in">
      {/* 顶部进度条 */}
      <MagicCard className="p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="font-magic font-bold text-gold text-base">
            🪄 第 {Math.min(index + 1, sessionWords.length)} / {sessionWords.length} 题
          </span>
          <span className="text-sm font-rounded text-cream/80">
            正确率 <span className="font-bold text-gold">{accuracy}%</span>
            <span className="ml-2 text-cream/50">
              ({correctCount}/{answeredCount})
            </span>
          </span>
        </div>
        <div className="h-2.5 bg-cosmos-deep/60 rounded-full overflow-hidden relative">
          <div
            className="h-full bg-gradient-to-r from-gold to-gold-dark rounded-full transition-all duration-500"
            style={{ width: `${sessionProgress}%`, boxShadow: '0 0 8px rgba(255,215,0,0.5)' }}
          />
        </div>
      </MagicCard>

      {/* 主答题区 */}
      <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-4 items-start">
        {/* 左侧宠物陪伴 */}
        <MagicCard className="p-4 flex flex-row lg:flex-col items-center gap-3 justify-center">
          <div className="text-5xl animate-float" aria-hidden>
            {currentPetId === 'phoenix' ? '🦄' : '🐰'}
          </div>
          <p className="text-xs font-rounded text-cream/60 text-center max-w-[8rem]">
            {encourage}
          </p>
        </MagicCard>

        {/* 题目卡片 */}
        <MagicCard className="p-6 md:p-8 relative overflow-visible" glow>
          {/* 右上角按钮 */}
          <div className="flex items-center gap-2 absolute top-4 right-4">
            <button
              onClick={() => current && toggleFavorite(current.word)}
              className="w-9 h-9 rounded-full bg-cosmos-light/40 border border-gold/30 flex items-center justify-center hover:bg-gold/20 transition-all text-lg"
              title={fav ? '取消收藏' : '收藏单词'}
              aria-label="收藏单词"
            >
              {fav ? '⭐' : '☆'}
            </button>
            {current?.sentence_analysis && (
              <button
                onClick={() => setShowAnalysis((s) => !s)}
                className={[
                  'w-9 h-9 rounded-full flex items-center justify-center transition-all text-sm',
                  showAnalysis
                    ? 'bg-gold/40 border border-gold text-gold-light'
                    : 'bg-white/60 border border-gold/40 hover:bg-gold/20',
                ].join(' ')}
                title="长难句解析"
                aria-label="长难句解析"
              >
                📝
              </button>
            )}
          </div>

          {/* 题目内容 */}
          <div className="flex flex-col items-center text-center mb-6">
            {/* 单词配图 */}
            {(practiceMode === 'cn-to-en' || practiceMode === 'en-to-cn' || answerState !== 'idle') && (
              <div className="mb-4">
                <WordImage word={current.word} size={130} />
              </div>
            )}

            {/* 词性徽章 */}
            {current.pos && (
              <span className="text-xs bg-gold/20 text-gold px-3 py-1 rounded-full font-medium mb-3 tracking-wide border border-gold/30">
                {current.pos}
              </span>
            )}

            {/* 主标题区 */}
            {practiceMode === 'cn-to-en' && (
              <h2 className="text-2xl md:text-3xl font-magic font-bold text-cream mb-2 leading-tight">
                {current.translation}
              </h2>
            )}

            {practiceMode === 'listen' && (
              <>
                <h2 className="text-lg md:text-xl font-magic font-bold text-cream/90 mb-4">
                  🎧 听音拼写
                </h2>
                <button
                  onClick={() => handlePlay(current.word)}
                  className={`w-14 h-14 rounded-full bg-gradient-to-br from-gold to-gold-dark flex items-center justify-center text-2xl shadow-glow-gold hover:scale-110 transition-all ${isPlaying ? 'scale-125 ring-4 ring-gold/50 animate-pulse' : 'breathe'}`}
                  title="点击播放发音"
                  aria-label="播放发音"
                >
                  {isPlaying ? '🎵' : '🔊'}
                </button>
              </>
            )}

            {practiceMode === 'en-to-cn' && (
              <h2 className="text-2xl md:text-3xl font-magic font-bold text-cream mb-2 leading-tight tracking-wide">
                {current.word}
              </h2>
            )}

            {/* 发音控制行 */}
            {practiceMode !== 'listen' && (
              <div className="flex items-center gap-3 mt-2">
                <AccentToggle accent={accent} onChange={setAccent} />
                <button
                  onClick={() => handlePlay(current.word)}
                  className={`text-lg hover:scale-110 transition-all ${isPlaying ? 'scale-125 animate-pulse' : ''}`}
                  title="播放发音"
                  aria-label="播放发音"
                >
                  {isPlaying ? '🎵' : '🔊'}
                </button>
                {(() => {
                  const phonetic = accent === 'us' ? current.phonetic_us : current.phonetic_uk
                  return phonetic ? (
                    <span className="text-sm text-cream/50 font-rounded italic">{phonetic}</span>
                  ) : null
                })()}
              </div>
            )}

            {practiceMode === 'listen' && (
              <div className="mt-3">
                <AccentToggle accent={accent} onChange={setAccent} />
              </div>
            )}
          </div>

          {/* 高频考点徽章（可展开） */}
          {current.high_freq_points && (
            <div className="mb-4 flex justify-center">
              <button
                onClick={() => setShowHighFreq((s) => !s)}
                className="text-xs bg-mint/40 text-gold-light px-3 py-1.5 rounded-full font-semibold hover:bg-mint/60 transition-all flex items-center gap-1"
              >
                💡 高频考点 {showHighFreq ? '▲' : '▼'}
              </button>
              {showHighFreq && (
                <p className="ml-3 text-xs text-cream/80 bg-mint/30 rounded-lg px-3 py-1.5 max-w-md self-center">
                  {current.high_freq_points}
                </p>
              )}
            </div>
          )}

          {/* 长难句解析（折叠） */}
          {showAnalysis && current.sentence_analysis && (
            <div className="mb-4 mx-auto max-w-md bg-primary/20 rounded-xl p-3 text-sm text-cream/80">
              <p className="font-semibold mb-1">📝 长难句解析</p>
              <p>{current.sentence_analysis}</p>
            </div>
          )}

          {/* 例句（默认隐藏，可展开，有朗读按钮） */}
          <div className="mb-5 flex flex-col items-center">
            <button
              onClick={() => setShowExample((s) => !s)}
              className="text-xs text-cream/60 hover:text-gold-light underline decoration-dotted transition-colors"
            >
              {showExample ? '隐藏例句 ▲' : '查看例句 ▼'}
            </button>
            {showExample && (
              <div className="mt-2 bg-white/50 rounded-xl px-4 py-3 max-w-md text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <p className="text-sm text-gold-light italic">"{current.example_en}"</p>
                  <button
                    onClick={() => playSentence(current.example_en, accent)}
                    className="text-sm hover:scale-110 transition-transform"
                    title="朗读例句"
                    aria-label="朗读例句"
                  >
                    🔊
                  </button>
                </div>
                <p className="text-xs text-cream/60">{current.example_cn}</p>
              </div>
            )}
          </div>

          {/* 输入框 + 提交按钮 */}
          <div className="flex flex-col sm:flex-row items-center gap-3 max-w-xl mx-auto">
            <div className="relative flex-1 w-full">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={answerState !== 'idle'}
                placeholder={
                  practiceMode === 'en-to-cn' ? '请输入中文释义，按回车提交' : '请输入英文单词，按回车提交'
                }
                className={[
                  'w-full px-5 py-3.5 rounded-2xl font-rounded text-lg text-gold-light',
                  'bg-white/70 border-2 transition-all duration-300 outline-none',
                  'placeholder:text-cream/30',
                  answerState === 'correct'
                    ? 'border-mint-dark bg-mint/20 shadow-glow-soft'
                    : answerState === 'wrong'
                      ? 'border-magic-pink bg-magic-pink/10'
                      : 'border-gold/50 focus:border-gold focus:shadow-glow-gold',
                ].join(' ')}
              />
              {/* 答对/答错粒子动画（pointer-events-none，不阻挡交互） */}
              {answerState === 'correct' && <ParticleEffect type="correct" />}
              {answerState === 'wrong' && <ParticleEffect type="wrong" />}
            </div>
            <MagicButton
              variant="primary"
              onClick={handleSubmit}
              disabled={answerState !== 'idle' || !input.trim()}
              className="shrink-0"
              icon="🪄"
            >
              提交
            </MagicButton>
          </div>

          {/* 答题反馈 */}
          {answerState === 'correct' && (
            <p className="mt-4 text-center font-magic font-bold text-mint-dark animate-pop-in">
              ✨ 答对了！+10 EXP，正在播放发音...
            </p>
          )}
          {answerState === 'wrong' && (
            <div className="mt-4 text-center animate-pop-in">
              <p className="font-magic font-bold text-magic-pink">
                💫 差一点点！正确答案：
                <span className="text-gold-light">
                  {practiceMode === 'en-to-cn' ? current.translation : current.word}
                </span>
              </p>
              <p className="text-xs text-cream/50 mt-1">已自动加入错词本，3 秒后继续～</p>
            </div>
          )}
        </MagicCard>
      </div>

      {/* 底部模式切换 */}
      <MagicCard className="p-4">
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span className="font-magic font-bold text-gold-light mr-2">🪄 模式：</span>
          {(Object.keys(MODE_CONFIG) as PracticeMode[]).map((mode) => {
            const active = practiceMode === mode
            return (
              <button
                key={mode}
                onClick={() => {
                  setPracticeMode(mode)
                  setAnswerState('idle')
                  setInput('')
                }}
                className={[
                  'px-4 py-2.5 rounded-xl text-sm font-rounded font-semibold transition-all border-2',
                  active
                    ? 'bg-gradient-to-r from-gold-light to-gold text-gold-light border-gold-dark shadow-glow-gold'
                    : 'bg-white/50 text-cream/70 border-transparent hover:bg-primary/20 hover:border-gold/40',
                ].join(' ')}
              >
                <span className="mr-1">{MODE_CONFIG[mode].icon}</span>
                {MODE_CONFIG[mode].label}
              </button>
            )
          })}
        </div>
        <p className="text-center text-xs text-cream/50 mt-2">
          {MODE_CONFIG[practiceMode].hint}
        </p>
      </MagicCard>
    </div>
  )
}

// 美音/英音切换小组件
function AccentToggle({ accent, onChange }: { accent: Accent; onChange: (a: Accent) => void }) {
  return (
    <div className="inline-flex rounded-full bg-white/60 border border-gold/30 overflow-hidden">
      <button
        onClick={() => onChange('us')}
        className={[
          'px-2.5 py-1 text-xs font-rounded transition-all',
          accent === 'us' ? 'bg-gold/40 text-gold-light font-bold' : 'text-cream/60',
        ].join(' ')}
        title="美音"
      >
        🇺🇸 美
      </button>
      <button
        onClick={() => onChange('uk')}
        className={[
          'px-2.5 py-1 text-xs font-rounded transition-all',
          accent === 'uk' ? 'bg-gold/40 text-gold-light font-bold' : 'text-cream/60',
        ].join(' ')}
        title="英音"
      >
        🇬🇧 英
      </button>
    </div>
  )
}
