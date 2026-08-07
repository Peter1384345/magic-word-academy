import { useState, useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWordStore } from '../store/useWordStore'
import MagicCard from '../components/MagicCard'
import MagicButton from '../components/MagicButton'
import { playSentence, playWord } from '../utils/pronunciation'
import type { Accent } from '../utils/pronunciation'
import type { Textbook, TextbookCategory, Word } from '../types'

// 使用 Vite 的 import.meta.glob 预加载所有课文 JSON
const textbookModules = import.meta.glob('../data/textbooks/**/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Textbook>

// 解析所有课文
const ALL_TEXTBOOKS: Textbook[] = Object.values(textbookModules)

// 三个 Tab 配置
const TABS: { key: TextbookCategory; label: string; icon: string }[] = [
  { key: 'graded', label: '分级阅读', icon: '🌱' },
  { key: 'textbook', label: '教材原文', icon: '📕' },
  { key: 'literature', label: '美文欣赏', icon: '🌸' },
]

// 将英文文本按单词拆分，生词（在词汇表中）渲染为可点击的下划线词
function renderTextWithRareWords(
  text: string,
  vocabulary: string[],
  onWordClick: (word: string) => void,
): ReactNode[] {
  const vocabSet = new Set(vocabulary.map((v) => v.toLowerCase()))
  // 按英文单词拆分，保留非单词部分（标点、空格）
  const parts = text.split(/([A-Za-z]+)/)
  return parts.map((part, i) => {
    if (part && vocabSet.has(part.toLowerCase())) {
      return (
        <button
          key={i}
          onClick={() => onWordClick(part.toLowerCase())}
          className="text-gold-light underline decoration-gold decoration-dashed underline-offset-2 hover:bg-gold/20 rounded px-0.5 transition-colors cursor-pointer"
          title="点击查看释义"
        >
          {part}
        </button>
      )
    }
    return <span key={i}>{part}</span>
  })
}

export default function TextbookPage() {
  const navigate = useNavigate()
  const { wordBank, setGrade } = useWordStore()

  // 全局单词映射表（word -> Word），用于生词释义查询
  const wordMap = useMemo(() => {
    const map = new Map<string, Word>()
    Object.values(wordBank).forEach((words) => {
      words.forEach((w) => map.set(w.word.toLowerCase(), w))
    })
    return map
  }, [wordBank])

  // 当前 Tab
  const [activeTab, setActiveTab] = useState<TextbookCategory>('graded')
  // 中文对照翻译开关
  const [showTranslation, setShowTranslation] = useState(true)
  // 当前选中的课文 id
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // 点击的生词（弹出释义卡）
  const [clickedWord, setClickedWord] = useState<string | null>(null)
  // 发音口音
  const [accent, setAccent] = useState<Accent>('us')

  // 当前 Tab 下的课文列表
  const catalog = useMemo(
    () => ALL_TEXTBOOKS.filter((t) => t.category === activeTab),
    [activeTab],
  )

  // 当前选中的课文（默认选第一篇）
  const current = useMemo(() => {
    if (selectedId) {
      const found = ALL_TEXTBOOKS.find((t) => t.id === selectedId)
      if (found && found.category === activeTab) return found
    }
    return catalog[0] ?? null
  }, [selectedId, activeTab, catalog])

  // 切换 Tab 时重置选中
  const handleTabChange = (tab: TextbookCategory) => {
    setActiveTab(tab)
    setClickedWord(null)
  }

  // 点击生词：查找释义
  const handleWordClick = (word: string) => {
    setClickedWord(word)
    // 同时播放发音
    playWord(word, accent)
  }

  // 我要背本课生词：跳转到练习页
  const handleMemorizeVocab = () => {
    if (current?.grade) {
      setGrade(current.grade)
    }
    navigate('/practice')
  }

  // 点击的生词释义
  const clickedWordInfo = clickedWord ? wordMap.get(clickedWord) : null

  return (
    <div className="space-y-5 animate-pop-in">
      {/* 顶部：Tab 切换 + 翻译开关 + 口音切换 */}
      <MagicCard className="p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        {/* 三个 Tab */}
        <div className="flex items-center gap-2 flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => handleTabChange(tab.key)}
              className={[
                'px-4 py-2 rounded-xl text-sm font-rounded font-semibold transition-all border-2',
                activeTab === tab.key
                  ? 'bg-gradient-to-r from-primary to-primary-dark text-white border-primary-dark shadow-card'
                  : 'bg-white/50 text-cream/70 border-transparent hover:bg-primary/20',
              ].join(' ')}
            >
              <span className="mr-1">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {/* 口音切换 */}
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
          {/* 中文对照翻译开关 */}
          <button
            onClick={() => setShowTranslation((s) => !s)}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-rounded font-medium transition-all',
              showTranslation
                ? 'bg-gold/40 text-gold-light border border-gold/60'
                : 'bg-white/50 text-cream/60 border border-transparent',
            ].join(' ')}
          >
            {showTranslation ? '🌐 中文对照：开' : '🌐 中文对照：关'}
          </button>
        </div>
      </MagicCard>

      <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-5">
        {/* 左侧：课文目录 */}
        <MagicCard className="p-4 lg:max-h-[640px] overflow-y-auto h-fit">
          <h3 className="font-magic font-bold text-gold-light mb-3">
            📚 课文目录
          </h3>
          {catalog.length === 0 ? (
            <p className="text-sm text-cream/50 py-4 text-center">
              暂无课文，敬请期待～
            </p>
          ) : (
            <div className="space-y-1.5">
              {catalog.map((t) => {
                const active = current?.id === t.id
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedId(t.id)
                      setClickedWord(null)
                    }}
                    className={[
                      'w-full text-left px-3 py-2.5 rounded-xl transition-all',
                      active
                        ? 'bg-gold/30 text-gold-light font-semibold shadow-card'
                        : 'hover:bg-primary/20 text-cream/70',
                    ].join(' ')}
                  >
                    <p className="font-rounded text-sm leading-snug">{t.title}</p>
                    {t.grade && (
                      <p className="text-[11px] text-cream/50 mt-0.5">
                        {TABS.find((tab) => tab.key === t.category)?.icon} 适合年级 {t.grade}
                      </p>
                    )}
                    {t.author && (
                      <p className="text-[11px] text-cream/50 mt-0.5">— {t.author}</p>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </MagicCard>

        {/* 右侧：课文展示 + 生词表 */}
        <div className="space-y-5">
          {current ? (
            <>
              {/* 课本造型展示区 */}
              <div
                className="relative rounded-2xl border-4 border-gold/50 shadow-magic overflow-hidden"
                style={{
                  background: 'linear-gradient(135deg, #FFFCF5 0%, #FFF8E7 100%)',
                }}
              >
                {/* 书本标题栏 */}
                <div className="bg-gradient-to-r from-gold/30 to-primary/30 px-6 py-4 border-b-2 border-gold/40">
                  <h2 className="text-2xl font-magic font-extrabold text-gold-light">
                    {current.title}
                  </h2>
                  {current.author && (
                    <p className="text-sm text-cream/60 mt-1">— {current.author}</p>
                  )}
                  {current.grade && (
                    <span className="inline-block mt-2 text-xs bg-gold/40 text-gold-light px-2 py-0.5 rounded-full font-semibold">
                      适合年级 {current.grade}
                    </span>
                  )}
                </div>

                {/* 课文正文（打开的书本造型） */}
                <div className="p-6 md:p-8 space-y-4 max-h-[480px] overflow-y-auto">
                  {current.paragraphs.map((para, i) => (
                    <div
                      key={i}
                      className="group relative rounded-lg px-3 py-2 -mx-3 hover:bg-gold/10 transition-colors"
                    >
                      {/* 段落朗读按钮 */}
                      <button
                        onClick={() => playSentence(para.en, accent)}
                        className="absolute -left-1 top-2 opacity-0 group-hover:opacity-100 transition-opacity w-7 h-7 rounded-full bg-gold/40 hover:bg-gold/60 flex items-center justify-center text-xs"
                        title="朗读本段"
                        aria-label="朗读本段"
                      >
                        🔊
                      </button>
                      {/* 英文原文（可点击句子 + 生词下划线） */}
                      <p
                        className="text-lg text-gold-light leading-relaxed font-rounded pl-6 cursor-pointer hover:bg-gold/5 rounded px-2 py-1 -mx-2 transition-colors"
                        onClick={() => playSentence(para.en, accent)}
                      >
                        {renderTextWithRareWords(para.en, current.vocabulary, handleWordClick)}
                      </p>
                      {/* 中文对照翻译 */}
                      {showTranslation && (
                        <p className="text-sm text-cream/60 mt-1 pl-6 italic">
                          {para.cn}
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                {/* 书本底部装饰 */}
                <div className="bg-gold/10 px-6 py-2 border-t-2 border-gold/30 text-center">
                  <span className="text-xs text-cream/40">📖 {current.title}</span>
                </div>
              </div>

              {/* 点击生词的释义卡 */}
              {clickedWord && (
                <MagicCard className="p-4 animate-pop-in" glow>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-magic font-bold text-gold-light">
                          {clickedWordInfo?.word ?? clickedWord}
                        </h3>
                        <button
                          onClick={() => playWord(clickedWordInfo?.word ?? clickedWord, accent)}
                          className="text-sm hover:scale-110 transition-transform"
                          title="播放发音"
                          aria-label="播放发音"
                        >
                          🔊
                        </button>
                      </div>
                      {clickedWordInfo ? (
                        <>
                          <p className="text-xs text-cream/50 mt-1">
                            {accent === 'us'
                              ? clickedWordInfo.phonetic_us
                              : clickedWordInfo.phonetic_uk}{' '}
                            · {clickedWordInfo.pos}
                          </p>
                          <p className="text-sm text-cream/80 mt-1">
                            {clickedWordInfo.translation}
                          </p>
                        </>
                      ) : (
                        <p className="text-sm text-cream/50 mt-1">
                          该词暂未收录在词库中
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setClickedWord(null)}
                      className="text-cream/40 hover:text-gold-light text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </MagicCard>
              )}

              {/* 底部生词表 */}
              <MagicCard className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-magic font-bold text-gold-light">
                    📝 本课生词（{current.vocabulary.length}）
                  </h3>
                  <MagicButton
                    variant="primary"
                    onClick={handleMemorizeVocab}
                    icon="📚"
                    className="text-sm"
                  >
                    我要背本课生词
                  </MagicButton>
                </div>
                <div className="flex flex-wrap gap-2">
                  {current.vocabulary.map((v) => {
                    const info = wordMap.get(v.toLowerCase())
                    return (
                      <button
                        key={v}
                        onClick={() => handleWordClick(v.toLowerCase())}
                        className={[
                          'px-3 py-1.5 rounded-lg text-sm font-rounded transition-all border',
                          clickedWord === v.toLowerCase()
                            ? 'bg-gold/40 border-gold text-gold-light font-semibold'
                            : 'bg-white/50 border-gold/30 text-cream/80 hover:bg-gold/20',
                        ].join(' ')}
                        title={info ? info.translation : '点击查看'}
                      >
                        {v}
                        {info && (
                          <span className="text-[10px] text-cream/50 ml-1">
                            {info.pos}
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </MagicCard>
            </>
          ) : (
            <MagicCard className="p-12 text-center">
              <div className="text-5xl mb-3">📖</div>
              <p className="text-cream/60 font-rounded">
                该分类暂无课文，敬请期待更多精彩内容～
              </p>
            </MagicCard>
          )}
        </div>
      </div>
    </div>
  )
}
