/**
 * [INPUT]: 依赖 @/lib/store 的 useGameStore, SCENES, getAvailableCharacters, getStatLevel
 * [OUTPUT]: 对外提供 LeftPanel 组件
 * [POS]: PC 端左侧面板：场景卡+立绘+信息+社死值+角色列表
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useGameStore, SCENES, getAvailableCharacters, getStatLevel } from '@/lib/store'

// ============================================================
// 场景卡片 — 16:9 白底明亮
// ============================================================

function SceneCard() {
  const currentScene = useGameStore((s) => s.currentScene)
  const scene = SCENES[currentScene]

  return (
    <div className="cs-card cs-scene-card">
      {scene?.background ? (
        <img src={scene.background} alt={scene.name} />
      ) : (
        <div className="cs-placeholder" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
          <span className="cs-placeholder-icon">🚽</span>
        </div>
      )}
      <div className="cs-scene-tag">
        <span style={{ fontSize: 14 }}>{scene?.icon || '📍'}</span>
        {scene?.name || '女厕隔间'}
      </div>
    </div>
  )
}

// ============================================================
// 场景选择器
// ============================================================
function SceneSelector() {
  const currentScene = useGameStore((s) => s.currentScene)
  const selectScene = useGameStore((s) => s.selectScene)

  return (
    <div className="cs-card">
      <div className="cs-scene-selector">
        {Object.entries(SCENES).map(([id, scene]) => {
          const active = currentScene === id
          return (
            <button
              key={id}
              className={`cs-scene-item${active ? ' active' : ''}`}
              onClick={() => selectScene(id)}
            >
              <span style={{ fontSize: 14 }}>{scene.icon}</span>
              {scene.name}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 角色立绘卡片 — 3:4
// ============================================================
function PortraitCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const char = currentCharacter ? characters[currentCharacter] : null

  return (
    <div className="cs-card cs-portrait-card">
      {char ? (
        <img src={char.fullImage} alt={char.name} />
      ) : (
        <div className="cs-placeholder" style={{ background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)' }}>
          <span className="cs-placeholder-icon">👶</span>
          <span className="cs-placeholder-text">选择角色开始</span>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 数值条
// ============================================================
function StatBar({ label, value, color, icon }: { label: string; value: number; color: string; icon: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
      <span style={{ fontSize: 12, width: 16, flexShrink: 0, textAlign: 'center' }}>{icon}</span>
      <span style={{ fontSize: 11, color: 'var(--text-muted)', width: 32, flexShrink: 0 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
        <div
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            height: '100%',
            background: color,
            borderRadius: 3,
            transition: 'width 0.3s ease',
          }}
        />
      </div>
      <span style={{ fontSize: 11, color: 'var(--text-secondary)', width: 24, textAlign: 'right', flexShrink: 0 }}>
        {value}
      </span>
    </div>
  )
}

// ============================================================
// 角色信息 + 按 category 分组渲染数值条
// ============================================================
const categories = ['relation', 'status', 'skill'] as const
const categoryLabels: Record<string, string> = { relation: '关系', status: '状态', skill: '技能' }

function InfoCard() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const char = currentCharacter ? characters[currentCharacter] : null

  if (!char) return null

  const stats = characterStats[char.id]
  const firstStatKey = char.statMetas[0]?.key
  const level = getStatLevel(stats?.[firstStatKey] ?? 0)

  const grouped = categories
    .map((cat) => ({
      category: cat,
      label: categoryLabels[cat],
      metas: char.statMetas.filter((m) => m.category === cat),
    }))
    .filter((g) => g.metas.length > 0)

  return (
    <div className="cs-card cs-info-card">
      <div className="cs-info-title">
        {char.gender === 'female' ? '🚺' : '🚹'} {char.name}
        <span style={{ fontSize: 11, fontWeight: 400, color: 'var(--text-muted)', marginLeft: 8 }}>
          {level.name}
        </span>
      </div>
      <div className="cs-info-meta">
        <span>{char.age}岁</span>
        <span style={{ color: 'var(--text-muted)' }}>·</span>
        <span>{char.title}</span>
      </div>
      <div className="cs-info-desc">{char.description}</div>

      {/* 按 category 分组数值条 */}
      {stats && grouped.map((group) => (
        <div key={group.category} style={{ marginTop: 8 }}>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4, letterSpacing: 1 }}>
            {group.label}
          </div>
          {group.metas.map((meta) => (
            <StatBar key={meta.key} label={meta.label} value={stats?.[meta.key] ?? 0} color={meta.color} icon={meta.icon} />
          ))}
        </div>
      ))}
    </div>
  )
}

// ============================================================
// 社死值计量器 — >=80 时脉冲预警
// ============================================================
function SocialDeathMeter() {
  const socialDeath = useGameStore((s) => s.socialDeath)
  const isWarning = socialDeath >= 80

  return (
    <div className={`cs-card${isWarning ? ' cs-pulse-warning' : ''}`} style={{ padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span>😳</span>
        <span style={{ color: 'var(--text-secondary)' }}>社死值</span>
        <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              width: `${socialDeath}%`,
              height: '100%',
              background: isWarning ? '#ef4444' : '#f97316',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: isWarning ? '#ef4444' : 'var(--text-primary)', width: 28, textAlign: 'right' }}>
          {socialDeath}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// 哭声分贝计量器
// ============================================================
function CryDecibelMeter() {
  const cryDecibel = useGameStore((s) => s.cryDecibel)

  return (
    <div className="cs-card" style={{ padding: '8px 12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
        <span>🔊</span>
        <span style={{ color: 'var(--text-secondary)' }}>分贝</span>
        <div style={{ flex: 1, height: 6, background: 'var(--bg-secondary)', borderRadius: 3, overflow: 'hidden' }}>
          <div
            style={{
              width: `${cryDecibel}%`,
              height: '100%',
              background: cryDecibel >= 80 ? '#8b5cf6' : '#3b82f6',
              borderRadius: 3,
              transition: 'width 0.3s ease',
            }}
          />
        </div>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', width: 28, textAlign: 'right' }}>
          {cryDecibel}
        </span>
      </div>
    </div>
  )
}

// ============================================================
// 角色选择列表
// ============================================================
function CharacterList() {
  const currentCharacter = useGameStore((s) => s.currentCharacter)
  const currentChapter = useGameStore((s) => s.currentChapter)
  const characters = useGameStore((s) => s.characters)
  const characterStats = useGameStore((s) => s.characterStats)
  const selectCharacter = useGameStore((s) => s.selectCharacter)

  const available = getAvailableCharacters(currentChapter, characters)

  return (
    <div className="cs-card" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>角色</span>
        <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          {Object.keys(available).length}人
        </span>
      </div>
      <div className="cs-char-list" style={{ flex: 1 }}>
        {Object.entries(available).map(([charId, char]) => {
          const stats = characterStats[charId]
          const firstMeta = char.statMetas[0]
          const firstStatValue = stats?.[firstMeta?.key] ?? 0

          return (
            <button
              key={charId}
              className={`cs-char-item ${currentCharacter === charId ? 'active' : ''}`}
              onClick={() => selectCharacter(currentCharacter === charId ? null : charId)}
            >
              <span style={{ flex: 1, color: currentCharacter === charId ? char.themeColor : undefined }}>
                {char.name}
              </span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flexShrink: 0 }}>
                {firstMeta?.icon}{firstStatValue}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================================
// 左侧面板主组件
// ============================================================
export default function LeftPanel() {
  return (
    <div
      className="cs-scrollbar"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        padding: '12px 0 12px 12px',
        height: '100%',
        background: 'var(--bg-secondary)',
        overflowY: 'auto',
      }}
    >
      <SceneCard />
      <SceneSelector />
      <PortraitCard />
      <InfoCard />
      <SocialDeathMeter />
      <CryDecibelMeter />
      <CharacterList />
    </div>
  )
}
