import { create } from 'zustand'
import type { Word, PracticeMode } from '../types'

// 使用 Vite 的 import.meta.glob 预加载所有年级词库 JSON
const wordModules = import.meta.glob('../data/words/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, Word[]>

// 解析出 grade -> 单词列表 的映射
function buildWordBank(): Record<number, Word[]> {
  const bank: Record<number, Word[]> = {}
  for (const [path, words] of Object.entries(wordModules)) {
    // 从路径提取年级数字，如 ../data/words/grade_1.json -> 1
    const match = path.match(/grade_(\d+)\.json$/)
    if (match) {
      const grade = parseInt(match[1], 10)
      bank[grade] = words
    }
  }
  return bank
}

const WORD_BANK = buildWordBank()

// 获取所有可用年级（排序）
export const AVAILABLE_GRADES: number[] = Object.keys(WORD_BANK)
  .map((g) => parseInt(g, 10))
  .sort((a, b) => a - b)

interface WordState {
  // 当前选中的年级
  currentGrade: number
  // 当前练习模式
  practiceMode: PracticeMode
  // 词库（grade -> 单词列表）
  wordBank: Record<number, Word[]>
  // 获取当前年级的单词列表
  getCurrentWords: () => Word[]
  // 获取指定年级的单词列表
  getWordsByGrade: (grade: number) => Word[]
  // 设置当前年级
  setGrade: (grade: number) => void
  // 设置练习模式
  setPracticeMode: (mode: PracticeMode) => void
  // 获取某年级单词总数
  getGradeTotal: (grade: number) => number
}

export const useWordStore = create<WordState>((set, get) => ({
  currentGrade: AVAILABLE_GRADES[0] ?? 1,
  practiceMode: 'cn-to-en',
  wordBank: WORD_BANK,

  getCurrentWords: () => {
    const { currentGrade, wordBank } = get()
    return wordBank[currentGrade] ?? []
  },

  getWordsByGrade: (grade) => WORD_BANK[grade] ?? [],

  setGrade: (grade) => set({ currentGrade: grade }),

  setPracticeMode: (mode) => set({ practiceMode: mode }),

  getGradeTotal: (grade) => WORD_BANK[grade]?.length ?? 0,
}))
