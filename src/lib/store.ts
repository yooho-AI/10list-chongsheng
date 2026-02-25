/**
 * [INPUT]: 依赖 zustand, immer, ./stream, ./data
 * [OUTPUT]: 对外提供 useGameStore hook 及 data.ts 全部导出
 * [POS]: lib 状态管理中枢，驱动整个游戏的状态流转
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import { streamChat, chat } from './stream'
import {
  type Character, type CharacterStats, type Message,
  SCENES, ITEMS, PERIODS, CHAPTERS, FORCED_EVENTS,
  MAX_ACTION_POINTS, MAX_ROUNDS,
  STORY_INFO, ENDINGS,
  buildCharacters, buildInitialStats, getStatLevel,
  getAvailableCharacters, getCurrentChapter, getRoundEvents,
} from './data'
import {
  trackGameStart, trackGameContinue, trackPlayerCreate,
  trackChapterEnter, trackEndingReached,
} from './analytics'

// ============================================================
// 类型
// ============================================================

interface GameState {
  gameStarted: boolean
  playerGender: 'male' | 'female'
  playerName: string
  characters: Record<string, Character>

  currentRound: number
  currentPeriodIndex: number
  actionPoints: number
  currentScene: string
  currentCharacter: string | null
  characterStats: Record<string, CharacterStats>
  unlockedScenes: string[]

  /* 核心数值 — 全局 */
  cryDecibel: number
  socialDeath: number

  currentChapter: number
  triggeredEvents: string[]
  inventory: Record<string, number>

  messages: Message[]
  historySummary: string
  isTyping: boolean
  streamingContent: string
  endingType: string | null
  activePanel: 'inventory' | 'relations' | null

  /* 称号 */
  titles: string[]
}

interface GameActions {
  setPlayerInfo: (gender: 'male' | 'female', name: string) => void
  initGame: () => void
  selectCharacter: (id: string | null) => void
  selectScene: (id: string) => void
  togglePanel: (panel: 'inventory' | 'relations') => void
  closePanel: () => void
  sendMessage: (text: string) => Promise<void>
  advanceTime: () => void
  useItem: (itemId: string) => void
  checkEnding: () => void
  addSystemMessage: (content: string) => void
  resetGame: () => void
  saveGame: () => void
  loadGame: () => boolean
  hasSave: () => boolean
  clearSave: () => void
}

type GameStore = GameState & GameActions

// ============================================================
// 工具
// ============================================================

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'chongsheng-save-v1'

// ============================================================
// parseStatChanges — 双轨模式
// ============================================================

interface StatChangeResult {
  charChanges: Array<{ charId: string; stat: string; delta: number }>
  globalChanges: Array<{ key: string; delta: number }>
}

function parseStatChanges(
  content: string,
  characters: Record<string, Character>
): StatChangeResult {
  const charChanges: StatChangeResult['charChanges'] = []
  const globalChanges: StatChangeResult['globalChanges'] = []

  /* 名称→ID 映射 */
  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
    if (char.name.length > 2) nameToId[char.name.slice(-2)] = id
  }

  /* 标签→key 映射 */
  const labelToKey: Record<string, { charId: string; key: string }[]> = {}
  for (const [charId, char] of Object.entries(characters)) {
    for (const meta of char.statMetas) {
      const labels = [meta.label, meta.label + '度', meta.label + '值']
      for (const label of labels) {
        if (!labelToKey[label]) labelToKey[label] = []
        labelToKey[label].push({ charId, key: meta.key })
      }
    }
  }

  /* 全局别名 */
  const GLOBAL_ALIASES: Record<string, string> = {
    '社死': 'socialDeath', '社死值': 'socialDeath',
    '分贝': 'cryDecibel', '哭声': 'cryDecibel',
  }

  /* 正则匹配 */
  const regex = /[【\[]([^\]】]+)[】\]]\s*(\S+?)([+-])(\d+)/g
  let match
  while ((match = regex.exec(content))) {
    const [, context, statLabel, sign, numStr] = match
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)

    /* 全局 */
    const globalKey = GLOBAL_ALIASES[statLabel] || GLOBAL_ALIASES[context]
    if (globalKey) {
      globalChanges.push({ key: globalKey, delta })
      continue
    }

    /* 角色 */
    const charId = nameToId[context]
    if (charId) {
      const entries = labelToKey[statLabel]
      const entry = entries?.find((e) => e.charId === charId) || entries?.[0]
      if (entry) {
        charChanges.push({ charId: entry.charId, stat: entry.key, delta })
      }
    }
  }

  return { charChanges, globalChanges }
}

// ============================================================
// buildSystemPrompt — 荒诞婴儿重生主题
// ============================================================

function buildSystemPrompt(state: GameState): string {
  const char = state.currentCharacter
    ? state.characters[state.currentCharacter]
    : null
  const chapter = getCurrentChapter(state.currentRound)
  const scene = SCENES[state.currentScene]

  /* 所有角色状态 */
  const allStats = Object.entries(state.characters)
    .map(([id, c]) => {
      const s = state.characterStats[id]
      const statStr = c.statMetas
        .map((m) => `${m.label}${s?.[m.key] ?? 0}`)
        .join(' ')
      return `${c.name}(${c.title}): ${statStr}`
    })
    .join('\n')

  const genderLabel = state.playerGender === 'male' ? '男孩👶' : '女孩👧'
  const genderTitle = state.playerGender === 'male' ? '职高哭声一哥' : '职高哭声一姐'

  let prompt = `你是荒诞喜剧文字冒险游戏《重生职高女厕：靠哭声续命》的 AI 叙述者。

## 世界观
2024年，中国二线城市某职业技术学校。短视频文化盛行，所有人对突发状况的第一反应是掏手机拍视频。
玩家重生为女厕刚出生的婴儿，拥有25岁社畜灵魂，唯一武器是哭声分贝。

## 玩家身份
婴儿「${state.playerName}」，${genderLabel}，目标称号：${genderTitle}
- 生理：刚出生的婴儿，只能控制哭声分贝
- 意识：25岁社畜灵魂，加班猝死前许愿"重来一次好好活"
- 内心独白用（括号）标注，体现成年人灵魂与婴儿身体的反差

## 叙述风格
- 荒诞幽默中带人性温度，放大社死和无厘头笑点
- 第二人称"你"展开，200-400字
- NPC 对话用【角色名】前缀，动作/旁白用（括号）
- 内心独白用斜体描写成年灵魂的吐槽
- 数值变化格式：【角色名 数值+N】或【数值-N】
- 全局数值：【社死值+N】【分贝+N】

## 哭声机制
玩家主要通过选择哭声分贝来推进剧情：
- 小猫叫（<60分贝）：微弱，只有近距离能听到
- 普通哭（60-80分贝）：标准婴儿哭声，引来附近的人
- 破音嘶吼（>80分贝）：穿透力极强，整层楼能听到
- 连续同分贝哭声效果递减20%
玩家也可以用自由行动描述其他婴儿行为（抓手、蹭脸、装死等）

## 当前章节
第${chapter.id}章「${chapter.name}」(回合${chapter.roundRange[0]}-${chapter.roundRange[1]})
${chapter.description}
目标: ${chapter.objectives.join('、')}
氛围: ${chapter.atmosphere}

## NPC 行为准则
- 林小满: 18岁花臂精神小妹。羁绊<30恐慌逃避，30-60犹豫纠结，>60接纳保护，>80深爱改变。口癖"卧槽""绝了""完了完了完了"
- 王建国: 45岁教导主任。好感<0怀疑戒备，0-30好奇观望，30-60接纳保护，>60认可宠爱。口癖"像什么样子！""你给我听着！"
- 围观学生: 群体NPC。手机拍视频，发出"绝绝子""天哪"。社死值越高围观越多。`

  if (char) {
    const stats = state.characterStats[char.id]
    const statStr = char.statMetas
      .map((m) => `${m.label}${stats?.[m.key] ?? 0}`)
      .join(' ')
    const level = getStatLevel(stats?.[char.statMetas[0]?.key] ?? 0)
    prompt += `\n\n## 当前互动角色
- 姓名：${char.name}（${char.title}，${char.age}岁，${char.gender === 'female' ? '女' : '男'}）
- 性格：${char.personality}
- 说话风格：${char.speakingStyle}
- 行为模式：${char.behaviorPatterns}
- 雷点：${char.triggerPoints.join('、')}
- 当前关系：${level.name}（${statStr}）
- 隐藏秘密：${char.secret}`
  }

  prompt += `\n\n## 当前状态
- 婴儿：${state.playerName}（${genderLabel}）
- 回合：${state.currentRound}/${MAX_ROUNDS}
- 场景：${scene?.icon} ${scene?.name} — ${scene?.description}
- 哭声分贝：${state.cryDecibel}
- 社死值：${state.socialDeath}/100
${state.titles.length > 0 ? `- 称号：${state.titles.join('、')}` : ''}

## 所有角色当前数值
${allStats}

## 输出要求
每次回复末尾必须输出当前状态面板：
回合 ${state.currentRound}/${MAX_ROUNDS} | 📍${scene?.name} | 😳社死${state.socialDeath} | 🔊分贝${state.cryDecibel}`

  return prompt
}

// ============================================================
// Store
// ============================================================

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    /* --- 初始状态 --- */
    gameStarted: false,
    playerGender: 'male' as 'male' | 'female',
    playerName: '婴儿',
    characters: {},
    currentRound: 1,
    currentPeriodIndex: 0,
    actionPoints: MAX_ACTION_POINTS,
    currentScene: 'toilet',
    currentCharacter: null,
    characterStats: {},
    unlockedScenes: ['toilet'],
    cryDecibel: 0,
    socialDeath: 0,
    currentChapter: 1,
    triggeredEvents: [],
    inventory: {
      'cry-small': 99,
      'cry-normal': 99,
      'cry-scream': 99,
    },
    messages: [],
    historySummary: '',
    isTyping: false,
    streamingContent: '',
    endingType: null,
    activePanel: null,
    titles: [],

    /* --- 操作 --- */
    setPlayerInfo: (gender, name) => {
      set((s) => {
        s.playerGender = gender
        s.playerName = name || '婴儿'
      })
      trackPlayerCreate(gender, name)
    },

    initGame: () => {
      const state = get()
      const chars = buildCharacters(state.playerGender)
      set((s) => {
        s.gameStarted = true
        s.characters = chars
        s.currentRound = 1
        s.currentPeriodIndex = 0
        s.actionPoints = MAX_ACTION_POINTS
        s.currentScene = 'toilet'
        s.currentCharacter = 'xiaoman'
        s.characterStats = buildInitialStats(chars)
        s.unlockedScenes = ['toilet']
        s.cryDecibel = 0
        s.socialDeath = 0
        s.currentChapter = 1
        s.triggeredEvents = []
        s.inventory = { 'cry-small': 99, 'cry-normal': 99, 'cry-scream': 99 }
        s.messages = []
        s.historySummary = ''
        s.endingType = null
        s.activePanel = null
        s.streamingContent = ''
        s.titles = []
      })
      trackGameStart()
    },

    selectCharacter: (id) => {
      set((s) => { s.currentCharacter = id })
    },

    selectScene: (id) => {
      set((s) => {
        s.currentScene = id
        s.currentCharacter = null
      })
      const scene = SCENES[id]
      if (scene) {
        get().addSystemMessage(`你来到了${scene.icon} ${scene.name}。${scene.description}`)
      }
    },

    togglePanel: (panel) => {
      set((s) => {
        s.activePanel = s.activePanel === panel ? null : panel
      })
    },

    closePanel: () => {
      set((s) => { s.activePanel = null })
    },

    sendMessage: async (text: string) => {
      const state = get()
      const char = state.currentCharacter ? state.characters[state.currentCharacter] : null

      set((s) => {
        s.messages.push({ id: makeId(), role: 'user', content: text, timestamp: Date.now() })
        s.isTyping = true
        s.streamingContent = ''
      })

      try {
        /* 上下文压缩 */
        let historySummary = state.historySummary
        let recentMessages = state.messages.slice(-20)

        if (state.messages.length > 15 && !state.historySummary) {
          const oldMessages = state.messages.slice(0, -10)
          const summaryText = oldMessages
            .map((m) => `[${m.role}]: ${m.content.slice(0, 200)}`)
            .join('\n')

          try {
            historySummary = await chat([{
              role: 'user',
              content: `请用200字以内概括以下荒诞婴儿重生游戏的对话历史，保留关键剧情、哭声选择和数值变化：\n\n${summaryText}`,
            }])
            set((s) => { s.historySummary = historySummary })
            recentMessages = state.messages.slice(-10)
          } catch {
            /* 压缩失败，继续 */
          }
        }

        const systemPrompt = buildSystemPrompt(get())
        const apiMessages = [
          { role: 'system' as const, content: systemPrompt },
          ...(historySummary ? [{ role: 'system' as const, content: `[历史摘要] ${historySummary}` }] : []),
          ...recentMessages.map((m) => ({
            role: m.role as 'user' | 'assistant' | 'system',
            content: m.content,
          })),
          { role: 'user' as const, content: text },
        ]

        let fullContent = ''

        await streamChat(
          apiMessages,
          (chunk) => {
            fullContent += chunk
            set((s) => { s.streamingContent = fullContent })
          },
          () => {}
        )

        if (!fullContent) {
          const fallbacks = char
            ? [
                `【${char.name}】（看了看你）"你...你在干嘛？"`,
                `【${char.name}】（愣住了）"..."`,
              ]
            : [
                '头顶的灯管又闪了一下，排风扇嗡嗡作响。你躺在冰冷的瓷砖上，思考人生。',
                '远处传来学生的笑声，和这个厕所隔间的紧张气氛形成鲜明对比。',
              ]
          fullContent = fallbacks[Math.floor(Math.random() * fallbacks.length)]
        }

        /* 解析数值变化 — 双轨 */
        const { charChanges, globalChanges } = parseStatChanges(fullContent, get().characters)
        set((s) => {
          for (const c of charChanges) {
            const stats = s.characterStats[c.charId]
            if (stats) {
              const meta = s.characters[c.charId]?.statMetas.find((m) => m.key === c.stat)
              const min = meta?.min ?? 0
              stats[c.stat] = Math.max(min, Math.min(100, (stats[c.stat] ?? 0) + c.delta))
            }
          }
          for (const g of globalChanges) {
            if (g.key === 'socialDeath') {
              s.socialDeath = Math.max(0, Math.min(100, s.socialDeath + g.delta))
            } else if (g.key === 'cryDecibel') {
              s.cryDecibel = Math.max(0, Math.min(100, s.cryDecibel + g.delta))
            }
          }
        })

        set((s) => {
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: fullContent,
            character: state.currentCharacter ?? undefined,
            timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })

        /* 自动存档 */
        get().saveGame()
      } catch {
        set((s) => {
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: char
              ? `【${char.name}】（似乎在想什么）"..."`
              : '排风扇的声音忽然大了起来，掩盖了一切。',
            character: state.currentCharacter ?? undefined,
            timestamp: Date.now(),
          })
          s.isTyping = false
          s.streamingContent = ''
        })
      }
    },

    advanceTime: () => {
      set((s) => {
        s.currentRound++

        /* 章节推进 */
        const newChapter = getCurrentChapter(s.currentRound)
        if (newChapter.id !== s.currentChapter) {
          s.currentChapter = newChapter.id

          /* 场景解锁 */
          for (const [sceneId, scene] of Object.entries(SCENES)) {
            if (scene.unlockCondition?.chapter && scene.unlockCondition.chapter <= newChapter.id) {
              if (!s.unlockedScenes.includes(sceneId)) {
                s.unlockedScenes.push(sceneId)
              }
            }
          }
        }
      })

      const state = get()
      trackChapterEnter(state.currentChapter)

      /* 章节推进消息 */
      const chapter = getCurrentChapter(state.currentRound)
      get().addSystemMessage(`📍 回合 ${state.currentRound} — 第${chapter.id}章「${chapter.name}」`)

      /* 检查强制事件 */
      const events = getRoundEvents(state.currentRound, state.triggeredEvents)
      for (const event of events) {
        /* 条件检查 */
        let conditionMet = true
        if (event.condition) {
          if (event.condition.includes('社死值>=30') && state.socialDeath < 30) conditionMet = false
          if (event.condition.includes('主任好感>=70') && (state.characterStats['jianguo']?.['favor'] ?? 0) < 70) conditionMet = false
          if (event.condition.includes('生母羁绊>=60') && (state.characterStats['xiaoman']?.['bond'] ?? 0) < 60) conditionMet = false
        }
        if (conditionMet) {
          set((s) => { s.triggeredEvents.push(event.id) })
          get().addSystemMessage(`🎬 【${event.name}】${event.description}`)
        }
      }

      /* 结局检查 — 最终回合 */
      if (state.currentRound >= MAX_ROUNDS) {
        get().checkEnding()
      }
    },

    useItem: (itemId: string) => {
      const state = get()
      const item = ITEMS[itemId]
      if (!item) return

      const count = state.inventory[itemId] ?? 0
      if (count <= 0 && item.type === 'consumable') {
        get().addSystemMessage(`你没有 ${item.name} 了。`)
        return
      }

      /* 消耗 */
      if (item.type === 'consumable') {
        set((s) => { s.inventory[itemId] = Math.max(0, (s.inventory[itemId] ?? 0) - 1) })
      }

      /* 效果 */
      if (itemId === 'bottle') {
        get().addSystemMessage('🍼 温热的牛奶流入喉咙，你暂时停止了哭泣。哭声分贝归零，但获得了短暂的满足感。')
        set((s) => { s.cryDecibel = 0 })
      } else if (itemId === 'grab-hair') {
        const charId = state.currentCharacter
        if (charId === 'jianguo') {
          set((s) => {
            const stats = s.characterStats['jianguo']
            if (stats) stats['favor'] = Math.min(100, (stats['favor'] ?? 0) + 10)
          })
          get().addSystemMessage('✊ 你一把抓住主任的头发！他愣了一下，然后气笑了："这娃有劲儿！"【王建国 好感+10】')
        } else if (charId === 'xiaoman') {
          set((s) => {
            const stats = s.characterStats['xiaoman']
            if (stats) stats['bond'] = Math.min(100, (stats['bond'] ?? 0) + 10)
          })
          get().addSystemMessage('✊ 你抓住了生母的手指，她的手在颤抖...但没有缩回去。【林小满 羁绊+10】')
        }
      } else if (itemId === 'nuzzle') {
        const charId = state.currentCharacter
        if (charId === 'xiaoman') {
          set((s) => {
            const stats = s.characterStats['xiaoman']
            if (stats) stats['bond'] = Math.min(100, (stats['bond'] ?? 0) + 15)
          })
          get().addSystemMessage('🤗 你用小脸蛋蹭了蹭生母的手。她愣住了，三秒后眼泪决堤。【林小满 羁绊+15】')
        } else if (charId === 'jianguo') {
          set((s) => {
            const stats = s.characterStats['jianguo']
            if (stats) stats['favor'] = Math.min(100, (stats['favor'] ?? 0) + 5)
          })
          get().addSystemMessage('🤗 你蹭了蹭主任的脸。他尴尬地咳了一声，但没躲开。【王建国 好感+5】')
        }
      }
    },

    checkEnding: () => {
      const state = get()
      const favor = state.characterStats['jianguo']?.['favor'] ?? 0
      const bond = state.characterStats['xiaoman']?.['bond'] ?? 0

      /* BE: 第一章未引来主任 */
      if (state.currentRound <= 6 && favor <= 0 && !state.triggeredEvents.includes('director-patrol')) {
        set((s) => { s.endingType = 'be-abandoned' })
        trackEndingReached('be-abandoned')
        return
      }

      /* TE: 全满 + 所有隐藏事件 */
      const hiddenEvents = ['director-past', 'mother-truth']
      const allHidden = hiddenEvents.every((e) => state.triggeredEvents.includes(e))
      if (favor >= 90 && bond >= 90 && allHidden) {
        set((s) => { s.endingType = 'te-truth' })
        trackEndingReached('te-truth')
        return
      }

      /* HE: 职高哭声传奇 */
      if (state.socialDeath >= 80 && favor >= 60) {
        set((s) => { s.endingType = 'he-cryking' })
        trackEndingReached('he-cryking')
        return
      }

      /* HE: 生母逆袭 */
      if (bond >= 80 && favor >= 40) {
        set((s) => { s.endingType = 'he-mother' })
        trackEndingReached('he-mother')
        return
      }

      /* NE: 社死王 */
      if (state.socialDeath >= 80) {
        set((s) => { s.endingType = 'ne-meme' })
        trackEndingReached('ne-meme')
        return
      }

      /* NE: 兜底 */
      set((s) => { s.endingType = 'ne-meme' })
      trackEndingReached('ne-meme')
    },

    addSystemMessage: (content: string) => {
      set((s) => {
        s.messages.push({ id: makeId(), role: 'system', content, timestamp: Date.now() })
      })
    },

    resetGame: () => {
      set((s) => {
        s.gameStarted = false
        s.messages = []
        s.historySummary = ''
        s.streamingContent = ''
        s.endingType = null
      })
      get().clearSave()
    },

    /* --- 存档 --- */
    saveGame: () => {
      const s = get()
      const data = {
        version: 1,
        playerGender: s.playerGender,
        playerName: s.playerName,
        characters: s.characters,
        currentRound: s.currentRound,
        currentPeriodIndex: s.currentPeriodIndex,
        actionPoints: s.actionPoints,
        currentScene: s.currentScene,
        currentCharacter: s.currentCharacter,
        characterStats: s.characterStats,
        currentChapter: s.currentChapter,
        triggeredEvents: s.triggeredEvents,
        unlockedScenes: s.unlockedScenes,
        cryDecibel: s.cryDecibel,
        socialDeath: s.socialDeath,
        inventory: s.inventory,
        messages: s.messages.slice(-30),
        historySummary: s.historySummary,
        endingType: s.endingType,
        titles: s.titles,
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(data))
    },

    loadGame: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
        const data = JSON.parse(raw)
        if (data.version !== 1) return false

        set((s) => {
          s.gameStarted = true
          s.playerGender = data.playerGender || 'male'
          s.playerName = data.playerName || '婴儿'
          s.characters = data.characters || buildCharacters(data.playerGender || 'male')
          s.currentRound = data.currentRound
          s.currentPeriodIndex = data.currentPeriodIndex
          s.actionPoints = data.actionPoints
          s.currentScene = data.currentScene
          s.currentCharacter = data.currentCharacter
          s.characterStats = data.characterStats
          s.currentChapter = data.currentChapter || 1
          s.triggeredEvents = data.triggeredEvents || []
          s.unlockedScenes = data.unlockedScenes || ['toilet']
          s.cryDecibel = data.cryDecibel ?? 0
          s.socialDeath = data.socialDeath ?? 0
          s.inventory = data.inventory
          s.messages = data.messages
          s.historySummary = data.historySummary || ''
          s.endingType = data.endingType || null
          s.titles = data.titles || []
        })
        trackGameContinue()
        return true
      } catch {
        return false
      }
    },

    hasSave: () => {
      try {
        const raw = localStorage.getItem(SAVE_KEY)
        if (!raw) return false
        return JSON.parse(raw).version === 1
      } catch {
        return false
      }
    },

    clearSave: () => {
      localStorage.removeItem(SAVE_KEY)
    },
  }))
)

// 导出 data.ts 全部内容
export {
  SCENES, ITEMS, PERIODS, CHAPTERS,
  MAX_ROUNDS, MAX_ACTION_POINTS,
  STORY_INFO, FORCED_EVENTS, ENDINGS,
  buildCharacters, getStatLevel,
  getAvailableCharacters, getCurrentChapter,
} from '@/lib/data'

export type {
  Character, CharacterStats, Scene, GameItem, Chapter,
  ForcedEvent, Ending, TimePeriod, Message, StatMeta,
} from '@/lib/data'
