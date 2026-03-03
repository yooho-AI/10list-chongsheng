/**
 * [INPUT]: 依赖 store.ts 状态，styles/*.css
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 根组件: 开场(性别选择+姓名输入+NPC预览) + GameScreen + EndingModal + MenuOverlay
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useGameStore, ENDINGS, ENDING_TYPE_MAP, STORY_INFO } from '@/lib/store'
import { trackGameStart, trackGameContinue } from '@/lib/analytics'
import { initBGM } from '@/lib/bgm'
import AppShell from '@/components/game/app-shell'
import './styles/globals.css'
import './styles/opening.css'
import './styles/rich-cards.css'

// ── NPC 预览数据 ──────────────────────────────────

const TRAINEE_PREVIEW = [
  { id: 'xiaoman', name: '林小满', color: '#ec4899', icon: '👩', role: '生母' },
  { id: 'jianguo', name: '王建国', color: '#3b82f6', icon: '👨\u200D🏫', role: '主任' },
  { id: 'students', name: '围观学生', color: '#a855f7', icon: '📱', role: '吃瓜' },
] as const

// ── Opening Screen ──────────────────────────────────

function OpeningScreen({ onStart }: { onStart: (gender: 'male' | 'female', name: string) => void }) {
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [name, setName] = useState('')
  const hasSave = useGameStore((s) => s.hasSave)
  const loadGame = useGameStore((s) => s.loadGame)

  const handleContinue = useCallback(() => {
    initBGM()
    trackGameContinue()
    loadGame()
  }, [loadGame])

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#fef7ff] via-white to-[#fef7ff]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-lg px-6 text-center"
      >
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.3, type: 'spring' }}
          className="mb-6 text-5xl"
        >
          👶
        </motion.div>
        <h1 className="mb-2 text-2xl font-bold text-[#1e293b]">
          {STORY_INFO.title}
        </h1>
        <p className="mb-1 text-sm text-[#ff6b9d]">
          {STORY_INFO.subtitle} · 荒诞喜剧冒险
        </p>
        <p className="mb-8 text-xs leading-relaxed text-[#64748b]">
          {STORY_INFO.description}
        </p>

        {/* 性别选择 */}
        <div className="mb-4 flex justify-center gap-3">
          {([
            { value: 'male' as const, label: '男孩' },
            { value: 'female' as const, label: '女孩' },
          ]).map((g) => (
            <button
              key={g.value}
              onClick={() => setGender(g.value)}
              className="rounded-full px-5 py-2 text-sm font-medium transition-all"
              style={{
                background: gender === g.value ? 'linear-gradient(135deg, #ff6b9d 0%, #e91e8c 100%)' : 'transparent',
                color: gender === g.value ? '#fff' : '#64748b',
                border: gender === g.value ? '1px solid transparent' : '1px solid rgba(255,107,157,0.3)',
                boxShadow: gender === g.value ? '0 2px 12px rgba(255,107,157,0.3)' : 'none',
              }}
            >
              {g.label}
            </button>
          ))}
        </div>

        {/* 名字输入 */}
        <div className="mb-6">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="你的名字..."
            maxLength={8}
            className="w-full max-w-[240px] rounded-lg border px-4 py-2 text-center text-sm outline-none transition-all"
            style={{
              background: '#fff',
              borderColor: 'rgba(255, 107, 157, 0.3)',
              color: '#1e293b',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = '#ff6b9d' }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'rgba(255, 107, 157, 0.3)' }}
          />
        </div>

        {/* NPC 预览 */}
        <div className="mb-8 flex justify-center gap-5">
          {TRAINEE_PREVIEW.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="w-[72px] text-center"
            >
              <div
                className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full text-lg shadow-lg"
                style={{
                  border: `2px solid ${t.color}`,
                  background: `${t.color}18`,
                }}
              >
                {t.icon}
              </div>
              <div className="text-xs font-medium text-[#1e293b]">{t.name}</div>
              <div className="text-[10px] text-[#64748b]">{t.role}</div>
            </motion.div>
          ))}
        </div>

        {/* 按钮组 */}
        <div className="flex flex-col gap-3">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              initBGM()
              onStart(gender, name.trim() || '玩家')
            }}
            className="w-full rounded-full px-8 py-3 text-sm font-medium text-white shadow-lg transition-shadow"
            style={{
              background: 'linear-gradient(135deg, #ff6b9d 0%, #e91e8c 100%)',
              boxShadow: '0 4px 16px rgba(255, 107, 157, 0.3)',
            }}
          >
            开始重生
          </motion.button>

          {hasSave() && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={handleContinue}
              className="w-full rounded-full border px-8 py-3 text-sm font-medium transition-colors"
              style={{
                borderColor: 'rgba(255, 107, 157, 0.2)',
                color: '#64748b',
              }}
            >
              继续游戏
            </motion.button>
          )}
        </div>
      </motion.div>
    </div>
  )
}

// ── Ending Modal ────────────────────────────────────

function EndingModal() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)
  const clearSave = useGameStore((s) => s.clearSave)

  if (!endingType) return null

  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null

  const typeInfo = ENDING_TYPE_MAP[ending.type]

  return (
    <motion.div
      className="cs-ending-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <motion.div
        className="cs-ending-card"
        style={{ background: typeInfo.gradient }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <div className="cs-ending-type">{typeInfo.label}</div>
        <div className="cs-ending-title">{ending.name}</div>
        <p className="cs-ending-desc">{ending.description}</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <button
            className="cs-ending-btn"
            onClick={() => { clearSave(); resetGame() }}
          >
            返回标题
          </button>
          <button
            className="cs-ending-btn-secondary"
            onClick={() => {
              useGameStore.setState({ endingType: null })
            }}
          >
            继续探索
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ── Menu Overlay ────────────────────────────────────

function MenuOverlay({
  show,
  onClose,
}: {
  show: boolean
  onClose: () => void
}) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)
  const clearSave = useGameStore((s) => s.clearSave)
  const [toast, setToast] = useState('')

  if (!show) return null

  const handleSave = () => {
    saveGame()
    setToast('已保存')
    setTimeout(() => setToast(''), 2000)
  }

  return (
    <motion.div
      className="cs-menu-overlay"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="cs-menu-panel"
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 16 }}>
          {STORY_INFO.title}
        </h3>
        <button className="cs-menu-btn" onClick={handleSave}>💾 保存进度</button>
        <button className="cs-menu-btn" onClick={() => { loadGame(); onClose() }}>📂 读取存档</button>
        <button className="cs-menu-btn cs-menu-danger" onClick={() => { clearSave(); resetGame() }}>
          🔄 重新开始
        </button>
        <button className="cs-menu-btn" onClick={onClose}>✕ 继续游戏</button>

        {toast && <div className="cs-toast" style={{ position: 'static', marginTop: 12, textAlign: 'center' }}>{toast}</div>}
      </motion.div>
    </motion.div>
  )
}

// ── App Root ────────────────────────────────────────

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const sendMessage = useGameStore((s) => s.sendMessage)
  const [showMenu, setShowMenu] = useState(false)

  const handleStart = (gender: 'male' | 'female', name: string) => {
    trackGameStart()
    setPlayerInfo(gender, name)
    initGame()
    setTimeout(() => sendMessage('开始游戏'), 500)
  }

  if (!gameStarted) {
    return <OpeningScreen onStart={handleStart} />
  }

  return (
    <>
      <AppShell onMenuOpen={() => setShowMenu(true)} />
      <EndingModal />
      <AnimatePresence>
        {showMenu && (
          <MenuOverlay show={showMenu} onClose={() => setShowMenu(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
