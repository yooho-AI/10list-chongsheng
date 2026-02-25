/**
 * [INPUT]: 依赖 @/lib/store, @/lib/parser, @/lib/bgm, ./highlight-modal
 * [OUTPUT]: 对外提供 MobileGameLayout 组件
 * [POS]: 移动端全屏布局，包含所有移动端子组件
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect, type FormEvent } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useGameStore, SCENES, ITEMS, STORY_INFO, ENDINGS,
  MAX_ROUNDS, getAvailableCharacters,
} from '@/lib/store'
import { parseStoryParagraph } from '@/lib/parser'
import { useBgm } from '@/lib/bgm'
import HighlightModal from './highlight-modal'

// ============================================================
// 结局类型映射 — 数据驱动
// ============================================================

const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: '⭐ True Ending',  color: '#ffd700', icon: '👑' },
  HE: { label: '🎉 Happy Ending', color: '#ff6b9d', icon: '🌟' },
  BE: { label: '💀 Bad Ending',    color: '#6b7280', icon: '💔' },
  NE: { label: '🌙 Normal Ending', color: '#f59e0b', icon: '🌙' },
}

/* 亮色主题常量 */
const BORDER = '#e2e8f0'
const BG_WHITE = '#fff'
const TEXT_PRIMARY = '#1e293b'
const TEXT_SECONDARY = '#64748b'
const TEXT_MUTED = '#94a3b8'
const ACCENT = '#ff6b9d'
const ACCENT_GRADIENT = 'linear-gradient(135deg, #ff6b9d 0%, #e91e8c 100%)'
const BUBBLE_AI_BG = 'rgba(255,255,255,0.95)'

// ============================================================
// 移动端顶栏 — 亮色清新风
// ============================================================

function MobileHeader({ onCharClick, onMenuClick }: { onCharClick: () => void; onMenuClick: () => void }) {
  const currentRound = useGameStore((s) => s.currentRound)
  const currentScene = useGameStore((s) => s.currentScene)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const socialDeath = useGameStore((s) => s.socialDeath)
  const cryDecibel = useGameStore((s) => s.cryDecibel)
  const selectScene = useGameStore((s) => s.selectScene)
  const { isPlaying, toggle } = useBgm()
  const char = currentCharacter ? characters[currentCharacter] : null

  return (
    <header
      className="mobile-header"
      style={{ flexDirection: 'column', gap: 4, padding: '8px 12px 6px', background: 'rgba(255,255,255,0.92)', borderBottom: `1px solid ${BORDER}` }}
    >
      {/* 上排：回合 + 数值 + 角色 + 音乐 + 菜单 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        <div className="mobile-header-left">
          <span className="mobile-header-stage" style={{ color: TEXT_PRIMARY, fontWeight: 600 }}>
            回合{currentRound}/{MAX_ROUNDS}
          </span>
          <span style={{ fontSize: 11, color: '#ef4444' }}>😳社死{socialDeath}</span>
          <span style={{ fontSize: 11, color: '#f59e0b' }}>🔊分贝{cryDecibel}</span>
          <button
            onClick={(e) => toggle(e)}
            title={isPlaying ? '关闭音乐' : '开启音乐'}
            style={{ background: 'rgba(255,107,157,0.08)', border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: 14, cursor: 'pointer', padding: '4px 10px' }}
          >
            {isPlaying ? '🔊' : '🔇'}
          </button>
        </div>
        <div className="mobile-header-right">
          <button className="mobile-header-npc" onClick={onCharClick} style={{ color: TEXT_PRIMARY }}>
            {char
              ? <span style={{ color: char.themeColor }}>{char.name}</span>
              : <span style={{ color: TEXT_SECONDARY }}>选择角色</span>}
            <span className="mobile-header-arrow">▼</span>
          </button>
          <button className="mobile-header-menu" onClick={onMenuClick}>☰</button>
        </div>
      </div>
      {/* 下排：场景快速切换 */}
      <div className="cs-scrollbar" style={{ display: 'flex', gap: 4, overflowX: 'auto', width: '100%', paddingBottom: 2 }}>
        {Object.values(SCENES).map((s) => {
          const active = currentScene === s.id
          return (
            <button
              key={s.id}
              onClick={() => selectScene(s.id)}
              style={{
                flexShrink: 0, padding: '3px 10px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
                border: `1px solid ${active ? ACCENT : BORDER}`,
                background: active ? 'rgba(255,107,157,0.1)' : 'rgba(255,255,255,0.8)',
                color: active ? ACCENT : TEXT_SECONDARY, fontWeight: active ? 600 : 400,
              }}
            >
              {s.icon} {s.name}
            </button>
          )
        })}
      </div>
    </header>
  )
}

// ============================================================
// 移动端信笺
// ============================================================

function MobileLetterCard() {
  return (
    <div className="mobile-letter-card" style={{ background: BUBBLE_AI_BG, color: TEXT_PRIMARY, border: `1px solid ${BORDER}` }}>
      <div className="mobile-letter-icon">👶</div>
      <div className="mobile-letter-genre" style={{ color: TEXT_SECONDARY }}>{STORY_INFO.genre}</div>
      <h2 className="mobile-letter-title" style={{ color: TEXT_PRIMARY }}>{STORY_INFO.title}</h2>
      <p className="mobile-letter-body" style={{ color: '#475569' }}>{STORY_INFO.description}</p>
    </div>
  )
}

// ============================================================
// 移动端对话区
// ============================================================

const aiBubbleStyle = { background: BUBBLE_AI_BG, border: `1px solid ${BORDER}`, color: TEXT_PRIMARY }

function MobileDialogue({ onCharClick }: { onCharClick: () => void }) {
  const messages = useGameStore((s) => s.messages)
  const isTyping = useGameStore((s) => s.isTyping)
  const streamingContent = useGameStore((s) => s.streamingContent)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const scrollRef = useRef<HTMLDivElement>(null)
  const isNearBottomRef = useRef(true)
  const char = currentCharacter ? characters[currentCharacter] : null
  const hasUserMessage = messages.some((m) => m.role === 'user')

  useEffect(() => {
    const el = scrollRef.current
    if (el && isNearBottomRef.current) el.scrollTop = el.scrollHeight
  }, [messages, isTyping, streamingContent])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      isNearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100
    }
    el.addEventListener('scroll', onScroll)
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div ref={scrollRef} className="mobile-dialogue cs-scrollbar" style={{ position: 'relative' }}>
      {/* 浮动角色小窗 */}
      {char && hasUserMessage && (
        <div
          onClick={onCharClick}
          style={{
            position: 'sticky', top: 8, float: 'right', width: 80, height: 106,
            borderRadius: 10, overflow: 'hidden', zIndex: 10, cursor: 'pointer', marginRight: 4,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)', border: '2px solid rgba(255,107,157,0.3)',
          }}
        >
          <img src={char.fullImage} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, padding: '14px 4px 4px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.5))',
            fontSize: 10, fontWeight: 600, color: '#fff', textAlign: 'center',
          }}>
            {char.name}
          </div>
        </div>
      )}

      {messages.length === 0 && <MobileLetterCard />}

      {messages.map((msg) => {
        if (msg.role === 'user') return (
          <div key={msg.id} className="mobile-msg-user">
            <div className="mobile-bubble-user" style={{ background: ACCENT_GRADIENT, color: '#fff' }}>{msg.content}</div>
          </div>
        )
        if (msg.role === 'system') return (
          <div key={msg.id} className="mobile-msg-system" style={{ color: TEXT_SECONDARY }}>{msg.content}</div>
        )
        const { narrative, statHtml } = parseStoryParagraph(msg.content)
        return (
          <div key={msg.id}>
            <div className="mobile-msg-ai">
              <div className="mobile-bubble-ai" style={aiBubbleStyle} dangerouslySetInnerHTML={{ __html: narrative }} />
            </div>
            {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
          </div>
        )
      })}

      {/* 流式输出 */}
      {isTyping && streamingContent && (() => {
        const { narrative, statHtml } = parseStoryParagraph(streamingContent)
        return (
          <div>
            <div className="mobile-msg-ai">
              <div className="mobile-bubble-ai" style={aiBubbleStyle} dangerouslySetInnerHTML={{ __html: narrative }} />
            </div>
            {statHtml && <div dangerouslySetInnerHTML={{ __html: statHtml }} />}
          </div>
        )
      })()}

      {/* 等待指示器 */}
      {isTyping && !streamingContent && (
        <div className="mobile-msg-ai">
          <div className="mobile-bubble-ai mobile-typing" style={{ background: BUBBLE_AI_BG, border: `1px solid ${BORDER}` }}>
            <span className="mobile-typing-dot" /><span className="mobile-typing-dot" /><span className="mobile-typing-dot" />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 移动端输入栏
// ============================================================

function MobileInputBar({ onInventoryClick }: { onInventoryClick: () => void }) {
  const [input, setInput] = useState('')
  const [showHighlight, setShowHighlight] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const messages = useGameStore((s) => s.messages)
  const isTyping = useGameStore((s) => s.isTyping)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const inventory = useGameStore((s) => s.inventory)
  const char = currentCharacter ? characters[currentCharacter] : null
  const canHighlight = messages.filter((m) => m.role !== 'system').length >= 5
  const inventoryCount = Object.values(inventory).reduce((sum, n) => sum + (n > 0 ? n : 0), 0)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isTyping) return
    const text = input.trim()
    setInput('')
    await sendMessage(text)
  }

  return (
    <div className="mobile-input-bar" style={{ flexDirection: 'column', gap: 0, background: BUBBLE_AI_BG, borderTop: `1px solid ${BORDER}` }}>
      {/* 快捷操作 */}
      <div className="flex gap-2 overflow-x-auto px-3 py-2" style={{ borderBottom: `1px solid ${BORDER}` }}>
        {canHighlight && (
          <button
            onClick={() => setShowHighlight(true)}
            className="shrink-0 rounded-full border px-3 py-1 text-xs"
            style={{ borderColor: ACCENT, color: ACCENT, background: 'rgba(255,107,157,0.06)' }}
          >
            ✨ 高光
          </button>
        )}
      </div>
      <AnimatePresence>
        {showHighlight && <HighlightModal onClose={() => setShowHighlight(false)} />}
      </AnimatePresence>
      <div className="flex items-center gap-2 px-3 py-2">
        <button className="mobile-inventory-btn" onClick={onInventoryClick}>
          🎒{inventoryCount > 0 && <span className="mobile-inventory-badge">{inventoryCount}</span>}
        </button>
        <form onSubmit={handleSubmit} className="mobile-input-form">
          <input
            ref={inputRef} type="text" className="mobile-input"
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder={char ? `对${char.name}说...` : '说点什么...'} disabled={isTyping}
            style={{ background: '#f1f5f9', color: TEXT_PRIMARY, border: `1px solid ${BORDER}` }}
          />
          <button
            type="submit" className="mobile-send-btn"
            disabled={isTyping || !input.trim()}
            style={{ background: ACCENT_GRADIENT, color: '#fff' }}
          >
            发送
          </button>
        </form>
      </div>
    </div>
  )
}

// ============================================================
// 角色选择面板 — 亮色底部抽屉
// ============================================================

const sheetStyle = { background: BG_WHITE, borderTop: `1px solid ${BORDER}` }
const springTransition = { type: 'spring' as const, damping: 25, stiffness: 300 }

function CharacterSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const currentRound = useGameStore((s) => s.currentRound)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const available = getAvailableCharacters(currentRound, characters)

  const handleSelect = (id: string) => {
    selectCharacter(currentCharacter === id ? null : id)
    onClose()
  }

  return (
    <AnimatePresence>
      {open && (<>
        <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div className="mobile-sheet" style={sheetStyle} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={springTransition}>
          <div className="mobile-sheet-handle" style={{ background: '#cbd5e1' }} />
          <div className="mobile-sheet-title" style={{ color: TEXT_PRIMARY }}>选择角色</div>
          <div className="mobile-char-grid">
            {Object.values(available).map((char) => {
              const isSelected = currentCharacter === char.id
              const stats = characterStats[char.id]
              return (
                <button
                  key={char.id}
                  className={`mobile-char-card ${isSelected ? 'selected' : ''}`}
                  style={{ borderColor: isSelected ? char.themeColor : BORDER, background: isSelected ? 'rgba(255,107,157,0.06)' : BG_WHITE }}
                  onClick={() => handleSelect(char.id)}
                >
                  <div style={{ width: 48, height: 48, borderRadius: 8, overflow: 'hidden' }}>
                    <img src={char.fullImage} alt={char.name} style={{ width: 48, height: 48, objectFit: 'cover' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span className="mobile-char-name" style={{ color: char.themeColor }}>{char.name}</span>
                    <div className="mobile-char-stats">
                      {char.statMetas.filter((m) => m.category === 'relation').map((meta) => (
                        <span key={meta.key} style={{ color: meta.color }}>{meta.icon}{stats?.[meta.key] ?? 0}</span>
                      ))}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}

// ============================================================
// 背包面板
// ============================================================

function InventorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inventory = useGameStore((s) => s.inventory)
  const useItem = useGameStore((s) => s.useItem)
  const isTyping = useGameStore((s) => s.isTyping)
  const handleUseItem = (itemId: string) => { useItem(itemId); onClose() }
  const hasItems = Object.entries(inventory).some(([, count]) => count > 0)

  return (
    <AnimatePresence>
      {open && (<>
        <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div className="mobile-sheet" style={sheetStyle} initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={springTransition}>
          <div className="mobile-sheet-handle" style={{ background: '#cbd5e1' }} />
          <div className="mobile-sheet-title" style={{ color: TEXT_PRIMARY }}>🎒 背包</div>
          <div className="cs-scrollbar" style={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {hasItems ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '0 4px' }}>
                {Object.entries(inventory).map(([itemId, count]) => {
                  if (count <= 0) return null
                  const item = ITEMS[itemId]
                  if (!item) return null
                  return (
                    <button
                      key={itemId} onClick={() => handleUseItem(itemId)} disabled={isTyping}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 8,
                        border: `1px solid ${BORDER}`, background: BG_WHITE,
                        cursor: isTyping ? 'default' : 'pointer', opacity: isTyping ? 0.5 : 1, textAlign: 'left',
                      }}
                    >
                      <span style={{ fontSize: 24 }}>{item.icon}</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: TEXT_PRIMARY }}>{item.name}</div>
                        <div style={{ fontSize: 12, color: TEXT_SECONDARY }}>{item.description}</div>
                      </div>
                      {count > 1 && <span style={{ fontSize: 12, color: TEXT_MUTED }}>x{count}</span>}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="cs-placeholder" style={{ height: 120 }}>
                <span style={{ fontSize: 32, opacity: 0.5 }}>🎒</span>
                <span className="cs-placeholder-text" style={{ color: TEXT_MUTED }}>背包空空如也</span>
              </div>
            )}
          </div>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}

// ============================================================
// 结局面板 — 数据驱动
// ============================================================

function EndingSheet() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)
  const ending = endingType ? ENDINGS.find((e) => e.id === endingType) : null
  if (!ending) return null
  const meta = ENDING_TYPE_MAP[ending.type] ?? ENDING_TYPE_MAP.NE

  return (
    <motion.div
      className="cs-ending-overlay" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(255,255,255,0.85)', backdropFilter: 'blur(12px)',
      }}
    >
      <div style={{
        background: BG_WHITE, borderRadius: 16, padding: '32px 24px',
        maxWidth: 360, width: '90%', textAlign: 'center',
        boxShadow: '0 16px 48px rgba(0,0,0,0.12)', border: `1px solid ${BORDER}`,
      }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>{meta.icon}</div>
        <div style={{ fontSize: 11, fontWeight: 600, color: meta.color, marginBottom: 6, letterSpacing: 2 }}>{meta.label}</div>
        <h2 style={{ fontSize: 20, fontWeight: 600, color: TEXT_PRIMARY, margin: '0 0 12px' }}>{ending.name}</h2>
        <p style={{ fontSize: 13, lineHeight: 1.8, color: TEXT_SECONDARY, marginBottom: 20 }}>{ending.description}</p>
        <button
          onClick={() => resetGame()}
          style={{ padding: '10px 28px', borderRadius: 99, border: 'none', background: ACCENT_GRADIENT, color: 'white', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          返回标题
        </button>
      </div>
    </motion.div>
  )
}

// ============================================================
// 移动端菜单
// ============================================================

function MobileMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const resetGame = useGameStore((s) => s.resetGame)
  const saveGame = useGameStore((s) => s.saveGame)

  return (
    <AnimatePresence>
      {open && (<>
        <motion.div className="mobile-sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
        <motion.div
          className="mobile-menu" style={{ background: BG_WHITE, border: `1px solid ${BORDER}` }}
          initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        >
          <div className="mobile-menu-title" style={{ color: TEXT_PRIMARY }}>游戏菜单</div>
          <button className="mobile-menu-btn" style={{ color: TEXT_PRIMARY }} onClick={() => { saveGame(); onClose() }}>💾 保存游戏</button>
          <button className="mobile-menu-btn" style={{ color: TEXT_PRIMARY }} onClick={() => resetGame()}>🏠 返回标题</button>
          <button className="mobile-menu-btn" style={{ color: TEXT_PRIMARY }} onClick={onClose}>▶️ 继续游戏</button>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}

// ============================================================
// 移动端游戏主布局
// ============================================================

export default function MobileGameLayout() {
  const [showChar, setShowChar] = useState(false)
  const [showInventory, setShowInventory] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const currentScene = useGameStore((s) => s.currentScene)
  const endingType = useGameStore((s) => s.endingType)
  const scene = SCENES[currentScene]

  return (
    <div className="mobile-game" style={{ position: 'relative' }}>
      {scene?.background && (
        <img src={scene.background} alt={scene.name} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0, pointerEvents: 'none' }} />
      )}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', zIndex: 0, pointerEvents: 'none' }} />
      <MobileHeader onCharClick={() => setShowChar(true)} onMenuClick={() => setShowMenu(true)} />
      <MobileDialogue onCharClick={() => setShowChar(true)} />
      <MobileInputBar onInventoryClick={() => setShowInventory(true)} />
      <CharacterSheet open={showChar} onClose={() => setShowChar(false)} />
      <InventorySheet open={showInventory} onClose={() => setShowInventory(false)} />
      <MobileMenu open={showMenu} onClose={() => setShowMenu(false)} />
      {endingType && <EndingSheet />}
    </div>
  )
}
