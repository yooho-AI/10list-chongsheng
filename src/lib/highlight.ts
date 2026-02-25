/**
 * [INPUT]: 依赖 @/lib/stream 的 chat
 * [OUTPUT]: 对外提供高光分析/生成函数及风格常量
 * [POS]: lib 的高光时刻 API 封装，被 highlight-modal 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

import { chat } from './stream'

// ============================================================
// 类型
// ============================================================

export type HighlightType = 'bond' | 'conflict' | 'growth' | 'crisis'
export type VideoStyle = 'absurd' | 'anime' | 'drama' | 'pixel'
export type ComicStyle = 'shoujo' | 'shounen' | 'webtoon' | 'doodle'

export interface Highlight {
  highlightId: string
  title: string
  summary: string
  type: HighlightType
  characters: { id: string; name: string }[]
  emotionalScore: number
}

// ============================================================
// 风格常量 — 荒诞婴儿主题 #ff6b9d
// ============================================================

export const HIGHLIGHT_TYPES: Record<HighlightType, { icon: string; label: string; color: string }> = {
  bond: { icon: '💕', label: '羁绊共鸣', color: '#ff6b9d' },
  conflict: { icon: '⚡', label: '名场面', color: '#ef4444' },
  growth: { icon: '🌟', label: '逆袭时刻', color: '#ffd700' },
  crisis: { icon: '🔥', label: '社死危机', color: '#f97316' },
}

export const VIDEO_STYLES: Record<VideoStyle, { label: string; desc: string; prompt: string }> = {
  absurd: { label: '荒诞喜剧', desc: '夸张表情、漫画式表现', prompt: '荒诞喜剧风格，夸张表情表演，漫画式构图，中国职高校园' },
  anime: { label: '日系动漫', desc: '赛璐珞上色、明亮色调', prompt: '日系动画风格，赛璐珞上色，明亮色调，现代中国校园' },
  drama: { label: '温情短片', desc: '柔和光影、感人氛围', prompt: '温情短片质感，柔和自然光，浅景深，中国校园日常' },
  pixel: { label: '像素复古', desc: '像素颗粒、复古色调', prompt: '像素动画风格，16bit复古色调，校园像素颗粒感' },
}

export const COMIC_STYLES: Record<ComicStyle, { label: string; desc: string; prompt: string }> = {
  shoujo: { label: '少女漫画', desc: '花瓣特效、梦幻氛围', prompt: 'Q版少女漫画风格，大头小身2:1比例，校园场景，花瓣特效' },
  shounen: { label: '少年漫画', desc: '硬朗线条、张力构图', prompt: 'Q版少年漫画风格，大头小身2:1比例，夸张表情，速度线' },
  webtoon: { label: '条漫风格', desc: '精致上色、社死名场面', prompt: 'Q版条漫风格，大头小身2:1比例，社死场面，精致数码上色' },
  doodle: { label: '手绘涂鸦', desc: '随性笔触、轻松氛围', prompt: 'Q版手绘涂鸦风格，大头小身2:1比例，婴儿日常，铅笔随性笔触' },
}

// ============================================================
// AI 分析
// ============================================================

export async function analyzeHighlights(
  dialogues: { role: string; content: string }[]
): Promise<Highlight[]> {
  const dialogueText = dialogues
    .map((d, i) => `${i + 1}. [${d.role}]: ${d.content}`)
    .join('\n')

  const prompt = `你是一个专业的荒诞喜剧剧情分析师。请分析以下《重生职高女厕》的对话，提取2-4个最精彩的高光片段。

## 对话历史
${dialogueText}

## 涉及角色
林小满（花臂生母）、王建国（教导主任）、围观学生（群体NPC）、婴儿主角

## 输出要求
请以 JSON 数组格式返回，每个片段包含：
- highlightId: 唯一ID (如 "hl_001")
- title: 片段标题 (6-10字，荒诞幽默风格)
- summary: 内容摘要 (20-40字)
- type: 片段类型 (bond/conflict/growth/crisis)
- characters: 涉及角色数组 [{id, name}]
- emotionalScore: 情感强度 (0-100)

只返回 JSON 数组，不要其他内容。`

  const content = await chat([{ role: 'user', content: prompt }])

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) return JSON.parse(jsonMatch[0]) as Highlight[]
  } catch {
    console.error('[Highlight] 解析失败:', content)
  }
  return []
}

// ============================================================
// 火山方舟 Ark API
// ============================================================

const ARK_BASE = 'https://ark.cn-beijing.volces.com/api/v3'
const ARK_API_KEY = '8821c4b7-6a64-44b9-a9d7-de1ffc36ff41'

const arkHeaders = {
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${ARK_API_KEY}`,
}

export async function generateImage(prompt: string): Promise<string> {
  const res = await fetch(`${ARK_BASE}/images/generations`, {
    method: 'POST',
    headers: arkHeaders,
    body: JSON.stringify({
      model: 'doubao-seedream-4-5-251128',
      prompt,
      sequential_image_generation: 'disabled',
      response_format: 'url',
      size: '2K',
      stream: false,
      watermark: true,
    }),
  })

  if (!res.ok) {
    const err = await res.text().catch(() => '')
    throw new Error(`图片生成失败: ${res.status} ${err}`)
  }

  const data = await res.json()
  const url = data.data?.[0]?.url
  if (!url) throw new Error('未返回图片 URL')
  return url
}

export async function generateVideo(
  prompt: string,
  imageUrl?: string
): Promise<{ taskId?: string; videoUrl?: string; error?: string }> {
  const content: { type: string; text?: string; image_url?: { url: string } }[] = [
    { type: 'text', text: `${prompt}  --duration 5 --camerafixed false --watermark true` },
  ]

  if (imageUrl) {
    content.push({ type: 'image_url', image_url: { url: imageUrl } })
  }

  try {
    const res = await fetch(`${ARK_BASE}/contents/generations/tasks`, {
      method: 'POST',
      headers: arkHeaders,
      body: JSON.stringify({ model: 'doubao-seedance-1-5-pro-251215', content }),
    })

    const data = await res.json()
    if (!res.ok || data.error) {
      return { error: data.error?.message || `视频生成失败: ${res.status}` }
    }
    return { taskId: data.id || data.task_id, videoUrl: data.output?.video_url }
  } catch (e) {
    return { error: e instanceof Error ? e.message : '视频生成请求失败' }
  }
}

export async function queryVideoTask(taskId: string): Promise<{
  status: 'pending' | 'running' | 'succeeded' | 'failed'
  videoUrl?: string
  error?: string
}> {
  const res = await fetch(`${ARK_BASE}/contents/generations/tasks/${taskId}`, {
    method: 'GET',
    headers: arkHeaders,
  })

  const data = await res.json()
  if (!res.ok) return { status: 'failed', error: data.error?.message || '查询失败' }

  return {
    status: data.status || 'pending',
    videoUrl: data.output?.video_url || data.content?.[0]?.url,
  }
}

// ============================================================
// Prompt 构建 — 荒诞婴儿主题
// ============================================================

const EMOTION_MAP: Record<HighlightType, { image: string; video: string }> = {
  bond: { image: '温暖微笑、母子羁绊、粉色柔光', video: '暖色调柔光，婴儿与生母的互动，校园背景' },
  conflict: { image: '尴尬社死、手机围观、夸张表情', video: '快节奏，戏剧性场面，社死名场面' },
  growth: { image: '哭声震天、逆袭时刻、金色光效', video: '慢镜头，婴儿哭声引发连锁反应' },
  crisis: { image: '紧张对峙、危机时刻、暗色光影', video: '戏剧性推拉镜头，紧迫感' },
}

export function buildImagePrompt(highlight: Highlight, style: ComicStyle): string {
  const styleInfo = COMIC_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].image

  return `${styleInfo.prompt}。中国职高校园，厕所/教务处/食堂场景，荒诞喜剧风格。
角色：${highlight.characters.map((c) => c.name).join('、')}，现代校园风格，职高学生/教师服装。
剧情：${highlight.summary}
情绪：${emotion}
排版：4-6格漫画分镜，黑色分格边框，对话气泡框，高清精致`
}

export function buildVideoPrompt(highlight: Highlight, style: VideoStyle): string {
  const styleInfo = VIDEO_STYLES[style]
  const emotion = EMOTION_MAP[highlight.type].video

  return `${styleInfo.prompt}。中国职高校园，荒诞喜剧氛围。
剧情：${highlight.summary}
角色：${highlight.characters.map((c) => c.name).join('、')}，校园服装
情绪：${emotion}
镜头：5秒短片，表情生动，校园氛围`
}
