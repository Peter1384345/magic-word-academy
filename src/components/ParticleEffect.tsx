import { useMemo, useEffect, type CSSProperties } from 'react'

interface ParticleEffectProps {
  type: 'correct' | 'wrong'
  // 动画完成回调
  onComplete?: () => void
}

// 单个粒子的描述
interface Particle {
  id: number
  left: number // 起始水平位置 %
  top: number // 起始垂直位置 %
  tx: number // 水平位移 px
  ty: number // 垂直位移 px（负值表示向上）
  rot: number // 旋转角度 deg
  isDot: boolean // 是否为圆点（否则用 emoji）
  emoji: string
  color: string
  size: number
  delay: number // 动画延迟 s
  duration: number // 动画时长 s
}

// 答对粒子 emoji：星星 / 爱心
const CORRECT_EMOJIS = ['✨', '⭐', '💫', '💛']
// 答对圆点颜色：金 / 淡粉紫 / 白
const CORRECT_COLORS = ['#FFD700', '#D4B5E8', '#FFFFFF']
// 答错粒子 emoji：柔粉心形
const WRONG_EMOJIS = ['💗', '💕', '💝', '💜']
// 答错圆点颜色：柔粉 / 淡红
const WRONG_COLORS = ['#FFB6C1', '#FF6B6B']

// 粒子动画组件：答对时金色粒子从中心爆开并向上飘升；答错时柔粉心形从顶部缓慢飘落
export default function ParticleEffect({ type, onComplete }: ParticleEffectProps) {
  const isCorrect = type === 'correct'

  // 随机生成粒子（useMemo 避免重渲染时位置抖动）
  const particles = useMemo<Particle[]>(() => {
    const count = isCorrect ? 28 : 18
    return Array.from({ length: count }, (_, i) => {
      if (isCorrect) {
        // 从中心向四周散开，并整体向上飘升
        const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4
        const distance = 70 + Math.random() * 80
        const tx = Math.cos(angle) * distance
        // 向上偏移：让粒子整体呈上升爆开效果
        const ty = Math.sin(angle) * distance - 90 - Math.random() * 40
        const isDot = Math.random() > 0.6
        return {
          id: i,
          left: 50,
          top: 50,
          tx,
          ty,
          rot: 0,
          isDot,
          emoji: CORRECT_EMOJIS[i % CORRECT_EMOJIS.length],
          color: CORRECT_COLORS[i % CORRECT_COLORS.length],
          size: isDot ? 7 + Math.random() * 7 : 16 + Math.random() * 12,
          delay: Math.random() * 0.15,
          duration: 1.2 + Math.random() * 0.3,
        }
      }
      // 答错：从顶部飘落，左右偏移 + 旋转
      const isDot = Math.random() > 0.75
      return {
        id: i,
        left: Math.random() * 100,
        top: 0,
        tx: (Math.random() - 0.5) * 90,
        ty: 0,
        rot: (Math.random() - 0.5) * 120,
        isDot,
        emoji: WRONG_EMOJIS[i % WRONG_EMOJIS.length],
        color: WRONG_COLORS[i % WRONG_COLORS.length],
        size: isDot ? 7 + Math.random() * 6 : 15 + Math.random() * 10,
        delay: Math.random() * 0.5,
        duration: 1.6 + Math.random() * 0.4,
      }
    })
  }, [isCorrect])

  // 动画结束后触发回调（答对 1.5s，答错 2s）
  const totalDuration = isCorrect ? 1500 : 2000
  useEffect(() => {
    if (!onComplete) return
    const timer = setTimeout(onComplete, totalDuration)
    return () => clearTimeout(timer)
  }, [onComplete, totalDuration])

  return (
    <div className="pointer-events-none absolute inset-0 z-20 overflow-visible">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute select-none"
          style={
            {
              left: `${p.left}%`,
              top: `${p.top}%`,
              // 用负 margin 把粒子中心对齐到起始点
              marginLeft: `${-p.size / 2}px`,
              marginTop: isCorrect ? `${-p.size / 2}px` : '0px',
              lineHeight: 1,
              fontSize: p.isDot ? 0 : `${p.size}px`,
              width: p.isDot ? `${p.size}px` : undefined,
              height: p.isDot ? `${p.size}px` : undefined,
              borderRadius: p.isDot ? '9999px' : undefined,
              background: p.isDot ? p.color : undefined,
              boxShadow: p.isDot ? `0 0 6px ${p.color}` : undefined,
              animation: `${isCorrect ? 'particleExplode' : 'particleFall'} ${p.duration}s ease-out ${p.delay}s forwards`,
              '--tx': `${p.tx}px`,
              '--ty': `${p.ty}px`,
              '--rot': `${p.rot}deg`,
            } as CSSProperties
          }
        >
          {p.isDot ? '' : p.emoji}
        </span>
      ))}

      {/* 文字弹出：外层负责定位，内层负责缩放动画，避免 transform 冲突 */}
      <div className="absolute left-1/2 top-0" style={{ transform: 'translate(-50%, -120%)' }}>
        <span
          className="font-magic font-extrabold whitespace-nowrap drop-shadow"
          style={{
            display: 'inline-block',
            fontSize: isCorrect ? '1.8rem' : '1.5rem',
            color: isCorrect ? '#D4AF37' : '#FF6B6B',
            animation: `textPop ${isCorrect ? 1.5 : 2}s ease-out forwards`,
          }}
        >
          {isCorrect ? 'Correct! ✨' : '再试一次 💪'}
        </span>
      </div>
    </div>
  )
}
