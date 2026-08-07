import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { UserProfile, Pet, ProficiencyLevel } from '../types'
import { PROFICIENCY_SCORE } from '../types'

// 宠物列表（按年级解锁）
export const PETS: Pet[] = [
  { id: 'bunny', name: '魔法兔', emoji: '🐰', unlockedGrade: 1, description: '活泼好动的小兔子，陪你开启魔法之旅' },
  { id: 'owl', name: '智慧鸮', emoji: '🦉', unlockedGrade: 3, description: '博学的猫头鹰，守护知识之树' },
  { id: 'cat', name: '星辰猫', emoji: '🐱', unlockedGrade: 5, description: '神秘的星辰之猫，眼中有银河' },
  { id: 'fox', name: '火焰狐', emoji: '🦊', unlockedGrade: 8, description: '灵动的火焰狐，聪慧又机敏' },
  { id: 'dragon', name: '魔法龙', emoji: '🐲', unlockedGrade: 12, description: '年轻的魔法龙，潜力无穷' },
  { id: 'unicorn', name: '独角兽', emoji: '🦄', unlockedGrade: 15, description: '稀有的彩虹独角兽' },
  { id: 'phoenix', name: '凤凰', emoji: '🔥', unlockedGrade: 17, description: '传说中的不死鸟，学识的化身' },
]

// 单次测试结果记录
export interface TestResult {
  score: number       // 答对题数
  total: number       // 总题数
  passed: boolean     // 是否通过
  date: string        // ISO 时间
}

// 默认用户档案
const defaultProfile: UserProfile = {
  name: '小魔法师',
  grade: 1,
  unlockedGrades: [1],
  level: 1,
  exp: 0,
  expToNext: 100,
  streak: 1,
  todayLearned: 0,
  todayGoal: 50,
}

export interface UserState {
  userProfile: UserProfile
  isFirstTime: boolean
  unlockedPets: string[] // 已解锁宠物 id 列表
  currentPetId: string    // 当前选中宠物
  // 各年级已使用的测试尝试次数（grade -> 已用次数）
  testAttempts: Record<number, number>
  // 各年级上次测试结果（grade -> TestResult）
  lastTestResult: Record<number, TestResult>
  // 单词熟练度记录：{ username: { word: ProficiencyLevel } }
  // 每个用户独立记录每个单词的熟悉程度
  wordProficiency: Record<string, Record<string, ProficiencyLevel>>

  // 设置用户名
  setUserName: (name: string) => void
  // 设置当前年级
  setUserGrade: (grade: number) => void
  // 解锁年级
  unlockGrade: (grade: number) => void
  // 增加经验值（自动升级）
  addExp: (amount: number) => void
  // 增加今日已学单词数
  addLearnedWord: (count?: number) => void
  // 更新连续打卡
  updateStreak: () => void
  // 设置今日目标
  setTodayGoal: (goal: number) => void
  // 完成首次引导
  completeOnboarding: () => void
  // 解锁宠物
  unlockPet: (petId: string) => void
  // 设置当前宠物
  setCurrentPet: (petId: string) => void
  // 记录一次测试结果（自动累加尝试次数）
  recordTestResult: (grade: number, score: number, total: number, passed: boolean) => void
  // 重置某年级的测试尝试次数
  resetTestAttempts: (grade: number) => void
  // 记录单个单词的熟练度（按用户维度）
  recordWordProficiency: (username: string, word: string, level: ProficiencyLevel) => void
  // 获取某用户某单词的熟练度（缺省返回 unknown）
  getWordProficiency: (username: string, word: string) => ProficiencyLevel
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userProfile: defaultProfile,
      isFirstTime: true,
      unlockedPets: ['bunny'],
      currentPetId: 'bunny',
      testAttempts: {},
      lastTestResult: {},
      wordProficiency: {},

      setUserName: (name) =>
        set((state) => ({
          userProfile: { ...state.userProfile, name },
        })),

      setUserGrade: (grade) =>
        set((state) => ({
          userProfile: { ...state.userProfile, grade },
        })),

      unlockGrade: (grade) =>
        set((state) => {
          if (state.userProfile.unlockedGrades.includes(grade)) return state
          return {
            userProfile: {
              ...state.userProfile,
              unlockedGrades: [...state.userProfile.unlockedGrades, grade].sort((a, b) => a - b),
            },
          }
        }),

      addExp: (amount) =>
        set((state) => {
          let { exp, expToNext, level } = state.userProfile
          exp += amount
          // 经验溢出则升级
          while (exp >= expToNext) {
            exp -= expToNext
            level += 1
            expToNext = Math.floor(expToNext * 1.2)
          }
          return {
            userProfile: { ...state.userProfile, exp, expToNext, level },
          }
        }),

      addLearnedWord: (count = 1) =>
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            todayLearned: state.userProfile.todayLearned + count,
          },
        })),

      updateStreak: () =>
        set((state) => ({
          userProfile: {
            ...state.userProfile,
            streak: state.userProfile.streak + 1,
          },
        })),

      setTodayGoal: (goal) =>
        set((state) => ({
          userProfile: { ...state.userProfile, todayGoal: goal },
        })),

      completeOnboarding: () => set({ isFirstTime: false }),

      unlockPet: (petId) =>
        set((state) => {
          if (state.unlockedPets.includes(petId)) return state
          return { unlockedPets: [...state.unlockedPets, petId] }
        }),

      setCurrentPet: (petId) => set({ currentPetId: petId }),

      recordTestResult: (grade, score, total, passed) =>
        set((state) => ({
          testAttempts: {
            ...state.testAttempts,
            [grade]: (state.testAttempts[grade] ?? 0) + 1,
          },
          lastTestResult: {
            ...state.lastTestResult,
            [grade]: { score, total, passed, date: new Date().toISOString() },
          },
        })),

      resetTestAttempts: (grade) =>
        set((state) => {
          const next = { ...state.testAttempts }
          delete next[grade]
          return { testAttempts: next }
        }),

      recordWordProficiency: (username, word, level) =>
        set((state) => {
          const userMap = { ...(state.wordProficiency[username] ?? {}) }
          // 仅当熟练度提升或未记录时更新；例如熟悉(1) > 不熟悉(0.5) > 不知道(0)
          const prev = userMap[word]
          if (prev) {
            const prevScore = PROFICIENCY_SCORE[prev]
            const newScore = PROFICIENCY_SCORE[level]
            if (newScore <= prevScore) return {} // 不降级记录（不改动）
          }
          userMap[word] = level
          return {
            wordProficiency: {
              ...state.wordProficiency,
              [username]: userMap,
            },
          }
        }),

      getWordProficiency: (username, word): ProficiencyLevel => {
        const state = useUserStore.getState() as UserState
        return state.wordProficiency[username]?.[word] ?? 'unknown'
      },
    }),
    {
      name: 'magic-word-academy-user',
    },
  ),
)

// 根据年级获取可解锁的宠物
export function getUnlockedPetsByGrade(grade: number, unlockedPets: string[]): Pet[] {
  return PETS.filter(
    (pet) => pet.unlockedGrade <= grade || unlockedPets.includes(pet.id),
  )
}
