# Bisheng 集成快速测试指南

## 修复已完成 ✅

已修复的问题:
- ✅ `window.electronAPI.bisheng` 未定义
- ✅ `Cannot read properties of undefined (reading 'login')`
- ✅ `Cannot read properties of undefined (reading 'runConnectionTests')`

## 快速测试步骤

### 1. 启动应用 (开发模式)

```bash
cd desktop-ai-assistant
npm run dev
```

### 2. 配置 Bisheng 服务

1. 点击应用右上角的 **设置图标** ⚙️
2. 滚动到 **"Bisheng 智能体服务"** 部分
3. 填写以下信息:

```
✓ 启用 Bisheng 服务: [勾选]
服务地址: http://localhost:7860
前端地址: http://localhost:3001
用户名: lzhy9999@163.com
密码: Moto@9999
```

### 3. 测试连接

#### 测试 1: 登录测试
1. 点击 **"测试登录"** 按钮
2. ✅ 应该看到: "连接成功! Token 已获取"
3. ❌ 如果失败,检查:
   - Bisheng 服务是否运行在 http://localhost:7860
   - 用户名和密码是否正确

#### 测试 2: 完整测试
1. 点击 **"完整测试"** 按钮
2. ✅ 应该看到:
   ```
   所有测试通过！
   登录: ✓
   工作流列表: ✓ (X个)
   工作流调用: ✓
   ```

### 4. 保存配置

1. 点击 **"保存配置"** 按钮
2. ✅ 应该看到: "配置已保存"

### 5. 使用智能体功能

1. 导航到 **"智能体服务"** 页面
2. ✅ 智能体功能应该可用(不再是灰色)
3. ✅ 应该能看到工作流列表
4. 选择一个工作流
5. 在聊天框中输入测试消息
6. ✅ 应该能收到 AI 回复

## 验证检查清单

- [ ] 应用能正常启动
- [ ] 设置面板中能看到 Bisheng 配置选项
- [ ] "测试登录" 按钮能正常工作
- [ ] "完整测试" 按钮能正常工作
- [ ] 能成功获取 token
- [ ] 能获取工作流列表
- [ ] 智能体功能不再是灰色
- [ ] 能与智能体进行对话
- [ ] 浏览器控制台没有错误

## 故障排查

### 问题: Bisheng 服务连接失败

**检查 Bisheng 服务状态:**
```bash
# 检查后端
curl http://localhost:7860/api/v1/health

# 检查前端
curl http://localhost:3001
```

**启动 Bisheng 服务:**
```bash
# 如果使用 Docker
docker-compose up -d

# 检查日志
docker-compose logs -f
```

### 问题: 仍然看到 "undefined" 错误

**清除缓存并重新构建:**
```bash
cd desktop-ai-assistant
rm -rf dist node_modules/.vite
npm run build
npm run dev
```

### 问题: Token 获取失败

**检查用户名和密码:**
- 确保用户名是完整的邮箱地址
- 确保密码正确
- 尝试在浏览器中登录 Bisheng 前端验证

### 问题: 工作流列表为空

**检查 Bisheng 中是否有工作流:**
1. 打开浏览器访问 http://localhost:3001
2. 登录 Bisheng
3. 检查是否有创建的工作流

## 技术细节

### 修改的文件
1. `src/main/preload.ts` - 添加了 bisheng API 定义和实现
2. `src/main/main.ts` - 改进了配置更新逻辑

### IPC 通道
- `bisheng-login` - 登录
- `bisheng-get-workflows` - 获取工作流列表
- `bisheng-invoke-workflow` - 调用工作流
- `bisheng-get-config` - 获取配置
- `bisheng-update-config` - 更新配置
- `bisheng-is-authenticated` - 检查认证状态
- `bisheng-get-proxy-status` - 获取代理状态
- `bisheng-test-workflow-list` - 测试工作流列表
- `bisheng-test-workflow-invoke` - 测试工作流调用
- `bisheng-run-connection-tests` - 运行完整连接测试

## 相关文档

- `BISHENG_FIX_SUMMARY.md` - 详细的修复总结
- `test-bisheng-fix.md` - 完整的验证指南
- `docs/BISHENG_AGENT_INTEGRATION.md` - Bisheng 集成文档
- `bisheng-test.html` - 独立测试页面

## 成功标志 🎉

如果你能完成以上所有测试步骤,说明 Bisheng 集成已经成功修复!

现在你可以:
- ✅ 在设置中配置和测试 Bisheng 连接
- ✅ 使用智能体服务与 AI 对话
- ✅ 调用工作流处理复杂任务
- ✅ 集成 Bisheng 到你的医疗工作流中

## 下一步

1. **探索工作流**: 在 Bisheng 中创建自定义工作流
2. **集成到医疗场景**: 将智能体用于患者信息提取、诊断建议等
3. **优化配置**: 根据实际使用调整 Bisheng 配置
4. **添加更多功能**: 扩展智能体的能力

祝使用愉快! 🚀

