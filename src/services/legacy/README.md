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

| 服务 | 新实现 | 状态 |
|------|--------|------|
| AI服务 | `adapters/ai-adapter.ts` | ⏳ 开发中 |
| 患者信息提取 | `adapters/patient-adapter.ts` | ⏳ 待开始 |
| OCR识别 | `adapters/ocr-adapter.ts` | ⏳ 待开始 |
| 语音服务 | `adapters/voice-adapter.ts` | ⏳ 待开始 |
| Bisheng集成 | `adapters/bisheng-adapter.ts` | ⏳ 待开始 |
| 医疗系统集成 | `adapters/medical-adapter.ts` | ⏳ 待开始 |
| 网络搜索 | `adapters/search-adapter.ts` | ⏳ 待开始 |

### 清理计划

所有服务迁移完成后，此目录将被删除。

---

**最后更新**: 2025-10-10
