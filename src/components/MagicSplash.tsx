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
// 先天八卦方位（上乾下坤 · 左离右坎）
// 从顶(乾)顺时针环绕顺序：乾 → 巽 → 坎 → 艮 → 坤 → 震 → 离 → 兑
const BAGUA_YAO: { name: string; lines: [boolean, boolean, boolean] }[] = [
  { name: '☰', lines: [true, true, true] },   // 乾 南(上)
  { name: '☴', lines: [false, true, true] },  // 巽 西南(右上)
  { name: '☵', lines: [false, true, false] }, // 坎 西(右)
  { name: '☶', lines: [false, false, true] }, // 艮 西北(右下)
  { name: '☷', lines: [false, false, false] },// 坤 北(下)
  { name: '☳', lines: [true, false, false] }, // 震 东北(左下)
  { name: '☲', lines: [true, false, true] },  // 离 东(左)
  { name: '☱', lines: [true, true, false] },  // 兑 东南(左上)
]

// ===== 12 星座星图 · 经典黄道恒星点阵（坐标归一化 ±0.6 空间）=====
// mags 值越小 = 恒星越亮（类视星等 1-4）
// lines 为星点索引对，表示传统连线
interface Constellation {
  cn: string
  latin: string
  color: string
  stars: [number, number][]
  mags: number[]
  lines: [number, number][]
}

const ZODIAC: Constellation[] = [
  // 0 · 白羊座 Aries · 娄宿三连星 + 小星群
  {
    cn: '白羊', latin: 'Ari', color: '#FFE28A',
    stars: [[0, -0.48], [0.22, -0.18], [0.38, 0.08], [0.44, 0.38], [0.16, -0.36], [-0.06, -0.18], [0.54, 0.2]],
    mags:  [1.2, 1.8, 2.2, 3.0, 3.5, 3.8, 3.6],
    lines: [[0, 1], [1, 2], [2, 3], [4, 0], [5, 1]],
  },
  // 1 · 金牛座 Taurus · 毕宿V形 + 昴星团（七姊妹）
  {
    cn: '金牛', latin: 'Tau', color: '#FFC89B',
    stars: [[-0.52, -0.26], [-0.22, -0.1], [-0.02, 0.16], [0.18, 0.02], [0.44, -0.1], [0.22, 0.3], [-0.18, 0.48], [0.36, -0.32], [0.58, -0.5]],
    mags:  [1.0, 2.0, 2.2, 3.2, 3.5, 3.6, 3.8, 3.3, 4.0],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [7, 4], [8, 7]],
  },
  // 2 · 双子座 Gemini · 北河二北河三 双人形
  {
    cn: '双子', latin: 'Gem', color: '#FFF7C0',
    stars: [[-0.5, -0.44], [-0.42, 0.04], [-0.28, 0.32], [0.3, -0.44], [0.4, 0.04], [0.34, 0.32], [-0.32, 0.58], [0.34, 0.58], [0.02, 0.18], [-0.32, -0.22], [0.3, -0.2]],
    mags:  [1.2, 1.6, 2.4, 1.2, 1.4, 2.8, 3.4, 3.4, 3.5, 3.8, 3.8],
    lines: [[0, 1], [1, 2], [2, 6], [3, 4], [4, 5], [5, 7], [1, 8], [4, 8], [9, 1], [10, 4]],
  },
  // 3 · 巨蟹座 Cancer · 鬼宿积尸气（星团形）
  {
    cn: '巨蟹', latin: 'Cnc', color: '#D4E3FF',
    stars: [[-0.2, -0.26], [0.02, -0.36], [0.22, -0.26], [-0.3, -0.02], [-0.1, 0.08], [0.1, 0.08], [0.3, -0.02], [-0.14, 0.38], [0.14, 0.38], [-0.02, 0.0], [-0.06, 0.18]],
    mags:  [3.2, 3.5, 3.2, 3.8, 3.8, 3.8, 3.8, 3.5, 3.5, 4.0, 4.0],
    lines: [[0, 1], [1, 2], [3, 4], [4, 5], [5, 6], [7, 4], [5, 8]],
  },
  // 4 · 狮子座 Leo · 轩辕镰刀（问号形）+ 狮尾三角
  {
    cn: '狮子', latin: 'Leo', color: '#FFD9A0',
    stars: [[-0.5, -0.14], [-0.46, -0.42], [-0.22, -0.58], [0.02, -0.52], [0.22, -0.28], [0.46, 0.0], [0.5, 0.26], [0.24, 0.42], [-0.12, 0.32], [-0.42, 0.22], [0.02, -0.28]],
    mags:  [1.4, 2.2, 2.2, 3.0, 3.2, 2.0, 1.8, 2.8, 3.5, 3.8, 3.4],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 10], [10, 0], [0, 9], [4, 5], [5, 6], [6, 7], [7, 8], [0, 8]],
  },
  // 5 · 室女座 Virgo · 角宿 Y 形麦穗
  {
    cn: '室女', latin: 'Vir', color: '#E7D7FF',
    stars: [[-0.42, -0.36], [-0.14, -0.08], [0.1, 0.18], [0.34, 0.38], [0.54, 0.46], [0.02, -0.36], [-0.46, 0.26], [-0.52, 0.46], [0.26, -0.3], [0.4, 0.1]],
    mags:  [2.8, 3.0, 2.8, 2.6, 1.0, 3.4, 3.6, 3.8, 3.6, 3.4],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [0, 6], [6, 7], [2, 9], [8, 5]],
  },
  // 6 · 天秤座 Libra · 氐宿秤形
  {
    cn: '天秤', latin: 'Lib', color: '#BFE6D0',
    stars: [[-0.5, 0.1], [-0.3, 0.26], [0.02, 0.4], [0.3, 0.26], [0.5, 0.1], [0.02, -0.26], [0.02, -0.5], [-0.4, -0.08], [0.4, -0.08]],
    mags:  [2.6, 2.8, 3.2, 2.8, 2.6, 3.4, 3.8, 3.4, 3.4],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [2, 5], [5, 6], [0, 7], [4, 8]],
  },
  // 7 · 天蝎座 Scorpius · 心宿S形蝎尾钩
  {
    cn: '天蝎', latin: 'Sco', color: '#FFB5B5',
    stars: [[-0.56, -0.3], [-0.36, -0.08], [-0.14, 0.12], [0.06, 0.3], [0.3, 0.42], [0.5, 0.32], [0.46, 0.08], [0.26, -0.12], [0.06, -0.26], [-0.14, -0.46], [-0.34, -0.5], [-0.26, 0.3]],
    mags:  [3.0, 2.6, 2.2, 1.0, 2.0, 2.6, 3.0, 3.2, 3.0, 2.8, 3.4, 3.8],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 10], [2, 11]],
  },
  // 8 · 射手座 Sagittarius · 斗宿 茶壶形
  {
    cn: '人马', latin: 'Sgr', color: '#C9D6FF',
    stars: [[-0.4, -0.4], [-0.16, -0.4], [0.1, -0.4], [0.36, -0.2], [0.4, 0.06], [0.2, 0.22], [-0.06, 0.22], [-0.3, 0.08], [-0.4, -0.14], [0.36, 0.3], [-0.1, -0.08], [0.14, -0.1]],
    mags:  [2.8, 2.8, 2.4, 2.2, 2.0, 2.8, 3.2, 3.2, 3.4, 3.5, 3.6, 3.6],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 0], [7, 10], [10, 11], [11, 4], [5, 9]],
  },
  // 9 · 摩羯座 Capricornus · 牛宿 三角形 + 鱼尾
  {
    cn: '摩羯', latin: 'Cap', color: '#CFE3FF',
    stars: [[-0.5, 0.22], [-0.26, -0.1], [0.04, 0.06], [-0.1, 0.36], [-0.36, 0.42], [0.24, 0.12], [0.44, -0.1], [0.5, -0.36], [-0.08, -0.2]],
    mags:  [3.0, 2.8, 2.4, 3.2, 3.4, 3.2, 3.0, 3.4, 3.8],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [0, 4], [2, 5], [5, 6], [6, 7], [8, 1]],
  },
  // 10 · 宝瓶座 Aquarius · 危宿 人形 + 水之折线
  {
    cn: '宝瓶', latin: 'Aqr', color: '#BDE4FF',
    stars: [[-0.3, -0.5], [0.02, -0.46], [0.3, -0.5], [0.16, -0.2], [-0.1, -0.1], [-0.34, 0.1], [-0.14, 0.26], [0.1, 0.22], [0.06, 0.42], [-0.1, 0.58], [0.3, 0.42], [0.4, 0.16], [0.18, 0.02]],
    mags:  [2.8, 2.8, 3.0, 2.6, 2.6, 3.2, 3.0, 2.8, 3.4, 3.8, 3.4, 3.2, 3.6],
    lines: [[0, 1], [1, 2], [1, 3], [3, 4], [4, 5], [4, 6], [3, 12], [12, 7], [7, 8], [8, 9], [7, 10], [10, 11]],
  },
  // 11 · 双鱼座 Pisces · 壁宿 双鱼 绳索形
  {
    cn: '双鱼', latin: 'Psc', color: '#DFCFFF',
    stars: [[-0.5, 0.2], [-0.4, -0.1], [-0.3, -0.36], [-0.06, -0.16], [0.2, -0.36], [0.4, -0.1], [0.5, 0.16], [0.34, 0.36], [0.1, 0.16], [-0.16, 0.3], [-0.4, 0.4], [-0.22, 0.06], [0.26, 0.02]],
    mags:  [3.8, 3.6, 3.4, 4.0, 3.6, 3.2, 2.8, 3.6, 4.0, 3.8, 3.6, 4.0, 4.0],
    lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [9, 0], [3, 11], [11, 9], [8, 12], [12, 5]],
  },
]

// ===== 颜色 / 位置 / 种子 工具函数 =====
function hexToRgba(hex: string, a: number): string {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map(c => c + c).join('') : h
  const r = parseInt(full.slice(0, 2), 16)
  const g = parseInt(full.slice(2, 4), 16)
  const b = parseInt(full.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, a))})`
}

// 伪随机位置（确定性，基于种子索引，避免重渲染抖动）
function pseudoRandPos(seed: number, w: number, h: number): [number, number] {
  const n = Math.sin(seed * 9301 + 49297) * 233280
  const u = n - Math.floor(n)
  const m = Math.sin(seed * 1301 + 7919) * 233280
  const v = m - Math.floor(m)
  return [u * w, v * h]
}
function minWithSeed(a: number, b: number) { return Math.min(a, b) }

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
  // 保留 phase 仅用于中间阶段显现控制（vortex / summon / reveal）；
  // 结束态不再用 'fadeout' 渐隐——因为 8.5→10s 是缓停段，必须让用户清晰看见每一层都卡上 0°。
  const [phase, setPhase] = useState<'vortex' | 'summon' | 'reveal'>('vortex')
  const startTimeRef = useRef(0)
  // 结束跳转只用一次：避免 rAF 循环多次触发 onFinished
  const finishedRef = useRef(false)

  // ===== 用于在 Canvas 主动画帧中同步驱动 SVG 旋转（消除 animateTransform 时钟不同步问题）=====
  // 各元素相对 Canvas 12 星座星图（5 圈 / 1800°）的转速比例。
  // 同一 elapsed + 同一 cubic ease-out 公式，保证 10s 时绝对卡准 0°。
  const ROT: Record<string, number> = {
    outerRing: 6 / 5,      // 最外圈刻度环：+6 圈
    hexGold: 8 / 5,        // 六芒金：+8 圈
    hexCyan: -7 / 5,       // 六芒青：-7 圈
    baguaDash: 4 / 5,      // 八卦虚线：+4 圈
    baguaSymbol: 3 / 5,    // 八卦符号：+3 圈（结束归上乾下坤）
    taiji: -2 / 5,         // 太极：-2 圈（结束阳上阴下）
    zodiacLabel: 1,        // 12 星座标签：与星图完全同速（5 圈），用于算实时方位
  }
  const svgElRef = useRef<SVGSVGElement | null>(null)
  const svgRotRef = useRef<Record<string, SVGElement | null>>({
    outerRing: null,
    hexGold: null,
    hexCyan: null,
    baguaDash: null,
    baguaSymbol: null,
    taiji: null,
  })
  const zodiacLabelGroupsRef = useRef<(SVGGElement | null)[]>([])
  // 一次性建立 DOM 引用（在主动画首帧 lazy bind，避免 ref 回调与事件顺序的竞态）
  const bindSvgRefs = () => {
    const svg = svgElRef.current
    if (!svg) return false
    svgRotRef.current.outerRing = svg.querySelector('[data-role="outer-ring"]') as any
    svgRotRef.current.hexGold = svg.querySelector('[data-role="hex-gold"]') as any
    svgRotRef.current.hexCyan = svg.querySelector('[data-role="hex-cyan"]') as any
    svgRotRef.current.baguaDash = svg.querySelector('[data-role="bagua-dash"]') as any
    svgRotRef.current.baguaSymbol = svg.querySelector('[data-role="bagua-symbol"]') as any
    svgRotRef.current.taiji = svg.querySelector('[data-role="taiji"]') as any
    const labs: (SVGGElement | null)[] = []
    for (let i = 0; i < 12; i++) {
      labs.push(svg.querySelector(`[data-zodi-i="${i}"]`) as any)
    }
    zodiacLabelGroupsRef.current = labs
    return !!(svgRotRef.current.outerRing && svgRotRef.current.taiji && labs[0])
  }
  // 统一旋转角计算（与 Canvas zRotDeg 完全同款公式），返回指定圈数比例对应的 deg
  const calcSpinDeg = (elapsed: number, ratio: number) => {
    const T_TOTAL = 10, T_SPIN = 8.5, SPIN_DEG_BASE = 1800
    let t = elapsed
    if (t <= 0) return 0
    if (t <= T_SPIN) return SPIN_DEG_BASE * ratio * (t / T_SPIN)
    if (t <= T_TOTAL) {
      const u = (t - T_SPIN) / (T_TOTAL - T_SPIN)
      const ease = 1 - (1 - u) * (1 - u) * (1 - u)
      return SPIN_DEG_BASE * ratio * (1 - ease)
    }
    return 0
  }

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

      if (elapsed < 2) setPhase('vortex')
      else if (elapsed < 4) setPhase('summon')
      else if (elapsed < 10) setPhase('reveal')

      // ===== 同步驱动 SVG 所有旋转元素：与 Canvas 同一 elapsed、同一 cubic ease-out，绝对锁步 =====
      // 第一次绑不上就每帧重试（React 挂载 DOM 需要一帧）
      if (!svgRotRef.current.outerRing) bindSvgRefs()
      {
        const outerDeg = calcSpinDeg(elapsed, ROT.outerRing)
        const hexGoldDeg = calcSpinDeg(elapsed, ROT.hexGold)
        const hexCyanDeg = calcSpinDeg(elapsed, ROT.hexCyan)
        const baguaDashDeg = calcSpinDeg(elapsed, ROT.baguaDash)
        const baguaSymbolDeg = calcSpinDeg(elapsed, ROT.baguaSymbol)
        const taijiDeg = calcSpinDeg(elapsed, ROT.taiji)
        const zodiDeg = calcSpinDeg(elapsed, ROT.zodiacLabel)
        if (svgRotRef.current.outerRing) (svgRotRef.current.outerRing as any).setAttribute('transform', `rotate(${outerDeg.toFixed(3)} 250 250)`)
        if (svgRotRef.current.hexGold) (svgRotRef.current.hexGold as any).setAttribute('transform', `rotate(${hexGoldDeg.toFixed(3)} 250 250)`)
        if (svgRotRef.current.hexCyan) (svgRotRef.current.hexCyan as any).setAttribute('transform', `rotate(${hexCyanDeg.toFixed(3)} 250 250)`)
        if (svgRotRef.current.baguaDash) (svgRotRef.current.baguaDash as any).setAttribute('transform', `rotate(${baguaDashDeg.toFixed(3)} 250 250)`)
        if (svgRotRef.current.baguaSymbol) (svgRotRef.current.baguaSymbol as any).setAttribute('transform', `rotate(${baguaSymbolDeg.toFixed(3)} 250 250)`)
        if (svgRotRef.current.taiji) (svgRotRef.current.taiji as any).setAttribute('transform', `rotate(${taijiDeg.toFixed(3)} 250 250)`)
        // 12 星座标签：保持文字正向（不 rotate 文字本身），只按 zodiDeg 改位置沿环移动
        const zRad = (zodiDeg * Math.PI) / 180
        const R = 258
        zodiacLabelGroupsRef.current.forEach((g, i) => {
          if (!g) return
          const baseAng = (30 * i - 90) * Math.PI / 180
          const ang = baseAng + zRad
          const x = 250 + R * Math.cos(ang)
          const y = 250 + R * Math.sin(ang)
          g.setAttribute('transform', `translate(${x.toFixed(2)}, ${y.toFixed(2)})`)
        })
      }

      // 背景渐变
      const bgGradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(w, h) / 1.2)
      bgGradient.addColorStop(0, '#2D1B4E')
      bgGradient.addColorStop(0.4, '#1A0E2E')
      bgGradient.addColorStop(0.8, '#0D0718')
      bgGradient.addColorStop(1, '#050210')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, w, h)

      // 漩涡星辰（10s 版：0→3s 维持峰值，3→4s 完全淡出）
      const vortexIntensity = elapsed < 3 ? 1 : Math.max(0, 1 - (elapsed - 3) / 1)
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

      // ========== 12 黄道星座 点状星图 ==========
      // 布局参数：环半径保证在 SVG 法阵之外
      const zodiacRing = Math.min(w, h) / 2 - 86
      const zodiacScale = Math.max(60, Math.min(w, h) * 0.16)

      // 12 星座整体环绕总旋转角（10s 版）：
      //   0→8.5s  匀速旋转 5 圈（1800°）
      //   8.5→10s  cubic ease-out 从 1800° 缓停精确归 0°
      const T_TOTAL = 10
      const T_SPIN = 8.5
      const SPIN_DEG = 1800
      let zRotDeg = 0
      if (elapsed <= 0) zRotDeg = 0
      else if (elapsed <= T_SPIN) {
        zRotDeg = SPIN_DEG * (elapsed / T_SPIN)
      } else if (elapsed <= T_TOTAL) {
        const u = (elapsed - T_SPIN) / (T_TOTAL - T_SPIN)
        // cubic ease out: f(u) = 1 - (1-u)^3，SPIN_DEG * (1 - ease) 从 1800 平滑收敛到 0
        const ease = 1 - (1 - u) * (1 - u) * (1 - u)
        zRotDeg = SPIN_DEG * (1 - ease)
      } else {
        zRotDeg = 0
      }
      const zRotRad = (zRotDeg * Math.PI) / 180
      const cosR = Math.cos(zRotRad), sinR = Math.sin(zRotRad)

      // 同时点亮：0.5s→2.5s 一次性显现 12 宫（与用户要求"统一把12个星座都点起来"一致）
      const sectorReveal = Math.max(0, Math.min(1, (elapsed - 0.5) / 2))
      // 连线淡入：2s→3.5s
      const lineFade = Math.min(1, Math.max(0, (elapsed - 2) / 1.5))
      // 淡出阶段：8s→10s
      const fadeK = elapsed < 8 ? 1 : Math.max(0, 1 - (elapsed - 8) / 2)

      ZODIAC.forEach((zodiac, zi) => {
        if (sectorReveal <= 0) return
        // 宫位基础角度 + 整体旋转 = 星图实时位置
        const sectorAng = (30 * zi - 90) * Math.PI / 180 + zRotRad
        const sxRaw = Math.cos(sectorAng) * zodiacRing
        const syRaw = Math.sin(sectorAng) * zodiacRing
        const sx = cx + sxRaw
        const sy = cy + syRaw

        // 闪烁相位（每颗星独立 + 全局呼吸）
        const twinkleBase = 0.65 + 0.35 * Math.sin(elapsed * 2.2 + zi * 1.73)

        // --- 恒星渲染（全部同时点亮）---
        const starPts: { x: number; y: number }[] = []
        zodiac.stars.forEach((st, si) => {
          // 单颗星全部同步显现
          const appearT = sectorReveal
          // 恒星相对宫位中心的局部坐标（按整体旋转角再次旋转，使得星图整体随环旋转）
          const lx = st[0] * zodiacScale
          const ly = st[1] * zodiacScale
          const px = sx + lx * cosR - ly * sinR
          const py = sy + lx * sinR + ly * cosR
          if (appearT <= 0) {
            starPts.push({ x: 0, y: 0 })
            return
          }
          starPts.push({ x: px, y: py })

          const mag = zodiac.mags[si] ?? 3
          // 视星等 -> 像素尺寸（越亮越大）
          const baseSize = Math.max(0.8, (5 - mag) * 0.9)
          const twinkle = twinkleBase * (0.72 + 0.28 * Math.sin(elapsed * (3 + si * 0.37) + zi + si * 0.9))
          const alpha = fadeK * appearT * (0.45 + 0.55 * twinkle)
          const size = baseSize * (0.8 + 0.2 * twinkle)

          // 外层柔光
          const haloR = size * (mag <= 1.5 ? 8 : mag <= 2.2 ? 6 : 4)
          const halo = ctx.createRadialGradient(px, py, 0, px, py, haloR)
          halo.addColorStop(0, hexToRgba(zodiac.color, alpha * (mag <= 1.5 ? 0.75 : 0.5)))
          halo.addColorStop(0.4, hexToRgba(zodiac.color, alpha * 0.18))
          halo.addColorStop(1, 'rgba(0,0,0,0)')
          ctx.fillStyle = halo
          ctx.fillRect(px - haloR, py - haloR, haloR * 2, haloR * 2)

          // 恒星本体
          ctx.fillStyle = hexToRgba('#FFFFFF', alpha)
          ctx.beginPath(); ctx.arc(px, py, size, 0, Math.PI * 2); ctx.fill()
          // 亮星十字衍射 + 彩色核
          if (mag <= 2.2) {
            ctx.fillStyle = hexToRgba(zodiac.color, Math.min(1, alpha * 1.2))
            ctx.beginPath(); ctx.arc(px, py, size * 0.55, 0, Math.PI * 2); ctx.fill()
            // 十字光芒
            const rayL = size * (mag <= 1.5 ? 10 : 6.5)
            const rayA = hexToRgba(zodiac.color, alpha * 0.55)
            ctx.strokeStyle = rayA
            ctx.lineWidth = Math.max(0.6, size * 0.5)
            ctx.beginPath()
            ctx.moveTo(px - rayL, py); ctx.lineTo(px + rayL, py)
            ctx.moveTo(px, py - rayL); ctx.lineTo(px, py + rayL)
            ctx.stroke()
          }
        })

        // --- 经典连线（淡入·较暗） ---
        if (lineFade > 0) {
          const lAlpha = fadeK * lineFade * sectorReveal * 0.42
          ctx.strokeStyle = hexToRgba(zodiac.color, lAlpha)
          ctx.lineWidth = 0.9
          ctx.beginPath()
          zodiac.lines.forEach(([a, b]) => {
            const pa = starPts[a], pb = starPts[b]
            if (!pa || !pb || (pa.x === 0 && pa.y === 0) || (pb.x === 0 && pb.y === 0)) return
            ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y)
          })
          ctx.stroke()
        }

        // --- 亮星脉冲辉光（宫位主角高亮光环） ---
        const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.4 + zi)
        if (sectorReveal > 0.6 && fadeK > 0.2) {
          zodiac.stars.forEach((st, si) => {
            if ((zodiac.mags[si] ?? 4) > 1.6) return
            const lx = st[0] * zodiacScale
            const ly = st[1] * zodiacScale
            const px = sx + lx * cosR - ly * sinR
            const py = sy + lx * sinR + ly * cosR
            const ringR = 8 + pulse * 6
            ctx.strokeStyle = hexToRgba(zodiac.color, fadeK * 0.35 * (0.6 + 0.4 * pulse))
            ctx.lineWidth = 1
            ctx.beginPath(); ctx.arc(px, py, ringR, 0, Math.PI * 2); ctx.stroke()
          })
        }
      })

      // 背景星尘（额外密集散点，增强复杂感）
      const bgStars = Math.floor(minWithSeed(w, h) * 0.15)
      for (let i = 0; i < bgStars; i++) {
        const [sx, sy] = pseudoRandPos(i, w, h)
        const phase = elapsed * 1.8 + i * 0.127
        const tw = 0.35 + 0.65 * Math.abs(Math.sin(phase))
        const hue = 40 + ((i * 13) % 40)
        const sz = 0.5 + ((i * 7) % 10) / 22
        ctx.fillStyle = `hsla(${hue}, 90%, 85%, ${fadeK * tw * 0.55})`
        ctx.beginPath(); ctx.arc(sx, sy, sz, 0, Math.PI * 2); ctx.fill()
      }

      // 中心光球（10s 版：0→1.8s 渐入，4→6s 淡出）
      const orbIntensity = Math.min(1, elapsed / 1.8) * (elapsed < 6 ? 1 : Math.max(0, 1 - (elapsed - 6) / 1))
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

      // 魔法师召唤粒子（10s 版：2.5→5s 持续召唤）
      if (elapsed > 2.5 && elapsed < 5 && Math.random() < 0.4) {
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

      // 大爆发（10s 版：5→5.3s 触发，总粒子数适当放宽）
      if (elapsed > 5 && elapsed < 5.3 && particles.length < 260) {
        for (let i = 0; i < 70; i++) {
          const a = (i / 70) * Math.PI * 2 + Math.random() * 0.3
          const v = 4 + Math.random() * 7
          particles.push({
            x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v,
            life: 70 + Math.random() * 50, maxLife: 120,
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

      // 不再画 8→10s 黑色渐隐遮罩；最终 0° 阵法必须干净可见，让用户看清"咔"卡上。

      // ===== 精确结束：先把最后一帧牢牢钉在 elapsed=10 的 exact 0° 位 → 停留 180ms 给眼睛确认 → 再跳转 =====
      // 只要 elapsed>=10 就立刻强制将所有旋转量 clamp 到 0°（再补一次），然后触发一次性的"卡上→跳转"流程。
      if (elapsed >= 10 && !finishedRef.current) {
        // 1) 最后一次同步所有 SVG transform 到精确 0°（防 rAF 采样在 10.016 等时刻产生浮点数漂移）
        if (svgRotRef.current.outerRing) (svgRotRef.current.outerRing as any).setAttribute('transform', 'rotate(0 250 250)')
        if (svgRotRef.current.hexGold) (svgRotRef.current.hexGold as any).setAttribute('transform', 'rotate(0 250 250)')
        if (svgRotRef.current.hexCyan) (svgRotRef.current.hexCyan as any).setAttribute('transform', 'rotate(0 250 250)')
        if (svgRotRef.current.baguaDash) (svgRotRef.current.baguaDash as any).setAttribute('transform', 'rotate(0 250 250)')
        if (svgRotRef.current.baguaSymbol) (svgRotRef.current.baguaSymbol as any).setAttribute('transform', 'rotate(0 250 250)')
        if (svgRotRef.current.taiji) (svgRotRef.current.taiji as any).setAttribute('transform', 'rotate(0 250 250)')
        // 12 星座标签位置也 clamp 到 t=10 / zodiDeg=0 的正位
        const R = 258
        zodiacLabelGroupsRef.current.forEach((g, i) => {
          if (!g) return
          const baseAng = (30 * i - 90) * Math.PI / 180
          const x = 250 + R * Math.cos(baseAng)
          const y = 250 + R * Math.sin(baseAng)
          g.setAttribute('transform', `translate(${x.toFixed(2)}, ${y.toFixed(2)})`)
        })
        // 2) 标记一次性结束，避免重复
        finishedRef.current = true
        // 3) 停 rAF 循环；下面 setTimeout 180ms 用来让浏览器至少 1~2 帧完整绘制 exact 0°，人眼看到"卡上"
        cancelAnimationFrame(animationId)
        setTimeout(() => {
          // 4) 精准跳转到登录界面：保证是在"看见卡上"的这个视觉事件之后的同一回调里发生
          onFinished()
        }, 180)
        return
      }

      animationId = requestAnimationFrame(animate)
    }
    animationId = requestAnimationFrame(animate)
    // 兜底：如果浏览器被切后台、rAF 暂停超过 10s，也能保证最多 11s 一定跳转；正常流程不会走到这儿。
    const finishFallback = setTimeout(() => {
      if (!finishedRef.current) {
        finishedRef.current = true
        onFinished()
      }
    }, 11000)
    return () => {
      cancelAnimationFrame(animationId)
      clearTimeout(finishFallback)
      window.removeEventListener('resize', resize)
    }
  }, [onFinished])

  // 阵法显示控制：全程可见（不再用 'fadeout' → 0 触发外层/SVG渐隐）。
  const circleOpacity = 1
  const wizardOpacity = phase === 'vortex' ? 0 : 1
  const titleOpacity = phase === 'reveal' ? 1 : 0

  return (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden"
      style={{ background: '#050210' }}
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
        <svg ref={svgElRef} viewBox="0 0 500 500" className="w-full h-full" style={{ overflow: 'visible' }}>
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

          {/* ===== 最外圈：虚线旋转 + 12 星座定位点 ===== */}
          <g data-role="outer-ring">
            <circle cx="250" cy="250" r="240" fill="none" stroke="rgba(255,215,0,0.3)" strokeWidth="1.5" strokeDasharray="4 8" filter="url(#goldGlow)" />
            {/* 12 黄道星位刻度 */}
            {Array.from({ length: 12 }).map((_, i) => {
              const a = (30 * i - 90) * Math.PI / 180
              const x = 250 + 240 * Math.cos(a)
              const y = 250 + 240 * Math.sin(a)
              return <circle key={i} cx={x} cy={y} r="3" fill="#FFD700" filter="url(#goldGlow)">
                <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" begin={`${i * 0.15}s`} repeatCount="indefinite" />
              </circle>
            })}
          </g>

          {/* 12 星座文字与拉丁缩写：Canvas 主动画通过 data-zodi-i 定位并每帧更新 transform
              —— 文字始终保持正向可读，位置沿环实时对齐到星图的旋转方位。 */}
          <g opacity={circleOpacity * 0.55}>
            {ZODIAC.map((z, i) => {
              // t=0 时的初始位置（zodiDeg=0），后续 translate 会被 JS 覆写。
              const baseAng = (30 * i - 90) * Math.PI / 180
              const R = 258
              const x = 250 + R * Math.cos(baseAng)
              const y = 250 + R * Math.sin(baseAng)
              return (
                <g key={`zlab-${i}`} data-zodi-i={i} transform={`translate(${x}, ${y})`}>
                  <text x={0} y={-12} textAnchor="middle"
                    fontSize="11" fill={z.color} fontWeight="700"
                    style={{ letterSpacing: 2 }}
                    filter="url(#goldGlow)">{z.cn}</text>
                  <text x={0} y={6} textAnchor="middle"
                    fontSize="9" fill={z.color} opacity="0.75"
                    fontFamily="'Courier New', monospace">
                    {z.latin}
                  </text>
                </g>
              )
            })}
          </g>

          {/* ===== 第二层：六芒星背景圆 + 双三角形 ===== */}
          <circle cx="250" cy="250" r="210" fill="url(#hexGrad)" stroke="rgba(212,181,232,0.4)" strokeWidth="1.5" />

          {/* 六芒星三角形1（金色·顺时针 8 圈·归零归顶点朝上） */}
          <g data-role="hex-gold">
            <path d={d1} fill="none" stroke="url(#goldStroke)" strokeWidth="2.5" filter="url(#goldGlow)" />
            {/* 三角形顶点星 */}
            {TRI1.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#FFD700" filter="url(#strongGlow)" />
                <circle cx={p.x} cy={p.y} r="2" fill="#FFFFFF" />
              </g>
            ))}
          </g>

          {/* 六芒星三角形2（青色·逆时针 7 圈·归零） */}
          <g data-role="hex-cyan">
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

          {/* ===== 第三层：先天八卦环 · 上乾下坤 ===== */}
          {/* 虚线装饰环：+4 圈·末段归零 */}
          <circle data-role="bagua-dash" cx="250" cy="250" r="120" fill="none" stroke="rgba(168,230,207,0.35)" strokeWidth="1" strokeDasharray="2 4" filter="url(#goldGlow)" />

          {/* 八卦符号 · 先天八卦方位（整体 +3 圈·末段精确回到上乾下坤·左离右坎） */}
          <g data-role="bagua-symbol">
            {BAGUA_YAO.map((yao, i) => {
              const a = (45 * i - 90) * Math.PI / 180
              const x = 250 + 100 * Math.cos(a)
              const y = 250 + 100 * Math.sin(a)
              // 宫位名：乾南 坤北 离东 坎西...（按先天八卦顺序）
              const palace = ['乾·南', '巽·西南', '坎·西', '艮·西北', '坤·北', '震·东北', '离·东', '兑·东南'][i]
              const isAxis = i === 0 || i === 4
              return (
                <g key={i} transform={`translate(${x - 14}, ${y - 9})`}>
                  <BaguaGlyph yao={yao} color={isAxis ? '#FFD166' : '#A8E6CF'} />
                  <text x="14" y="34" textAnchor="middle"
                    fontSize="7" opacity="0.6"
                    fill={isAxis ? '#FFD166' : '#A8E6CF'}
                    style={{ letterSpacing: 1 }}>
                    {palace}
                  </text>
                </g>
              )
            })}
          </g>

          {/* 八卦环与六芒星顶点之间的连接线（静态连接，不旋转） */}
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
          <g data-role="taiji">
            {/* 太极外圈光晕 */}
            <circle cx="250" cy="250" r="60" fill="none" stroke="rgba(255,215,0,0.6)" strokeWidth="2" filter="url(#strongGlow)" />
            <circle cx="250" cy="250" r="55" fill="none" stroke="rgba(255,215,0,0.3)" strokeWidth="1" />
            {/* 阳半圆（浅，上） */}
            <path d="M250 195 A55 55 0 0 1 250 305 A27.5 27.5 0 0 0 250 250 A27.5 27.5 0 0 1 250 195"
              fill="url(#taijiYang)" />
            {/* 阴半圆（深，下） */}
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
