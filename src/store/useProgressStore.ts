import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { WrongWord, Word } from '../types'

// 艾宾浩斯复习间隔（毫秒）
// 轮次 0: 1 天, 1: 2 天, 2: 4 天, 3: 7 天, 4: 15 天, 5: 30 天(复习后掌握)
export const REVIEW_INTERVALS_MS: number[] = [
  1 * 24 * 60 * 60 * 1000,    // 1 天
  2 * 24 * 60 * 60 * 1000,    // 2 天
  4 * 24 * 60 * 60 * 1000,    // 4 天
  7 * 24 * 60 * 60 * 1000,    // 7 天
  15 * 24 * 60 * 60 * 1000,   // 15 天
  30 * 24 * 60 * 60 * 1000,   // 30 天
]

// 艾宾浩斯各轮次的人类可读标签（用于UI展示）
export const REVIEW_STAGE_LABELS: string[] = [
  '1 天',
  '2 天',
  '4 天',
  '7 天',
  '15 天',
  '30 天',
]

// 根据轮次计算下次复习时间（ISO 字符串）
export function calcNextReview(stage: number): string {
  const interval = REVIEW_INTERVALS_MS[stage] ?? REVIEW_INTERVALS_MS[0]
  return new Date(Date.now() + interval).toISOString()
}

// 获取今日待复习的错词
function filterTodayReview(wrongs: WrongWord[]): WrongWord[] {
  const now = Date.now()
  return wrongs.filter(
    (w) => w.status === 'pending' && new Date(w.nextReview).getTime() <= now,
  )
}

interface ProgressState {
  // 各年级已学单词（grade -> 已学单词列表）
  learnedWords: Record<number, string[]>
  // 错词本
  wrongWords: WrongWord[]
  // 收藏的单词文本列表
  favoriteWords: string[]
  // 记录已学单词
  addLearnedWord: (grade: number, word: string) => void
  // 获取某年级已学单词数
  getLearnedCount: (grade: number) => number
  // 添加错词
  addWrongWord: (word: Word, userInput: string) => void
  // 复习错词（正确则推进轮次，错误则重置）
  reviewWrongWord: (wordText: string, correct: boolean) => void
  // 获取今日待复习的错词
  getTodayReviewWords: () => WrongWord[]
  // 跳过某错词
  skipWrongWord: (wordText: string) => void
  // 清空错词本
  clearWrongWords: () => void
  // 重置进度
  resetProgress: () => void
  // 切换单词收藏状态
  toggleFavorite: (word: string) => void
  // 判断是否已收藏
  isFavorite: (word: string) => boolean
}

export const useProgressStore = create<ProgressState>()(
  persist(
    (set, get) => ({
      learnedWords: {},
      wrongWords: [],
      favoriteWords: [],

      addLearnedWord: (grade, word) =>
        set((state) => {
          const list = state.learnedWords[grade] ?? []
          if (list.includes(word)) return state
          return {
            learnedWords: {
              ...state.learnedWords,
              [grade]: [...list, word],
            },
          }
        }),

      getLearnedCount: (grade) => {
        return get().learnedWords[grade]?.length ?? 0
      },

      addWrongWord: (word, userInput) =>
        set((state) => {
          const existing = state.wrongWords.find((w) => w.word.word === word.word)
          if (existing) {
            // 已存在则增加错误次数、重置轮次
            return {
              wrongWords: state.wrongWords.map((w) =>
                w.word.word === word.word
                  ? {
                      ...w,
                      errorCount: w.errorCount + 1,
                      lastError: new Date().toISOString(),
                      reviewStage: 0,
                      nextReview: calcNextReview(0),
                      userInputs: [...w.userInputs, userInput].slice(-10),
                      status: 'pending' as const,
                    }
                  : w,
              ),
            }
          }
          // 新增错词
          const newWrong: WrongWord = {
            word,
            errorCount: 1,
            lastError: new Date().toISOString(),
            reviewStage: 0,
            nextReview: calcNextReview(0),
            userInputs: [userInput],
            status: 'pending',
          }
          return { wrongWords: [...state.wrongWords, newWrong] }
        }),

      reviewWrongWord: (wordText, correct) =>
        set((state) => ({
          wrongWords: state.wrongWords.map((w) => {
            if (w.word.word !== wordText) return w
            if (correct) {
              const nextStage = w.reviewStage + 1
              // 超过最后轮次则掌握
              if (nextStage >= REVIEW_INTERVALS_MS.length) {
                return { ...w, status: 'mastered' as const, reviewStage: nextStage }
              }
              return {
                ...w,
                reviewStage: nextStage,
                nextReview: calcNextReview(nextStage),
              }
            }
            // 答错：重置到第 0 轮
            return {
              ...w,
              reviewStage: 0,
              nextReview: calcNextReview(0),
              errorCount: w.errorCount + 1,
            }
          }),
        })),

      getTodayReviewWords: () => filterTodayReview(get().wrongWords),

      skipWrongWord: (wordText) =>
        set((state) => ({
          wrongWords: state.wrongWords.map((w) =>
            w.word.word === wordText ? { ...w, status: 'skipped' as const } : w,
          ),
        })),

      clearWrongWords: () => set({ wrongWords: [] }),

      resetProgress: () => set({ learnedWords: {}, wrongWords: [], favoriteWords: [] }),

      toggleFavorite: (word) =>
        set((state) => {
          const exists = state.favoriteWords.includes(word)
          return {
            favoriteWords: exists
              ? state.favoriteWords.filter((w) => w !== word)
              : [...state.favoriteWords, word],
          }
        }),

      isFavorite: (word) => get().favoriteWords.includes(word),
    }),
    {
      name: 'magic-word-academy-progress',
    },
  ),
)
