/**
 * [INPUT]: 依赖 store.ts 状态（角色/场景/道具/全局值）
 * [OUTPUT]: 对外提供 DashboardDrawer 组件
 * [POS]: 求生手册(左抽屉)：扉页+社死分贝双表+角色轮播+场景缩略图+章节目标+道具格+音乐。Reorder拖拽排序
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState, useRef } from 'react'
import { AnimatePresence, motion, Reorder, useDragControls } from 'framer-motion'
import {
  useGameStore,
  SCENES,
  ITEMS,
  PERIODS,
  MAX_ROUNDS,
  getCurrentChapter,
} from '@/lib/store'
import { useBgm } from '@/lib/bgm'

const DASH_ORDER_KEY = 'cs-dash-order'
const DEFAULT_ORDER = ['front', 'globals', 'cast', 'scenes', 'goals', 'items', 'music']

// ── DragHandle ──────────────────────────────────────

function DragHandle({ controls }: { controls: ReturnType<typeof useDragControls> }) {
  return (
    <div onPointerDown={(e) => controls.start(e)} style={{ cursor: 'grab', touchAction: 'none', padding: 4 }}>
      <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--text-muted)">
        <rect y="3" width="16" height="2" rx="1" />
        <rect y="7" width="16" height="2" rx="1" />
        <rect y="11" width="16" height="2" rx="1" />
      </svg>
    </div>
  )
}

// ── Section wrapper ─────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  const controls = useDragControls()
  return (
    <Reorder.Item value={id} dragListener={false} dragControls={controls}>
      <div className="cs-dash-section">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{title}</span>
          <DragHandle controls={controls} />
        </div>
        {children}
      </div>
    </Reorder.Item>
  )
}

// ── FrontPage ───────────────────────────────────────

function FrontPage() {
  const currentRound = useGameStore((s) => s.currentRound)
  const currentPeriodIndex = useGameStore((s) => s.currentPeriodIndex)
  const chapter = getCurrentChapter(currentRound)
  const period = PERIODS[currentPeriodIndex] || PERIODS[0]

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
      <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--primary)', lineHeight: 1, minWidth: 44, textAlign: 'center' }}>
        {currentRound}
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 13 }}>
          <span>{period.icon}</span>
          <span style={{ color: 'var(--text-primary)' }}>{period.name}</span>
          <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>· {chapter.name}</span>
        </div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
          回合 {currentRound}/{MAX_ROUNDS}
        </div>
      </div>
    </div>
  )
}

// ── GlobalStatsMini ─────────────────────────────────

function GlobalStatsMini() {
  const socialDeath = useGameStore((s) => s.socialDeath)
  const cryDecibel = useGameStore((s) => s.cryDecibel)

  return (
    <div style={{ display: 'flex', gap: 10 }}>
      <div style={{ flex: 1, padding: 10, borderRadius: 10, background: 'rgba(233,30,140,0.06)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>😳 社死值</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#e91e8c', fontVariantNumeric: 'tabular-nums' }}>{socialDeath}</div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.06)', marginTop: 4 }}>
          <div style={{ width: `${socialDeath}%`, height: '100%', borderRadius: 2, background: '#e91e8c', transition: 'width 0.3s' }} />
        </div>
      </div>
      <div style={{ flex: 1, padding: 10, borderRadius: 10, background: 'rgba(59,130,246,0.06)' }}>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>🔊 哭声分贝</div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#3b82f6', fontVariantNumeric: 'tabular-nums' }}>{cryDecibel}</div>
        <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.06)', marginTop: 4 }}>
          <div style={{ width: `${cryDecibel}%`, height: '100%', borderRadius: 2, background: '#3b82f6', transition: 'width 0.3s' }} />
        </div>
      </div>
    </div>
  )
}

// ── CastGallery ─────────────────────────────────────

function CastGallery() {
  const { characters, characterStats, selectCharacter, toggleDashboard } = useGameStore()
  const charEntries = Object.entries(characters)
  const [idx, setIdx] = useState(0)
  const touchX = useRef(0)

  if (charEntries.length === 0) return null
  const [charId, char] = charEntries[idx]
  const stats = characterStats[charId] || {}
  const primaryStat = char.statMetas[0]
  const primaryValue = stats[primaryStat?.key] ?? 0

  return (
    <div>
      <div
        onTouchStart={(e) => { touchX.current = e.touches[0].clientX }}
        onTouchEnd={(e) => {
          const dx = e.changedTouches[0].clientX - touchX.current
          if (dx < -50 && idx < charEntries.length - 1) setIdx(idx + 1)
          else if (dx > 50 && idx > 0) setIdx(idx - 1)
        }}
        style={{ overflow: 'hidden' }}
      >
        <AnimatePresence mode="wait">
          <motion.div key={idx} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -40 }} transition={{ duration: 0.25 }}
            onClick={() => { selectCharacter(charId); toggleDashboard() }}
            style={{ display: 'flex', gap: 10, cursor: 'pointer', padding: '4px 0' }}>
            <div style={{ width: 80, height: 120, borderRadius: 8, overflow: 'hidden', flexShrink: 0, border: `2px solid ${char.themeColor}` }}>
              <img src={char.portrait} alt={char.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 4 }}>
              <div style={{ fontSize: 15, fontWeight: 600, color: char.themeColor }}>{char.name}</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{char.title} · {char.age}岁</div>
              {/* Show all stats */}
              {char.statMetas.map((meta) => (
                <div key={meta.key} style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 24 }}>{meta.label}</span>
                  <div style={{ flex: 1, height: 5, borderRadius: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                    <div style={{ width: `${Math.max(0, stats[meta.key] ?? 0)}%`, height: '100%', borderRadius: 3, background: meta.color, transition: 'width 0.3s' }} />
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, color: meta.color, fontVariantNumeric: 'tabular-nums', minWidth: 22, textAlign: 'right' }}>{stats[meta.key] ?? 0}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <div style={{ display: 'flex', justifyContent: 'center', gap: 5, marginTop: 6 }}>
        {charEntries.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)} style={{
            width: i === idx ? 16 : 6, height: 6, borderRadius: 3, border: 'none', padding: 0,
            background: i === idx ? 'var(--primary)' : 'rgba(0,0,0,0.1)', transition: 'all 0.2s', cursor: 'pointer',
          }} />
        ))}
      </div>
    </div>
  )
  void primaryValue // suppress unused
}

// ── SceneMap ─────────────────────────────────────────

function SceneMap() {
  const { currentScene, unlockedScenes, selectScene, toggleDashboard } = useGameStore()
  return (
    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4, scrollbarWidth: 'none' }}>
      {Object.entries(SCENES).map(([sid, scene]) => {
        const locked = !unlockedScenes.includes(sid), current = sid === currentScene
        return (
          <button key={sid} disabled={locked} onClick={() => { if (!locked && !current) { selectScene(sid); toggleDashboard() } }}
            style={{ flexShrink: 0, width: 100, border: 'none', background: 'none', padding: 0, cursor: locked ? 'default' : 'pointer', opacity: locked ? 0.4 : 1 }}>
            <div style={{ width: 100, height: 56, borderRadius: 6, overflow: 'hidden', position: 'relative', border: current ? '2px solid var(--primary)' : '2px solid transparent' }}>
              <img src={scene.background} alt={scene.name} style={{ width: '100%', height: '100%', objectFit: 'cover', filter: locked ? 'blur(4px) grayscale(1)' : 'none' }} />
              {locked && <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)', fontSize: 18 }}>🔒</div>}
            </div>
            <div style={{ fontSize: 11, marginTop: 3, textAlign: 'center', color: current ? 'var(--primary)' : 'var(--text-secondary)', fontWeight: current ? 600 : 400 }}>
              {scene.icon} {scene.name}
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── ChapterGoals ─────────────────────────────────────

function ChapterGoals() {
  const currentRound = useGameStore((s) => s.currentRound)
  const chapter = getCurrentChapter(currentRound)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>
        第{chapter.id}章「{chapter.name}」
      </div>
      {chapter.objectives.map((obj) => (
        <div key={obj} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)' }}>
          <span style={{
            width: 18, height: 18, borderRadius: 4, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid var(--text-muted)', background: 'transparent', fontSize: 11,
          }} />
          <span>{obj}</span>
        </div>
      ))}
    </div>
  )
}

// ── ItemGrid ─────────────────────────────────────────

function ItemGrid() {
  const inventory = useGameStore((s) => s.inventory)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
      {Object.entries(ITEMS).map(([id, item]) => {
        const qty = inventory[id] ?? 0
        return (
          <div key={id} style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '8px 4px',
            borderRadius: 8, background: 'rgba(255,107,157,0.04)', opacity: qty <= 0 ? 0.35 : 1, position: 'relative',
          }}>
            <span style={{ fontSize: 24, lineHeight: 1 }}>{item.icon}</span>
            <span style={{ fontSize: 10, color: 'var(--text-secondary)', textAlign: 'center' }}>{item.name}</span>
            {qty > 0 && <span style={{ position: 'absolute', top: 2, right: 4, fontSize: 10, fontWeight: 700, color: 'var(--primary)', background: 'rgba(255,107,157,0.08)', borderRadius: 6, padding: '0 4px', lineHeight: '16px' }}>{qty}</span>}
          </div>
        )
      })}
    </div>
  )
}

// ── MiniPlayer ──────────────────────────────────────

function MiniPlayer() {
  const { isPlaying, toggle } = useBgm()
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
      <button onClick={(e) => toggle(e)} style={{
        width: 36, height: 36, borderRadius: '50%', border: 'none', cursor: 'pointer',
        background: isPlaying ? 'var(--primary)' : 'rgba(0,0,0,0.06)', color: isPlaying ? '#fff' : 'var(--text-secondary)', fontSize: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s',
      }}>
        {isPlaying ? '⏸' : '♪'}
      </button>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500 }}>背景音乐</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{isPlaying ? '播放中' : '已暂停'}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'end', gap: 2, height: 18 }}>
        {[0.6, 1, 0.7, 0.9, 0.5].map((s, i) => (
          <div key={i} style={{
            width: 3, borderRadius: 1.5, background: isPlaying ? 'var(--primary)' : 'var(--text-muted)',
            height: isPlaying ? `${s * 100}%` : '20%', transition: 'height 0.3s',
            animation: isPlaying ? `cs-wave ${0.4 + i * 0.1}s ease-in-out infinite alternate` : 'none',
          }} />
        ))}
      </div>
    </div>
  )
}

// ── DashboardDrawer ─────────────────────────────────

const SECTION_TITLES: Record<string, string> = {
  front: '回合概览', globals: '全局数值', cast: 'NPC角色',
  scenes: '场景地图', goals: '章节目标', items: '背包', music: '音乐',
}

export default function DashboardDrawer() {
  const showDashboard = useGameStore((s) => s.showDashboard)
  const toggleDashboard = useGameStore((s) => s.toggleDashboard)

  const [order, setOrder] = useState<string[]>(() => {
    try { const s = localStorage.getItem(DASH_ORDER_KEY); if (s) { const a = JSON.parse(s); if (DEFAULT_ORDER.every((k) => a.includes(k))) return a } } catch {}
    return [...DEFAULT_ORDER]
  })

  const handleReorder = (v: string[]) => { setOrder(v); localStorage.setItem(DASH_ORDER_KEY, JSON.stringify(v)) }

  const renderSection = (id: string) => {
    switch (id) {
      case 'front': return <FrontPage />
      case 'globals': return <GlobalStatsMini />
      case 'cast': return <CastGallery />
      case 'scenes': return <SceneMap />
      case 'goals': return <ChapterGoals />
      case 'items': return <ItemGrid />
      case 'music': return <MiniPlayer />
      default: return null
    }
  }

  return (
    <AnimatePresence>
      {showDashboard && (<>
        <motion.div className="cs-dashboard-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          onClick={toggleDashboard} style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)' }} />
        <motion.div className="cs-dashboard" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }}
          transition={{ type: 'spring', damping: 26, stiffness: 300 }} onClick={(e) => e.stopPropagation()}
          style={{ position: 'fixed', top: 0, left: 0, bottom: 0, width: '82vw', maxWidth: 340, zIndex: 91, background: 'var(--bg-dash)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Header */}
          <header style={{ padding: '14px 16px 10px', flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--primary)' }}>📓 求生手册</div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>重生职高女厕 · 靠哭声续命</div>
            </div>
            <button onClick={toggleDashboard} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 18, cursor: 'pointer', padding: 4 }}>✕</button>
          </header>

          {/* Scrollable sections */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 16px 16px', scrollbarWidth: 'none' }}>
            <Reorder.Group axis="y" values={order} onReorder={handleReorder} style={{ listStyle: 'none', padding: 0, margin: 0 }}>
              {order.map((id) => (
                <Section key={id} id={id} title={SECTION_TITLES[id] || id}>
                  {renderSection(id)}
                </Section>
              ))}
            </Reorder.Group>
          </div>
        </motion.div>
      </>)}
    </AnimatePresence>
  )
}
