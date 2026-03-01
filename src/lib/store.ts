/**
 * [INPUT]: 依赖 script.md(?raw), stream.ts, data.ts, parser.ts, analytics.ts
 * [OUTPUT]: 对外提供 useGameStore + re-export data.ts + parser.ts
 * [POS]: 状态中枢：Zustand+Immer，剧本直通+富消息+双轨解析+链式反应+存档
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { create } from 'zustand'
import { immer } from 'zustand/middleware/immer'
import GAME_SCRIPT from './script.md?raw'
import { streamChat, type Message as StreamMessage } from './stream'
import {
  type Character,
  type CharacterStats,
  type Message,
  type StoryRecord,
  PERIODS,
  SCENES,
  ITEMS,
  MAX_ACTION_POINTS,
  MAX_ROUNDS,
  buildCharacters,
  buildInitialStats,
  getCurrentChapter,
  getRoundEvents,
} from './data'
import { parseStoryParagraph, extractChoices } from './parser'
import {
  trackGameStart,
  trackGameContinue,
  trackPlayerCreate,
  trackChapterEnter,
  trackEndingReached,
  trackTimeAdvance,
  trackSceneUnlock,
} from './analytics'

// ── Re-export data.ts + parser.ts ────────────────────
export {
  type Character,
  type CharacterStats,
  type Message,
  type StoryRecord,
  type TimePeriod,
  type Scene,
  type GameItem,
  type Chapter,
  type ForcedEvent,
  type Ending,
  type StatMeta,
  PERIODS,
  SCENES,
  ITEMS,
  CHAPTERS,
  MAX_ROUNDS,
  MAX_ACTION_POINTS,
  STORY_INFO,
  FORCED_EVENTS,
  ENDINGS,
  ENDING_TYPE_MAP,
  QUICK_ACTIONS,
  buildCharacters,
  getStatLevel,
  getAvailableCharacters,
  getCurrentChapter,
} from './data'
export { parseStoryParagraph, extractChoices } from './parser'

// ── Helpers ──────────────────────────────────────────

let messageCounter = 0
const makeId = () => `msg-${Date.now()}-${++messageCounter}`
const SAVE_KEY = 'chongsheng-save-v1'
const HISTORY_COMPRESS_THRESHOLD = 15

// ── State / Actions ──────────────────────────────────

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

  titles: string[]

  activeTab: 'dialogue' | 'scene' | 'character'
  choices: string[]

  showDashboard: boolean
  showRecords: boolean
  storyRecords: StoryRecord[]
}

interface GameActions {
  setPlayerInfo: (gender: 'male' | 'female', name: string) => void
  initGame: () => void
  selectCharacter: (id: string | null) => void
  selectScene: (id: string) => void
  setActiveTab: (tab: 'dialogue' | 'scene' | 'character') => void
  toggleDashboard: () => void
  toggleRecords: () => void
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

// ── Dual-track parseStatChanges ──────────────────────

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

  const nameToId: Record<string, string> = {}
  for (const [id, char] of Object.entries(characters)) {
    nameToId[char.name] = id
    if (char.name.length > 2) nameToId[char.name.slice(-2)] = id
  }

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

  const GLOBAL_ALIASES: Record<string, string> = {
    '社死': 'socialDeath', '社死值': 'socialDeath',
    '分贝': 'cryDecibel', '哭声': 'cryDecibel',
  }

  const regex = /[【\[]([^\]】]+)[】\]]\s*(\S+?)([+-])(\d+)/g
  let match
  while ((match = regex.exec(content))) {
    const [, context, statLabel, sign, numStr] = match
    const delta = parseInt(numStr) * (sign === '+' ? 1 : -1)

    const globalKey = GLOBAL_ALIASES[statLabel] || GLOBAL_ALIASES[context]
    if (globalKey) {
      globalChanges.push({ key: globalKey, delta })
      continue
    }

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

// ── buildSystemPrompt — Script-through ───────────────

function buildStatsSnapshot(state: GameState): string {
  const npcs = Object.entries(state.characterStats)
    .map(([charId, stats]) => {
      const char = state.characters[charId]
      if (!char) return ''
      const statStr = char.statMetas
        .map((m) => `${m.label}${stats?.[m.key] ?? 0}`)
        .join(' ')
      return `${char.name}(${char.title}): ${statStr}`
    })
    .filter(Boolean)
    .join('\n')

  return `全局数值:\n🔊 哭声分贝: ${state.cryDecibel}\n😳 社死值: ${state.socialDeath}/100\n\nNPC数值:\n${npcs}`
}

function buildSystemPrompt(state: GameState): string {
  const char = state.currentCharacter
    ? state.characters[state.currentCharacter]
    : null
  const chapter = getCurrentChapter(state.currentRound)
  const scene = SCENES[state.currentScene]
  const period = PERIODS[state.currentPeriodIndex] || PERIODS[0]

  const genderLabel = state.playerGender === 'male' ? '男孩👶' : '女孩👧'

  return `你是《重生职高女厕：靠哭声续命》的AI叙述者。

## 游戏剧本
${GAME_SCRIPT}

## 当前状态
婴儿「${state.playerName}」（${genderLabel}）
回合 ${state.currentRound}/${MAX_ROUNDS} · ${period.name}
第${chapter.id}章「${chapter.name}」
当前场景：${scene?.icon} ${scene?.name}
${char ? `当前交互角色：${char.name}（${char.title}）` : ''}

## 当前数值
${buildStatsSnapshot(state)}

## 背包
${Object.entries(state.inventory).filter(([, v]) => v > 0).map(([k, v]) => {
  const item = ITEMS[k]
  return item ? `${item.icon} ${item.name} x${v}` : ''
}).filter(Boolean).join('、') || '空'}

## 已触发事件
${state.triggeredEvents.join('、') || '无'}
${state.titles.length > 0 ? `\n## 称号\n${state.titles.join('、')}` : ''}

## 历史摘要
${state.historySummary || '故事刚刚开始'}

## 选项系统（必须严格遵守）
每次回复末尾必须给出恰好4个行动选项，格式严格如下：
1. 选项文本（简洁，15字以内）
2. 选项文本
3. 选项文本
4. 选项文本
规则：
- 必须恰好4个，不能多也不能少
- 选项前不要加"你的选择"等标题行
- 选项应涵盖不同的策略和行动方向
- 每个选项要具体、有剧情推动力，不要笼统`
}

// ── Chain Reactions ──────────────────────────────────

function applyChainReactions(state: GameState): void {
  // socialDeath≥80 → panic+10
  if (state.socialDeath >= 80) {
    const xiaomanStats = state.characterStats['xiaoman']
    if (xiaomanStats) {
      xiaomanStats['panic'] = Math.min(100, (xiaomanStats['panic'] ?? 0) + 10)
    }
  }

  // cryDecibel≥80 + 围观场景 → crowd+5
  if (state.cryDecibel >= 80 && (state.currentScene === 'canteen' || state.currentScene === 'corridor')) {
    const studentStats = state.characterStats['students']
    if (studentStats) {
      studentStats['crowd'] = Math.min(100, (studentStats['crowd'] ?? 0) + 5)
    }
  }
}

// ── Store ────────────────────────────────────────────

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    // ── Initial state ──
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
    titles: [],

    activeTab: 'dialogue',
    choices: [],

    showDashboard: false,
    showRecords: false,
    storyRecords: [],

    // ── Actions ──

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
        s.streamingContent = ''
        s.titles = []
        s.choices = []
        s.activeTab = 'dialogue'
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `你睁开眼睛。冰冷的瓷砖，忽明忽暗的灯管，头顶排风扇嗡嗡作响。\n\n一个花臂少女正颤抖着看着你，眼里满是恐慌。"完了完了完了..."她喃喃自语。\n\n你意识到——你重生了，而现在是一个刚出生的婴儿。你唯一的武器，是哭声。`,
          timestamp: Date.now(),
        })

        s.storyRecords.push({
          id: `sr-${Date.now()}`,
          round: 1,
          period: '清晨',
          title: '重生降临',
          content: `婴儿「${s.playerName}」在女厕隔间降生，故事开始。`,
        })

        s.choices = ['小猫叫（40分贝）', '普通婴儿哭（70分贝）', '破音嘶吼（90分贝）', '装死不动']
      })

      trackGameStart()
    },

    selectCharacter: (id) => {
      set((s) => {
        s.currentCharacter = id
        s.activeTab = 'dialogue'
      })
    },

    selectScene: (id) => {
      const state = get()
      if (!state.unlockedScenes.includes(id)) return
      if (state.currentScene === id) return

      trackSceneUnlock(id)

      set((s) => {
        s.currentScene = id
        s.activeTab = 'dialogue'

        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `你来到了${SCENES[id].icon} ${SCENES[id].name}。${SCENES[id].description}`,
          timestamp: Date.now(),
          type: 'scene-transition',
          sceneId: id,
        })
      })
    },

    setActiveTab: (tab) => {
      set((s) => {
        s.activeTab = tab
        s.showDashboard = false
        s.showRecords = false
      })
    },

    toggleDashboard: () => {
      set((s) => {
        s.showDashboard = !s.showDashboard
        if (s.showDashboard) s.showRecords = false
      })
    },

    toggleRecords: () => {
      set((s) => {
        s.showRecords = !s.showRecords
        if (s.showRecords) s.showDashboard = false
      })
    },

    sendMessage: async (text: string) => {
      const state = get()
      if (state.isTyping || state.endingType) return

      set((s) => {
        s.messages.push({ id: makeId(), role: 'user', content: text, timestamp: Date.now() })
        s.isTyping = true
        s.streamingContent = ''
      })

      // Compress history if needed
      const currentState = get()
      if (currentState.messages.length > HISTORY_COMPRESS_THRESHOLD) {
        const oldMessages = currentState.messages.slice(0, -10)
        const summary = oldMessages
          .filter((m) => m.role !== 'system' || m.type)
          .map((m) => `[${m.role}] ${m.content.slice(0, 80)}`)
          .join('\n')

        set((s) => {
          s.historySummary = (s.historySummary + '\n' + summary).slice(-2000)
          s.messages = s.messages.slice(-10)
        })
      }

      const promptState = get()
      const systemPrompt = buildSystemPrompt(promptState)
      const recentMessages = promptState.messages
        .filter((m) => !m.type)
        .slice(-10)
        .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

      let fullContent = ''

      try {
        const chatMessages: StreamMessage[] = [
          { role: 'system', content: systemPrompt },
          ...recentMessages,
        ]

        await streamChat(
          chatMessages,
          (chunk: string) => {
            fullContent += chunk
            set((s) => { s.streamingContent = fullContent })
          },
          () => {},
        )

        if (!fullContent) {
          const char = state.currentCharacter ? state.characters[state.currentCharacter] : null
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

        // Parse stat changes
        const afterState = get()
        const { charChanges, globalChanges } = parseStatChanges(fullContent, afterState.characters)

        // Detect character for NPC bubble
        const { charColor } = parseStoryParagraph(fullContent)
        let detectedChar: string | null = null
        if (charColor) {
          for (const [id, char] of Object.entries(afterState.characters)) {
            if (char.themeColor === charColor) {
              detectedChar = id
              break
            }
          }
        }

        // Extract choices
        const { cleanContent, choices: parsedChoices } = extractChoices(fullContent)

        const finalChoices = parsedChoices.length >= 2 ? parsedChoices : (() => {
          const cs = get()
          const char = cs.currentCharacter ? cs.characters[cs.currentCharacter] : null
          if (char) {
            return [
              `对${char.name}小猫叫`,
              `对${char.name}大声哭`,
              `抓${char.name}的手`,
              '装死不动',
            ]
          }
          return ['小猫叫（40分贝）', '普通婴儿哭（70分贝）', '破音嘶吼（90分贝）', '装死不动']
        })()

        set((s) => {
          // Apply character stat changes
          for (const c of charChanges) {
            const stats = s.characterStats[c.charId]
            if (stats) {
              const meta = s.characters[c.charId]?.statMetas.find((m) => m.key === c.stat)
              const min = meta?.min ?? 0
              stats[c.stat] = Math.max(min, Math.min(100, (stats[c.stat] ?? 0) + c.delta))
            }
          }

          // Apply global stat changes
          for (const g of globalChanges) {
            if (g.key === 'socialDeath') {
              s.socialDeath = Math.max(0, Math.min(100, s.socialDeath + g.delta))
            } else if (g.key === 'cryDecibel') {
              s.cryDecibel = Math.max(0, Math.min(100, s.cryDecibel + g.delta))
            }
          }

          // Chain reactions
          applyChainReactions(s)

          // Push assistant message
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: cleanContent,
            character: detectedChar || state.currentCharacter || undefined,
            timestamp: Date.now(),
          })

          s.choices = finalChoices.slice(0, 4)

          // Record
          const period = PERIODS[s.currentPeriodIndex] || PERIODS[0]
          s.storyRecords.push({
            id: `sr-${Date.now()}`,
            round: s.currentRound,
            period: period.name,
            title: text.slice(0, 20) + (text.length > 20 ? '...' : ''),
            content: cleanContent.slice(0, 100) + '...',
          })

          s.isTyping = false
          s.streamingContent = ''
        })

        // Check ending
        get().checkEnding()

        // Auto-save
        get().saveGame()
      } catch {
        set((s) => {
          s.isTyping = false
          s.streamingContent = ''
          const char = state.currentCharacter ? state.characters[state.currentCharacter] : null
          s.messages.push({
            id: makeId(),
            role: 'assistant',
            content: char
              ? `【${char.name}】（似乎在想什么）"..."`
              : '排风扇的声音忽然大了起来，掩盖了一切。',
            character: state.currentCharacter ?? undefined,
            timestamp: Date.now(),
          })
        })
      }
    },

    advanceTime: () => {
      set((s) => {
        s.currentRound++

        const newChapter = getCurrentChapter(s.currentRound)
        const period = PERIODS[s.currentPeriodIndex] || PERIODS[0]

        trackTimeAdvance(s.currentRound, period.name)

        // Round-change rich message
        s.messages.push({
          id: makeId(),
          role: 'system',
          content: `回合 ${s.currentRound} — 第${newChapter.id}章「${newChapter.name}」`,
          timestamp: Date.now(),
          type: 'round-change',
          roundInfo: { round: s.currentRound, period: period.name, chapter: newChapter.name },
        })

        // Chapter progression
        if (newChapter.id !== s.currentChapter) {
          s.currentChapter = newChapter.id
          trackChapterEnter(newChapter.id)

          // Scene unlock
          for (const [sceneId, scene] of Object.entries(SCENES)) {
            if (scene.unlockCondition?.chapter && scene.unlockCondition.chapter <= newChapter.id) {
              if (!s.unlockedScenes.includes(sceneId)) {
                s.unlockedScenes.push(sceneId)
                trackSceneUnlock(sceneId)
              }
            }
          }
        }

        // Record
        s.storyRecords.push({
          id: `sr-${Date.now()}`,
          round: s.currentRound,
          period: period.name,
          title: `进入回合 ${s.currentRound}`,
          content: `${newChapter.name} · ${period.name}`,
        })

        // Forced events
        const events = getRoundEvents(s.currentRound, s.triggeredEvents)
        for (const event of events) {
          let conditionMet = true
          if (event.condition) {
            if (event.condition.includes('社死值>=30') && s.socialDeath < 30) conditionMet = false
            if (event.condition.includes('主任好感>=70') && (s.characterStats['jianguo']?.['favor'] ?? 0) < 70) conditionMet = false
            if (event.condition.includes('生母羁绊>=60') && (s.characterStats['xiaoman']?.['bond'] ?? 0) < 60) conditionMet = false
          }
          if (conditionMet) {
            s.triggeredEvents.push(event.id)
            s.messages.push({
              id: makeId(),
              role: 'system',
              content: `🎬 【${event.name}】${event.description}`,
              timestamp: Date.now(),
            })
            s.storyRecords.push({
              id: `sr-${Date.now()}-evt`,
              round: s.currentRound,
              period: period.name,
              title: event.name,
              content: event.description,
            })
          }
        }
      })

      // Check ending at MAX_ROUNDS
      const state = get()
      if (state.currentRound >= MAX_ROUNDS) {
        get().checkEnding()
      }

      get().saveGame()
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

      if (item.type === 'consumable') {
        set((s) => { s.inventory[itemId] = Math.max(0, (s.inventory[itemId] ?? 0) - 1) })
      }

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
      if (state.endingType) return

      const favor = state.characterStats['jianguo']?.['favor'] ?? 0
      const bond = state.characterStats['xiaoman']?.['bond'] ?? 0

      // BE: 第一章未引来主任
      if (state.currentRound <= 6 && favor <= 0 && !state.triggeredEvents.includes('director-patrol')) {
        set((s) => { s.endingType = 'be-abandoned' })
        trackEndingReached('be-abandoned')
        return
      }

      // TE: 全满 + 所有隐藏事件
      const hiddenEvents = ['director-past', 'mother-truth']
      const allHidden = hiddenEvents.every((e) => state.triggeredEvents.includes(e))
      if (favor >= 90 && bond >= 90 && allHidden) {
        set((s) => { s.endingType = 'te-truth' })
        trackEndingReached('te-truth')
        return
      }

      // HE: 职高哭声传奇
      if (state.socialDeath >= 80 && favor >= 60) {
        set((s) => { s.endingType = 'he-cryking' })
        trackEndingReached('he-cryking')
        return
      }

      // HE: 生母逆袭
      if (bond >= 80 && favor >= 40) {
        set((s) => { s.endingType = 'he-mother' })
        trackEndingReached('he-mother')
        return
      }

      // NE: 社死王 or 兜底
      if (state.currentRound >= MAX_ROUNDS) {
        set((s) => { s.endingType = 'ne-meme' })
        trackEndingReached('ne-meme')
      }
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
        s.choices = []
        s.activeTab = 'dialogue'
        s.showDashboard = false
        s.showRecords = false
        s.storyRecords = []
      })
      get().clearSave()
    },

    // ── Save / Load ──

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
        storyRecords: s.storyRecords.slice(-50),
      }
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data))
      } catch { /* 静默 */ }
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
          s.storyRecords = data.storyRecords || []
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
