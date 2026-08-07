import type { ButtonHTMLAttributes, ReactNode } from 'react'

interface MagicButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost'
  icon?: ReactNode
  children: ReactNode
}

// 魔法棒风格按钮组件
export default function MagicButton({
  variant = 'primary',
  icon,
  children,
  className = '',
  ...props
}: MagicButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 px-6 py-3 rounded-magic font-rounded font-semibold transition-all duration-300 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed select-none'

  const variants = {
    // 金色渐变 + 发光边框
    primary:
      'magic-glow-btn',
    // 淡粉紫渐变
    secondary:
      'bg-gradient-to-br from-primary to-primary-dark text-white shadow-magic border-2 border-primary-light hover:shadow-glow-soft hover:-translate-y-0.5',
    // 幽灵透明样式
    ghost:
      'bg-cosmos-light/40 text-gold-light border-2 border-gold/30 hover:bg-cosmos-light/60 hover:border-gold',
  }

  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {icon && <span className="text-lg leading-none">{icon}</span>}
      <span>{children}</span>
    </button>
  )
}
