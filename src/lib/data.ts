/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供游戏全部类型定义、常量、角色/场景/道具/章节/事件/结局数据
 * [POS]: lib 核心数据层，被 store.ts 消费，是整个游戏的数据基石
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

// ============================================================
// 类型定义
// ============================================================

export interface TimePeriod {
  index: number
  name: string
  icon: string
  hours: string
}

export interface StatMeta {
  key: string
  label: string
  color: string
  icon: string
  category?: 'relation' | 'status' | 'skill'
  min?: number
}

export type CharacterStats = Record<string, number>

export interface Character {
  id: string
  name: string
  avatar: string
  fullImage: string
  gender: 'female' | 'male'
  age: number
  title: string
  description: string
  personality: string
  speakingStyle: string
  secret: string
  triggerPoints: string[]
  behaviorPatterns: string
  themeColor: string
  joinChapter: number
  statMetas: StatMeta[]
  initialStats: CharacterStats
}

export interface Scene {
  id: string
  name: string
  icon: string
  description: string
  background: string
  atmosphere: string
  tags: string[]
  unlockCondition?: {
    chapter?: number
    event?: string
  }
}

export interface GameItem {
  id: string
  name: string
  icon: string
  type: 'consumable' | 'collectible' | 'quest' | 'social'
  description: string
  maxCount?: number
}

export interface Chapter {
  id: number
  name: string
  roundRange: [number, number]
  description: string
  objectives: string[]
  atmosphere: string
}

export interface ForcedEvent {
  id: string
  name: string
  triggerRound: number
  description: string
  condition?: string
}

export interface Ending {
  id: string
  name: string
  type: 'TE' | 'HE' | 'NE' | 'BE'
  description: string
  condition: string
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  character?: string
  timestamp: number
}

// ============================================================
// 常量
// ============================================================

/* 时段系统 — 100% 通用 */
export const PERIODS: TimePeriod[] = [
  { index: 0, name: '清晨', icon: '🌅', hours: '06:00-08:00' },
  { index: 1, name: '上午', icon: '☀️', hours: '09:00-11:00' },
  { index: 2, name: '中午', icon: '🌞', hours: '12:00-13:00' },
  { index: 3, name: '下午', icon: '⛅', hours: '14:00-16:00' },
  { index: 4, name: '傍晚', icon: '🌇', hours: '17:00-19:00' },
  { index: 5, name: '深夜', icon: '🌙', hours: '20:00-04:00' },
]

export const MAX_ACTION_POINTS = 6
export const MAX_ROUNDS = 30
export const TOTAL_CHAPTERS = 5

// ============================================================
// 角色数据
// ============================================================

/* 生母 — 林小满 */
const LINXIAOMAN: Character = {
  id: 'xiaoman',
  name: '林小满',
  avatar: '👩',
  fullImage: '/characters/xiaoman.jpg',
  gender: 'female',
  age: 18,
  title: '花臂精神小妹',
  description: '18岁职高三年级学生，美容美发专业。漂染浅金发，左唇钉，右臂樱花纹身掩盖旧疤。父母离异后跟奶奶长大，奶奶去年去世。看起来叛逆不靠谱，其实从未被好好爱过。',
  personality: '嘴硬心软，外表叛逆内心脆弱。恐慌时会重复"完了完了完了"。用花臂和穿孔武装自己，但眼神里有不属于这个年纪的疲惫。',
  speakingStyle: '频繁使用"卧槽""绝了""我真的会谢"，紧张时结巴，平时语速快如机关枪，现在很小声怕被外面听到。',
  secret: '她其实想留下孩子，但害怕自己给不了好的生活。右臂樱花纹身下是年少时的自残疤痕。',
  triggerPoints: ['提到父母会触发强烈防御', '被触碰花臂会下意识躲闪', '被嘲笑学历会暴怒'],
  behaviorPatterns: '哭声<60分贝时犹豫但想逃避；60-80分贝时更加恐慌；>80分贝时震惊想阻止。蹭手时会愣住然后眼泪决堤。羁绊>60后坦白想留下孩子的真实想法。',
  themeColor: '#ec4899',
  joinChapter: 1,
  statMetas: [
    { key: 'bond', label: '羁绊', color: '#ec4899', icon: '💕', category: 'relation' },
    { key: 'panic', label: '恐慌', color: '#ef4444', icon: '😰', category: 'status' },
    { key: 'health', label: '体力', color: '#10b981', icon: '💪', category: 'status' },
  ],
  initialStats: { bond: 10, panic: 80, health: 50 },
}

/* 教导主任 — 王建国 */
const WANGJIANGUO: Character = {
  id: 'jianguo',
  name: '王建国',
  avatar: '👨‍🏫',
  fullImage: '/characters/jianguo.jpg',
  gender: 'male',
  age: 45,
  title: '铁面教导主任',
  description: '从业20年的教导主任，学生背地里叫他"王老虎"。175cm微胖啤酒肚，板寸两鬓银丝，右眼眉骨浅疤。严厉外表下藏着对学生的深沉责任感。',
  personality: '表面严厉不苟言笑，内心柔软有责任感。年轻时是"问题少年"，被恩师拯救后走上正途。笨拙温柔，不知道如何表达关心，只能用严厉包装。',
  speakingStyle: '"像什么样子！""你给我听着！""叫家长！"语速不快但每个字很重，音量很大确保整个走廊能听到。',
  secret: '年轻时也是混子，右眼眉骨的疤是打架留下的。被一位老教师拯救后决心从教。看到婴儿让他想起当年的自己。',
  triggerPoints: ['被学生当面顶撞会暴怒', '看到学生自甘堕落会冷笑长篇大论', '被称"你不就是个教导主任"会特别生气'],
  behaviorPatterns: '首次听到高分贝哭声：震惊然后快步赶到。发现婴儿后：脱外套包裹你，动作笨拙但轻柔。被抓头发：气笑"这娃有劲儿！"。好感>70后透露年轻往事。',
  themeColor: '#3b82f6',
  joinChapter: 1,
  statMetas: [
    { key: 'favor', label: '好感', color: '#3b82f6', icon: '👍', category: 'relation', min: -50 },
    { key: 'patience', label: '耐心', color: '#f59e0b', icon: '⏳', category: 'status' },
  ],
  initialStats: { favor: 0, patience: 60 },
}

/* 围观学生 — 群体NPC */
const STUDENTS: Character = {
  id: 'students',
  name: '围观学生',
  avatar: '📱',
  fullImage: '/characters/students.jpg',
  gender: 'female',
  age: 17,
  title: '吃瓜群众',
  description: '以女生为主的围观群体，手机永远拿在手上。看到异常第一反应是掏手机拍抖音，发出此起彼伏的"哇——""绝了——"。本质上没有恶意，只是网络时代的吃瓜群众。',
  personality: '猎奇心重，娱乐至上，随时准备拍视频。集体行动，个体无恶意但群体带来巨大社会压力。',
  speakingStyle: '"绝绝子！""天哪这也太离谱了""快拍快拍""发抖音能火""有没有人报警啊"。多人发言此起彼伏。',
  secret: '其中一个叫张美琪的女生其实认识林小满，曾经是初中同学。',
  triggerPoints: ['任何奇异场面都会引发拍摄', '主任呵斥时会暂时收起手机'],
  behaviorPatterns: '社死值越高围观人数越多。被拍视频会增加社死值。主任好感高时学生态度会从猎奇转为同情。',
  themeColor: '#a855f7',
  joinChapter: 2,
  statMetas: [
    { key: 'crowd', label: '围观', color: '#a855f7', icon: '👀', category: 'status' },
  ],
  initialStats: { crowd: 0 },
}

/* 角色工厂 */
export function buildCharacters(
  _playerGender: 'male' | 'female'
): Record<string, Character> {
  return {
    xiaoman: LINXIAOMAN,
    jianguo: WANGJIANGUO,
    students: STUDENTS,
  }
}

/* 初始数值构建 */
export function buildInitialStats(
  characters: Record<string, Character>
): Record<string, CharacterStats> {
  const result: Record<string, CharacterStats> = {}
  for (const [id, char] of Object.entries(characters)) {
    result[id] = { ...char.initialStats }
  }
  return result
}

// ============================================================
// 场景数据
// ============================================================

export const SCENES: Record<string, Scene> = {
  toilet: {
    id: 'toilet',
    name: '女厕隔间',
    icon: '🚽',
    description: '白色瓷砖墙面，白炽灯忽明忽暗。门板贴满动漫贴纸和涂鸦，空气中弥漫消毒水和血腥味。',
    background: '/scenes/toilet.jpg',
    atmosphere: '窒息的紧张感，狭小空间里弥漫着恐慌与不确定',
    tags: ['开局', '密闭', '紧张'],
  },
  office: {
    id: 'office',
    name: '教务处',
    icon: '🏢',
    description: '大办公桌堆满文件，百叶窗切割阳光成条纹。角落半死绿萝，保温壶飘茶香。',
    background: '/scenes/office.jpg',
    atmosphere: '尴尬的正式感，权威氛围中夹杂着围观学生的窥探',
    tags: ['质问', '尴尬', '转折'],
    unlockCondition: { chapter: 2 },
  },
  canteen: {
    id: 'canteen',
    name: '食堂',
    icon: '🍜',
    description: '宽敞大厅，不锈钢长条餐桌排列。几百人的嘈杂声，打饭阿姨叫号，广播放流行歌。',
    background: '/scenes/canteen.jpg',
    atmosphere: '荒诞的社死现场，全校目光汇聚的超级尴尬时刻',
    tags: ['社死', '荒诞', '围观'],
    unlockCondition: { chapter: 3 },
  },
  corridor: {
    id: 'corridor',
    name: '走廊',
    icon: '🚶',
    description: '长条走廊两侧教室，窗户透进自然光被栏杆切割。学生作品和各种通知贴满墙壁。',
    background: '/scenes/corridor.jpg',
    atmosphere: '流动的过渡感，连接各个场景的人生走廊',
    tags: ['过渡', '日常', '校园'],
    unlockCondition: { chapter: 2 },
  },
}

// ============================================================
// 道具数据
// ============================================================

export const ITEMS: Record<string, GameItem> = {
  'cry-small': {
    id: 'cry-small',
    name: '小猫叫',
    icon: '🐱',
    type: 'social',
    description: '40分贝的微弱哭声，只有近距离才能听到',
    maxCount: 99,
  },
  'cry-normal': {
    id: 'cry-normal',
    name: '普通婴儿哭',
    icon: '😢',
    type: 'social',
    description: '70分贝的标准哭声，能引来附近的人',
    maxCount: 99,
  },
  'cry-scream': {
    id: 'cry-scream',
    name: '破音嘶吼哭',
    icon: '😱',
    type: 'social',
    description: '90分贝的破音哭声，整层楼都能听到',
    maxCount: 99,
  },
  'jacket': {
    id: 'jacket',
    name: '主任的外套',
    icon: '🧥',
    type: 'collectible',
    description: '深蓝色西装外套，有淡淡烟草味，裹着你让你暖和',
  },
  'bottle': {
    id: 'bottle',
    name: '婴儿奶瓶',
    icon: '🍼',
    type: 'consumable',
    description: '从医务室借来的奶瓶，温热牛奶能暂时止住哭声',
    maxCount: 3,
  },
  'grab-hair': {
    id: 'grab-hair',
    name: '抓头发',
    icon: '✊',
    type: 'social',
    description: '婴儿本能地抓住身边人的头发',
  },
  'nuzzle': {
    id: 'nuzzle',
    name: '蹭手贴贴',
    icon: '🤗',
    type: 'social',
    description: '用小脸蛋蹭对方的手，触发母性/保护欲',
  },
}

// ============================================================
// 章节数据 — 章节推进制（按回合数划分）
// ============================================================

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    name: '女厕求生',
    roundRange: [1, 6],
    description: '你刚被生下，躺在冰冷的女厕瓷砖上。生母正恐慌地准备把你塞进垃圾桶。你必须用哭声引来教导主任。',
    objectives: ['用哭声引来教导主任', '在倒计时内避免被丢弃'],
    atmosphere: '紧张→荒诞→反转的幽默',
  },
  {
    id: 2,
    name: '教务处风波',
    roundRange: [7, 12],
    description: '主任把你和生母带到教务处。你需要应对主任的质问，同时处理围观学生的手机镜头。',
    objectives: ['应对主任和围观学生', '揭开生母的背景'],
    atmosphere: '尴尬中带着黑色幽默',
  },
  {
    id: 3,
    name: '食堂社死',
    roundRange: [13, 18],
    description: '主任带你去食堂，"女厕婴儿"的消息传遍全校。你要在社死名场面中反客为主。',
    objectives: ['在全校围观中站稳脚跟', '触发隐藏事件'],
    atmosphere: '爆笑社死→意外温暖',
  },
  {
    id: 4,
    name: '仪容大乱',
    roundRange: [19, 24],
    description: '主任带你参加仪容检查，你的特殊身份引发一系列荒诞事件。生母面临最终选择。',
    objectives: ['改变仪容检查的走向', '影响生母的最终决定'],
    atmosphere: '荒诞闹剧→情感升华',
  },
  {
    id: 5,
    name: '命运抉择',
    roundRange: [25, 30],
    description: '一切走向终局。你的存在究竟意味着什么？哭声能否改变所有人的命运？',
    objectives: ['达成目标结局', '揭开所有隐藏真相'],
    atmosphere: '震撼→感动→余韵悠长',
  },
]

// ============================================================
// 强制事件
// ============================================================

export const FORCED_EVENTS: ForcedEvent[] = [
  {
    id: 'birth',
    name: '降生',
    triggerRound: 1,
    description: '你睁开眼睛。冰冷的瓷砖，忽明忽暗的灯管，头顶排风扇嗡嗡作响。一个花臂少女正颤抖着看着你，眼里满是恐慌。"完了完了完了..."她喃喃自语。你意识到——你重生了，而现在是一个刚出生的婴儿。你唯一的武器，是哭声。',
  },
  {
    id: 'director-patrol',
    name: '走廊脚步',
    triggerRound: 3,
    description: '走廊传来有节奏的皮鞋声——教导主任正在巡查。如果你的哭声不够大，他会走过去。这可能是唯一的机会。',
  },
  {
    id: 'video-viral',
    name: '视频疯传',
    triggerRound: 10,
    description: '围观学生拍的视频被发到了学校群里。"女厕出生婴儿"的标题在各个班级群炸开。社死值暴涨。',
    condition: '社死值>=30',
  },
  {
    id: 'mother-breakdown',
    name: '生母崩溃',
    triggerRound: 15,
    description: '食堂里所有人的目光让林小满终于绷不住了。她蹲在角落开始哭，比你哭得还大声。',
  },
  {
    id: 'director-past',
    name: '主任的过去',
    triggerRound: 20,
    description: '王建国看着窗外沉默良久，然后轻声说："我年轻时，也差点被这个世界丢掉..."',
    condition: '主任好感>=70',
  },
  {
    id: 'mother-truth',
    name: '生母的秘密',
    triggerRound: 22,
    description: '林小满终于对你坦白："其实...我想留下你。但我害怕，我不知道怎么做妈妈...因为从来没有人教过我。"',
    condition: '生母羁绊>=60',
  },
]

// ============================================================
// 结局
// ============================================================

export const ENDINGS: Ending[] = [
  {
    id: 'te-truth',
    name: '真相大白',
    type: 'TE',
    description: '主任说："我知道你不只是普通婴儿。你的眼神里有成年人的智慧。"生母说："谢谢你选择我当妈妈，即使我是个不称职的开始。"三人站在天台上看着日出。重生不是回到过去，而是带着记忆，选择更好的未来。',
    condition: '主任好感=100 且 生母羁绊=100 且 触发所有隐藏事件',
  },
  {
    id: 'he-cryking',
    name: '职高哭声传奇',
    type: 'HE',
    description: '你靠哭声成为学校的活宝。主任开了个"哭声培训班"（虽然是玩笑），你成为"首席讲师"。生母因为你的存在被学校特招进入成人教育班，最终考上大学。每到校庆，大家都会提起那个在女厕出生却改变整个学校的婴儿。',
    condition: '社死值>=80 且 主任好感>=60',
  },
  {
    id: 'he-mother',
    name: '生母逆袭',
    type: 'HE',
    description: '生母被你"哭声激励"，决心为你改变人生。一边照顾你一边准备高考。三年后毕业典礼上，她抱着你说："是他让我知道，我可以成为一个好母亲。"',
    condition: '生母羁绊>=80 且 主任好感>=40',
  },
  {
    id: 'ne-meme',
    name: '抽象社死王',
    type: 'NE',
    description: '你的哭声视频传遍全网，成为"女厕出生婴儿"的网络符号。学校迫于压力低调处理，你被送到福利院。虽然活了下来，但你的存在永远和一个猎奇标签绑在一起。',
    condition: '社死值=100 且 主任好感<40 或 生母羁绊<40',
  },
  {
    id: 'be-abandoned',
    name: '被丢弃的轮回',
    type: 'BE',
    description: '你的哭声没有引来任何人。生母在恐慌中把你塞进了垃圾桶。黑暗中，系统提示："是否重来一次？"',
    condition: '第一章结束时主任未到场',
  },
]

// ============================================================
// 游戏信息
// ============================================================

export const STORY_INFO = {
  title: '重生职高女厕',
  subtitle: '靠哭声续命',
  genre: '荒诞喜剧 · AI 交互冒险',
  description: '你重生为职高女厕刚出生的婴儿，拥有25岁社畜的灵魂。唯一武器是哭声分贝——用哭声求生、社死、逆袭，最终改变自己和生母的命运。',
  goals: [
    '用哭声引来教导主任，避免被丢弃',
    '在社死名场面中反客为主',
    '改变生母和主任的命运',
    '达成属于你的传奇结局',
  ],
}

// ============================================================
// 工具函数
// ============================================================

export function getStatLevel(value: number) {
  if (value >= 80) return { level: 4, name: '命运共鸣', color: '#fbbf24' }
  if (value >= 60) return { level: 3, name: '深度羁绊', color: '#10b981' }
  if (value >= 30) return { level: 2, name: '逐渐了解', color: '#3b82f6' }
  return { level: 1, name: '陌生试探', color: '#94a3b8' }
}

export function getAvailableCharacters(
  chapter: number,
  characters: Record<string, Character>
): Record<string, Character> {
  return Object.fromEntries(
    Object.entries(characters).filter(([, char]) => char.joinChapter <= chapter)
  )
}

export function getCurrentChapter(round: number): Chapter {
  return CHAPTERS.find((ch) => round >= ch.roundRange[0] && round <= ch.roundRange[1])
    ?? CHAPTERS[CHAPTERS.length - 1]
}

export function getRoundEvents(
  round: number,
  triggeredEvents: string[]
): ForcedEvent[] {
  return FORCED_EVENTS.filter(
    (e) => e.triggerRound === round && !triggeredEvents.includes(e.id)
  )
}
