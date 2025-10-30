## Context
前端样式系统基于 Tailwind + 自定义 CSS 变量实现玻璃效果。当前存在根变量选择器书写错误、`@apply` 误用自定义类、类名与工具函数不一致等问题。

## Goals / Non-Goals
- Goals: 变量生效、构建稳定、类名规范一致、导入分层正确、禁用范围可控。
- Non-Goals: 变更 UI 布局、引入新主题框架。

## Decisions
- 使用 `:root` 定义 CSS 变量；所有玻璃参数通过变量驱动。
- 禁止对自定义类使用 `@apply`（Tailwind 仅用于 utility）；复用通过 CSS 变量或公共类完成。
- 强度类名与工具函数一致：优先方案A（新增 `.glass-light/.glass-strong`）。
- 自定义样式置于 `@tailwind` 之后，或以 `@layer components` 声明，确保层级清晰。
- `.glass-disabled` 改为局部容器控制，避免全局误伤。

## Risks / Trade-offs
- 层叠顺序变更可能影响少数覆盖；通过可视回归与按层级调整缓解。
- 类名对齐需要同步更新少量引用；提供兼容别名或文档标注。

## Migration Plan
1) 修正变量与移除 `@apply` 误用 → 通过。
2) 类名/工具函数对齐 → 通过。
3) 导入顺序与 `@layer` 调整 → 通过。
4) 收敛禁用范围 → 通过。
5) 文档与检查清单更新 → 通过。

## Open Questions
- 是否保留 `.glass-effect-*` 作为兼容别名一个小版本？（建议保留一次小版本周期）


