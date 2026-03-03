/**
 * [INPUT]: 依赖 store.ts 状态（场景/解锁），data.ts 场景常量
 * [OUTPUT]: 对外提供 TabScene 组件
 * [POS]: 场景 Tab：当前场景横幅 + 2列场景网格 + SceneDetail 全屏覆盖(overlay+sheet)
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore, SCENES } from '@/lib/store'

const P = 'cs'

// ── Scene Detail (Full-screen overlay) ──────────────

function SceneDetail({
  sceneId,
  onClose,
}: {
  sceneId: string
  onClose: () => void
}) {
  const scene = SCENES[sceneId]
  const currentScene = useGameStore((s) => s.currentScene)
  const selectScene = useGameStore((s) => s.selectScene)
  const isCurrent = sceneId === currentScene

  if (!scene) return null

  return (
    <>
      <motion.div
        className={`${P}-dossier-overlay`}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 51, overflow: 'visible' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        className={`${P}-records-sheet`}
        style={{ zIndex: 52, overflowY: 'auto' }}
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
      >
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 12, right: 12, zIndex: 10,
            background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
            width: 36, height: 36, color: '#fff', fontSize: 18, cursor: 'pointer',
          }}
        >
          ✕
        </button>

        {/* Scene Image */}
        <motion.div
          style={{ height: '50vh', overflow: 'hidden', position: 'relative' }}
          animate={{ scale: [1, 1.02, 1] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        >
          <img
            src={scene.background}
            alt={scene.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
            background: 'linear-gradient(transparent, #fef7ff)',
          }} />
        </motion.div>

        {/* Info */}
        <div style={{ padding: '0 16px 24px' }}>
          <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
            {scene.icon} {scene.name}
            {isCurrent && (
              <span style={{
                fontSize: 11, padding: '2px 8px', borderRadius: 10, marginLeft: 8,
                background: 'var(--primary)', color: '#fff', fontWeight: 600,
                verticalAlign: 'middle',
              }}>
                当前
              </span>
            )}
          </div>

          {/* Atmosphere */}
          <div style={{
            display: 'inline-block', padding: '2px 10px', borderRadius: 12,
            background: 'rgba(255, 107, 157, 0.1)', color: 'var(--primary)',
            fontSize: 12, fontWeight: 600, marginBottom: 12,
          }}>
            {scene.atmosphere}
          </div>

          {/* Description */}
          <p style={{
            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7,
            marginBottom: 16,
          }}>
            {scene.description}
          </p>

          {/* Tags */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
            {scene.tags.map((tag) => (
              <span key={tag} style={{
                padding: '3px 10px', borderRadius: 12,
                background: 'white', border: '1px solid rgba(0,0,0,0.08)',
                fontSize: 11, color: 'var(--text-muted)',
              }}>
                {tag}
              </span>
            ))}
          </div>

          {/* Move button */}
          {!isCurrent && (
            <button
              onClick={() => {
                selectScene(sceneId)
                onClose()
              }}
              style={{
                width: '100%', padding: '12px 0', borderRadius: 12,
                background: 'var(--primary)', color: '#fff',
                border: 'none', fontSize: 14, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              移动到此场景
            </button>
          )}
        </div>
      </motion.div>
    </>
  )
}

// ── Main Component ──────────────────────────────────

export default function TabScene() {
  const currentScene = useGameStore((s) => s.currentScene)
  const unlockedScenes = useGameStore((s) => s.unlockedScenes)

  const [detailScene, setDetailScene] = useState<string | null>(null)

  return (
    <div className={`${P}-scrollbar`} style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      {/* ── 当前场景 ── */}
      {SCENES[currentScene] && (
        <>
          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
            📍 当前位置
          </h4>
          <button
            onClick={() => setDetailScene(currentScene)}
            style={{
              width: '100%', borderRadius: 16, overflow: 'hidden',
              background: 'white', border: '1px solid rgba(0,0,0,0.06)',
              cursor: 'pointer', marginBottom: 20, padding: 0,
            }}
          >
            <div style={{ position: 'relative', height: 120, overflow: 'hidden' }}>
              <img
                src={SCENES[currentScene].background}
                alt={SCENES[currentScene].name}
                loading="lazy"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
              <div style={{
                position: 'absolute', bottom: 0, left: 0, right: 0,
                padding: '20px 12px 8px',
                background: 'linear-gradient(transparent, rgba(0,0,0,0.6))',
              }}>
                <span style={{ color: '#fff', fontSize: 15, fontWeight: 600 }}>
                  {SCENES[currentScene].icon} {SCENES[currentScene].name}
                </span>
                <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginLeft: 8 }}>
                  {SCENES[currentScene].atmosphere}
                </span>
              </div>
            </div>
          </button>
        </>
      )}

      {/* ── 场景网格 (2列) ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        🗺️ 探索地点
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {Object.values(SCENES).map((s) => {
          const locked = !unlockedScenes.includes(s.id)
          const active = s.id === currentScene

          return (
            <button
              key={s.id}
              onClick={() => !locked && setDetailScene(s.id)}
              disabled={locked}
              style={{
                display: 'flex', flexDirection: 'column',
                borderRadius: 12, overflow: 'hidden',
                background: 'white',
                border: active ? '2px solid var(--primary)' : '1px solid rgba(0,0,0,0.06)',
                cursor: locked ? 'not-allowed' : 'pointer',
                opacity: locked ? 0.4 : 1,
                padding: 0,
                transition: 'all 0.2s',
              }}
            >
              {/* Scene thumbnail */}
              <div style={{ height: 80, overflow: 'hidden', position: 'relative' }}>
                <img
                  src={s.background}
                  alt={s.name}
                  loading="lazy"
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {locked && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'rgba(0,0,0,0.4)',
                    fontSize: 20,
                  }}>
                    🔒
                  </div>
                )}
                {active && (
                  <span style={{
                    position: 'absolute', top: 4, right: 4,
                    fontSize: 9, padding: '1px 6px', borderRadius: 8,
                    background: 'var(--primary)', color: '#fff', fontWeight: 600,
                  }}>
                    当前
                  </span>
                )}
              </div>
              {/* Scene info */}
              <div style={{ padding: '6px 8px', textAlign: 'left' }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text-primary)' }}>
                  {s.icon} {s.name}
                </div>
                <div style={{
                  fontSize: 10, color: 'var(--text-muted)',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {s.tags.join(' · ')}
                </div>
              </div>
            </button>
          )
        })}
      </div>

      <div style={{ height: 16 }} />

      {/* ── Scene Detail Overlay ── */}
      <AnimatePresence>
        {detailScene && SCENES[detailScene] && (
          <SceneDetail
            sceneId={detailScene}
            onClose={() => setDetailScene(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
