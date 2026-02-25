# components/game/ — 游戏 UI 组件

L2 | 父级: /10list-chongsheng/CLAUDE.md

## 成员清单

- `character-panel.tsx`: PC 端左侧面板，角色选择/数值展示/场景切换
- `dialogue-panel.tsx`: PC 端中间对话面板，消息列表/输入区/HighlightModal 入口
- `side-panel.tsx`: PC 端右侧面板，道具背包/关系总览
- `mobile-layout.tsx`: 移动端自适应布局
- `highlight-modal.tsx`: 高光时刻弹窗，5阶段(分析→选择→风格→生成→结果)，主色 #ff6b9d，白色轻量主题

## 依赖关系

- 全部依赖 `@/lib/store` 的 useGameStore
- `highlight-modal.tsx` 依赖 `@/lib/highlight` 全部导出

## 样式约定

- CSS class 前缀: `cs-`
- 主题色: #ff6b9d (粉色), #e91e8c (深粉), 白底轻量风格
- highlight-modal 使用白色背景 + subtle shadow，非暗色玻璃

[PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
