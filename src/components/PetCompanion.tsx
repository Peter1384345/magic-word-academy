import type { UserState } from '../store/useUserStore'
import { PETS, useUserStore } from '../store/useUserStore'

interface PetCompanionProps {
  // 指定宠物 id，不传则使用当前选中宠物
  petId?: string
  // 尺寸
  size?: 'sm' | 'md' | 'lg' | 'xl'
  // 是否显示名字
  showName?: boolean
  className?: string
}

// 宠物伴伴组件：显示当前宠物（emoji 大图）+ 浮动动画
export default function PetCompanion({
  petId,
  size = 'md',
  showName = false,
  className = '',
}: PetCompanionProps) {
  const currentPetId = useUserStore((s: UserState) => s.currentPetId)
  const targetId = petId ?? currentPetId
  const pet = PETS.find((p) => p.id === targetId) ?? PETS[0]

  const sizes = {
    sm: 'text-4xl',
    md: 'text-6xl',
    lg: 'text-8xl',
    xl: 'text-9xl',
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${className}`}>
      <div className="relative">
        {/* 宠物光晕 */}
        <div className="absolute inset-0 blur-xl opacity-60 bg-gradient-to-br from-primary/40 to-gold/30 rounded-full" />
        {/* 宠物本体（浮动动画） */}
        <div className={`relative animate-float drop-shadow-lg ${sizes[size]}`}>
          {pet.emoji}
        </div>
      </div>
      {showName && (
        <div className="text-center">
          <p className="font-magic font-bold text-gold-light text-lg">{pet.name}</p>
          <p className="text-xs text-cream/60">{pet.description}</p>
        </div>
      )}
    </div>
  )
}
