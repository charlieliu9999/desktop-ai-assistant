# 语音识别崩溃问题修复报告

**日期**: 2025-10-09  
**版本**: 1.0.0

---

## 📋 问题描述

**症状**:
- 录音功能正常 ✅
- 播放功能正常 ✅
- 语音识别时系统闪退 ❌

**错误日志**:
```
2025-10-09 23:48:30.939 Electron Helper (Renderer)[49756:34835064] CoreText note: Client requested name ".AppleSDGothicNeoI-Regular", it will get TimesNewRomanPSMT rather than the intended font. All system UI font access should be through proper APIs such as CTFontCreateUIFontForLanguage() or +[NSFont systemFontOfSize:].
2025-10-09 23:48:30.939 Electron Helper (Renderer)[49756:34835064] CoreText note: Set a breakpoint on CTFontLogSystemFontNameRequest to debug.
[73987:1009/234848.514932:ERROR:system_services.cc(34)] SetApplicationIsDaemon: Error Domain=NSOSStatusErrorDomain Code=-50 "paramErr: error in user parameter list" (-50)
```

---

## 🔍 问题分析

### 1. 重复的 IPC 处理器注册

**问题位置**: `desktop-ai-assistant/src/main/index.ts`

在第480行和第564行，同一个 IPC 处理器 `voice-test-all-models` 被注册了两次：

```typescript
// 第一次注册（第480行）
ipcMain.handle('voice-test-all-models', async (_event, audioData: ArrayBuffer) => {
  // 实际的语音识别逻辑
  ...
});

// 第二次注册（第564行）- 重复！
ipcMain.handle('voice-test-all-models', async (_, audioData: ArrayBuffer) => {
  // 返回模拟数据
  ...
});
```

**影响**:
- Electron 不允许同一个 IPC 通道被注册两次
- 这会导致冲突和未定义行为
- 可能导致主进程崩溃

### 2. 缺少错误处理和日志

**问题**:
- 音频数据转换没有 try-catch 保护
- API 请求没有超时控制
- 缺少详细的日志记录
- 错误时直接抛出异常，导致进程崩溃

### 3. macOS 系统服务错误

**CoreText 警告**:
- 这是 macOS 系统字体相关的警告
- 通常不会导致崩溃，但表明有系统资源访问问题

**SetApplicationIsDaemon 错误**:
- 参数错误（Code=-50）
- 可能与 Electron 的系统服务调用有关
- 在某些情况下可能导致崩溃

---

## ✅ 解决方案

### 1. 移除重复的 IPC 处理器

**修改位置**: `desktop-ai-assistant/src/main/index.ts` 第560-601行

```typescript
// ❌ 删除了重复的注册
// ipcMain.handle('voice-test-all-models', async (_, audioData: ArrayBuffer) => {
//   // 模拟数据...
// });
```

**结果**: 只保留第一个实际的语音识别处理器

### 2. 添加完善的错误处理

**修改位置**: `desktop-ai-assistant/src/main/index.ts` 第479-713行

#### 2.1 添加顶层 try-catch

```typescript
ipcMain.handle('voice-test-all-models', async (_event, audioData: ArrayBuffer) => {
  try {
    // 所有逻辑都在 try 块中
    ...
  } catch (error: any) {
    this.logger.error('[Voice Test] Voice recognition test failed with error:', error);
    // 返回错误结果而不是抛出异常，避免崩溃
    return [{
      model: 'error',
      success: false,
      accuracy: 0,
      latency: 0,
      text: '',
      confidence: 0,
      error: error?.message || String(error),
      timestamp: Date.now()
    }];
  }
});
```

#### 2.2 安全的音频数据转换

```typescript
// 安全地转换 ArrayBuffer 到 Buffer
let buf: Buffer;
try {
  const toBuffer = (ab: ArrayBuffer) => Buffer.from(new Uint8Array(ab));
  buf = toBuffer(audioData);
  this.logger.info(`[Voice Test] Audio data converted to buffer, size: ${buf.length} bytes`);
} catch (error) {
  this.logger.error('[Voice Test] Failed to convert audio data:', error);
  throw new Error('音频数据转换失败');
}
```

#### 2.3 添加 API 请求超时控制

```typescript
// Whisper API 请求
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

try {
  const resp = await fetch(whisperUrl, { 
    method: 'POST', 
    body: buf as any, 
    headers: { 'Content-Type': 'audio/wav' },
    signal: controller.signal  // 添加超时信号
  });
  clearTimeout(timeoutId);
  
  // 处理响应...
} catch (fetchError: any) {
  clearTimeout(timeoutId);
  if (fetchError.name === 'AbortError') {
    this.logger.error('[Voice Test] Whisper request timeout');
    results.push({ 
      model: 'whisper', 
      success: false, 
      error: '请求超时（30秒）', 
      ...
    });
  } else {
    throw fetchError;
  }
}
```

### 3. 添加详细的日志记录

**添加的日志点**:

```typescript
this.logger.info('[Voice Test] Starting voice recognition test for all models');
this.logger.info(`[Voice Test] Audio data converted to buffer, size: ${buf.length} bytes`);
this.logger.info('[Voice Test] Adding browser placeholder result');
this.logger.info('[Voice Test] Testing Whisper model');
this.logger.info(`[Voice Test] Whisper API URL: ${whisperUrl}`);
this.logger.info('[Voice Test] Whisper recognition successful:', data);
this.logger.error(`[Voice Test] Whisper API error: ${resp.status} ${resp.statusText}`);
this.logger.info('[Voice Test] Testing FunASR model');
this.logger.info(`[Voice Test] All models tested, returning ${results.length} results`);
```

---

## 📊 修改总结

### 修改的文件

1. `desktop-ai-assistant/src/main/index.ts` - 主进程 IPC 处理器和 macOS 配置
2. `desktop-ai-assistant/src/renderer/pages/VoiceWindow.tsx` - 语音窗口错误处理

### 代码变更统计

**src/main/index.ts**:
- 删除代码：约 42 行（重复的 IPC 处理器）
- 修改代码：约 150 行（添加错误处理和日志）
- 新增代码：约 120 行（超时控制、详细日志、macOS 配置）

**src/renderer/pages/VoiceWindow.tsx**:
- 修改代码：约 80 行（改进错误处理和日志）
- 新增代码：约 40 行（详细的错误分类和恢复逻辑）

### 关键改进点

#### 主进程 (src/main/index.ts)

1. **消除重复注册**:
   - 移除了重复的 `voice-test-all-models` IPC 处理器
   - 避免了 IPC 通道冲突

2. **完善错误处理**:
   - 顶层 try-catch 捕获所有异常
   - 音频数据转换有独立的错误处理
   - API 请求有超时控制
   - 错误时返回结果而不是抛出异常

3. **改进日志记录**:
   - 添加了详细的日志标签 `[Voice Test]`
   - 记录关键步骤和数据
   - 记录成功和失败的详细信息

4. **超时保护**:
   - Whisper API 请求 30 秒超时
   - FunASR API 请求 30 秒超时
   - 超时后正确清理资源

5. **macOS 特定配置**:
   - 设置激活策略为 `regular`，避免 SetApplicationIsDaemon 错误
   - 添加 macOS 平台检测和特殊处理
   - 改进系统服务调用的兼容性

#### 渲染进程 (src/renderer/pages/VoiceWindow.tsx)

1. **改进 SpeechRecognition 创建**:
   - 添加 try-catch 保护
   - 详细的日志记录
   - 配置验证和日志输出

2. **详细的错误分类**:
   - `no-speech` - 未检测到语音
   - `audio-capture` - 无法访问麦克风
   - `not-allowed` - 麦克风权限被拒绝
   - `network` - 网络错误
   - 其他错误类型的友好提示

3. **错误恢复机制**:
   - 错误时清理识别实例
   - 避免状态混乱
   - 自动重置为可用状态

4. **改进启动逻辑**:
   - 显式请求麦克风权限
   - 权限检查和错误处理
   - `InvalidStateError` 自动重试
   - 详细的启动日志

5. **改进停止逻辑**:
   - 安全的停止处理
   - 即使失败也重置状态
   - 详细的停止日志

---

## 🧪 测试建议

### 1. 基础功能测试

```
1. 打开语音测试页面
2. 点击"开始录音"
3. 录制一段语音（3-5秒）
4. 点击"停止录音"
5. 点击"播放录音" - ✅ 应该正常播放
6. 点击"测试所有模型" - ✅ 应该不再崩溃
```

### 2. 错误场景测试

```
1. 测试未配置 API 的情况
   - 应该返回错误信息，不崩溃

2. 测试 API 超时的情况
   - 30秒后应该返回超时错误，不崩溃

3. 测试无效音频数据
   - 应该返回转换失败错误，不崩溃

4. 测试网络断开的情况
   - 应该返回网络错误，不崩溃
```

### 3. 日志验证

```
1. 打开开发者工具控制台
2. 执行语音识别测试
3. 查看日志输出：
   ✅ 应该看到 [Voice Test] 开头的日志
   ✅ 应该看到音频数据大小
   ✅ 应该看到 API URL
   ✅ 应该看到识别结果或错误信息
```

---

## 🔧 后续优化建议

### 1. 改进音频数据处理

```typescript
// 添加音频数据验证
function validateAudioData(audioData: ArrayBuffer): boolean {
  if (!audioData || audioData.byteLength === 0) {
    return false;
  }
  
  // 检查最小音频长度（例如 1KB）
  if (audioData.byteLength < 1024) {
    return false;
  }
  
  return true;
}
```

### 2. 添加重试机制

```typescript
async function fetchWithRetry(url: string, options: any, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);
      if (response.ok) {
        return response;
      }
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      // 等待后重试
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

### 3. 添加性能监控

```typescript
// 记录性能指标
const performanceMetrics = {
  audioConversionTime: 0,
  whisperLatency: 0,
  funasrLatency: 0,
  totalTime: 0
};

// 在关键点记录时间
const conversionStart = Date.now();
// ... 转换逻辑
performanceMetrics.audioConversionTime = Date.now() - conversionStart;
```

---

## ⚠️ 注意事项

### macOS 系统警告

**CoreText 警告**:
- 这是 macOS 系统字体相关的警告
- 通常不影响功能
- 如果需要消除，可以在 Electron 配置中禁用字体回退

**SetApplicationIsDaemon 错误**:
- 这是 Electron 在 macOS 上的已知问题
- 通常不影响功能
- 如果频繁出现，可以考虑升级 Electron 版本

### 语音识别 API

**Whisper API**:
- 需要正确配置 `voice.recognition.whisper.apiUrl`
- 确保 API 服务正常运行
- 建议设置合理的超时时间

**FunASR API**:
- 需要正确配置 `voice.recognition.funasr.apiUrl`
- 确保 API 服务正常运行
- 建议设置合理的超时时间

---

## ✅ 预期结果

修复后，语音识别功能应该：

1. ✅ 不再崩溃
2. ✅ 正确处理所有错误情况
3. ✅ 提供详细的日志信息
4. ✅ 在 API 超时时正确返回
5. ✅ 在音频数据无效时正确返回
6. ✅ 在网络错误时正确返回

---

**维护者**: 桌面AI助手开发团队  
**更新日期**: 2025-10-09

