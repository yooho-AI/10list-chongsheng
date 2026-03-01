/**
 * [INPUT]: marked (Markdown渲染)，无项目内依赖（避免循环引用 data.ts）
 * [OUTPUT]: parseStoryParagraph (narrative + statHtml + charColor), extractChoices (cleanContent + choices)
 * [POS]: lib AI 回复解析层，Markdown 渲染 + charColor 驱动气泡左边框 + 选项提取
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { marked } from 'marked'

// ── 角色名 → 主题色（手动同步 data.ts，不 import 避免循环依赖） ──

const CHARACTER_COLORS: Record<string, string> = {
  '林小满': '#ec4899',
  '小满': '#ec4899',
  '王建国': '#3b82f6',
  '建国': '#3b82f6',
  '围观学生': '#a855f7',
}

// ── 数值标签 → 颜色 ──

const STAT_COLORS: Record<string, string> = {
  '羁绊': '#ec4899',
  '羁绊度': '#ec4899',
  '恐慌': '#ef4444',
  '体力': '#10b981',
  '好感': '#3b82f6',
  '好感度': '#3b82f6',
  '耐心': '#f59e0b',
  '围观': '#a855f7',
  '社死': '#f97316',
  '社死值': '#f97316',
  '分贝': '#ff6b9d',
  '哭声': '#ff6b9d',
}

// ── 工具函数 ──

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function colorizeStats(line: string): string {
  let html = line

  for (const [label, color] of Object.entries(STAT_COLORS)) {
    html = html.replaceAll(
      label,
      `<span class="stat-change" style="color:${color};font-weight:600">${label}</span>`,
    )
  }

  for (const [name] of Object.entries(CHARACTER_COLORS)) {
    html = html.replaceAll(
      name,
      `<span class="char-name">${name}</span>`,
    )
  }

  html = html.replace(
    /(\+\d+[万%]?)/g,
    '<span class="stat-up">$1</span>',
  )
  html = html.replace(
    /(-\d+[万%]?)/g,
    '<span class="stat-down">$1</span>',
  )

  return html
}

function colorizeCharNames(html: string): string {
  let result = html
  for (const [name] of Object.entries(CHARACTER_COLORS)) {
    result = result.replaceAll(
      name,
      `<span class="char-name">${name}</span>`,
    )
  }
  return result
}

// ── 选项提取 ──

export function extractChoices(content: string): {
  cleanContent: string
  choices: string[]
} {
  const lines = content.split('\n')
  const choices: string[] = []
  let choiceStartIdx = lines.length

  for (let i = lines.length - 1; i >= 0; i--) {
    const trimmed = lines[i].trim()
    if (!trimmed && choices.length > 0) continue
    if (!trimmed && choices.length === 0) continue

    if (/^[1-4][\.、．]\s*.+/.test(trimmed) || /^[A-Da-d][\.、．]\s*.+/.test(trimmed)) {
      choices.unshift(trimmed.replace(/^[1-4A-Da-d][\.、．]\s*/, ''))
      choiceStartIdx = i
    } else {
      break
    }
  }

  if (choices.length < 2) return { cleanContent: content, choices: [] }

  let cutIdx = choiceStartIdx
  if (cutIdx > 0) {
    const prevLine = lines[cutIdx - 1].trim()
    if (/选择|选项|你可以|接下来|你的行动/.test(prevLine)) {
      cutIdx -= 1
    }
  }

  if (cutIdx > 0 && !lines[cutIdx - 1].trim()) {
    cutIdx -= 1
  }

  return {
    cleanContent: lines.slice(0, cutIdx).join('\n').trim(),
    choices,
  }
}

// ── 主解析函数 ──

export function parseStoryParagraph(content: string): {
  narrative: string
  statHtml: string
  charColor: string | null
} {
  const lines = content.split('\n')
  const narrativeLines: string[] = []
  const statParts: string[] = []
  let charColor: string | null = null

  for (const raw of lines) {
    const line = raw.trim()

    if (!line) { narrativeLines.push(''); continue }

    // 纯数值变化行：【好感度+10 羁绊-5】
    if (/^[【\[][^】\]]*[+-]\d+[^】\]]*[】\]]$/.test(line)) {
      statParts.push(colorizeStats(line))
      continue
    }

    // 获得物品
    if (line.startsWith('【获得') || line.startsWith('[获得')) {
      statParts.push(`<div class="item-gain">${escapeHtml(line)}</div>`)
      continue
    }

    // Detect charColor from 【角色名】 pattern
    if (!charColor) {
      const charMatch = line.match(/^[【\[]([^\]】]+)[】\]]/)
      if (charMatch) {
        charColor = CHARACTER_COLORS[charMatch[1]] || null
      }
    }

    narrativeLines.push(raw)
  }

  const rawNarrative = narrativeLines.join('\n').trim()
  const html = rawNarrative ? (marked.parse(rawNarrative, { breaks: true, gfm: true }) as string) : ''

  const narrative = colorizeCharNames(html)

  // Fallback: detect charColor from any character name in content
  if (!charColor) {
    for (const [name, color] of Object.entries(CHARACTER_COLORS)) {
      if (content.includes(name)) {
        charColor = color
        break
      }
    }
  }

  return {
    narrative,
    statHtml: statParts.length > 0
      ? `<div class="stat-changes">${statParts.join('')}</div>`
      : '',
    charColor,
  }
}
