import { useState, useEffect, useRef } from 'react'

interface MagicSplashProps {
  onFinished: () => void
}

// ===== Canvas 粒子类型 =====
interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  type: 'spark' | 'glow'
}

interface VortexStar {
  angle: number
  radius: number
  baseRadius: number
  speed: number
  size: number
  hue: number
  z: number
}

// ===== 八卦爻线配置（从下到上：初爻/中爻/上爻）=====
// 阳爻=true（整条），阴爻=false（断开）
// 八卦对应：乾☰ 兑☱ 离☲ 震☳ 巽☴ 坎☵ 艮☶ 坤☷
const BAGUA_YAO: { name: string; lines: [boolean, boolean, boolean] }[] = [
  { name: '☰', lines: [true, true, true] },   // 乾
  { name: '☱', lines: [true, true, false] },  // 兑
  { name: '☲', lines: [true, false, true] },  // 离
  { name: '☳', lines: [true, false, false] }, // 震
  { name: '☴', lines: [false, true, true] },  // 巽
  { name: '☵', lines: [false, true, false] }, // 坎
  { name: '☶', lines: [false, false, true] }, // 艮
  { name: '☷', lines: [false, false, false] },// 坤
]

// 绘制单个八卦的爻线
function BaguaGlyph({ yao, color }: { yao: { name: string; lines: [boolean, boolean, boolean] }; color: string }) {
  const w = 28
  const gap = 4
  const lineH = 3
  const rowGap = 5
  return (
    <g>
      {[0, 1, 2].map((i) => {
        const y = i * (lineH + rowGap)
        if (yao.lines[i]) {
          return <rect key={i} x={0} y={y} width={w} height={lineH} rx={1.5} fill={color} />
        }
        return (
          <g key={i}>
            <rect x={0} y={y} width={(w - gap) / 2} height={lineH} rx={1.5} fill={color} />
            <rect x={(w + gap) / 2} y={y} width={(w - gap) / 2} height={lineH} rx={1.5} fill={color} />
          </g>
        )
      })}
    </g>
  )
}

// 六芒星两个三角形
const HEX_VERTS = Array.from({ length: 6 }, (_, i) => {
  const a = (60 * i - 90) * Math.PI / 180
  return { x: 250 + 150 * Math.cos(a), y: 250 + 150 * Math.sin(a) }
})
const TRI1 = [HEX_VERTS[0], HEX_VERTS[2], HEX_VERTS[4]]
const TRI2 = [HEX_VERTS[1], HEX_VERTS[3], HEX_VERTS[5]]
const d1 = TRI1.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'
const d2 = TRI2.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z'

export default function MagicSplash({ onFinished }: MagicSplashProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [phase, setPhase] = useState<'vortex' | 'summon' | 'reveal' | 'fadeout'>('vortex')
  const startTimeRef = useRef(0)

  useEffect(() => {
    startTimeRef.current = performance.now()
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')!
    let animationId: number
    let particles: Particle[] = []
    let vortexStars: VortexStar[] = []

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    for (let i = 0; i < 180; i++) {
      vortexStars.push({
        angle: Math.random() * Math.PI * 2,
        radius: 80 + Math.random() * 450,
        baseRadius: 80 + Math.random() * 450,
        speed: 0.002 + Math.random() * 0.007,
        size: 0.5 + Math.random() * 2,
        hue: 35 + Math.random() * 30,
        z: Math.random(),
      })
    }

    const animate = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000
      const w = canvas.width
      const h = canvas.height
      const cx = w / 2
      const cy = h / 2

      if (elapsed < 1.2) setPhase('vortex')
      else if (elapsed < 2.5) setPhase('summon')
      else if (elapsed < 5) setPhase('reveal')
      else if (elapsed < 6) setPhase('fadeout')

      // 背景渐变
      const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 1.2)
      bgGradient.addColorStop(0, '#2D1B4E')
      bgGradient.addColorStop(0.4, '#1A0E2E')
      bgGradient.addColorStop(0.8, '#0D0718')
      bgGradient.addColorStop(1, '#050210')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, w, h)

      // 漩涡星辰
      const vortexIntensity = elapsed < 2 ? 1 : Math.max(0, 1 - (elapsed - 2) / 1)
      if (vortexIntensity > 0) {
        vortexStars.forEach((s) => {
          s.angle += s.speed * 2
          s.radius -= s.speed * 60
          if (s.radius < 30) {
            s.radius = s.baseRadius
            for (let k = 0; k < 2; k++) {
              const a = Math.random() * Math.PI * 2
              const v = 1 + Math.random() * 3
              particles.push({
                x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
                life: 30 + Math.random() * 30, maxLife: 60,
                size: 1 + Math.random() * 2,
                color: `hsl(${s.hue}, 90%, 70%)`, type: 'spark',
              })
            }
          }
          const x = cx + Math.cos(s.angle) * s.radius
          const y = cy + Math.sin(s.angle) * s.radius
          const alpha = vortexIntensity * (0.4 + s.z * 0.6)
          const tx = cx + Math.cos(s.angle - s.speed * 12) * (s.radius + 25)
          const ty = cy + Math.sin(s.angle - s.speed * 12) * (s.radius + 25)
          const g = ctx.createLinearGradient(x, y, tx, ty)
          g.addColorStop(0, `hsla(${s.hue}, 90%, 70%, ${alpha})`)
          g.addColorStop(1, `hsla(${s.hue}, 90%, 70%, 0)`)
          ctx.strokeStyle = g
          ctx.lineWidth = s.size
          ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(tx, ty); ctx.stroke()
          ctx.fillStyle = `hsla(${s.hue}, 100%, 80%, ${alpha})`
          ctx.beginPath(); ctx.arc(x, y, s.size, 0, Math.PI * 2); ctx.fill()
        })
      }

      // 中心光球
      const orbIntensity = Math.min(1, elapsed / 1.5) * (elapsed < 4 ? 1 : Math.max(0, 1 - (elapsed - 4) / 1))
      if (orbIntensity > 0) {
        const r = 50 + Math.sin(elapsed * 4) * 15 + Math.min(60, elapsed * 25)
        const gg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 3)
        gg.addColorStop(0, `rgba(255, 215, 0, ${0.5 * orbIntensity})`)
        gg.addColorStop(0.3, `rgba(255, 180, 50, ${0.25 * orbIntensity})`)
        gg.addColorStop(0.6, `rgba(180, 100, 200, ${0.12 * orbIntensity})`)
        gg.addColorStop(1, 'rgba(0,0,0,0)')
        ctx.fillStyle = gg
        ctx.fillRect(cx - r * 3, cy - r * 3, r * 6, r * 6)
        const cg = ctx.createRadialGradient(cx, cy, 0, cx, cy, r)
        cg.addColorStop(0, `rgba(255, 255, 255, ${orbIntensity})`)
        cg.addColorStop(0.3, `rgba(255, 230, 100, ${0.9 * orbIntensity})`)
        cg.addColorStop(0.7, `rgba(255, 180, 50, ${0.4 * orbIntensity})`)
        cg.addColorStop(1, 'rgba(255, 100, 0, 0)')
        ctx.fillStyle = cg
        ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill()
      }

      // 魔法师召唤粒子
      if (elapsed > 2.5 && elapsed < 3.5 && Math.random() < 0.4) {
        for (let i = 0; i < 4; i++) {
          const a = Math.random() * Math.PI * 2
          const v = 2 + Math.random() * 3
          particles.push({
            x: cx + (Math.random() - 0.5) * 50, y: cy - 20,
            vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1,
            life: 40 + Math.random() * 30, maxLife: 70,
            size: 1 + Math.random() * 2,
            color: `hsl(${40 + Math.random() * 20}, 90%, 70%)`, type: 'glow',
          })
        }
      }

      // 大爆发
      if (elapsed > 3.5 && elapsed < 3.7 && particles.length < 200) {
        for (let i = 0; i < 60; i++) {
          const a = (i / 60) * Math.PI * 2 + Math.random() * 0.3
          const v = 4 + Math.random() * 7
          particles.push({
            x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            life: 60 + Math.random() * 40, maxLife: 100,
            size: 2 + Math.random() * 3,
            color: `hsl(${[45, 280, 330, 160, 200][i % 5] + Math.random() * 20}, 90%, 70%)`,
            type: 'spark',
          })
        }
      }

      // 粒子更新
      particles = particles.filter((p) => p.life > 0)
      particles.forEach((p) => {
        p.x += p.vx; p.y += p.vy
        p.vx *= 0.98; p.vy *= 0.98; p.vy += 0.05
        p.life -= 1
        const alpha = p.life / p.maxLife
        if (p.type === 'glow') {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 4)
          g.addColorStop(0, p.color.replace(')', `, ${alpha})`).replace('hsl', 'hsla'))
          g.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = g
          ctx.fillRect(p.x - p.size * 4, p.y - p.size * 4, p.size * 8, p.size * 8)
        } else {
          ctx.fillStyle = p.color.replace('hsl', 'hsla').replace(')', `, ${alpha})`)
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2); ctx.fill()
          ctx.fillStyle = p.color.replace('hsl', 'hsla').replace(')', `, ${alpha * 0.3})`)
          ctx.beginPath(); ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2); ctx.fill()
        }
      })

      if (elapsed > 5) {
        ctx.fillStyle = `rgba(5, 2, 16, ${Math.min(1, (elapsed - 5) / 1)})`
        ctx.fillRect(0, 0, w, h)
      }

      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)
    const finishTimer = setTimeout(onFinished, 6000)
    return () => {
      cancelAnimationFrame(animationId)
      clearTimeout(finishTimer)
      window.removeEventListener('resize', resize)
    }
  }, [onFinished])

  // 阵法显示控制
  const circleOpacity = phase === 'vortex' ? 0 : phase === 'fadeout' ? 0 : 1
  const wizardOpacity = phase === 'vortex' ? 0 : 1
  const titleOpacity = phase === 'reveal' || phase === 'fadeout' ? 1 : 0

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: '#050210', opacity: phase === 'fadeout' ? 0 : 1, transition: 'opacity 1s ease-out' }}
    >
      {/* Canvas粒子背景层 */}
      <canvas ref={canvasRef} className="absolute inset-0" />

      {/* SVG 八卦六芒星阵法层 */}
      <div
        className="absolute"
        style={{
          width: 560,
          height: 560,
          opacity: circleOpacity,
          transition: 'opacity 0.8s ease',
        }}
      >
        <svg viewBox="0 0 500 500" className="w-full h-full" style={{ overflow: 'visible' }}>
          {/* 发光滤镜 */}
          <defs>
            <filter id="goldGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <filter id="strongGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <radialGradient id="hexGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="rgba(255,215,0,0.15)" />
              <stop offset="100%" stopColor="rgba(255,215,0,0)" />
            </radialGradient>
            <linearGradient id="goldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D4AF37" />
              <stop offset="50%" stopColor="#FFE55C" />
              <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
            <linearGradient id="taijiYin" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4A2A6B" />
              <stop offset="100%" stopColor="#2D1B4E" />
            </linearGradient>
            <linearGradient id="taijiYang" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FFF8E7" />
              <stop offset="100%" stopColor="#FFE55C" />
            </linearGradient>
          </defs>

          {/* ===== 最外圈：虚线旋转 ===== */}
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="40s" repeatCount="indefinite" />
            <circle cx="250" cy="250" r="240" fill="none" stroke="rgba(255,215,0,0.3)" strokeWidth="1.5" strokeDasharray="4 8" filter="url(#goldGlow)" />
            {/* 12方位星点 */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (30 * i - 90) * Math.PI / 180
              const x = 250 + 240 * Math.cos(a)
              const y = 250 + 240 * Math.sin(a)
              return <circle key={i} cx={x} cy={y} r="3" fill="#FFD700" filter="url(#goldGlow)">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
              </circle>
            })}
          </g>

          {/* ===== 第二层：六芒星背景圆 + 双三角形 ===== */}
          <circle cx="250" cy="250" r="210" fill="url(#hexGrad)" stroke="rgba(212,181,232,0.4)" strokeWidth="1.5" />

          {/* 六芒星三角形1（顺时针旋转） */}
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="30s" repeatCount="indefinite" />
            <path d={d1} fill="none" stroke="url(#goldStroke)" strokeWidth="2.5" filter="url(#goldGlow)" />
            {/* 三角形顶点星 */}
            {TRI1.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#FFD700" filter="url(#strongGlow)" />
                <circle cx={p.x} cy={p.y} r="2" fill="#FFFFFF" />
              </g>
            ))}
          </g>

          {/* 六芒星三角形2（逆时针旋转） */}
          <g>
            <animateTransform attributeName="transform" type="rotate" from="360 250 250" to="0 250 250" dur="30s" repeatCount="indefinite" />
            <path d={d2} fill="none" stroke="rgba(168,230,207,0.8)" strokeWidth="2.5" filter="url(#goldGlow)" />
            {TRI2.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#A8E6CF" filter="url(#strongGlow)" />
                <circle cx={p.x} cy={p.y} r="2" fill="#FFFFFF" />
              </g>
            ))}
          </g>

          {/* 六芒星内部连接线（小六边形） */}
          <polygon
            points={HEX_VERTS.map(p => `${p.x},${p.y}`).join(' ')}
            fill="none" stroke="rgba(255,215,0,0.2)" strokeWidth="1"
          />

          {/* ===== 第三层：八卦环 ===== */}
          <circle cx="250" cy="250" r="120" fill="none" stroke="rgba(168,230,207,0.35)" strokeWidth="1" strokeDasharray="2 4" filter="url(#goldGlow)">
            <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="20s" repeatCount="indefinite" />
          </circle>

          {/* 八卦符号（精细爻线绘制） */}
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="360 250 250" dur="20s" repeatCount="indefinite" />
            {BAGUA_YAO.map((yao, i) => {
              const a = (45 * i - 90) * Math.PI / 180
              const x = 250 + 100 * Math.cos(a)
              const y = 250 + 100 * Math.sin(a)
              return (
                <g key={i} transform={`translate(${x - 14}, ${y - 9})`}>
                  <BaguaGlyph yao={yao} color="#A8E6CF" />
                </g>
              )
            })}
          </g>

          {/* 八卦环与六芒星顶点之间的连接线 */}
          {HEX_VERTS.map((p, i) => {
            const dx = 250 - p.x
            const dy = 250 - p.y
            const len = Math.sqrt(dx * dx + dy * dy)
            const nx = p.x + (dx / len) * 30
            const ny = p.y + (dy / len) * 30
            return (
              <line key={i} x1={p.x} y1={p.y} x2={nx} y2={ny}
                stroke="rgba(255,215,0,0.3)" strokeWidth="1" strokeDasharray="2 3" />
            )
          })}

          {/* ===== 中心：太极图 ===== */}
          <g>
            <animateTransform attributeName="transform" type="rotate" from="0 250 250" to="-360 250 250" dur="12s" repeatCount="indefinite" />
            {/* 太极外圈光晕 */}
            <circle cx="250" cy="250" r="60" fill="none" stroke="rgba(255,215,0,0.6)" strokeWidth="2" filter="url(#strongGlow)" />
            <circle cx="250" cy="250" r="55" fill="none" stroke="rgba(255,215,0,0.3)" strokeWidth="1" />
            {/* 阳半圆（浅） */}
            <path d="M250 195 A55 55 0 0 1 250 305 A27.5 27.5 0 0 0 250 250 A27.5 27.5 0 0 1 250 195"
              fill="url(#taijiYang)" />
            {/* 阴半圆（深） */}
            <path d="M250 195 A55 55 0 0 0 250 305 A27.5 27.5 0 0 1 250 250 A27.5 27.5 0 0 0 250 195"
              fill="url(#taijiYin)" />
            {/* 阳中阴点 */}
            <circle cx="250" cy="222.5" r="8" fill="url(#taijiYin)" />
            <circle cx="250" cy="222.5" r="3" fill="rgba(255,255,255,0.4)" />
            {/* 阴中阳点 */}
            <circle cx="250" cy="277.5" r="8" fill="url(#taijiYang)" />
            <circle cx="250" cy="277.5" r="3" fill="rgba(74,42,107,0.4)" />
          </g>
        </svg>
      </div>

      {/* 魔法师 */}
      <div
        className="absolute z-10"
        style={{
          opacity: wizardOpacity,
          transform: phase === 'vortex' ? 'translateY(-100px) scale(0.5)' : phase === 'summon' ? 'translateY(-10px) scale(1.1)' : 'translateY(-10px) scale(1)',
          transition: 'transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.5s ease',
          filter: 'drop-shadow(0 0 30px rgba(255,215,0,0.8))',
        }}
      >
        <div style={{ fontSize: 80, animation: 'wizardFloat 3s ease-in-out infinite' }}>🧙‍♂️</div>
        <div style={{ fontSize: 36, marginLeft: 50, marginTop: -20, filter: 'drop-shadow(0 0 15px rgba(255,215,0,1))' }}>✨</div>
      </div>

      {/* 标题 */}
      <div
        className="absolute z-20 flex flex-col items-center"
        style={{
          marginTop: 200,
          opacity: titleOpacity,
          transform: titleOpacity ? 'translateY(0) scale(1)' : 'translateY(30px) scale(0.9)',
          transition: 'opacity 0.7s ease, transform 0.7s cubic-bezier(0.34, 1.56, 0.64, 1)',
        }}
      >
        <h1
          className="font-magic font-extrabold text-5xl md:text-7xl tracking-wider"
          style={{
            background: 'linear-gradient(135deg, #D4AF37 0%, #FFE55C 30%, #FFFFFF 50%, #FFE55C 70%, #D4AF37 100%)',
            backgroundSize: '200% 200%',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            filter: 'drop-shadow(0 3px 12px rgba(255,215,0,0.7))',
            animation: phase === 'reveal' ? 'goldShimmer 2s ease-in-out infinite' : 'none',
          }}
        >
          魔法单词学院
        </h1>
        <p className="mt-4 text-lg md:text-xl font-rounded tracking-[0.3em]" style={{ color: 'rgba(168, 230, 207, 0.85)' }}>
          ✨   开 启 你 的 魔 法 之 旅   ✨
        </p>
      </div>

      <style>{`
        @keyframes wizardFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes goldShimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
      `}</style>
    </div>
  )
}
