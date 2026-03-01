# components/game/ — 游戏 UI 组件

L2 | 父级: /10list-chongsheng/CLAUDE.md

## 成员清单

- `app-shell.tsx`: 游戏主框架 — Header + Tab路由(dialogue/scene/character) + 5键TabBar + 三向手势 + DashboardDrawer + RecordSheet + Toast
- `dashboard-drawer.tsx`: 重生手册(左抽屉) — Reorder.Group 7段可拖拽排序：扉页+全局数值+角色轮播+场景缩略+章节目标+道具格+音乐
- `tab-dialogue.tsx`: 对话Tab — 富消息路由(LetterCard/SceneCard/RoundCard/NpcBubble/PlayerBubble/SystemBubble) + CollapsibleChoices + InventorySheet + InputArea
- `tab-scene.tsx`: 场景Tab — 场景大图(9:16) + 描述 + 地点列表(锁定/解锁/当前)
- `tab-character.tsx`: 人物Tab — RelationGraph SVG + 全局数值面板 + 异构属性列表 + CharacterDossier 全屏档案

## 依赖关系

- 全部依赖 `@/lib/store` 的 useGameStore
- `tab-dialogue.tsx` 依赖 `@/lib/store` 的 SCENES, ITEMS, parseStoryParagraph
- `tab-scene.tsx` 依赖 `@/lib/store` 的 SCENES
- `dashboard-drawer.tsx` 依赖 `@/lib/store` 的 SCENES, ITEMS, CHAPTERS + framer-motion Reorder
- `app-shell.tsx` 依赖 `@/lib/store` 的 PERIODS, MAX_ROUNDS, getCurrentChapter + `@/lib/bgm`
- 图标统一使用 `@phosphor-icons/react`（Notebook/Scroll/ChatCircleDots/MapTrifold/Users/MusicNotes/List/Backpack/PaperPlaneRight/GameController/CaretUp/CaretDown/Play/Pause）

## 样式约定

- CSS class 前缀: `cs-`
- 主题色: #ff6b9d (粉色), #e91e8c (深粉), 白底轻量风格
- 样式来源: globals.css (基础) + opening.css (开场) + rich-cards.css (富UI组件)
- 桌面端 430px 居中壳（`@media (min-width: 431px)`）

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
