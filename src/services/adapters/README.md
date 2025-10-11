# Service Adapters (服务适配器)

✅ **推荐**: 所有新代码应使用此目录中的适配器。

## 说明

服务适配器实现了统一的接口，内部可以切换新旧实现。

### 设计模式

使用**适配器模式**实现新旧服务的无缝切换：

```typescript
export class AIServiceAdapter {
  private useBackend = true; // 配置开关
  
  async processMessage(message: string) {
    if (this.useBackend) {
      // 调用后端API (新实现)
      return this.apiClient.post('/ai/chat', { message });
    } else {
      // 调用前端服务 (旧实现)
      return this.legacyService.processMessage(message);
    }
  }
}
```

### 使用方法

```typescript
import { AIServiceAdapter } from '@/services/adapters/ai-adapter';

const aiService = new AIServiceAdapter();
const response = await aiService.processMessage('你好');
```

### 配置开关

在 `config/features.ts` 中控制使用新旧实现：

```typescript
export const FEATURE_FLAGS = {
  USE_BACKEND_AI: true,      // 使用后端AI服务
  USE_BACKEND_OCR: false,    // 使用后端OCR服务
  USE_BACKEND_VOICE: false,  // 使用后端语音服务
};
```

### 开发指南

1. **创建适配器**: 继承基础适配器类
2. **实现接口**: 保持与旧服务相同的接口
3. **添加开关**: 支持新旧实现切换
4. **编写测试**: 确保新旧实现行为一致
5. **更新文档**: 记录使用方法和注意事项

### 迁移进度

| 适配器 | 状态 | 负责人 | 完成日期 |
|--------|------|--------|---------|
| ai-adapter.ts | ✅ 已完成 | AI | 2025-10-10 |
| vision-adapter.ts | ✅ 已完成 | AI | 2025-10-10 |
| voice-adapter.ts | ✅ 已完成 | AI | 2025-10-10 |
| agent-adapter.ts | ⏳ 待开始 | - | - |
| config-adapter.ts | ⏳ 待开始 | - | - |

### 已实现的适配器功能

#### AI适配器 (`ai-adapter.ts`)
- ✅ 标准对话 (`processMessage`)
- ✅ 流式对话 (`chatStream`)
- ✅ 内容分析 (`analyzeContent`)
- ✅ 自动故障转移
- ✅ 后端连接测试

#### 视觉适配器 (`vision-adapter.ts`)
- ✅ OCR文字识别 (`recognizeText`)
- ✅ 图像理解 (`understandImage`)
- ✅ 医疗图像分析 (`analyzeMedicalImage`)
- ✅ 文字提取 (`extractTextFromImage`)
- ✅ 自动降级到legacy实现

#### 语音适配器 (`voice-adapter.ts`)
- ✅ 语音识别 (`speechToText`)
- ✅ 语音合成 (`textToSpeech`)
- ✅ 连续识别 (`startContinuousRecognition`)
- ✅ 音频播放 (`playAudio`)
- ✅ 自动降级到legacy实现

---

**最后更新**: 2025-10-10
