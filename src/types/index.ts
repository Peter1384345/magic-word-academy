// 单词数据结构
export interface Word {
  word: string;
  phonetic_us: string;
  phonetic_uk: string;
  translation: string;
  pos: string;
  example_en: string;
  example_cn: string;
  high_freq_points: string;
  sentence_analysis: string;
  grade: number;
  tag: string;
  image?: string; // 单词配图URL（可选）
}

// 用户档案
export interface UserProfile {
  name: string;
  grade: number;            // 当前年级 1-17
  unlockedGrades: number[]; // 已解锁年级列表
  level: number;           // 经验等级 Lv.1-100
  exp: number;             // 当前经验值
  expToNext: number;       // 升级所需经验
  streak: number;          // 连续打卡天数
  todayLearned: number;     // 今日已学
  todayGoal: number;       // 今日目标
}

// 错词记录
export interface WrongWord {
  word: Word;
  errorCount: number;
  lastError: string;       // ISO date
  reviewStage: number;     // 0-5 艾宾浩斯轮次
  nextReview: string;      // ISO date 下次复习时间
  userInputs: string[];    // 用户错误拼写记录
  status: 'pending' | 'mastered' | 'skipped';
}

// 宠物
export interface Pet {
  id: string;
  name: string;
  emoji: string;
  unlockedGrade: number;
  description: string;
}

// 练习模式
export type PracticeMode = 'cn-to-en' | 'listen' | 'en-to-cn';

// 课文段落（中英对照）
export interface TextbookParagraph {
  en: string;
  cn: string;
}

// 单词熟练度（熟悉/不熟悉/不知道 三档）
export type ProficiencyLevel = 'familiar' | 'unfamiliar' | 'unknown'
// 熟练度分数字面：familiar = 1（满分）、unfamiliar = 0.5、unknown = 0
export const PROFICIENCY_SCORE: Record<ProficiencyLevel, number> = {
  familiar: 1,
  unfamiliar: 0.5,
  unknown: 0,
}
export const PROFICIENCY_LABEL: Record<ProficiencyLevel, string> = {
  familiar: '熟悉',
  unfamiliar: '不熟悉',
  unknown: '不知道',
}
export const PROFICIENCY_EMOJI: Record<ProficiencyLevel, string> = {
  familiar: '🌟',
  unfamiliar: '💭',
  unknown: '❓',
}

// 课文分类
export type TextbookCategory = 'graded' | 'textbook' | 'literature';

// 课文数据结构
export interface Textbook {
  id: string;
  title: string;
  category: TextbookCategory;
  grade?: number;
  author?: string;
  paragraphs: TextbookParagraph[];
  vocabulary: string[];
}
