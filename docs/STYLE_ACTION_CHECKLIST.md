# 样式统一性问题 - 快速行动清单

> 这是 [前端样式统一性分析报告](./FRONTEND_STYLE_CONSISTENCY_ANALYSIS.md) 的快速参考版本

## 🔥 立即修复 (P0 - 高优先级)

### ✅ 任务1: 统一CSS变量定义

**时间**: 2小时  
**风险**: 中

**操作步骤**:

1. **备份现有文件**
   ```bash
   cp src/renderer/App.css src/renderer/App.css.backup
   cp src/renderer/index.css src/renderer/index.css.backup
   ```

2. **删除 App.css 中的 CSS 变量**
   
   打开 `src/renderer/App.css`，删除第 27-124 行的 `:root` 和媒体查询部分:
   ```css
   /* 删除这些 */
   :root {
     --color-primary: #007AFF;
     /* ... 所有变量定义 ... */
   }
   
   @media (prefers-color-scheme: dark) {
     /* ... */
   }
   ```
   
   保留 `.app`, `.btn` 等组件样式

3. **验证没有破坏**
   ```bash
   npm run dev
   # 检查所有页面是否正常显示
   ```

4. **全局搜索确认**
   ```bash
   # 搜索是否还有其他地方定义了 CSS 变量
   rg "^:root" --type css
   # 应该只在 index.css 和 glass-effect.css 中出现
   ```

### ✅ 任务2: 修复玻璃效果 - 移除 `dark:glass-dark`

**时间**: 30分钟  
**风险**: 低

**文件**: `bisheng-integration/components/AgentList.tsx`

**修改位置**: 第 146 行

**修改前**:
```tsx
className="glass dark:glass-dark hover:bg-white/40 dark:hover:bg-black/40 border border-gray-200/30 dark:border-gray-600/30"
```

**修改后**:
```tsx
className="glass hover:bg-white/40 dark:hover:bg-black/40 border border-gray-200/30 dark:border-gray-600/30"
```

**验证**:
1. 启动应用
2. 进入智能体页面
3. 切换浅色/深色模式
4. 确认玻璃效果正常

---

## ⚡ 本周完成 (P1 - 中优先级)

### ✅ 任务3: 创建样式规范文档

**时间**: 2小时  
**风险**: 低

**操作**:
创建 `docs/STYLE_GUIDE.md` (模板已在分析报告中提供)

### ✅ 任务4: 创建主题管理 Hook

**时间**: 3小时  
**风险**: 低

**新建文件**: `src/renderer/hooks/useTheme.ts`

**代码**: (见分析报告 P2 部分)

**使用位置**:
- `src/renderer/App.tsx`
- `src/renderer/pages/SettingsWindow.tsx`
- `src/renderer/pages/FloatingWindow.tsx`
- `src/renderer/pages/VoiceWindow.tsx`

### ✅ 任务5: 创建玻璃效果管理 Hook

**时间**: 2小时  
**风险**: 低

**新建文件**: `src/renderer/hooks/useGlassTheme.ts`

**代码**: (见分析报告 P1 部分)

**使用位置**:
- `src/renderer/components/Chat.tsx`
- `src/renderer/components/MainWindow.tsx`
- `bisheng-integration/components/AgentChat.tsx`

### ✅ 任务6: 审计硬编码颜色

**时间**: 2小时  
**风险**: 低

**操作**:
```bash
# 搜索所有硬编码的十六进制颜色
rg "#[0-9a-fA-F]{6}" --type tsx --type css > color-audit.txt

# 搜索直接使用的蓝色类
rg "bg-blue-[0-9]|text-blue-[0-9]" --type tsx > blue-usage.txt

# 人工审查并分类：
# - 需要改为 primary 的
# - 需要改为语义化颜色的 (success, warning, error)
# - 可以保留的 (如医疗系统的 medical-500)
```

---

## 📅 本月完成 (P2 - 低优先级)

### ✅ 任务7: 统一所有组件的玻璃效果

**时间**: 8小时  
**风险**: 中

**文件清单**:
- [ ] `src/renderer/components/MainWindow.tsx`
- [ ] `src/renderer/components/Chat.tsx`
- [ ] `bisheng-integration/components/AgentChat.tsx`
- [ ] `bisheng-integration/components/AgentList.tsx`
- [ ] `src/renderer/components/FloatingWindow.tsx`
- [ ] `src/renderer/components/SettingsPanel.tsx`

**对每个文件**:
1. 导入 `useGlassTheme` Hook
2. 替换条件判断为 Hook 方法
3. 测试所有主题模式

### ✅ 任务8: 替换硬编码颜色

**时间**: 6小时  
**风险**: 中

**基于任务6的审计结果**:
1. 创建颜色常量文件 (可选)
2. 逐个文件替换
3. 测试视觉效果

### ✅ 任务9: 添加 ESLint 规则

**时间**: 3小时  
**风险**: 低

**配置 `.eslintrc.js`**:
```js
rules: {
  // 禁止硬编码颜色
  'no-restricted-syntax': [
    'error',
    {
      selector: 'Literal[value=/#[0-9a-fA-F]{6}/]',
      message: '不要硬编码颜色值，使用 Tailwind 类或 CSS 变量'
    }
  ],
  
  // 其他规则...
}
```

---

## 🧪 验证清单

完成每个任务后，执行以下验证:

### 视觉测试

- [ ] 浅色模式下所有页面正常
- [ ] 深色模式下所有页面正常
- [ ] 玻璃主题下所有页面正常
- [ ] 自动模式切换正常
- [ ] 没有样式闪烁
- [ ] 颜色一致性良好

### 功能测试

- [ ] 所有按钮可点击
- [ ] 所有输入框可输入
- [ ] 主题设置保存生效
- [ ] 玻璃效果设置生效
- [ ] 窗口拖动正常
- [ ] 快捷键功能正常

### 技术测试

- [ ] `npm run build` 成功
- [ ] `npm run lint` 无错误
- [ ] `npm run type-check` 无错误
- [ ] CSS bundle 大小未显著增加
- [ ] 没有 console 警告

---

## 🚨 回滚计划

如果出现问题:

### 回滚 CSS 变量更改
```bash
mv src/renderer/App.css.backup src/renderer/App.css
mv src/renderer/index.css.backup src/renderer/index.css
```

### 回滚组件更改
```bash
git checkout HEAD -- src/renderer/components/Chat.tsx
# 其他文件同理
```

### 完全回滚到之前的提交
```bash
git log --oneline  # 找到之前的提交 hash
git reset --hard <commit-hash>
```

---

## 📊 进度跟踪

### 已完成

- [x] 样式问题分析 (本文档)
- [ ] ...

### 进行中

- [ ] ...

### 待开始

- [ ] 统一 CSS 变量 (P0)
- [ ] 修复 glass-dark (P0)
- [ ] 创建样式规范 (P1)
- [ ] 创建主题 Hook (P1)
- [ ] 审计颜色使用 (P1)
- [ ] 统一组件样式 (P2)
- [ ] 添加 ESLint 规则 (P2)

---

## 💡 快速参考

### 正确的样式使用方式

```tsx
// ✅ 正确: 使用 Tailwind 语义类
<div className="bg-background text-foreground">

// ✅ 正确: 玻璃效果
<div className="glass">

// ✅ 正确: 深色模式
<div className="bg-white dark:bg-gray-900">

// ✅ 正确: 条件玻璃效果
const { getGlassClass } = useGlassTheme();
<div className={getGlassClass()}>

// ❌ 错误: 硬编码颜色
<div style={{ background: '#3b82f6' }}>

// ❌ 错误: 废弃的类
<div className="glass dark:glass-dark">

// ❌ 错误: 语义化旧类
<div className="glass-header">
```

### 常用命令

```bash
# 搜索问题模式
rg "dark:glass-dark" --type tsx
rg "#[0-9a-fA-F]{6}" --type tsx
rg "glass-header|glass-card|glass-effect" --type tsx

# 运行测试
npm run dev
npm run build
npm run lint

# Git 操作
git status
git diff
git add .
git commit -m "fix: 统一CSS变量定义"
```

---

**最后更新**: 2025-10-11  
**负责人**: 开发团队  
**预计完成**: 2周内完成 P0 和 P1 任务
