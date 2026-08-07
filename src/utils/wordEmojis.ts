// 常见单词 Emoji 映射表
// 覆盖小学到高中常见词汇，无映射的单词将使用首字母魔法球

const WORD_EMOJI_MAP: Record<string, string> = {
  // 动物
  cat: '🐱', dog: '🐶', bird: '🐦', fish: '🐟', horse: '🐴', pig: '🐷', cow: '🐮', sheep: '🐑', chicken: '🐔', duck: '🦆',
  rabbit: '🐰', bear: '🐻', panda: '🐼', lion: '🦁', tiger: '🐯', monkey: '🐵', elephant: '🐘', giraffe: '🦒', frog: '🐸',
  snake: '🐍', mouse: '🐭', whale: '🐳', dolphin: '🐬', shark: '🦈', eagle: '🦅', owl: '🦉', bee: '🐝', butterfly: '🦋',
  ant: '🐜', spider: '🕷️', turtle: '🐢', fox: '🦊', deer: '🦌', wolf: '🐺', kangaroo: '🦘', penguin: '🐧', seal: '🦭',
  // 食物
  apple: '🍎', banana: '🍌', orange: '🍊', grape: '🍇', strawberry: '🍓', cherry: '🍒', peach: '🍑', pear: '🍐',
  lemon: '🍋', watermelon: '🍉', pineapple: '🍍', mango: '🥭', tomato: '🍅', corn: '🌽', carrot: '🥕', bread: '🍞',
  cake: '🍰', cookie: '🍪', chocolate: '🍫', candy: '🍬', ice: '🧊', cheese: '🧀', egg: '🥚', milk: '🥛',
  rice: '🍚', noodle: '🍜', pizza: '🍕', hamburger: '🍔', hotdog: '🌭', sandwich: '🥪', coffee: '☕', tea: '🍵',
  juice: '🧃', water: '💧', soup: '🍲', butter: '🧈', honey: '🍯', sugar: '🬋',
  // 自然
  sun: '☀️', moon: '🌙', star: '⭐', cloud: '☁️', rain: '🌧️', snow: '❄️', wind: '💨', storm: '⛈️', rainbow: '🌈',
  fire: '🔥', mountain: '⛰️', river: '🏞️', sea: '🌊', lake: '🪤', tree: '🌳', flower: '🌸', grass: '🌱', leaf: '🍃',
  forest: '🌲', desert: '🏜️', island: '🏝️', beach: '🏖️', sky: '🌌', earth: '🌍', rock: '🪨', crystal: '🔮',
  // 身体
  eye: '👁️', ear: '👂', nose: '👃', mouth: '👄', hand: '✋', foot: '🦶', head: '🗣️', heart: '❤️', bone: '🦴',
  hair: '💇', face: '😊', finger: '👆', arm: '💪', leg: '🦵', tooth: '🦷', brain: '🧠',
  // 颜色
  red: '🔴', blue: '🔵', green: '🟢', yellow: '🟡', black: '⚫', white: '⚪', purple: '🟣', orange_color: '🟠', pink: '🩷',
  // 物品
  book: '📖', pen: '🖊️', pencil: '✏️', ruler: '📏', bag: '🎒', clock: '🕐', watch: '⌚', phone: '📱', computer: '💻',
  key: '🔑', lock: '🔒', lamp: '💡', candle: '🕯️', umbrella: '☂️', glasses: '👓', hat: '🎩', crown: '👑', ring: '💍',
  ball: '⚽', kite: '🪁', doll: '🪆', puzzle: '🧩', drum: '🥁', guitar: '🎸', piano: '🎹', violin: '🎻',
  // 交通
  car: '🚗', bus: '🚌', train: '🚂', plane: '✈️', ship: '🚢', boat: '⛵', bike: '🚲', taxi: '🚕', rocket: '🚀',
  // 建筑
  house: '🏠', school: '🏫', hospital: '🏥', bank: '🏦', church: '⛪', castle: '🏰', tent: '⛺', bridge: '🌉',
  // 衣服
  shirt: '👕', pants: '👖', dress: '👗', shoes: '👟', hat_cap: '🧢', sock: '🧦', glove: '🧤', scarf: '🧣',
  // 动作
  run: '🏃', walk: '🚶', jump: '🦘', swim: '🏊', fly: '🦅', sleep: '😴', eat: '🍽️', drink: '🥤', read: '📖',
  write: '✍️', sing: '🎤', dance: '💃', play: '🎮', study: '📚', work: '💼', cry: '😢', laugh: '😄', smile: '😊',
  // 天文/科学
  planet: '🪐', galaxy: '🌌', atom: '⚛️', DNA: '🧬', microscope: '🔬', telescope: '🔭', experiment: '🧪',
  // 情绪
  happy: '😄', sad: '😢', angry: '😠', scared: '😱', surprised: '😮', excited: '🤩', tired: '😴', confused: '🤔',
  love: '❤️', hate: '💔', hope: '🤞', dream: '💭',
  // 时间
  morning: '🌅', afternoon: '☀️', evening: '🌆', night: '🌃', day: '📅', week: '🗓️', month: '📆', year: '🎯',
  spring: '🌸', summer: '☀️', autumn: '🍂', winter: '⛄', today: '📌', tomorrow: '➡️', yesterday: '⬅️',
  // 数字/量
  one: '1️⃣', two: '2️⃣', three: '3️⃣', four: '4️⃣', five: '5️⃣', six: '6️⃣', seven: '7️⃣', eight: '8️⃣', nine: '9️⃣', ten: '🔟',
  hundred: '💯', thousand: '🧮', zero: '0️⃣',
  // 家庭
  family: '👨‍👩‍👧‍👦', father: '👨', mother: '👩', brother: '👦', sister: '👧', baby: '👶', grandfather: '👴', grandmother: '👵',
  son: '🧒', daughter: '👧', uncle: '🧔', aunt: '👩‍🦰', friend: '🤝', teacher: '👩‍🏫', student: '🧑‍🎓', doctor: '👨‍⚕️',
  // 方位
  up: '⬆️', down: '⬇️', left: '⬅️', right: '➡️', front: '⏩', back: '⏪', inside: '📥', outside: '📤', top: '🔝', bottom: '🔚',
  // 其他常见
  money: '💰', gift: '🎁', music: '🎵', art: '🎨', sport: '⚽', game: '🎮', magic: '✨', wizard: '🧙', witch: '🧙‍♀️',
  dragon: '🐉', ghost: '👻', robot: '🤖', alien: '👽', fairy: '🧚', unicorn: '🦄', mermaid: '🧜‍♀️', pirate: '🏴‍☠️',
  king: '🤴', queen: '👸', prince: '🤴', princess: '👸', knight: '🗡️', sword: '⚔️', shield: '🛡️', arrow: '🏹',
  bomb: '💣', sparkle: '✨', star2: '🌟', firework: '🎆', balloon: '🎈', party: '🎉', birthday: '🎂',
  umbrella_rain: '☔', snowman: '⛄', gift2: '🛍️', bell: '🔔', candle2: '🕯️', book2: '📚', scroll: '📜',
  map: '🗺️', compass: '🧭', globe: '🌐', flag: '🚩', trophy: '🏆', medal: '🥇', target: '🎯', puzzle2: '🧩',
  light: '💡', dark: '🌑', shadow: '👤', mirror: '🪞', window: '🪟', door: '🚪', wall: '🧱', floor: '⬜',
  garden: '🌷', farm: '🚜', zoo: '🦁', park: '🏞️', city: '🏙️', village: '🏘️', country: '🗺️', world: '🌍',
  // 学校
  pencil2: '✏️', eraser: '🧽', scissors: '✂️', notebook: '📓', textbook: '📚', dictionary: '📖', blackboard: '🟫', chalk: '✍️',
  desk: '🪑', chair: '🪑', classroom: '🏫', homework: '📝', exam: '📋', test: '📃', grade: '🅰️', score: '💯',
  // 天气
  sunny: '☀️', cloudy: '☁️', rainy: '🌧️', snowy: '🌨️', windy: '💨', foggy: '🌫️', hot: '🥵', cold: '🥶',
  // 工具
  hammer: '🔨', saw: '🪚', screw: '🪛', wrench: '🔧', gear: '⚙️', magnet: '🧲', battery: '🔋', plug: '🔌',
  // 乐器（补充）
  flute: '🪈', trumpet: '🎺', harmonica: '🎵', microphone: '🎤',
  // 食物（补充）
  potato: '🥔', onion: '🧅', garlic: '🧄', mushroom: '🍄', salad: '🥗', sushi: '🍣', dumpling: '🥟', pancake: '🥞',
  waffle: '🧇', bagel: '🥯', pretzel: '🥨', croissant: '🥐', donut: '🍩', cupcake: '🧁', pie: '🥧', pudding: '🍮',
}

// 获取单词对应的 emoji
export function getWordEmoji(word: string): string | null {
  const lower = word.toLowerCase().trim()
  // 精确匹配
  if (WORD_EMOJI_MAP[lower]) return WORD_EMOJI_MAP[lower]
  // 尝试去除复数 s
  if (lower.endsWith('s') && WORD_EMOJI_MAP[lower.slice(0, -1)]) return WORD_EMOJI_MAP[lower.slice(0, -1)]
  // 尝试去除过去式 ed
  if (lower.endsWith('ed') && WORD_EMOJI_MAP[lower.slice(0, -2)]) return WORD_EMOJI_MAP[lower.slice(0, -2)]
  if (lower.endsWith('ed') && WORD_EMOJI_MAP[lower.slice(0, -1)]) return WORD_EMOJI_MAP[lower.slice(0, -1)]
  // 尝试去除 ing
  if (lower.endsWith('ing') && WORD_EMOJI_MAP[lower.slice(0, -3)]) return WORD_EMOJI_MAP[lower.slice(0, -3)]
  if (lower.endsWith('ing') && WORD_EMOJI_MAP[lower.slice(0, -3) + 'e']) return WORD_EMOJI_MAP[lower.slice(0, -3) + 'e']
  // 尝试去除 ly
  if (lower.endsWith('ly') && WORD_EMOJI_MAP[lower.slice(0, -2)]) return WORD_EMOJI_MAP[lower.slice(0, -2)]
  // 尝试去除 er/est
  if (lower.endsWith('er') && WORD_EMOJI_MAP[lower.slice(0, -2)]) return WORD_EMOJI_MAP[lower.slice(0, -2)]
  if (lower.endsWith('est') && WORD_EMOJI_MAP[lower.slice(0, -3)]) return WORD_EMOJI_MAP[lower.slice(0, -3)]
  return null
}
