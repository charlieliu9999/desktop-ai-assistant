## ADDED Requirements

### Requirement: Glass Style Consistency
前端应提供一致、可配置、可维护的玻璃样式体系。

#### Scenario: Root variables must be effective
- WHEN 应用加载
- THEN 使用 `:root` 定义的 `--glass-opacity/--glass-blur/--glass-saturation/--glass-tint` 必须生效

#### Scenario: No @apply on custom classes
- WHEN 编辑自定义 CSS 类
- THEN 不得对自定义类使用 `@apply`（仅可用于 Tailwind utility）

#### Scenario: Class and helper alignment
- WHEN 通过 `getGlassClass('light'|'medium'|'strong')` 获取类名
- THEN 返回的类名与实际实现一致（存在 `glass-light/medium/strong` 或等价实现）

#### Scenario: Import order and layering
- WHEN 组合 Tailwind 与自定义样式
- THEN 自定义样式置于 `@tailwind` 之后或使用 `@layer components`，确保层级一致

#### Scenario: Scoped disabling
- WHEN 禁用玻璃效果
- THEN 优先在局部容器禁用（非全局 `body`），避免误伤其它区域

#### Scenario: Standard usage with .glass
- WHEN 在常规组件应用玻璃效果
- THEN 统一使用 `.glass`（语义类仅限特殊场景：模态/通知/滚动条/浮窗）


