// 发音工具 - 优先浏览器 Web Speech API（无需网络），fallback 有道API
export type Accent = 'us' | 'uk'

// 缓存已加载的 voices
let cachedVoices: SpeechSynthesisVoice[] = []

// 初始化：监听 voices 加载完成
if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
  const loadVoices = () => {
    const voices = window.speechSynthesis.getVoices()
    if (voices.length > 0) {
      cachedVoices = voices
    }
  }
  loadVoices()
  window.speechSynthesis.addEventListener('voiceschanged', loadVoices)
  setTimeout(loadVoices, 500)
  setTimeout(loadVoices, 1500)
  // 兜底：某些浏览器需要触发一次空操作才能激活
  setTimeout(() => {
    if (cachedVoices.length === 0) loadVoices()
  }, 3000)
}

// 获取对应口音的语音
function getVoiceForAccent(accent: Accent): SpeechSynthesisVoice | null {
  const target = accent === 'us' ? 'en-US' : 'en-GB'
  let voice = cachedVoices.find((v) => v.lang === target)
  if (voice) return voice
  voice = cachedVoices.find((v) => v.lang.startsWith('en'))
  if (voice) return voice
  return null
}

// 预加载：在用户首次交互时初始化 voices
export function initSpeech(): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false
  }
  if (cachedVoices.length === 0) {
    cachedVoices = window.speechSynthesis.getVoices()
  }
  // 触发一次空 speak 来"解锁" Web Speech API
  try {
    const u = new SpeechSynthesisUtterance('')
    u.volume = 0
    window.speechSynthesis.speak(u)
  } catch {}
  return cachedVoices.length > 0
}

// 播放单词发音
export function playWord(word: string, accent: Accent = 'us'): void {
  if (speechSynthesis_play(word, accent)) {
    return
  }
  tryYoudaoTts(word, accent, () => {
    console.warn('[发音] 所有发音方式均不可用')
  })
}

// 播放例句
export function playSentence(sentence: string, accent: Accent = 'us'): void {
  if (speechSynthesis_play(sentence, accent)) {
    return
  }
  tryYoudaoTts(sentence, accent, () => {
    console.warn('[发音] 所有发音方式均不可用')
  })
}

// 浏览器 Web Speech API 播放
function speechSynthesis_play(text: string, accent: Accent): boolean {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return false
  }

  try {
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = accent === 'us' ? 'en-US' : 'en-GB'
    utterance.rate = 0.85
    utterance.pitch = 1.0
    utterance.volume = 1.0

    const voice = getVoiceForAccent(accent)
    if (voice) {
      utterance.voice = voice
    }

    // Chrome bug: 需要先 resume 再 speak
    window.speechSynthesis.resume()
    window.speechSynthesis.speak(utterance)
    return true
  } catch (e) {
    console.warn('[发音] Web Speech API 播放失败:', e)
    return false
  }
}

// 有道在线发音 API（fallback）
function tryYoudaoTts(word: string, accent: Accent, onFallback: () => void): void {
  try {
    const audioType = accent === 'us' ? 2 : 1
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${audioType}`
    const audio = new Audio(url)
    let timedOut = false
    const timeoutId = setTimeout(() => {
      timedOut = true
      audio.src = ''
      audio.load()
      onFallback()
    }, 5000)

    audio.play()
      .then(() => {
        if (!timedOut) clearTimeout(timeoutId)
      })
      .catch(() => {
        if (!timedOut) {
          clearTimeout(timeoutId)
          onFallback()
        }
      })
  } catch {
    onFallback()
  }
}
