# 重生职高女厕：靠哭声续命 — 荒诞喜剧婴儿重生交互叙事游戏

React 19 + Zustand 5 + Immer + Vite 7 + Tailwind CSS v4 + Framer Motion + Cloudflare Workers

## 架构

```
10list-chongsheng/
├── worker/index.js              - CF Worker API 代理（☆零修改）
├── public/
│   ├── audio/bgm.mp3            - 背景音乐
│   ├── characters/              - 3 角色立绘 9:16 竖版 (jpg)
│   └── scenes/                  - 4 场景背景 9:16 竖版 (jpg)
├── src/
│   ├── main.tsx                 - React 入口（☆零修改）
│   ├── vite-env.d.ts            - Vite 类型声明（☆零修改）
│   ├── App.tsx                  - 根组件: 开场(性别+姓名+NPC预览) + GameScreen + EndingModal + MenuOverlay
│   ├── lib/
│   │   ├── script.md            - ★ 剧本直通：五模块原文（零转换注入 prompt）
│   │   ├── data.ts              - ★ UI 薄层：类型(含富消息扩展) + 3角色 + 4场景 + 7道具 + 5章节 + 5结局
│   │   ├── store.ts             - ★ 状态中枢：Zustand + 富消息插入(场景/回合) + 抽屉状态 + StoryRecord + Analytics + 双轨解析 + extractChoices
│   │   ├── parser.ts            - AI 回复解析（3角色着色 + 数值着色 + marked 渲染）
│   │   ├── analytics.ts         - Umami 埋点（cs_ 前缀）
│   │   ├── stream.ts            - SSE 流式通信（☆零修改）
│   │   ├── bgm.ts               - 背景音乐（initBGM/toggleBGM/isBGMPlaying）
│   │   └── hooks.ts             - useMediaQuery / useIsMobile（☆零修改）
│   ├── styles/
│   │   ├── globals.css          - 全局基础样式（cs- 前缀，含 430px 居中壳）
│   │   ├── opening.css          - 开场样式：信件卡片 + 水印
│   │   └── rich-cards.css       - 富UI组件：场景卡 + 回合卡 + NPC气泡 + 选项面板 + DashboardDrawer + RecordSheet + SVG关系图 + Toast + TabBar
│   └── components/game/
│       ├── app-shell.tsx        - 桌面居中壳 + Header(手册+事件) + 三向手势 + Tab路由 + TabBar + DashboardDrawer + RecordSheet + Toast
│       ├── dashboard-drawer.tsx - 重生手册(左抽屉)：扉页+全局数值+角色轮播+场景缩略+章节目标+道具格+音乐。Reorder拖拽排序
│       ├── tab-dialogue.tsx     - 对话 Tab：富消息路由(SceneCard/RoundCard/NPC头像气泡) + 可折叠选项 + 背包 + 输入区
│       ├── tab-scene.tsx        - 场景 Tab：9:16大图 + 描述 + 地点列表
│       └── tab-character.tsx    - 人物 Tab：立绘 + 异构属性 + SVG RelationGraph + 角色列表 + CharacterDossier 全屏档案
├── index.html
├── package.json
├── vite.config.ts               - ☆
├── tsconfig*.json               - ☆
└── wrangler.toml                - ☆
```

★ = 种子文件 ☆ = 零修改模板

## 核心设计

- **荒诞喜剧婴儿重生**：2024 职高女厕、短视频文化、婴儿重生设定
- **双轨数值**：2 全局属性（cryDecibel/socialDeath）+ NPC 异构属性（bond/panic/health/favor/patience/crowd）
- **亮色漫画风**：白底粉色(#ff6b9d)，cs- CSS 前缀
- **6 时段制**：每回合 6 时段（凌晨/早晨/上午/中午/下午/傍晚/夜晚），30 回合 × 5 章节
- **剧本直通**：script.md 存五模块原文，?raw import 注入 prompt
- **5 结局**：BE(社死爆表) + TE(真相大白) + HE(哭声之王) + HE(母性觉醒) + NE(平凡一生)

## 富UI组件系统

| 组件 | 位置 | 触发 | 视觉风格 |
|------|------|------|----------|
| LetterCard | tab-dialogue | 首条系统消息 | 信件卡片+水印+签名 |
| DashboardDrawer | dashboard-drawer | Header手册+右滑手势 | 白色卡片：扉页+全局数值+角色轮播+场景缩略+目标+道具+音乐+Reorder拖拽 |
| RecordSheet | app-shell | Header事件+左滑手势 | 右侧滑入事件记录：时间线倒序+粉色圆点 |
| SceneTransitionCard | tab-dialogue | selectScene | 场景背景+Ken Burns(8s)+渐变遮罩+粉色角标 |
| RoundCard | tab-dialogue | advanceTime换回合 | 回合数+时段+章节名 |
| RelationGraph | tab-character | 始终可见 | SVG环形布局，中心"我"+3NPC立绘节点+连线+关系标签 |
| CharacterDossier | tab-character | 点击角色 | 全屏右滑入+50vh立绘呼吸动画+数值阶段+性格描述 |
| CollapsibleChoices | tab-dialogue | AI返回选项 | 收起横条(GameController)+展开A/B/C/D卡片 |
| Toast | app-shell | saveGame | TabBar上方弹出2s消失 |

## 三向手势导航

- **右滑**（任意主Tab内容区）→ 左侧重生手册
- **左滑**（任意主Tab内容区）→ 右侧事件记录
- Header 按钮（Notebook/Scroll）同等触发
- 手册内组件支持拖拽排序（Reorder + localStorage `cs-dash-order` 持久化）

## Store 状态扩展

- `activeTab: 'dialogue' | 'scene' | 'character'` — Tab 路由
- `choices: string[]` — AI 提取的选项
- `showDashboard: boolean` — 左抽屉开关
- `showRecords: boolean` — 右抽屉开关
- `storyRecords: StoryRecord[]` — 事件记录（sendMessage 和 advanceTime 自动追加）
- `selectCharacter` 末尾自动跳转 dialogue Tab
- 链式反应：socialDeath≥80 → panic+10；cryDecibel≥80 + 围观场景 → crowd+5

## 富消息机制

Message 类型扩展 `type` 字段路由渲染：
- `scene-transition` → SceneTransitionCard（selectScene 触发）
- `round-change` → RoundCard（advanceTime 换回合时触发）
- NPC 消息带 `character` 字段 → 28px 圆形立绘头像

## Analytics 集成

- `trackGameStart` / `trackPlayerCreate` → App.tsx 开场
- `trackGameContinue` → App.tsx 继续游戏
- `trackTimeAdvance` / `trackSceneUnlock` → store.ts
- `trackEndingReached` → store.ts checkEnding

## 关键架构决策

- `data.ts` 异构 StatMeta: 每角色独立维度 (xiaoman: bond/panic/health, jianguo: favor/patience, students: crowd)
- `store.ts` 双轨解析: `parseStatChanges` → `{ charChanges, globalChanges }`
- `store.ts` 结局优先级: BE → TE → HE(cryking) → HE(mother) → NE
- 哭声道具为 `social` 类型, `maxCount:99`, 不消耗
- `portrait` 字段（非 fullImage）用于角色立绘路径

[PROTOCOL]: 变更时更新此头部
