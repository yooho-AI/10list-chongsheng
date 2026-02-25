/**
 * [INPUT]: 依赖 @/lib/store 的 useGameStore, @/lib/highlight 的全部导出
 * [OUTPUT]: 对外提供 HighlightModal 组件
 * [POS]: 高光时刻弹窗，5阶段：分析→选择→风格→生成→结果
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useGameStore } from '@/lib/store'
import {
  analyzeHighlights,
  generateImage,
  generateVideo,
  queryVideoTask,
  buildImagePrompt,
  buildVideoPrompt,
  HIGHLIGHT_TYPES,
  COMIC_STYLES,
  VIDEO_STYLES,
  type Highlight,
  type ComicStyle,
  type VideoStyle,
} from '@/lib/highlight'

// ── 常量 ──────────────────────────────────────────────────────
const PRIMARY = '#ff6b9d'
const PRIMARY_DARK = '#e91e8c'

type Phase = 'analyzing' | 'select' | 'style' | 'generating' | 'result'

export default function HighlightModal({ onClose }: { onClose: () => void }) {
  const messages = useGameStore((s) => s.messages)

  const [phase, setPhase] = useState<Phase>('analyzing')
  const [highlights, setHighlights] = useState<Highlight[]>([])
  const [selected, setSelected] = useState<Highlight | null>(null)
  const [outputType, setOutputType] = useState<'comic' | 'video'>('comic')
  const [resultUrl, setResultUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  // ── 启动分析 ──────────────────────────────────────────────
  useState(() => {
    const dialogues = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({ role: m.role, content: m.content }))

    analyzeHighlights(dialogues).then((result) => {
      if (result.length > 0) {
        setHighlights(result)
        setPhase('select')
      } else {
        setError('未能提取高光片段，请继续对话后重试')
      }
    }).catch(() => {
      setError('分析失败，请稍后重试')
    })
  })

  // ── 生成漫画 ──────────────────────────────────────────────
  const handleGenerateComic = async (style: ComicStyle) => {
    if (!selected) return
    setPhase('generating')
    setError(null)

    try {
      const prompt = buildImagePrompt(selected, style)
      const url = await generateImage(prompt)
      setResultUrl(url)
      setPhase('result')
    } catch (e) {
      setError(e instanceof Error ? e.message : '图片生成失败')
      setPhase('style')
    }
  }

  // ── 生成视频 ──────────────────────────────────────────────
  const handleGenerateVideo = async (style: VideoStyle) => {
    if (!selected) return
    setPhase('generating')
    setError(null)

    try {
      const imgPrompt = buildImagePrompt(selected, 'shoujo')
      const imageUrl = await generateImage(imgPrompt)

      const videoPrompt = buildVideoPrompt(selected, style)
      const { taskId, videoUrl, error: videoErr } = await generateVideo(videoPrompt, imageUrl)

      if (videoErr) throw new Error(videoErr)
      if (videoUrl) {
        setResultUrl(videoUrl)
        setPhase('result')
        return
      }

      if (taskId) {
        for (let i = 0; i < 60; i++) {
          await new Promise((r) => setTimeout(r, 3000))
          const status = await queryVideoTask(taskId)
          if (status.status === 'succeeded' && status.videoUrl) {
            setResultUrl(status.videoUrl)
            setPhase('result')
            return
          }
          if (status.status === 'failed') {
            throw new Error(status.error || '视频生成失败')
          }
        }
        throw new Error('视频生成超时')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败')
      setPhase('style')
    }
  }

  // ── 渲染 ──────────────────────────────────────────────────
  return (
    <div className="cs-overlay" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="cs-modal"
        style={{
          maxWidth: 440, maxHeight: '85vh', overflow: 'auto',
          background: '#fff', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.12)',
          padding: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ── 标题栏 ─────────────────────────────────────── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
            ✨ 高光时刻
          </h2>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#999' }}
          >
            ✕
          </button>
        </div>

        {/* ── 错误提示 ───────────────────────────────────── */}
        {error && (
          <div style={{ padding: 10, borderRadius: 8, background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontSize: 12, marginBottom: 12 }}>
            {error}
          </div>
        )}

        {/* ── 分析中 ────────────────────────────────────── */}
        {phase === 'analyzing' && (
          <div style={{ textAlign: 'center', padding: 32, color: '#888', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8, animation: 'spin 1.2s linear infinite' }}>🔍</div>
            分析中...
          </div>
        )}

        {/* ── 选择片段 ───────────────────────────────────── */}
        {phase === 'select' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 4 }}>选择一个高光片段</div>
            {highlights.map((h) => {
              const typeInfo = HIGHLIGHT_TYPES[h.type]
              return (
                <button
                  key={h.highlightId}
                  onClick={() => { setSelected(h); setPhase('style') }}
                  style={{
                    textAlign: 'left', padding: 12, borderRadius: 10,
                    border: '1px solid #eee', background: '#fafafa',
                    cursor: 'pointer', transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = typeInfo.color }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#eee' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <span>{typeInfo.icon}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, color: '#1a1a2e' }}>{h.title}</span>
                    <span style={{ fontSize: 11, color: typeInfo.color, marginLeft: 'auto' }}>{typeInfo.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#666', lineHeight: 1.5 }}>{h.summary}</div>
                </button>
              )
            })}
          </div>
        )}

        {/* ── 风格选择 ───────────────────────────────────── */}
        {phase === 'style' && selected && (
          <div>
            <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
              已选: <strong style={{ color: '#1a1a2e' }}>{selected.title}</strong> — 选择生成类型
            </div>

            {/* 漫画 / 视频 切换 */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              {(['comic', 'video'] as const).map((type) => (
                <button
                  key={type}
                  onClick={() => setOutputType(type)}
                  style={{
                    flex: 1, padding: 8, borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: outputType === type
                      ? `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`
                      : '#f0f0f0',
                    color: outputType === type ? '#fff' : '#666',
                    fontWeight: 600, fontSize: 13,
                  }}
                >
                  {type === 'comic' ? '🎨 漫画' : '🎬 视频'}
                </button>
              ))}
            </div>

            {/* 风格网格 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {outputType === 'comic'
                ? Object.entries(COMIC_STYLES).map(([key, style]) => (
                    <button
                      key={key}
                      onClick={() => handleGenerateComic(key as ComicStyle)}
                      style={{
                        padding: 10, borderRadius: 8, border: '1px solid #eee',
                        background: '#fafafa', cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{style.label}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{style.desc}</div>
                    </button>
                  ))
                : Object.entries(VIDEO_STYLES).map(([key, style]) => (
                    <button
                      key={key}
                      onClick={() => handleGenerateVideo(key as VideoStyle)}
                      style={{
                        padding: 10, borderRadius: 8, border: '1px solid #eee',
                        background: '#fafafa', cursor: 'pointer', textAlign: 'center',
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#1a1a2e' }}>{style.label}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{style.desc}</div>
                    </button>
                  ))}
            </div>
          </div>
        )}

        {/* ── 生成中 ────────────────────────────────────── */}
        {phase === 'generating' && (
          <div style={{ textAlign: 'center', padding: 32, color: '#888', fontSize: 13 }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🎨</div>
            {outputType === 'video' ? '正在生成视频，这可能需要1-3分钟...' : '正在生成漫画...'}
          </div>
        )}

        {/* ── 结果展示 ───────────────────────────────────── */}
        {phase === 'result' && resultUrl && (
          <div style={{ textAlign: 'center' }}>
            {outputType === 'comic' ? (
              <img
                src={resultUrl}
                alt="高光时刻"
                style={{ width: '100%', borderRadius: 10, marginBottom: 12 }}
              />
            ) : (
              <video
                src={resultUrl}
                controls
                autoPlay
                loop
                style={{ width: '100%', borderRadius: 10, marginBottom: 12 }}
              />
            )}
            <a
              href={resultUrl}
              download
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-block', padding: '8px 20px', borderRadius: 99,
                background: `linear-gradient(135deg, ${PRIMARY}, ${PRIMARY_DARK})`,
                color: '#fff', fontSize: 13, fontWeight: 600,
                textDecoration: 'none',
              }}
            >
              ⬇️ 下载保存
            </a>
          </div>
        )}
      </motion.div>
    </div>
  )
}
