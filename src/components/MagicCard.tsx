import type { ReactNode } from 'react'

interface MagicCardProps {
  children: ReactNode
  className?: string
  // 是否带金色发光效果
  glow?: boolean
  // 点击回调
  onClick?: () => void
}

// 魔法卡片组件：圆角 + 毛玻璃 + 金色细边框 + 轻柔阴影
export default function MagicCard({
  children,
  className = '',
  glow = false,
  onClick,
}: MagicCardProps) {
  const isClickable = typeof onClick === 'function'
  return (
    <div
      onClick={onClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={[
        'glass-card relative overflow-hidden',
        'border border-gold/40',
        glow ? 'glow-gold-border breathe' : '',
        isClickable ? 'cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:shadow-magic' : '',
        className,
      ].join(' ')}
    >
      {children}
    </div>
  )
}
