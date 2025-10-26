# Legacy代码审计报告

**生成时间**: 2025-10-26  
**审计范围**: `src/services/legacy/` 目录下所有TypeScript文件  
**目的**: 确定哪些legacy文件可以安全删除,哪些需要保留

---

## 📊 审计总结

| 类别 | 文件数 | 说明 |
|------|--------|------|
| ✅ 可以安全删除 | 1 | 未被引用且有adapter替代 |
| 🔒 需要保留 | 7 | 正在被使用或被adapter依赖 |
| 📦 仅类型定义 | 1 | 仅被用作类型导入 |
| **总计** | **9** | 所有legacy文件 |

---

## 📋 详细审计结果

### ✅ 可以安全删除 (1个文件)

#### 1. `web-search.ts` (418行)

**状态**: ✅ 可以安全删除

**引用情况**:
- ❌ **未被外部直接引用**
- ⚠️ 仅被 `src/services/legacy/ai.ts` 内部使用

**分析**:
- `web-search.ts` 是 `ai.ts` 的内部依赖
- 提供网络搜索工具功能 (DuckDuckGo, SerpAPI)
- `ai.ts` 已有adapter (`ai-adapter.ts`),且adapter已被主进程使用
- 当 `ai.ts` 被删除时,`web-search.ts` 也应该被删除

**adapter替代**:
- 后端API已实现网络搜索功能
- `ai-adapter.ts` 通过后端API调用网络搜索

**结论**: 
- 暂时保留,等待 `ai.ts` 完全迁移后一起删除
- 或者现在删除,同时修改 `ai.ts` 移除网络搜索功能

---

### 🔒 需要保留 (7个文件)

#### 1. `ai.ts` (1179行)

**状态**: 🔒 需要保留

**引用情况**:
- ✅ `src/main/main.ts` - 主进程直接使用
- ✅ `src/services/adapters/ai-adapter.ts` - adapter依赖

**使用方式**:
```typescript
// src/main/main.ts
import { AIService } from '../services/legacy/ai';
this.aiService = new AIService(config.ai as AIConfig, this.logger);
```

**adapter状态**:
- ✅ 已有adapter: `ai-adapter.ts`
- ⚠️ 主进程同时使用legacy和adapter (双轨制)

**保留原因**:
- 主进程 `main.ts` 仍在使用legacy实现
- adapter内部也依赖legacy实现作为fallback
- 需要等待完全迁移到adapter后才能删除

---

#### 2. `voice.ts` (645行)

**状态**: 🔒 需要保留

**引用情况**:
- ✅ `src/main/index.ts` - 主进程直接使用
- ✅ `src/main/main.ts` - 主进程直接使用
- ✅ `src/services/adapters/voice-adapter.ts` - adapter依赖

**使用方式**:
```typescript
// src/main/index.ts
import { VoiceService } from '../services/legacy/voice';
this.voiceService = new VoiceService(config.voice, this.logger);
```

**adapter状态**:
- ✅ 已有adapter: `voice-adapter.ts`
- ⚠️ 主进程直接使用legacy实现

**保留原因**:
- 主进程仍在使用
- adapter依赖legacy实现

---

#### 3. `voice-recognition.ts` (280行)

**状态**: 🔒 需要保留

**引用情况**:
- ✅ `src/services/adapters/voice-adapter.ts` - adapter依赖

**使用方式**:
```typescript
// voice-adapter.ts
import { VoiceRecognitionService } from '../legacy/voice-recognition';
```

**adapter状态**:
- ✅ 已有adapter: `voice-adapter.ts`
- ✅ adapter封装了此服务

**保留原因**:
- adapter依赖此实现
- 需要等待adapter完全迁移到后端API

---

#### 4. `bisheng.ts` (约500行)

**状态**: 🔒 需要保留

**引用情况**:
- ✅ `src/main/main.ts` - 主进程直接使用

**使用方式**:
```typescript
// src/main/main.ts
import { BishengService } from '../services/legacy/bisheng';
```

**adapter状态**:
- ✅ 已有adapter: `agent-adapter.ts`
- ⚠️ 主进程可能仍在使用legacy实现

**保留原因**:
- 主进程仍在使用
- 需要确认是否已完全迁移到adapter

---

#### 5. `desktop-recognition.ts` (约400行)

**状态**: 🔒 需要保留

**引用情况**:
- ✅ `src/main/main.ts` - 主进程直接使用
- ✅ `src/services/adapters/vision-adapter.ts` - adapter依赖

**使用方式**:
```typescript
// src/main/main.ts
import { DesktopRecognitionService } from '../services/legacy/desktop-recognition';
```

**adapter状态**:
- ✅ 已有adapter: `vision-adapter.ts`
- ⚠️ 主进程直接使用legacy实现

**保留原因**:
- 主进程仍在使用
- adapter依赖legacy实现

---

#### 6. `screenshot.ts` (约200行)

**状态**: 🔒 需要保留

**引用情况**:
- ✅ `src/main/main.ts` - 主进程直接使用

**使用方式**:
```typescript
// src/main/main.ts
import { ScreenshotService } from '../services/legacy/screenshot';
```

**adapter状态**:
- ❌ 无对应adapter
- 这是一个独立的截图服务

**保留原因**:
- 主进程直接使用
- 无adapter替代
- 截图功能是Electron特有的,不适合迁移到后端

---

#### 7. `medical-integration.ts` (645行)

**状态**: 🔒 保留使用

**引用情况**:
- ✅ `src/main/index.ts` - 主进程直接使用
- ✅ `src/main/main.ts` - 主进程直接使用

**使用方式**:
```typescript
// src/main/index.ts
import { MedicalIntegrationService } from '../services/legacy/medical-integration';
this.medicalService = new MedicalIntegrationService(config.medical, this.logger);
```

**adapter状态**:
- ❌ 无对应adapter
- ❌ 不需要adapter

**保留原因**:
- 这是一个**独立的医疗系统集成服务**,不是AI功能的一部分
- 提供患者搜索、记录查询、研究搜索等医疗系统特定功能
- 包含缓存管理、请求队列、健康检查等复杂逻辑
- **没有对应的后端API实现**,也不需要adapter封装

**详细说明**: 见 `src/services/legacy/README.md`

---

### 📦 仅类型定义 (1个文件)

#### 1. `patient-info-extractor.ts` (280行)

**状态**: 📦 仅类型定义

**引用情况**:
- ✅ `src/renderer/components/medical/PatientInfoDisplay.tsx` - **仅类型导入**

**使用方式**:
```typescript
// PatientInfoDisplay.tsx
import type { PatientInfo } from '../../../services/legacy/patient-info-extractor';
```

**分析**:
- ❌ 服务本身未被使用
- ✅ 仅 `PatientInfo` 类型被导入
- ✅ 功能已由 `vision-adapter.ts` 通过后端API实现

**adapter状态**:
- ✅ 功能已由 `vision-adapter.ts` 实现
- ❌ 不需要单独的patient-adapter

**保留原因**:
- 提供 `PatientInfo` 类型定义
- 可以考虑将类型定义提取到 `src/shared/types.ts`
- 然后删除此文件

**建议**:
1. 将 `PatientInfo` 类型移动到 `src/shared/types.ts`
2. 更新 `PatientInfoDisplay.tsx` 的import
3. 删除 `patient-info-extractor.ts`

---

## 🎯 清理建议

### 立即可以执行的操作

#### 1. 提取类型定义并删除 `patient-info-extractor.ts`

**步骤**:
1. 将 `PatientInfo`, `OCRResult`, `ExtractionConfig` 类型移动到 `src/shared/types.ts`
2. 更新 `PatientInfoDisplay.tsx` 的import:
   ```typescript
   // 修改前
   import type { PatientInfo } from '../../../services/legacy/patient-info-extractor';
   
   // 修改后
   import type { PatientInfo } from '../../../shared/types';
   ```
3. 删除 `src/services/legacy/patient-info-extractor.ts`

**预计时间**: 15分钟

---

### 需要进一步确认的操作

#### 1. 删除 `web-search.ts`

**前提条件**:
- 确认 `ai.ts` 的网络搜索功能不再需要
- 或者确认后端API已完全替代

**步骤**:
1. 从 `ai.ts` 中移除 `WebSearchService` 的导入和使用
2. 删除 `src/services/legacy/web-search.ts`

**预计时间**: 30分钟

---

### 长期迁移计划

#### 阶段1: 完成adapter迁移 (预计2周)

**目标**: 主进程完全使用adapter,不再直接导入legacy服务

**文件**:
- `ai.ts` → 完全使用 `ai-adapter.ts`
- `voice.ts` → 完全使用 `voice-adapter.ts`
- `bisheng.ts` → 完全使用 `agent-adapter.ts`
- `desktop-recognition.ts` → 完全使用 `vision-adapter.ts`

**步骤**:
1. 更新 `src/main/index.ts` 和 `src/main/main.ts`
2. 将所有legacy service导入替换为adapter导入
3. 测试所有功能正常工作
4. 提交代码

#### 阶段2: 删除legacy实现 (预计1周)

**前提条件**: 阶段1完成,所有adapter已被使用

**文件**:
- 删除 `ai.ts`
- 删除 `voice.ts`
- 删除 `voice-recognition.ts`
- 删除 `bisheng.ts`
- 删除 `desktop-recognition.ts`
- 删除 `web-search.ts`

**保留**:
- `medical-integration.ts` - 继续使用
- `screenshot.ts` - 继续使用

---

## 📈 进度追踪

| 阶段 | 状态 | 完成时间 |
|------|------|---------|
| 审计legacy代码 | ✅ 完成 | 2025-10-26 |
| 提取类型定义 | ⏳ 待执行 | - |
| 完成adapter迁移 | ⏳ 待执行 | - |
| 删除legacy实现 | ⏳ 待执行 | - |

---

**最后更新**: 2025-10-26  
**审计人员**: AI Assistant

