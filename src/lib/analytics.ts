/**
 * [INPUT]: 无外部依赖
 * [OUTPUT]: 对外提供 track* 系列埋点函数
 * [POS]: lib 的数据统计模块，被 store.ts 消费
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */

declare global {
  interface Window {
    umami?: {
      track: (name: string, data?: Record<string, string | number>) => void
    }
  }
}

function trackEvent(name: string, data?: Record<string, string | number>) {
  if (typeof window !== 'undefined' && window.umami) {
    window.umami.track(name, data)
  }
}

// ============================================================
// 预定义事件 — cs_ 前缀
// ============================================================

export function trackGameStart() {
  trackEvent('cs_game_start')
}

export function trackGameContinue() {
  trackEvent('cs_game_continue')
}

export function trackPlayerCreate(gender: string, name: string) {
  trackEvent('cs_player_create', { gender, name })
}

export function trackChapterEnter(chapter: number) {
  trackEvent('cs_chapter_enter', { chapter })
}

export function trackEndingReached(ending: string) {
  trackEvent('cs_ending_reached', { ending })
}

export function trackCryChoice(decibel: number) {
  trackEvent('cs_cry_choice', { decibel })
}

export function trackSocialDeath(value: number) {
  trackEvent('cs_social_death', { value })
}
