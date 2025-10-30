## 1. Planning & Alignment
- [ ] 1.1 审阅 `docs/GLASS_STYLE_GUIDE.md` 与现状差异
- [ ] 1.2 确认变更范围（仅样式/工具函数/最小组件改动）

## 2. Implementation
- [ ] 2.1 修正根选择器：`::root` → `:root`（`glass-effect.css` / `index.css`）
- [ ] 2.2 移除/替换 @apply 自定义类用法（`glass-effect.css` 中 `.floating-expanded`/`.floating-header`）
- [ ] 2.3 统一强度类命名：
  - 方案A：新增 `.glass-light`/`.glass-strong` 对应实现
  - 方案B：将 `getGlassClass()` 对齐到现有 `.glass-effect-light/strong`
- [ ] 2.4 调整样式导入顺序/分层（必要时使用 `@layer components`），确保 Tailwind 优先级正确
- [ ] 2.5 收敛 `.glass-disabled` 作用域：从 `body` 移至主容器或改为局部条件 class
- [ ] 2.6 常规组件统一 `.glass` 用法，语义类仅保留在特殊场景（模态/通知/滚动条/浮窗）

## 3. Tests & Verification
- [ ] 3.1 视觉回归：浅色/深色/高对比/减少动画
- [ ] 3.2 参数生效性：opacity/blur/saturation/tint 改动即刻生效
- [ ] 3.3 浮动窗口/主窗口在独立渲染器下参数独立（不互相污染）
- [ ] 3.4 Tailwind 构建无警告/错误，`@apply` 无不合法用法

## 4. Documentation
- [ ] 4.1 更新 `docs/GLASS_STYLE_GUIDE.md`（类名对齐、禁用策略、导入顺序）
- [ ] 4.2 在 `STYLE_GUIDE.md` 增补“玻璃样式一致性检查清单”

## 5. Release
- [ ] 5.1 Canary：在开发环境开启，收集问题与截图
- [ ] 5.2 合并主分支并归档变更（OpenSpec archive）


