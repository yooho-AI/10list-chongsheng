/**
 * [INPUT]: 依赖 @/lib/store, @/lib/bgm, @/lib/hooks, @/styles/globals.css, 所有游戏组件
 * [OUTPUT]: 对外提供 App 根组件
 * [POS]: 应用入口，管理开场/游戏/结局三态
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, ENDINGS, PERIODS, STORY_INFO, MAX_ROUNDS } from '@/lib/store'
import { useIsMobile } from '@/lib/hooks'
import { useBgm } from '@/lib/bgm'
import DialoguePanel from '@/components/game/dialogue-panel'
import LeftPanel from '@/components/game/character-panel'
import RightPanel from '@/components/game/side-panel'
import MobileGameLayout from '@/components/game/mobile-layout'
import '@/styles/globals.css'

// ============================================================
// NPC 预览数据 — 开始画面用，与 store 解耦
// ============================================================

const TRAINEE_PREVIEW = [
  { id: 'xiaoman', name: '林小满', color: '#ec4899', icon: '👩', role: '生母' },
  { id: 'jianguo', name: '王建国', color: '#3b82f6', icon: '👨\u200D🏫', role: '主任' },
  { id: 'students', name: '围观学生', color: '#a855f7', icon: '📱', role: '吃瓜' },
] as const

// ============================================================
// 结局类型映射 — 消除 if/else 分支
// ============================================================

const ENDING_TYPE_MAP: Record<string, { label: string; color: string; icon: string }> = {
  TE: { label: '⭐ True Ending', color: '#ffd700', icon: '👑' },
  HE: { label: '🎉 Happy Ending', color: '#ff6b9d', icon: '🌟' },
  BE: { label: '💀 Bad Ending', color: '#6b7280', icon: '💔' },
  NE: { label: '🌙 Normal Ending', color: '#f59e0b', icon: '🌙' },
}

// ============================================================
// 开始界面 — 明亮漫画风
// ============================================================

function StartScreen() {
  const setPlayerInfo = useGameStore((s) => s.setPlayerInfo)
  const initGame = useGameStore((s) => s.initGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const hasSave = useGameStore((s) => s.hasSave)
  const { toggle, isPlaying } = useBgm()

  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [name, setName] = useState('')

  const handleStart = () => {
    setPlayerInfo(gender, name || '玩家')
    initGame()
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gradient-to-br from-[#fef7ff] via-white to-[#fef7ff]">
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="w-full max-w-lg px-6 text-center"
      >
        {/* 标题 */}
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

        {/* 性别选择 — 二选 */}
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
            onClick={handleStart}
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
              onClick={() => loadGame()}
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

        {/* 音乐按钮 */}
        <button
          onClick={(e) => toggle(e)}
          className="mt-4 text-xs text-[#94a3b8] transition-colors hover:text-[#64748b]"
        >
          {isPlaying ? '🔊 音乐开' : '🔇 音乐关'}
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================
// 顶部状态栏 — 回合 + 社死 + 分贝
// ============================================================

function HeaderBar({ onMenuClick }: { onMenuClick: () => void }) {
  const currentRound = useGameStore((s) => s.currentRound)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const socialDeath = useGameStore((s) => s.socialDeath)
  const cryDecibel = useGameStore((s) => s.cryDecibel)
  const { toggle, isPlaying } = useBgm()

  const period = PERIODS[currentPeriodIndex]

  return (
    <header
      className="relative z-10 flex min-h-[44px] items-center justify-between gap-2 px-4 py-2"
      style={{ background: 'var(--bg-primary)' }}
    >
      {/* 左侧：回合 + 时段 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium" style={{ color: 'var(--primary)' }}>
          👶 回合{currentRound}/{MAX_ROUNDS}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {period?.icon} {period?.name}
        </span>
      </div>

      {/* 右侧：社死 + 分贝 + 音乐 + 菜单 */}
      <div className="flex items-center gap-1">
        <span className="rounded-md px-2 py-1 text-xs" style={{ color: '#e91e8c' }}>
          😳社死{socialDeath}
        </span>

        <span className="rounded-md px-2 py-1 text-xs" style={{ color: '#3b82f6' }}>
          🔊分贝{cryDecibel}
        </span>

        <button
          onClick={(e) => toggle(e)}
          className="rounded px-3 py-2 text-sm transition-all"
          style={{ color: 'var(--text-muted)' }}
          title={isPlaying ? '关闭音乐' : '开启音乐'}
        >
          {isPlaying ? '🔊' : '🔇'}
        </button>

        <button
          onClick={onMenuClick}
          className="rounded px-3 py-2 text-sm transition-all"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,107,157,0.08)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
          title="菜单"
        >
          ☰
        </button>
      </div>
    </header>
  )
}

// ============================================================
// 菜单弹窗
// ============================================================

function MenuOverlay({ onClose }: { onClose: () => void }) {
  const saveGame = useGameStore((s) => s.saveGame)
  const loadGame = useGameStore((s) => s.loadGame)
  const resetGame = useGameStore((s) => s.resetGame)

  return (
    <div className="cs-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="cs-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          style={{ color: 'var(--text-primary)', fontSize: 16, fontWeight: 600, margin: '0 0 16px', textAlign: 'center' }}
        >
          游戏菜单
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <button className="cs-modal-btn" onClick={() => { saveGame(); onClose() }}>💾 保存游戏</button>
          <button className="cs-modal-btn" onClick={() => { loadGame(); onClose() }}>📂 读取存档</button>
          <button className="cs-modal-btn" onClick={() => resetGame()}>🏠 返回标题</button>
          <button className="cs-modal-btn" onClick={onClose}>▶️ 继续游戏</button>
        </div>
      </motion.div>
    </div>
  )
}

// ============================================================
// 结局弹窗 — 数据驱动，无 if/else
// ============================================================

function EndingModal() {
  const endingType = useGameStore((s) => s.endingType)
  const resetGame = useGameStore((s) => s.resetGame)

  const ending = ENDINGS.find((e) => e.id === endingType)
  if (!ending) return null

  const meta = ENDING_TYPE_MAP[ending.type] ?? ENDING_TYPE_MAP.NE

  return (
    <div className="cs-ending-overlay">
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, type: 'spring' }}
        className="cs-ending-modal"
      >
        <div style={{ fontSize: 48, marginBottom: 16 }}>
          {meta.icon}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: meta.color, marginBottom: 8, letterSpacing: 2 }}>
          {meta.label}
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 16px', letterSpacing: 1 }}>
          {ending.name}
        </h2>
        <p style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', marginBottom: 24 }}>
          {ending.description}
        </p>
        <button
          onClick={() => resetGame()}
          style={{
            padding: '10px 32px',
            borderRadius: 99,
            border: 'none',
            background: 'linear-gradient(135deg, #ff6b9d 0%, #e91e8c 100%)',
            color: 'white',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(255, 107, 157, 0.3)',
          }}
        >
          返回标题
        </button>
      </motion.div>
    </div>
  )
}

// ============================================================
// 通知
// ============================================================

function Notification({ text, type }: { text: string; type: string }) {
  return (
    <div className={`cs-notification ${type}`}>
      <span>{type === 'success' ? '✓' : type === 'error' ? '✕' : type === 'warning' ? '⚠' : 'ℹ'}</span>
      <span>{text}</span>
    </div>
  )
}

// ============================================================
// PC 游戏主屏幕 — 三栏布局
// ============================================================

function GameScreen() {
  const [showMenu, setShowMenu] = useState(false)
  const [notification, setNotification] = useState<{ text: string; type: string } | null>(null)
  const endingType = useGameStore((s) => s.endingType)

  const showNotif = useCallback((text: string, type = 'info') => {
    setNotification({ text, type })
    setTimeout(() => setNotification(null), 2000)
  }, [])
  void showNotif

  return (
    <div
      className="flex h-screen flex-col"
      style={{ background: 'var(--bg-secondary)', fontFamily: 'var(--font)' }}
    >
      <HeaderBar onMenuClick={() => setShowMenu(true)} />

      <main className="flex flex-1 overflow-hidden">
        <aside className="w-[280px] shrink-0">
          <LeftPanel />
        </aside>
        <section className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DialoguePanel />
        </section>
        <aside className="shrink-0">
          <RightPanel />
        </aside>
      </main>

      <AnimatePresence>
        {showMenu && <MenuOverlay onClose={() => setShowMenu(false)} />}
      </AnimatePresence>

      {endingType && <EndingModal />}

      <AnimatePresence>
        {notification && (
          <motion.div
            key="notif"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <Notification text={notification.text} type={notification.type} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ============================================================
// App 根组件
// ============================================================

export default function App() {
  const gameStarted = useGameStore((s) => s.gameStarted)
  const isMobile = useIsMobile()

  return (
    <AnimatePresence mode="wait">
      {gameStarted ? (
        <motion.div
          key="game"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
          className="h-screen"
        >
          {isMobile ? <MobileGameLayout /> : <GameScreen />}
        </motion.div>
      ) : (
        <motion.div key="start" exit={{ opacity: 0 }} transition={{ duration: 0.3 }}>
          <StartScreen />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
