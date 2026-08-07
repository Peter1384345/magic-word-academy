import { memo, useMemo } from 'react'
import { getWordEmoji } from '../utils/wordEmojis'

interface WordImageProps {
  word: string
  size?: number
}

// 词性对应的主题色
const POS_COLORS: Record<string, { bg: string; border: string }> = {
  n:   { bg: 'rgba(255, 215, 0, 0.15)',  border: 'rgba(255, 215, 0, 0.5)' },
  v:   { bg: 'rgba(168, 230, 207, 0.15)', border: 'rgba(168, 230, 207, 0.5)' },
  adj: { bg: 'rgba(255, 182, 193, 0.15)', border: 'rgba(255, 182, 193, 0.5)' },
  adv: { bg: 'rgba(212, 181, 232, 0.15)', border: 'rgba(212, 181, 232, 0.5)' },
}

// 单词配图组件（纯本地生成，不依赖外部API）
function WordImageBase({ word, size = 130 }: WordImageProps) {
  const emoji = useMemo(() => getWordEmoji(word), [word])
  const firstLetter = word.charAt(0).toUpperCase()

  // 配色：默认金色
  const colorScheme = POS_COLORS.n // 简化：统一用金色主题
  const bg = colorScheme.bg
  const border = colorScheme.border

  return (
    <div
      className="rounded-full flex items-center justify-center relative breathe"
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle at 30% 30%, ${bg}, rgba(45, 27, 78, 0.6))`,
        border: `3px solid ${border}`,
        boxShadow: `0 0 20px ${border}, inset 0 0 20px rgba(255, 215, 0, 0.1)`,
      }}
    >
      {/* 装饰星星 */}
      <span
        className="absolute animate-twinkle"
        style={{ top: '10%', right: '15%', fontSize: size * 0.15, opacity: 0.7 }}
      >
        ✨
      </span>
      <span
        className="absolute animate-twinkle"
        style={{ bottom: '12%', left: '12%', fontSize: size * 0.12, opacity: 0.5, animationDelay: '0.5s' }}
      >
        ⭐
      </span>

      {/* 主体：emoji 或首字母 */}
      {emoji ? (
        <span
          style={{
            fontSize: size * 0.5,
            lineHeight: 1,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
          }}
        >
          {emoji}
        </span>
      ) : (
        <span
          className="font-magic font-extrabold"
          style={{
            fontSize: size * 0.42,
            color: '#FFD700',
            textShadow: '0 0 12px rgba(255, 215, 0, 0.6), 0 2px 4px rgba(0,0,0,0.3)',
          }}
        >
          {firstLetter}
        </span>
      )}

      {/* 底部小标签：单词首字母 */}
      <span
        className="absolute font-rounded"
        style={{
          bottom: '-2px',
          fontSize: size * 0.1,
          color: 'rgba(255, 248, 231, 0.5)',
          letterSpacing: '0.05em',
        }}
      >
        {word.toLowerCase().slice(0, 6)}
      </span>
    </div>
  )
}

export const WordImage = memo(WordImageBase)
export default WordImage
