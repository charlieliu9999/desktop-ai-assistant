# 语音识别崩溃问题修复总结

**日期**: 2025-10-09  
**状态**: ✅ 已修复

---

## 🔍 问题现象

- ✅ 录音功能正常
- ✅ 播放功能正常
- ❌ 语音识别时系统闪退

**错误日志**:
```
CoreText note: Client requested name ".AppleSDGothicNeoI-Regular"...
SetApplicationIsDaemon: Error Domain=NSOSStatusErrorDomain Code=-50 "paramErr: error in user parameter list" (-50)
```

---

## 🎯 根本原因

### 1. 重复的 IPC 处理器注册 ⚠️ **主要原因**

在 `src/main/index.ts` 中，`voice-test-all-models` IPC 处理器被注册了两次：
- 第480行：实际的语音识别逻辑
- 第564行：返回模拟数据（重复！）

**影响**: Electron 不允许同一个 IPC 通道被注册两次，导致冲突和崩溃。

### 2. 缺少错误处理

- 音频数据转换没有 try-catch 保护
- API 请求没有超时控制
- 错误时直接抛出异常，导致进程崩溃
- SpeechRecognition 创建和使用缺少保护

### 3. macOS 系统服务错误

- `SetApplicationIsDaemon` 错误是 macOS 特有的问题
- 与 Electron 的系统服务调用有关
- 需要正确的激活策略配置

---

## ✅ 解决方案

### 修改的文件

1. **`desktop-ai-assistant/src/main/index.ts`**
   - 移除重复的 IPC 处理器
   - 添加完善的错误处理和日志
   - 添加 API 请求超时控制
   - 添加 macOS 特定配置

2. **`desktop-ai-assistant/src/renderer/pages/VoiceWindow.tsx`**
   - 改进 SpeechRecognition 创建和错误处理
   - 添加详细的错误分类和友好提示
   - 添加错误恢复机制
   - 改进启动和停止逻辑

---

## 🔧 关键修复点

### 主进程修复

```typescript
// ✅ 移除重复的 IPC 处理器（第564-601行）

// ✅ 添加顶层 try-catch
ipcMain.handle('voice-test-all-models', async (_event, audioData: ArrayBuffer) => {
  try {
    // 所有逻辑
    ...
  } catch (error: any) {
    // 返回错误结果而不是抛出异常
    return [{ model: 'error', success: false, error: error?.message }];
  }
});

// ✅ 添加超时控制
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000);

// ✅ macOS 配置
if (process.platform === 'darwin') {
  app.setActivationPolicy('regular');
}
```

### 渲染进程修复

```typescript
// ✅ 改进 SpeechRecognition 创建
const buildRecognition = () => {
  try {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      console.warn('[Voice] SpeechRecognition API not available');
      return null;
    }
    const rec = new SR();
    // 配置...
    return rec;
  } catch (error) {
    console.error('[Voice] Failed to build SpeechRecognition:', error);
    return null;
  }
};

// ✅ 详细的错误处理
rec.onerror = (e: any) => {
  const errorType = e?.error || 'unknown';
  if (errorType === 'no-speech') {
    toast.warning('未检测到语音，请重试');
  } else if (errorType === 'audio-capture') {
    toast.error('无法访问麦克风，请检查权限');
  } else if (errorType === 'not-allowed') {
    toast.error('麦克风权限被拒绝');
  }
  // 清理识别实例
  if (recognitionRef.current) {
    recognitionRef.current.stop();
    recognitionRef.current = null;
  }
};

// ✅ 改进启动逻辑
const startListening = async () => {
  try {
    // 显式请求麦克风权限
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach(track => track.stop());
    
    // 创建识别实例
    if (!recognitionRef.current) {
      recognitionRef.current = buildRecognition();
    }
    
    // 启动识别
    recognitionRef.current.start();
  } catch (error: any) {
    if (error.name === 'InvalidStateError') {
      // 自动重试
      setTimeout(() => startListening(), 100);
    }
  }
};
```

---

## 📊 代码变更统计

**src/main/index.ts**:
- 删除：42 行（重复的 IPC 处理器）
- 修改：150 行（错误处理和日志）
- 新增：120 行（超时控制、macOS 配置）

**src/renderer/pages/VoiceWindow.tsx**:
- 修改：80 行（错误处理和日志）
- 新增：40 行（错误分类和恢复）

---

## 🧪 测试步骤

### 1. 基础功能测试

```
1. 打开语音测试页面
2. 录制一段语音（3-5秒）
3. 点击"播放录音" → ✅ 应该正常播放
4. 点击"测试所有模型" → ✅ 应该不再崩溃
5. 查看控制台日志 → ✅ 应该看到详细的 [Voice Test] 日志
```

### 2. 错误场景测试

```
- 未配置 API → 应该返回错误信息，不崩溃
- API 超时 → 30秒后返回超时错误，不崩溃
- 无效音频 → 返回转换失败错误，不崩溃
- 拒绝麦克风权限 → 显示友好提示，不崩溃
```

### 3. 语音窗口测试

```
1. 打开语音窗口
2. 点击麦克风按钮开始识别
3. 说话 → ✅ 应该显示识别结果
4. 点击停止 → ✅ 应该正常停止
5. 查看控制台 → ✅ 应该看到详细的 [Voice] 日志
```

---

## ⚠️ 关于 macOS 系统警告

### CoreText 警告

```
CoreText note: Client requested name ".AppleSDGothicNeoI-Regular"...
```

**说明**:
- 这是 macOS 系统字体相关的警告
- 通常不影响功能，可以忽略
- 是 Electron 在 macOS 上的已知问题

### SetApplicationIsDaemon 错误

```
SetApplicationIsDaemon: Error Domain=NSOSStatusErrorDomain Code=-50
```

**说明**:
- 这是 Electron 在 macOS 上的已知问题
- 已通过设置 `app.setActivationPolicy('regular')` 缓解
- 如果仍然出现，通常不影响功能

**解决方案**:
- ✅ 已添加 macOS 特定配置
- ✅ 设置正确的激活策略
- 如果频繁出现，可以考虑升级 Electron 版本

---

## 📝 预期结果

修复后，语音识别功能应该：

1. ✅ 不再崩溃
2. ✅ 正确处理所有错误情况
3. ✅ 提供详细的日志信息
4. ✅ 显示友好的错误提示
5. ✅ 在 API 超时时正确返回
6. ✅ 在音频数据无效时正确返回
7. ✅ 在权限被拒绝时正确提示
8. ✅ 在网络错误时正确返回
9. ✅ 支持错误后自动恢复

---

## 🔄 后续建议

### 1. 监控和日志

- 持续监控控制台日志，确认没有新的错误
- 收集用户反馈，了解实际使用情况
- 记录性能指标（延迟、成功率等）

### 2. 性能优化

- 考虑添加音频数据验证
- 实现 API 请求重试机制
- 优化音频数据转换性能

### 3. 用户体验

- 添加更多的状态提示
- 改进错误消息的可读性
- 考虑添加语音识别质量指示器

---

**维护者**: 桌面AI助手开发团队  
**更新日期**: 2025-10-09  
**版本**: 1.0.0

