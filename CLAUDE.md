# 重生职高女厕：靠哭声续命 — 荒诞喜剧婴儿重生交互叙事游戏

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Workers

## 核心设定

- 主题色: `#ff6b9d` (粉色) | 视觉: 亮色漫画风
- CSS 前缀: `cs-` | 项目代号: `chongsheng`
- 时间系统: 章节推进制 (30回合, 5章节, 无传统 advanceTime 按钮)
- 全局数值: `cryDecibel` (哭声分贝) + `socialDeath` (社死值)
- 角色: 3 NPC (林小满/王建国/围观学生), 异构 StatMeta
- 性别: 二选 (男/女)

## 目录结构

```
worker/index.js          - CF Worker API 代理 (☆零修改)
public/
  audio/bgm.mp3          - 背景音乐
  characters/             - 角色立绘 (jpg): xiaoman, jianguo, students
  scenes/                 - 场景背景 (jpg): toilet, office, canteen, corridor
src/
  main.tsx               - React 入口 (☆零修改)
  App.tsx                - 根组件: 开场/游戏/结局三态
  lib/                   - 核心逻辑层 (2种子 + 4辅助 + 3零修改)
  styles/globals.css     - 全局样式: cs- 前缀, 亮色漫画主题
  components/game/       - 游戏组件 (5文件)
```

## 关键架构决策

- `data.ts` 异构 StatMeta: 每角色独立维度 (xiaoman: bond/panic/health, jianguo: favor/patience, students: crowd)
- `store.ts` 双轨解析: `parseStatChanges` → `{ charChanges, globalChanges }`
- `store.ts` 结局优先级: BE → TE → HE(cryking) → HE(mother) → NE
- 哭声道具为 `social` 类型, `maxCount:99`, 不消耗

[PROTOCOL]: 变更时更新此头部
