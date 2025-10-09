# Bisheng 智能体测试指南

## 概述

本项目提供了与 Bisheng 智能体平台交互的测试功能，包括两个版本：
1. **集成版本**：在主应用的 "Bisheng测试" 标签页中
2. **独立版本**：独立的 HTML 测试页面

## 功能特性

### 1. 工作流列表获取
- 自动从 Bisheng 平台获取可用的工作流列表
- 支持分页显示（默认每页10个）
- 显示工作流名称、描述和状态信息
- 支持手动刷新列表

### 2. 智能体对话
- 选择工作流后可与智能体进行对话
- 支持流式响应（stream: true）
- 维护会话状态（session_id 和 message_id）
- 实时显示对话历史

### 3. 用户界面
- 美观的现代化 UI 设计
- 响应式布局，支持不同屏幕尺寸
- 深色/浅色主题支持
- 实时状态反馈和错误提示

## 使用方法

### 方法一：使用主应用

1. 启动主应用：
   ```bash
   npm run dev
   ```

2. 在主应用界面中点击 "Bisheng测试" 标签页

3. 等待工作流列表自动加载

4. 选择一个工作流开始对话

### 方法二：使用独立测试页面

1. 确保 Bisheng 服务正在运行（http://localhost:7860）

2. 在浏览器中打开 `bisheng-test.html` 文件

3. 点击 "刷新工作流列表" 按钮

4. 选择一个工作流开始对话

## API 接口说明

### 获取工作流列表
```
GET http://localhost:7860/api/v1/workflow/list?page_size=10&page_num=1
Headers:
  accept: application/json
```

### 调用工作流
```
POST http://localhost:7860/api/v2/workflow/invoke
Headers:
  accept: application/json
  Content-Type: application/json
Body:
{
  "workflow_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
  "stream": true,
  "user_input": {
    "query": "用户输入的消息"
  },
  "message_id": 0,
  "session_id": "string"
}
```

## 配置要求

### 前置条件
1. Bisheng 服务必须运行在 `http://localhost:7860`
2. 确保网络连接正常
3. 浏览器支持现代 JavaScript 特性

### 环境变量
无需特殊环境变量配置，使用默认的本地地址。

## 故障排除

### 常见问题

1. **工作流列表加载失败**
   - 检查 Bisheng 服务是否正在运行
   - 确认服务地址是否为 `http://localhost:7860`
   - 检查网络连接

2. **消息发送失败**
   - 确认已选择工作流
   - 检查工作流 ID 是否有效
   - 查看浏览器控制台错误信息

3. **界面显示异常**
   - 检查浏览器是否支持现代 CSS 特性
   - 尝试刷新页面
   - 清除浏览器缓存

### 调试技巧

1. 打开浏览器开发者工具查看网络请求
2. 检查控制台错误信息
3. 验证 API 响应格式是否符合预期

## 技术实现

### 前端技术栈
- React + TypeScript（集成版本）
- 原生 HTML/CSS/JavaScript（独立版本）
- Tailwind CSS（样式框架）
- Lucide React（图标库）

### 核心功能
- 异步 API 调用
- 状态管理
- 错误处理
- 用户交互反馈

## 扩展功能

### 可添加的功能
1. 工作流搜索和过滤
2. 对话历史导出
3. 多会话管理
4. 自定义 API 端点配置
5. 消息模板和快捷回复

### 自定义配置
可以通过修改代码来：
- 更改 API 端点地址
- 调整分页大小
- 自定义 UI 样式
- 添加新的消息类型

## 注意事项

1. 确保 Bisheng 服务正常运行
2. 网络连接稳定
3. 浏览器支持现代特性
4. 定期更新依赖包

## 更新日志

### v1.0.0
- 初始版本发布
- 支持工作流列表获取
- 支持智能体对话
- 提供集成和独立两个版本
