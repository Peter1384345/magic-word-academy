import { useState, useEffect, useRef } from 'react'

// 六芒星6个顶点
const HEX_POINTS = Array.from({ length: 6 }, (_, i) => {
  const angle = (60 * i - 90) * Math.PI / 180
  return { x: 150 + 120 * Math.cos(angle), y: 150 + 120 * Math.sin(angle) }
})

// 粒子
const BURST_PARTICLES = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  angle: (360 / 20) * i,
  distance: 50 + Math.random() * 100,
  color: ['#FFD700', '#E8D5F5', '#FFB6C1', '#A8E6CF', '#7B68EE'][i % 5],
}))

interface PageTransitionProps {
  children: React.ReactNode
  pathname: string
}

export default function PageTransition({ children, pathname }: PageTransitionProps) {
  const [phase, setPhase] = useState<'idle' | 'exit' | 'enter'>('idle')
  const [displayChildren, setDisplayChildren] = useState(children)
  const prevPath = useRef(pathname)
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([])

  // 六芒星路径
  const tri1 = HEX_POINTS.filter((_, i) => i % 2 === 0)
  const tri2 = HEX_POINTS.filter((_, i) => i % 2 === 1)
  const d1 = tri1.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
  const d2 = tri2.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

  useEffect(() => {
    if (prevPath.current !== pathname) {
      prevPath.current = pathname
      timerRef.current.forEach(clearTimeout)
      timerRef.current = []

      setPhase('exit')

      const t1 = setTimeout(() => {
        setDisplayChildren(children)
        setPhase('enter')
      }, 600)

      const t2 = setTimeout(() => setPhase('idle'), 1200)
      timerRef.current = [t1, t2]
    } else {
      setDisplayChildren(children)
    }

    return () => { timerRef.current.forEach(clearTimeout) }
  }, [pathname, children])

  return (
    <div className="relative">
      {/* 内容区 */}
      <div
        style={{
          opacity: phase === 'exit' ? 0 : 1,
          transform: phase === 'exit' ? 'scale(0.92) translateY(8px)' : 'scale(1) translateY(0)',
          transition: phase === 'exit'
            ? 'opacity 0.25s ease-in, transform 0.25s ease-in'
            : 'opacity 0.35s ease-out, transform 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        {displayChildren}
      </div>

      {/* 转场覆盖层 */}
      {phase !== 'idle' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none overflow-hidden"
          style={{
            background: 'radial-gradient(circle at center, rgba(26,14,46,0.6) 0%, rgba(5,2,16,0.8) 100%)',
            opacity: phase === 'enter' ? 0 : 1,
            transition: 'opacity 0.5s ease',
          }}
        >
          {/* 旋转六芒星 + 太极 SVG */}
          <div
            className="absolute"
            style={{
              width: 260,
              height: 260,
              opacity: phase === 'exit' ? 1 : 0.5,
              transition: 'opacity 0.3s ease',
            }}
          >
            <svg viewBox="0 0 300 300" className="w-full h-full">
              {/* 外圈 */}
              <circle cx="150" cy="150" r="140" fill="none" stroke="rgba(255,215,0,0.3)" strokeWidth="1.5" strokeDasharray="6 3">
                <animateTransform attributeName="transform" type="rotate" from="0 150 150" to="360 150 150" dur="6s" repeatCount="indefinite" />
              </circle>
              {/* 六芒星 */}
              <g opacity="0.6">
                <path d={d1} fill="none" stroke="rgba(255,215,0,0.7)" strokeWidth="2">
                  <animateTransform attributeName="transform" type="rotate" from="0 150 150" to="360 150 150" dur="4s" repeatCount="indefinite" />
                </path>
                <path d={d2} fill="none" stroke="rgba(168,230,207,0.6)" strokeWidth="2">
                  <animateTransform attributeName="transform" type="rotate" from="360 150 150" to="0 150 150" dur="4s" repeatCount="indefinite" />
                </path>
              </g>
              {/* 太极 */}
              <g opacity="0.5">
                <animateTransform attributeName="transform" type="rotate" from="0 150 150" to="-360 150 150" dur="3s" repeatCount="indefinite" />
                <circle cx="150" cy="150" r="35" fill="none" stroke="rgba(255,215,0,0.4)" strokeWidth="1.5" />
                <path d="M150 115 A35 35 0 0 1 150 185 A17.5 17.5 0 0 0 150 150 A17.5 17.5 0 0 1 150 115" fill="rgba(74,42,107,0.7)" />
                <path d="M150 115 A35 35 0 0 0 150 185 A17.5 17.5 0 0 1 150 150 A17.5 17.5 0 0 0 150 115" fill="rgba(255,248,231,0.7)" />
                <circle cx="150" cy="132.5" r="5" fill="rgba(74,42,107,0.7)" />
                <circle cx="150" cy="167.5" r="5" fill="rgba(255,248,231,0.7)" />
              </g>
            </svg>
          </div>

          {/* 魔法师（跳跃穿越） */}
          <div
            style={{
              fontSize: 56,
              filter: 'drop-shadow(0 0 20px rgba(255,215,0,0.8))',
              transform: phase === 'exit'
                ? 'scale(0.3) rotate(-20deg) translateY(50px)'
                : 'scale(1.3) rotate(15deg) translateY(-30px)',
              opacity: phase === 'exit' ? 1 : 0.5,
              transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease',
            }}
          >
            🧙‍♂️
          </div>

          {/* 魔法棒 */}
          <div
            className="absolute"
            style={{
              fontSize: 24,
              filter: 'drop-shadow(0 0 12px rgba(255,215,0,1))',
              left: 'calc(50% + 35px)',
              top: 'calc(50% - 25px)',
              transform: phase === 'exit' ? 'scale(0) rotate(0deg)' : 'scale(1) rotate(45deg)',
              opacity: phase === 'exit' ? 0 : 1,
              transition: 'transform 0.3s ease, opacity 0.3s ease',
            }}
          >
            ✨
          </div>

          {/* 粒子 */}
          {phase === 'exit' && (
            <>
              {BURST_PARTICLES.map((p) => (
                <div
                  key={p.id}
                  className="absolute left-1/2 top-1/2 rounded-full"
                  style={{
                    width: 3 + Math.random() * 4,
                    height: 3 + Math.random() * 4,
                    background: p.color,
                    boxShadow: `0 0 8px ${p.color}`,
                    animation: `pageBurst 0.5s ease-out forwards`,
                    '--tx': `${Math.cos((p.angle * Math.PI) / 180) * p.distance}px`,
                    '--ty': `${Math.sin((p.angle * Math.PI) / 180) * p.distance}px`,
                  } as React.CSSProperties}
                />
              ))}
            </>
          )}
        </div>
      )}

      <style>{`
        @keyframes pageBurst {
          0% { transform: translate(-50%, -50%) translate(0, 0) scale(1); opacity: 1; }
          100% { transform: translate(-50%, -50%) translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
        }
      `}</style>
    </div>
  )
}
