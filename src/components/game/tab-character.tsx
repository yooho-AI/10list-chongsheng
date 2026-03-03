/**
 * [INPUT]: 依赖 store.ts 状态（角色/属性）
 * [OUTPUT]: 对外提供 TabCharacter 组件
 * [POS]: 人物Tab：2x2角色网格(聊天按钮+mini好感条) + SVG关系图 + CharacterDossier 全屏档案 + CharacterChat 私聊
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChatCircleDots } from '@phosphor-icons/react'
import {
  useGameStore,
  type Character,
  getStatLevel,
} from '@/lib/store'
import CharacterChat from './character-chat'

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

// ── Character Dossier (overlay+sheet) ─────────────────

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
    </>
  )
}

// ── Main Component ──────────────────────────────────

export default function TabCharacter() {
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const playerName = useGameStore((s) => s.playerName)

  const [dossierChar, setDossierChar] = useState<string | null>(null)
  const [chatChar, setChatChar] = useState<string | null>(null)

  return (
    <div className={`${P}-scrollbar`} style={{ height: '100%', overflow: 'auto', padding: 12 }}>
      {/* ── 角色网格 (2×2) ── */}
      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, paddingLeft: 4 }}>
        👶 重生同伴
      </h4>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
        {Object.entries(characters).map(([id, char]) => {
          const stats = characterStats[id] || {}
          const primaryKey = char.statMetas[0]?.key || 'favor'
          const primaryVal = stats[primaryKey] ?? 0
          const level = getStatLevel(primaryVal)
          return (
            <button
              key={id}
              onClick={() => setDossierChar(id)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                padding: 10, borderRadius: 12,
                background: 'white',
                border: '1px solid var(--border)',
                cursor: 'pointer', transition: 'all 0.2s',
                position: 'relative',
              }}
            >
              {/* 聊天按钮 */}
              <div
                onClick={(e) => { e.stopPropagation(); setChatChar(id) }}
                style={{
                  position: 'absolute', top: 6, left: 6,
                  width: 28, height: 28, borderRadius: '50%',
                  background: `${char.themeColor}18`,
                  border: `1px solid ${char.themeColor}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', zIndex: 1,
                }}
              >
                <ChatCircleDots size={16} weight="fill" color={char.themeColor} />
              </div>
              <img
                src={char.portrait}
                alt={char.name}
                style={{
                  width: 56, height: 56, borderRadius: '50%',
                  objectFit: 'cover', objectPosition: 'center top',
                  border: `2px solid ${char.themeColor}44`,
                  marginBottom: 6,
                }}
              />
              <span style={{ fontSize: 12, fontWeight: 500, color: char.themeColor }}>
                {char.name}
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>
                {char.title}
              </span>
              {/* Mini affection bar */}
              <div style={{ width: '80%', height: 3, borderRadius: 2, background: 'rgba(0,0,0,0.06)' }}>
                <div style={{
                  height: '100%', borderRadius: 2, background: char.themeColor,
                  width: `${primaryVal}%`, transition: 'width 0.5s ease',
                }} />
              </div>
              <span style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 2 }}>
                {level.name} {primaryVal}
              </span>
            </button>
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
          onSelect={(id) => setDossierChar(id)}
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

      {/* ── Character Chat ── */}
      <AnimatePresence>
        {chatChar && characters[chatChar] && (
          <CharacterChat charId={chatChar} onClose={() => setChatChar(null)} />
        )}
      </AnimatePresence>
    </div>
  )
}
