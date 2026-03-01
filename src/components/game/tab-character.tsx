/**
 * [INPUT]: 依赖 store.ts 状态（角色/属性）
 * [OUTPUT]: 对外提供 TabCharacter 组件
 * [POS]: 人物Tab：立绘 + 异构属性 + SVG关系图 + 角色列表 + 全屏档案
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  useGameStore,
  type Character,
  getStatLevel,
} from '@/lib/store'

const P = 'cs'

// ── Relation Graph (SVG) ────────────────────────────

function RelationGraph({
  characters,
  characterStats,
  playerName,
  onSelect,
}: {
  characters: Record<string, Character>
  characterStats: Record<string, Record<string, number>>
  playerName: string
  onSelect: (id: string) => void
}) {
  const entries = Object.entries(characters)
  const cx = 150
  const cy = 150
  const radius = 110

  return (
    <svg viewBox="0 0 300 300" style={{ width: '100%', maxWidth: 300, margin: '0 auto', display: 'block' }}>
      <circle cx={cx} cy={cy} r={28} fill="white" stroke="var(--primary)" strokeWidth={2} />
      <text x={cx} y={cy + 5} textAnchor="middle" fill="var(--primary)" fontSize={12} fontWeight={600}>
        {playerName || '我'}
      </text>

      {entries.map(([id, char], i) => {
        const angle = (i / entries.length) * Math.PI * 2 - Math.PI / 2
        const nx = cx + radius * Math.cos(angle)
        const ny = cy + radius * Math.sin(angle)
        const stats = characterStats[id] || {}
        const primaryKey = char.statMetas[0]?.key || 'favor'
        const primaryVal = stats[primaryKey] ?? 0
        const level = getStatLevel(primaryVal)

        return (
          <g key={id} onClick={() => onSelect(id)} style={{ cursor: 'pointer' }}>
            <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={char.themeColor} strokeWidth={1.5} opacity={0.4} />
            <text
              x={(cx + nx) / 2}
              y={(cy + ny) / 2 - 6}
              textAnchor="middle"
              fill={char.themeColor}
              fontSize={9}
              fontWeight={500}
            >
              {level.name}
            </text>
            <circle cx={nx} cy={ny} r={22} fill="white" stroke={char.themeColor} strokeWidth={2} />
            <clipPath id={`clip-${id}`}>
              <circle cx={nx} cy={ny} r={20} />
            </clipPath>
            <image
              href={char.portrait}
              x={nx - 20} y={ny - 20}
              width={40} height={40}
              clipPath={`url(#clip-${id})`}
              preserveAspectRatio="xMidYMin slice"
            />
          </g>
        )
      })}
    </svg>
  )
}

// ── Character Dossier (Full-screen) ─────────────────

function CharacterDossier({
  char,
  stats,
  onClose,
}: {
  char: Character
  stats: Record<string, number>
  onClose: () => void
}) {
  const primaryKey = char.statMetas[0]?.key || 'favor'
  const primaryVal = stats[primaryKey] ?? 0
  const level = getStatLevel(primaryVal)

  return (
    <motion.div
      className={`${P}-dossier`}
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

      {/* Portrait */}
      <motion.div
        style={{ height: '50vh', overflow: 'hidden', position: 'relative' }}
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
      >
        <img
          src={char.portrait}
          alt={char.name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
        />
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: '40%',
          background: 'linear-gradient(transparent, #fef7ff)',
        }} />
      </motion.div>

      {/* Info */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 4 }}>
          <span style={{ fontSize: 24, fontWeight: 700, color: char.themeColor }}>
            {char.name}
          </span>
          <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {char.title} · {char.age}岁
          </span>
        </div>

        {/* Level stage */}
        <div style={{
          display: 'inline-block', padding: '2px 10px', borderRadius: 12,
          background: `${char.themeColor}20`, color: char.themeColor,
          fontSize: 12, fontWeight: 600, marginBottom: 12,
        }}>
          {level.name}
        </div>

        {/* All stat bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          {char.statMetas.map((meta) => {
            const val = stats[meta.key] ?? 0
            return (
              <div key={meta.key}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{meta.icon} {meta.label}</span>
                  <span style={{ fontSize: 12, fontWeight: 600, color: meta.color }}>{val}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'rgba(0,0,0,0.06)', overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(0, val)}%` }}
                    transition={{ duration: 0.8, delay: 0.2 }}
                    style={{ height: '100%', borderRadius: 3, background: meta.color }}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Description */}
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 16 }}>
          {char.description}
        </p>

        {/* Personality */}
        <div style={{
          padding: 12, borderRadius: 12, background: 'white',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>性格特征</div>
          <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}>
            {char.personality}
          </p>
        </div>
      </div>
    </motion.div>
  )
}

// ── Main Component ──────────────────────────────────

export default function TabCharacter() {
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const socialDeath = useGameStore((s) => s.socialDeath)
  const cryDecibel = useGameStore((s) => s.cryDecibel)
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const selectCharacter = useGameStore((s) => s.selectCharacter)
  const playerName = useGameStore((s) => s.playerName)

  const [dossierChar, setDossierChar] = useState<string | null>(null)

  const selectedChar = currentCharacter ? characters[currentCharacter] : null

  const handleNodeSelect = (id: string) => {
    selectCharacter(id)
    setDossierChar(id)
  }

  return (
    <div className={`${P}-scrollbar`} style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      {/* ── 当前角色立绘 ── */}
      {selectedChar && (
        <div
          style={{
            borderRadius: 16, overflow: 'hidden', marginBottom: 16,
            position: 'relative', aspectRatio: '9/16', maxHeight: 320,
          }}
          onClick={() => setDossierChar(currentCharacter)}
        >
          <img
            src={selectedChar.portrait}
            alt={selectedChar.name}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top' }}
          />
          <div style={{
            position: 'absolute', bottom: 0, left: 0, right: 0,
            padding: '24px 12px 12px',
            background: 'linear-gradient(transparent, rgba(0,0,0,0.8))',
          }}>
            <div style={{ fontSize: 18, fontWeight: 600, color: selectedChar.themeColor }}>
              {selectedChar.name}
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)' }}>
              {selectedChar.title} · {selectedChar.age}岁
            </div>
          </div>
        </div>
      )}

      {/* ── 全局数值面板 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        📊 全局数值
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {[
          { label: '社死值', value: socialDeath, max: 100, color: '#e91e8c', icon: '😳' },
          { label: '哭声分贝', value: cryDecibel, max: 100, color: '#3b82f6', icon: '🔊' },
        ].map((stat) => (
          <div key={stat.label} style={{
            padding: 10, borderRadius: 12, background: 'white', border: '1px solid var(--border)',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{stat.icon} {stat.label}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: stat.color }}>{stat.value}</span>
            </div>
            <div style={{ height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.06)' }}>
              <div style={{
                height: '100%', borderRadius: 2, background: stat.color,
                width: `${(stat.value / stat.max) * 100}%`, transition: 'width 0.5s ease',
              }} />
            </div>
          </div>
        ))}
      </div>

      {/* ── NPC 属性（异构） ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        💗 角色关系
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 20 }}>
        {Object.entries(characters).map(([id, char], i) => {
          const stats = characterStats[id] || {}
          return (
            <motion.div
              key={id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '8px 12px', borderRadius: 12,
                background: 'white', border: '1px solid var(--border)', cursor: 'pointer',
              }}
              onClick={() => handleNodeSelect(id)}
            >
              <img
                src={char.portrait}
                alt={char.name}
                style={{
                  width: 36, height: 36, borderRadius: '50%',
                  objectFit: 'cover', objectPosition: 'center top',
                  border: `2px solid ${char.themeColor}44`,
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: char.themeColor, marginBottom: 4 }}>
                  {char.name}
                </div>
                {char.statMetas.map((meta) => (
                  <div key={meta.key} style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 24 }}>{meta.label}</span>
                    <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(0,0,0,0.06)' }}>
                      <div style={{
                        height: '100%', borderRadius: 2, background: meta.color,
                        width: `${Math.max(0, stats[meta.key] ?? 0)}%`, transition: 'width 0.5s ease',
                      }} />
                    </div>
                    <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 18, textAlign: 'right' }}>
                      {stats[meta.key] ?? 0}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          )
        })}
      </div>

      {/* ── 关系图 ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        🕸️ 关系网络
      </h4>
      <div style={{
        padding: 12, borderRadius: 16, background: 'white',
        border: '1px solid var(--border)', marginBottom: 20,
      }}>
        <RelationGraph
          characters={characters}
          characterStats={characterStats}
          playerName={playerName}
          onSelect={handleNodeSelect}
        />
      </div>

      <div style={{ height: 16 }} />

      {/* ── Character Dossier ── */}
      <AnimatePresence>
        {dossierChar && characters[dossierChar] && (
          <CharacterDossier
            char={characters[dossierChar]}
            stats={characterStats[dossierChar] || {}}
            onClose={() => setDossierChar(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
