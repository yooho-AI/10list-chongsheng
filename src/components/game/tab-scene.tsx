/**
 * [INPUT]: 依赖 store.ts 状态（场景/解锁），data.ts 场景常量
 * [OUTPUT]: 对外提供 TabScene 组件
 * [POS]: 场景 Tab：场景大图(9:16) + 描述 + 地点列表
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useGameStore, SCENES } from '@/lib/store'

const P = 'cs'

export default function TabScene() {
  const currentScene = useGameStore((s) => s.currentScene)
  const unlockedScenes = useGameStore((s) => s.unlockedScenes)
  const selectScene = useGameStore((s) => s.selectScene)

  const scene = SCENES[currentScene]

  return (
    <div
      className={`${P}-scrollbar`}
      style={{ height: '100%', overflow: 'auto', padding: 12 }}
    >
      {/* ── 场景大图 ── */}
      {scene && (
        <div className={`${P}-scene-hero`}>
          <img
            src={scene.background}
            alt={scene.name}
            loading="lazy"
            style={{ aspectRatio: '9/16', objectFit: 'cover', width: '100%' }}
          />
          <div className={`${P}-scene-hero-overlay`}>
            <div style={{ fontSize: 18, fontWeight: 600 }}>
              {scene.icon} {scene.name}
            </div>
            <p style={{ fontSize: 13, opacity: 0.9, marginTop: 4 }}>
              {scene.atmosphere}
            </p>
          </div>
        </div>
      )}

      {/* ── 场景描述 ── */}
      {scene && (
        <p style={{
          fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6,
          padding: '12px 4px', marginBottom: 16,
        }}>
          {scene.description}
        </p>
      )}

      {/* ── 探索地点 ── */}
      <h4 style={{
        fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)',
        marginBottom: 8, paddingLeft: 4,
      }}>
        📍 探索地点
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {Object.values(SCENES).map((s) => {
          const locked = !unlockedScenes.includes(s.id)
          const active = s.id === currentScene

          return (
            <button
              key={s.id}
              className={`${P}-location-tag ${active ? `${P}-location-active` : ''}`}
              onClick={() => !locked && selectScene(s.id)}
              disabled={locked}
              style={{ opacity: locked ? 0.4 : 1 }}
            >
              <span style={{ fontSize: 20 }}>{s.icon}</span>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: 14, fontWeight: 500 }}>
                  {s.name}
                  {locked && <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 6 }}>🔒</span>}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                  {s.tags.join(' · ')}
                </div>
              </div>
              {active && (
                <span style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>
                  当前
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div style={{ height: 16 }} />
    </div>
  )
}
