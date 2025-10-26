# 全项目代码审查与重构 - 任务清单

## 阶段1: 代码清理与整理 (P0 - 紧急, 1周)

### 1.1 清理冗余文件 (1天)

- [x] 1.1.1 删除备份文件 ✅ 已完成 (2025-10-26)
  - [x] 删除 `src/renderer/App.css.backup`
  - [x] 删除 `src/renderer/index.css.backup`
  - [x] 删除 `backend-service/.env copy` (包含敏感API密钥)
  - [x] 删除 `backend-service/.env.bak` (包含多个API密钥)
  - [x] 删除临时文件 `.tmp_*.json` (5个文件)
  - [x] 删除 `.webui_secret_key`
  - [x] 检查并删除其他.backup文件 (已全部清理)

- [x] 1.1.2 整理根目录文档 ✅ 已完成 (2025-10-26)
  - [x] 创建 `docs/archive/2025-01/` 目录
  - [x] 移动分析报告到archive (11个文件)
    - STYLE_ANALYSIS_SUMMARY.md
    - STYLE_OPTIMIZATION_SUMMARY.md
    - BACKEND_INTEGRATION_TEST_REPORT.md
    - BACKEND_REFACTOR_ANALYSIS.md
    - DUAL_VERSION_FEASIBILITY_ANALYSIS.md
    - GLASS_THEME_FIX.md
    - IMPROVEMENTS_SUMMARY.md
    - PR_REVIEW_SUMMARY.md
    - SYSTEM_STATUS_REPORT.md
    - TESTING_GUIDE.md
    - 前端样式统一性分析结果.md
  - [x] 移动启动和重构文档到archive
    - E2E_IMPROVEMENTS.md
    - STARTUP_GUIDE.md
    - STARTUP_SCRIPTS_README.md
    - REFACTOR_PROPOSAL_SUMMARY.md
  - [x] 保留核心文档: README.md, QUICK_START.md, README_API.md, AGENTS.md
  - [x] 创建归档索引 `docs/archive/2025-01/README.md`
  - [x] 更新README.md添加文档索引链接

- [x] 1.1.3 清理临时文件 ✅ 已完成 (2025-10-26)
  - [x] 删除或归档 `前端样式统一性分析结果.md` (已移至archive)
  - [x] 清理 `logs/` 目录中的旧日志 (保留1个最新日志)
  - [x] 清理 `test-results/` 目录 (删除.last-run.json)
  - [x] 清理 `htmlcov/` 目录 (删除所有HTML/CSS/JS/PNG文件,保留.gitignore)

### 1.2 统一样式系统 (3天)

- [x] 1.2.1 合并CSS变量定义 ✅ 已完成 (2025-10-26)
  - [x] CSS变量已统一到 `src/renderer/index.css`
  - [x] App.css中已移除重复的`:root`定义
  - [x] 保留了媒体查询中的CSS变量覆盖(高对比度、减少动画等)
  - [x] 验证: 所有页面样式正常
  - 备注: CSS变量已在之前的优化中完成统一

- [x] 1.2.2 移除废弃样式类 ✅ 已完成 (2025-10-26)
  - [x] 检查: `dark:glass-dark` 仅在文档中引用,代码中未使用
  - [x] 检查: `glass-header`, `glass-card`, `glass-effect` 是合法的CSS类定义
  - [x] 验证: 所有组件样式正常
  - 备注: 这些类是在 `glass-effect.css` 中定义的合法样式类,不是废弃类

- [x] 1.2.3 审计和替换硬编码颜色 ✅ 已完成 (2025-10-26)
  - [x] 运行 `rg "#[0-9a-fA-F]{6}"` 审计所有硬编码颜色
  - [x] 创建颜色映射表:
    - `#3B82F6` → `--color-info` (蓝色)
    - `#6B7280` → `--text-muted` (灰色)
  - [x] 替换VoiceWindow.tsx中的硬编码颜色(使用CSS变量)
  - [x] 验证其他硬编码颜色为合理默认值(tintColor, 测试数据等)
  - 备注: 发现的硬编码颜色大多是合理的默认值或测试数据

- [x] 1.2.4 创建样式规范和工具 ✅ 已完成 (2025-10-26)
  - [x] 创建 `docs/STYLE_GUIDE.md` - 完整的样式使用规范文档
  - [x] 创建 `src/renderer/hooks/useTheme.ts` - 主题管理Hook
  - [x] 验证 `src/renderer/hooks/useGlassEffect.ts` - 已存在且完整
  - [x] 验证 `src/renderer/hooks/useFloatingGlassEffect.ts` - 已存在且完整
  - [x] 添加ESLint规则禁止废弃的dark:glass-dark类
  - [x] 更新 `.eslintrc.js` 配置
  - [x] 运行 `npm run lint` 验证 - 通过
  - 备注: 样式系统已完整,所有组件都使用统一的配置源

### 1.3 完成Legacy迁移 (3天)

- [ ] 1.3.1 实现patient-adapter (8小时)
  - [ ] 创建 `src/services/adapters/patient-adapter.ts`
  - [ ] 实现 `extractPatientInfo()` 方法
  - [ ] 实现 `generateRecommendations()` 方法
  - [ ] 添加后端API调用逻辑
  - [ ] 添加故障转移到legacy实现
  - [ ] 编写单元测试
  - [ ] 更新README.md迁移状态

- [ ] 1.3.2 实现config-adapter (6小时)
  - [ ] 创建 `src/services/adapters/config-adapter.ts`
  - [ ] 实现 `getConfig()` 方法
  - [ ] 实现 `updateConfig()` 方法
  - [ ] 实现 `validateConfig()` 方法
  - [ ] 添加配置同步逻辑
  - [ ] 编写单元测试

- [ ] 1.3.3 完善agent-adapter (4小时)
  - [ ] 检查 `src/services/adapters/agent-adapter.ts` 实现
  - [ ] 补充缺失的方法
  - [ ] 添加错误处理
  - [ ] 编写单元测试
  - [ ] 更新README.md

- [ ] 1.3.4 更新所有导入引用 (4小时)
  - [ ] 全局搜索 `from '../legacy/` 或 `from '../../services/legacy/`
  - [ ] 替换为对应的adapter导入
  - [ ] 更新 `src/renderer/components/medical/OneClickDesktopChat.tsx`
  - [ ] 更新 `src/renderer/components/Chat.tsx`
  - [ ] 更新其他使用legacy的组件
  - [ ] 运行 `npm run type-check` 验证

- [ ] 1.3.5 删除Legacy代码 (2小时)
  - [ ] 确认所有导入已更新
  - [ ] 删除 `src/services/legacy/` 目录
  - [ ] 删除 `scripts/migrate-to-legacy.sh`
  - [ ] 更新 `.gitignore` 移除legacy相关条目
  - [ ] 运行完整测试套件验证

## 阶段2: 配置管理统一 (P1 - 重要, 1周)

### 2.1 统一配置架构 (3天)

- [ ] 2.1.1 创建后端配置API (8小时)
  - [ ] 创建 `backend-service/app/api/v1/config.py`
  - [ ] 实现 `GET /v1/config` 获取完整配置
  - [ ] 实现 `GET /v1/config/{key}` 获取单个配置项
  - [ ] 实现 `PUT /v1/config/{key}` 更新配置项
  - [ ] 实现 `POST /v1/config/validate` 验证配置
  - [ ] 添加配置变更事件通知
  - [ ] 编写API测试

- [ ] 2.1.2 前端配置同步 (8小时)
  - [ ] 修改 `src/renderer/stores/configStore.ts`
  - [ ] 实现从后端加载配置
  - [ ] 实现配置变更监听
  - [ ] 实现配置缓存机制
  - [ ] 添加离线模式支持(使用本地缓存)
  - [ ] 编写单元测试

- [ ] 2.1.3 配置验证 (8小时)
  - [ ] 安装Zod依赖: `npm install zod`
  - [ ] 创建 `src/types/config-schema.ts` 配置Schema
  - [ ] 在configStore中添加Zod验证
  - [ ] 后端使用Pydantic验证
  - [ ] 添加配置迁移脚本
  - [ ] 测试配置验证功能

### 2.2 简化配置文件 (2天)

- [ ] 2.2.1 合并模型配置 (4小时)
  - [ ] 将 `config/models.json` 内容迁移到 `backend-service/app/config.py`
  - [ ] 将 `config/scenarios.json` 内容迁移到 `backend-service/app/config.py`
  - [ ] 更新后端代码读取新配置
  - [ ] 删除旧配置文件
  - [ ] 测试模型配置功能

- [ ] 2.2.2 规范环境变量 (4小时)
  - [ ] 更新 `backend-service/.env.example` 添加详细注释
  - [ ] 删除重复的环境变量定义
  - [ ] 统一命名规范(如AI_CHAT_MODEL vs LOCAL_AI_MODEL)
  - [ ] 添加环境变量验证
  - [ ] 更新 `docs/ENVIRONMENT_VARIABLES.md`

- [ ] 2.2.3 配置文档 (8小时)
  - [ ] 创建 `docs/CONFIGURATION_GUIDE.md`
  - [ ] 文档化所有配置项
  - [ ] 添加配置示例
  - [ ] 添加常见问题解答
  - [ ] 添加配置迁移指南

## 阶段3: 后端API清理 (P1 - 重要, 1周)

### 3.1 完成Legacy API移除 (3天)

- [ ] 3.1.1 验证前端迁移完成 (4小时)
  - [ ] 检查 `openspec/changes/remove-legacy-api/tasks.md` 状态
  - [ ] 运行前端测试确保v1 API调用正常
  - [ ] 运行后端测试确保v1端点功能完整
  - [ ] 检查是否还有 `/api/model-config` 等legacy调用

- [ ] 3.1.2 删除Legacy路由 (4小时)
  - [ ] 删除 `backend-service/app/api/ai_chat.py`
  - [ ] 删除 `backend-service/app/api/model_config.py`
  - [ ] 删除 `backend-service/app/api/patient_extraction.py` (legacy版本)
  - [ ] 删除 `backend-service/app/api/patients.py`
  - [ ] 删除 `backend-service/app/api/recommendations.py`
  - [ ] 从 `backend-service/app/main.py` 移除legacy路由挂载

- [ ] 3.1.3 清理Legacy服务 (4小时)
  - [ ] 检查 `backend-service/app/services/` 中的legacy服务
  - [ ] 删除未使用的服务文件
  - [ ] 更新服务导入
  - [ ] 运行测试验证

- [ ] 3.1.4 更新API文档 (4小时)
  - [ ] 更新 `README_API.md` 移除legacy端点
  - [ ] 添加v1 API完整文档
  - [ ] 添加API版本控制说明
  - [ ] 添加迁移指南

### 3.2 规范API结构 (2天)

- [ ] 3.2.1 统一响应格式 (4小时)
  - [ ] 确保所有v1 API使用 `APIResponse` 包装
  - [ ] 统一成功响应格式
  - [ ] 统一错误响应格式
  - [ ] 添加响应Schema文档

- [ ] 3.2.2 错误处理标准化 (4小时)
  - [ ] 创建 `backend-service/app/core/errors.py` 错误类
  - [ ] 定义标准错误码
  - [ ] 实现全局异常处理器
  - [ ] 更新所有API使用标准错误处理

- [ ] 3.2.3 API版本控制 (8小时)
  - [ ] 设计v2 API路由结构
  - [ ] 添加API版本协商机制
  - [ ] 文档化版本控制策略
  - [ ] 添加版本废弃警告机制

## 阶段4: 代码结构优化 (P2 - 一般, 2周)

### 4.1 前端组件重构 (5天)

- [ ] 4.1.1 拆分大组件 (16小时)
  - [ ] 重构 `OneClickDesktopChat.tsx` (488行 -> <200行)
  - [ ] 重构 `Chat.tsx` (超过300行)
  - [ ] 重构 `MainWindow.tsx`
  - [ ] 提取子组件到独立文件
  - [ ] 添加组件文档

- [ ] 4.1.2 提取公共逻辑 (12小时)
  - [ ] 创建 `useChat` Hook 提取对话逻辑
  - [ ] 创建 `usePatientExtraction` Hook
  - [ ] 创建 `useVoiceInput` Hook
  - [ ] 创建 `useScreenshot` Hook
  - [ ] 编写Hook测试

- [ ] 4.1.3 统一状态管理 (12小时)
  - [ ] 审查所有Zustand store使用
  - [ ] 规范store命名和结构
  - [ ] 避免prop drilling
  - [ ] 添加状态持久化
  - [ ] 编写状态管理文档

### 4.2 后端服务重构 (5天)

- [ ] 4.2.1 服务层解耦 (16小时)
  - [ ] 将业务逻辑从API路由提取到services
  - [ ] 创建服务接口定义
  - [ ] 实现依赖注入
  - [ ] 添加服务测试

- [ ] 4.2.2 统一异常处理 (8小时)
  - [ ] 创建自定义异常类
  - [ ] 实现全局异常处理器
  - [ ] 统一日志记录
  - [ ] 添加错误追踪

- [ ] 4.2.3 优化数据库访问 (16小时)
  - [ ] 实现Repository模式
  - [ ] 添加数据库连接池
  - [ ] 优化查询性能
  - [ ] 添加数据库迁移

### 4.3 测试覆盖提升 (4天)

- [ ] 4.3.1 前端单元测试 (12小时)
  - [ ] 为关键组件添加测试
  - [ ] 为Hooks添加测试
  - [ ] 为stores添加测试
  - [ ] 目标覆盖率>70%

- [ ] 4.3.2 后端单元测试 (12小时)
  - [ ] 为所有v1 API添加测试
  - [ ] 为services添加测试
  - [ ] 为utils添加测试
  - [ ] 目标覆盖率>85%

- [ ] 4.3.3 E2E测试 (8小时)
  - [ ] 添加用户登录流程测试
  - [ ] 添加患者信息提取流程测试
  - [ ] 添加AI对话流程测试
  - [ ] 添加配置管理流程测试

## 阶段5: 文档和工具 (P2 - 一般, 1周)

### 5.1 文档整理 (3天)

- [ ] 5.1.1 创建文档索引 (4小时)
  - [ ] 创建 `docs/README.md` 总索引
  - [ ] 按类别组织文档(开发、API、部署、测试)
  - [ ] 添加文档搜索指南
  - [ ] 添加文档贡献指南

- [ ] 5.1.2 归档历史文档 (4小时)
  - [ ] 创建 `docs/archive/` 目录结构
  - [ ] 移动过时的分析报告
  - [ ] 移动过时的测试报告
  - [ ] 更新文档链接

- [ ] 5.1.3 更新核心文档 (16小时)
  - [ ] 更新 `README.md` 项目介绍
  - [ ] 更新 `QUICK_START.md` 快速开始
  - [ ] 更新 `TESTING_GUIDE.md` 测试指南
  - [ ] 创建 `ARCHITECTURE.md` 架构文档
  - [ ] 创建 `CONTRIBUTING.md` 贡献指南

### 5.2 开发工具 (2天)

- [ ] 5.2.1 代码审计脚本 (8小时)
  - [ ] 扩展 `scripts/audit-frontend-styles.sh`
  - [ ] 添加代码复杂度检查
  - [ ] 添加依赖分析
  - [ ] 添加安全漏洞扫描
  - [ ] 生成审计报告

- [ ] 5.2.2 自动化检查 (8小时)
  - [ ] 配置pre-commit hooks
  - [ ] 添加代码格式化检查
  - [ ] 添加类型检查
  - [ ] 添加测试覆盖率检查
  - [ ] 添加文档更新检查

### 5.3 CI/CD优化 (2天)

- [ ] 5.3.1 优化测试流程 (8小时)
  - [ ] 并行运行测试
  - [ ] 添加测试缓存
  - [ ] 优化测试速度
  - [ ] 添加测试报告

- [ ] 5.3.2 优化构建流程 (8小时)
  - [ ] 优化依赖安装
  - [ ] 添加构建缓存
  - [ ] 优化打包大小
  - [ ] 添加构建报告

## 验收标准

### 阶段1验收
- [ ] 所有备份文件已删除
- [ ] 根目录.md文件<5个
- [ ] CSS变量无重复定义
- [ ] 无废弃样式类使用
- [ ] 硬编码颜色<5处
- [ ] Legacy代码完全删除
- [ ] 所有测试通过

### 阶段2验收
- [ ] 配置API正常工作
- [ ] 前端配置从后端加载
- [ ] 配置验证正常
- [ ] 配置文件<3个
- [ ] 配置文档完整

### 阶段3验收
- [ ] Legacy API完全移除
- [ ] 所有API使用统一响应格式
- [ ] 错误处理标准化
- [ ] API文档完整
- [ ] 所有API测试通过

### 阶段4验收
- [ ] 无超过300行的组件
- [ ] 公共逻辑已提取为Hooks
- [ ] 服务层解耦完成
- [ ] 前端测试覆盖率>70%
- [ ] 后端测试覆盖率>85%

### 阶段5验收
- [ ] 文档索引完整
- [ ] 历史文档已归档
- [ ] 核心文档已更新
- [ ] 代码审计脚本可用
- [ ] Pre-commit hooks配置完成
- [ ] CI/CD流程优化完成

