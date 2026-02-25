# lib/ — 核心逻辑层

L2 | 父级: /10list-chongsheng/CLAUDE.md

## 成员清单

- `data.ts`: ★种子文件, 全部类型定义 + 3角色(异构StatMeta) + 4场景 + 7道具 + 5章节 + 6事件 + 5结局, `MAX_ROUNDS=30`
- `store.ts`: ★种子文件, Zustand+Immer 状态中枢, `buildSystemPrompt` 荒诞婴儿世界观, `parseStatChanges` 双轨(charChanges+globalChanges), `advanceTime` 回合推进, `checkEnding` BE→TE→HE→NE, SAVE_KEY `chongsheng-save-v1`
- `parser.ts`: AI 回复文本解析器, 角色名着色 + 数值变化着色, 硬编码颜色(禁止 import data.ts)
- `analytics.ts`: Umami 埋点, `cs_` 前缀事件
- `highlight.ts`: 高光时刻分析 + 火山方舟 Ark API 图片/视频生成, 荒诞喜剧主题
- `stream.ts`: ☆零修改, SSE 流式通信
- `bgm.ts`: ☆零修改, 背景音乐控制
- `hooks.ts`: ☆零修改, useMediaQuery / useIsMobile

## 依赖拓扑

```
data.ts ← store.ts ← [所有组件]
stream.ts ← store.ts
parser.ts (独立, 禁止 import data.ts)
analytics.ts ← store.ts
highlight.ts ← highlight-modal.tsx
```

## 关键约束

- `parser.ts` 零依赖 data.ts (避免循环依赖, 颜色硬编码)
- `store.ts` 底部 re-export data.ts 全部常量/类型 (组件统一从 store 导入)
- 全局数值 `socialDeath` / `cryDecibel` 走 globalChanges 通道, 非角色 stat

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
