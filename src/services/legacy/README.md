# Legacy Services (旧服务实现)

⚠️ **警告**: 此目录包含旧的服务实现，仅供参考。

## 说明

这些文件是原有的前端服务实现，在架构重构过程中被迁移到此目录。

### 不要在新代码中使用

- ❌ 不要导入此目录的代码
- ❌ 不要修改此目录的代码
- ✅ 使用 `src/services/adapters/` 中的新实现

### 保留原因

1. **参考**: 了解原有实现逻辑
2. **对比**: 验证新实现的正确性
3. **回滚**: 紧急情况下的备份方案

### 迁移状态

| 服务文件 | 对应适配器 | 迁移状态 | 说明 |
|---------|-----------|---------|------|
| `ai.ts` | `adapters/ai-adapter.ts` | ✅ 已迁移 | AI服务已有适配器 |
| `voice.ts` | `adapters/voice-adapter.ts` | ✅ 已迁移 | 语音服务已有适配器 |
| `voice-recognition.ts` | `adapters/voice-adapter.ts` | ✅ 已迁移 | 包含在语音适配器中 |
| `bisheng.ts` | `adapters/agent-adapter.ts` | ✅ 已迁移 | Bisheng智能体已有适配器 |
| `desktop-recognition.ts` | `adapters/vision-adapter.ts` | ✅ 已迁移 | 桌面识别已有适配器 |
| `patient-info-extractor.ts` | - | 📦 仅类型定义 | 仅被用作类型导入,功能已由vision-adapter实现 |
| `medical-integration.ts` | - | 🔒 保留使用 | **医疗系统集成服务,主进程直接使用,无需adapter** |
| `web-search.ts` | - | ⏳ 待审计 | 网络搜索服务 |
| `screenshot.ts` | - | ⏳ 待审计 | 截图服务 |

### 保留说明

#### `medical-integration.ts` - 为何保留?

**原因**:
- 这是一个**独立的医疗系统集成服务**,不是AI功能的一部分
- 主进程 (`src/main/index.ts`, `src/main/main.ts`) 直接使用此服务
- 提供患者搜索、记录查询、研究搜索等医疗系统特定功能
- 包含缓存管理、请求队列、健康检查等复杂逻辑
- **没有对应的后端API实现**,也不需要adapter封装

**使用情况**:
```typescript
// src/main/index.ts
this.medicalService = new MedicalIntegrationService(config.medical, this.logger);
await this.medicalService.initialize();

// IPC handlers
ipcMain.handle('medical:search-patients', (_, filters) => {
  return this.medicalService.searchPatients(filters.query || '');
});
```

**结论**: 保留在legacy目录,继续使用,不创建adapter。

### 清理计划

- ✅ 已迁移的服务: 可以在后续版本中删除legacy实现
- 🔒 保留使用的服务: 继续保留,不删除
- ⏳ 待审计的服务: 需要进一步分析后决定

---

**最后更新**: 2025-10-26
