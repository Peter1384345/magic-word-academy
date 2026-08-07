import { PETS, useUserStore, getUnlockedPetsByGrade } from '../store/useUserStore'
import MagicCard from '../components/MagicCard'

export default function PetsPage() {
  const { userProfile, unlockedPets, currentPetId, setCurrentPet, unlockPet } = useUserStore()
  // 当前可解锁的宠物（按当前年级）
  const unlocked = getUnlockedPetsByGrade(userProfile.grade, unlockedPets)

  return (
    <div className="space-y-6 animate-pop-in">
      <MagicCard className="p-6">
        <h2 className="text-2xl font-magic font-extrabold text-gold-light">🐰 宠物乐园</h2>
        <p className="text-cream/60 mt-1">
          随着年级提升，更多魔法伙伴将加入你的旅程！
        </p>
        <p className="text-sm text-cream/50 mt-2">
          已解锁 {unlocked.length} / {PETS.length} 只宠物
        </p>
      </MagicCard>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {PETS.map((pet) => {
          const isUnlocked = unlocked.some((p) => p.id === pet.id)
          const isCurrent = currentPetId === pet.id
          return (
            <MagicCard
              key={pet.id}
              className={`p-6 flex flex-col items-center text-center ${isCurrent ? 'ring-2 ring-gold' : ''}`}
              glow={isCurrent}
            >
              <div className={`text-7xl mb-3 ${isUnlocked ? 'animate-float' : 'grayscale opacity-30'}`}>
                {pet.emoji}
              </div>
              {isUnlocked ? (
                <>
                  <h3 className="text-lg font-magic font-bold text-gold-light">{pet.name}</h3>
                  <p className="text-xs text-cream/60 mt-1 mb-3">{pet.description}</p>
                  {isCurrent ? (
                    <span className="bg-gold/40 text-gold-light text-xs font-bold px-4 py-2 rounded-full">
                      ★ 当前伙伴
                    </span>
                  ) : (
                    <button
                      onClick={() => setCurrentPet(pet.id)}
                      className="bg-gradient-to-r from-primary to-primary-dark text-white text-sm font-rounded font-medium px-4 py-2 rounded-xl hover:shadow-card transition-all"
                    >
                      设为伙伴
                    </button>
                  )}
                </>
              ) : (
                <>
                  <h3 className="text-lg font-magic font-bold text-cream/40">？？？</h3>
                  <p className="text-xs text-cream/40 mt-1 mb-3">
                    🔒 解锁年级 {pet.unlockedGrade} 后获得
                  </p>
                  {userProfile.grade >= pet.unlockedGrade && (
                    <button
                      onClick={() => unlockPet(pet.id)}
                      className="bg-mint/50 text-gold-light text-sm font-rounded font-medium px-4 py-2 rounded-xl hover:bg-mint transition-all"
                    >
                      点击解锁
                    </button>
                  )}
                </>
              )}
            </MagicCard>
          )
        })}
      </div>
    </div>
  )
}
