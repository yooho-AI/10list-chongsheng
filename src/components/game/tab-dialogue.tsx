/**
 * [INPUT]: 依赖 store.ts 状态（消息/角色/场景/道具/流式内容）
 * [OUTPUT]: 对外提供 TabDialogue 组件
 * [POS]: 对话Tab：富消息路由(SceneCard/RoundCard/NPC头像气泡) + 可折叠选项 + 背包 + 输入区
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useGameStore,
  SCENES,
  ITEMS,
  parseStoryParagraph,
  type Message,
} from '@/lib/store'
import { Backpack, PaperPlaneRight, GameController, CaretUp, CaretDown } from '@phosphor-icons/react'

const P = 'cs'

// ── LetterCard — Welcome message ─────────────────────

function LetterCard({ message }: { message: Message }) {
  return (
    <div className={`${P}-letter`}>
      <div className={`${P}-letter-watermark`}>👶</div>
      <div className={`${P}-letter-title`}>重生降临</div>
      <div className={`${P}-letter-body`} style={{ whiteSpace: 'pre-line' }}>
        {message.content}
      </div>
      <div className={`${P}-letter-sign`}>— 系统提示</div>
    </div>
  )
}

// ── SceneTransitionCard ──────────────────────────────

function SceneTransitionCard({ message }: { message: Message }) {
  const scene = message.sceneId ? SCENES[message.sceneId] : null
  if (!scene) return null

  return (
    <div className={`${P}-scene-card`}>
      <img
        src={scene.background}
        alt={scene.name}
        style={{ width: '100%', height: 180, objectFit: 'cover' }}
      />
      <div className={`${P}-scene-card-overlay`}>
        <div className={`${P}-scene-card-name`}>{scene.icon} {scene.name}</div>
        <div className={`${P}-scene-card-atmo`}>{scene.atmosphere}</div>
      </div>
      <div className={`${P}-scene-card-badge`}>📍 场景切换</div>
    </div>
  )
}

// ── RoundCard — Round change card ────────────────────

function RoundCard({ message }: { message: Message }) {
  const info = message.roundInfo
  if (!info) return null

  return (
    <div className={`${P}-round-card`}>
      <div className={`${P}-round-number`}>回合 {info.round}</div>
      <div className={`${P}-round-period`}>{info.period}</div>
      <div className={`${P}-round-chapter`}>{info.chapter}</div>
    </div>
  )
}

// ── NpcBubble ────────────────────────────────────────

function NpcBubble({
  message,
  character,
}: {
  message: Message
  character: { name: string; portrait: string; themeColor: string } | undefined
}) {
  const { narrative, statHtml, charColor } = parseStoryParagraph(message.content)
  const borderColor = character?.themeColor || charColor || 'var(--primary)'

  return (
    <div className={`${P}-npc-row`}>
      {character && (
        <img
          className={`${P}-npc-avatar`}
          src={character.portrait}
          alt={character.name}
          style={{ borderColor }}
        />
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        {character && (
          <div style={{ fontSize: 12, fontWeight: 600, color: borderColor, marginBottom: 4 }}>
            {character.name}
          </div>
        )}
        <div
          className={`${P}-npc-bubble`}
          style={{ borderLeft: `3px solid ${borderColor}`, width: '100%' }}
        >
          <div dangerouslySetInnerHTML={{ __html: narrative }} />
          {statHtml && (
            <div className="stat-changes" dangerouslySetInnerHTML={{ __html: statHtml }} />
          )}
        </div>
      </div>
    </div>
  )
}

// ── PlayerBubble ─────────────────────────────────────

function PlayerBubble({ message }: { message: Message }) {
  return (
    <div className={`${P}-bubble-player`}>
      {message.content}
    </div>
  )
}

// ── SystemBubble ─────────────────────────────────────

function SystemBubble({ message }: { message: Message }) {
  return (
    <div className={`${P}-bubble-system`}>
      {message.content}
    </div>
  )
}

// ── StreamingMessage ─────────────────────────────────

function StreamingMessage({ content }: { content: string }) {
  if (content) {
    const { narrative, statHtml } = parseStoryParagraph(content)
    return (
      <div className={`${P}-npc-row`} style={{ opacity: 0.85 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div className={`${P}-npc-bubble`} style={{ borderLeft: '3px solid var(--primary)' }}>
            <div dangerouslySetInnerHTML={{ __html: narrative }} />
            {statHtml && (
              <div className="stat-changes" dangerouslySetInnerHTML={{ __html: statHtml }} />
            )}
            <span style={{
              display: 'inline-block', width: 6, height: 14, marginLeft: 2,
              background: 'var(--primary)', borderRadius: 1,
              animation: 'cs-blink 1s ease-in-out infinite', verticalAlign: 'text-bottom',
            }} />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`${P}-typing`}>
      <div className={`${P}-typing-dot`} />
      <div className={`${P}-typing-dot`} />
      <div className={`${P}-typing-dot`} />
    </div>
  )
}

// ── CollapsibleChoices ───────────────────────────────

const CHOICE_LETTERS = ['A', 'B', 'C', 'D']

function CollapsibleChoices({
  choices, onAction, disabled, expanded, onToggle,
}: {
  choices: string[]
  onAction: (text: string) => void
  disabled: boolean
  expanded: boolean
  onToggle: () => void
}) {
  if (choices.length === 0) return null

  if (!expanded) {
    return (
      <button className={`${P}-choices-bar`} onClick={onToggle} disabled={disabled}>
        <GameController size={16} weight="fill" />
        <span>展开行动选项</span>
        <span className={`${P}-choices-count`}>{choices.length}</span>
        <CaretUp size={14} />
      </button>
    )
  }

  return (
    <div className={`${P}-choices-panel`}>
      <div className={`${P}-choices-panel-header`} onClick={onToggle}>
        <span className={`${P}-choices-panel-title`}>
          选择行动 <span className={`${P}-choices-count`}>{choices.length}项</span>
        </span>
        <CaretDown size={14} style={{ color: 'var(--text-muted)' }} />
      </div>
      <div className={`${P}-choices-grid`}>
        {choices.map((action, idx) => (
          <button
            key={`${action}-${idx}`}
            className={`${P}-choices-card`}
            disabled={disabled}
            onClick={() => onAction(action)}
          >
            <span className={`${P}-choices-letter`}>{CHOICE_LETTERS[idx] || idx + 1}</span>
            {action}
          </button>
        ))}
      </div>
    </div>
  )
}

// ── InventorySheet ───────────────────────────────────

function InventorySheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const inventory = useGameStore((s) => s.inventory)
  const useItem = useGameStore((s) => s.useItem)

  const items = Object.entries(ITEMS).filter(([id]) => (inventory[id] || 0) > 0)

  if (!open) return null

  return (
    <AnimatePresence>
      <motion.div
        className={`${P}-inventory-overlay`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className={`${P}-inventory-sheet`}
          initial={{ y: '100%' }}
          animate={{ y: 0 }}
          exit={{ y: '100%' }}
          transition={{ type: 'spring', damping: 28, stiffness: 320 }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className={`${P}-inventory-handle`} />
          <div className={`${P}-inventory-header`}>
            <div className={`${P}-inventory-title`}>🎒 背包</div>
            <button className={`${P}-inventory-close`} onClick={onClose}>✕</button>
          </div>
          <div className={`${P}-inventory-grid`}>
            {items.length === 0 && (
              <div className={`${P}-inventory-empty`}>背包空空如也...</div>
            )}
            {items.map(([id, item]) => (
              <div
                key={id}
                className={`${P}-inventory-item`}
                onClick={() => {
                  useItem(id)
                  if ((inventory[id] || 0) <= 1) onClose()
                }}
                title={item.description}
              >
                <div className={`${P}-inventory-count`}>x{inventory[id]}</div>
                <div className={`${P}-inventory-icon`}>{item.icon}</div>
                <div className={`${P}-inventory-name`}>{item.name}</div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ── InputArea ────────────────────────────────────────

function InputArea({
  input, setInput, onSend, onToggleInventory, disabled,
}: {
  input: string
  setInput: (v: string) => void
  onSend: () => void
  onToggleInventory: () => void
  disabled: boolean
}) {
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  return (
    <div className={`${P}-input-area`}>
      <button
        className={`${P}-icon-btn`}
        onClick={onToggleInventory}
        title="背包"
        style={{ flexShrink: 0 }}
      >
        <Backpack size={20} />
      </button>
      <input
        className={`${P}-input`}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={disabled ? '等待回复中...' : '说点什么吧...'}
        disabled={disabled}
      />
      <button
        className={`${P}-send-btn`}
        onClick={onSend}
        disabled={disabled || !input.trim()}
        title="发送"
      >
        <PaperPlaneRight size={18} weight="fill" />
      </button>
    </div>
  )
}

// ══════════════════════════════════════════════════════
//  Main Component
// ══════════════════════════════════════════════════════

export default function TabDialogue() {
  const messages = useGameStore((s) => s.messages)
  const isTyping = useGameStore((s) => s.isTyping)
  const streamingContent = useGameStore((s) => s.streamingContent)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const characters = useGameStore((s) => s.characters)
  const choices = useGameStore((s) => s.choices)

  const [input, setInput] = useState('')
  const [showInventory, setShowInventory] = useState(false)
  const [choicesExpanded, setChoicesExpanded] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isTyping) setChoicesExpanded(false)
  }, [isTyping])

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: 'smooth',
    })
  }, [messages.length, streamingContent])

  const handleSend = () => {
    if (!input.trim() || isTyping) return
    sendMessage(input.trim())
    setInput('')
  }

  const renderMessage = (msg: Message, index: number) => {
    if (msg.type === 'scene-transition') return <SceneTransitionCard key={msg.id} message={msg} />
    if (msg.type === 'round-change') return <RoundCard key={msg.id} message={msg} />
    if (msg.role === 'assistant' && msg.character) {
      const char = characters[msg.character]
      return <NpcBubble key={msg.id} message={msg} character={char} />
    }
    if (msg.role === 'user') return <PlayerBubble key={msg.id} message={msg} />
    if (msg.role === 'system' && index === 0) return <LetterCard key={msg.id} message={msg} />
    return <SystemBubble key={msg.id} message={msg} />
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div
        ref={scrollRef}
        className={`${P}-scrollbar`}
        style={{ flex: 1, overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column' }}
      >
        {messages.map((msg, i) => renderMessage(msg, i))}
        {isTyping && <StreamingMessage content={streamingContent} />}
        <div style={{ height: 8 }} />
      </div>

      <CollapsibleChoices
        choices={choices}
        onAction={(text) => {
          if (!isTyping) {
            setChoicesExpanded(false)
            sendMessage(text)
          }
        }}
        disabled={isTyping}
        expanded={choicesExpanded}
        onToggle={() => setChoicesExpanded((v) => !v)}
      />

      <InputArea
        input={input}
        setInput={setInput}
        onSend={handleSend}
        onToggleInventory={() => setShowInventory((v) => !v)}
        disabled={isTyping}
      />

      <InventorySheet
        open={showInventory}
        onClose={() => setShowInventory(false)}
      />
    </div>
  )
}
