# ACRAC服务集成测试指南

## 前置条件

### 1. 确认ACRAC服务运行

```bash
# 检查ACRAC服务状态
curl http://localhost:5173/api/v1/acrac/rag-llm/rag-llm-status

# 预期响应:
# {
#   "status": "ok",
#   "service": "RAG+LLM",
#   ...
# }
```

### 2. 测试ACRAC API

```bash
# 测试智能推荐接口
curl -X POST http://localhost:5173/api/v1/acrac/rag-llm/intelligent-recommendation \
  -H "Content-Type: application/json" \
  -d '{
    "clinical_query": "持续性头痛3天,伴有恶心呕吐。患者:45岁女性",
    "show_reasoning": true,
    "top_scenarios": 3,
    "top_recommendations_per_scenario": 5,
    "similarity_threshold": 0.3
  }'
```

**预期响应**:
```json
{
  "success": true,
  "query": "持续性头痛3天,伴有恶心呕吐。患者:45岁女性",
  "llm_recommendations": {
    "recommendations": [
      {
        "procedure_name": "头颅CT平扫",
        "modality": "CT",
        "body_part": "头颅",
        "appropriateness_rating": 9,
        "appropriateness_category_zh": "通常适用",
        "reasoning_zh": "患者主诉持续性头痛伴恶心呕吐...",
        "evidence_level": "A"
      }
    ]
  },
  "processing_time_ms": 1500,
  "model_used": "deepseek-chat"
}
```

## 启动前端应用

### 1. 启动Electron应用

```bash
cd desktop-ai-assistant/glass-test-app
npm start
```

### 2. 应用界面说明

应用启动后会显示一个玻璃态窗口,包含以下部分:

1. **患者信息区域**:
   - 显示当前患者的基本信息
   - 姓名、性别、年龄、主诉、病史等

2. **推荐列表区域**:
   - 显示AI生成的检查推荐
   - 每个推荐包含:优先级、检查名称、理由、紧急程度、预估费用等

3. **刷新按钮**:
   - 点击重新生成推荐

4. **AI问答区域**:
   - 可以输入问题咨询AI

## 测试流程

### 测试1: 基本推荐功能

1. **启动应用**
2. **点击"刷新推荐"按钮**
3. **观察加载状态**:
   - 应显示"正在生成推荐..."
   - 加载指示器应该可见
4. **查看推荐结果**:
   - 应显示3-5个推荐项目
   - 每个推荐应包含完整信息
   - 优先级标签应正确显示(高/中/低)

**预期结果**:
- ✅ 成功调用ACRAC服务
- ✅ 正确解析响应数据
- ✅ 推荐列表正确显示
- ✅ 优先级、紧急程度等信息正确

### 测试2: 错误处理(ACRAC服务不可用)

1. **停止ACRAC服务**
2. **点击"刷新推荐"按钮**
3. **观察降级行为**:
   - 应显示模拟数据
   - 控制台应输出警告信息

**预期结果**:
- ✅ 不会崩溃
- ✅ 显示降级数据
- ✅ 用户体验良好

### 测试3: 不同患者场景

修改患者信息测试不同场景:

#### 场景1: 头痛患者
```javascript
// 在浏览器控制台修改患者信息
currentPatient = {
  name: '张三',
  gender: '男',
  age: 45,
  chiefComplaint: '持续性头痛3天,伴有恶心呕吐',
  history: '高血压病史5年'
};
refreshRecommendations();
```

**预期推荐**:
- 头颅CT平扫
- 头颅MRI
- 颈椎X线片

#### 场景2: 胸痛患者
```javascript
currentPatient = {
  name: '李四',
  gender: '女',
  age: 55,
  chiefComplaint: '胸痛2小时,放射至左肩',
  history: '糖尿病病史10年'
};
refreshRecommendations();
```

**预期推荐**:
- 心电图
- 胸部CT
- 冠状动脉CTA

#### 场景3: 腹痛患者
```javascript
currentPatient = {
  name: '王五',
  gender: '男',
  age: 35,
  chiefComplaint: '右下腹痛6小时,伴发热',
  history: '无特殊病史'
};
refreshRecommendations();
```

**预期推荐**:
- 腹部超声
- 腹部CT平扫
- 血常规

### 测试4: 用户反馈功能

1. **点击推荐项目的👍按钮**
2. **观察反馈状态**:
   - 按钮应变为激活状态
   - 控制台应输出反馈信息

3. **点击推荐项目的👎按钮**
4. **观察反馈状态**:
   - 按钮应变为激活状态
   - 应显示评论输入框

**预期结果**:
- ✅ 反馈按钮状态正确切换
- ✅ 反馈数据正确记录

### 测试5: AI问答功能

1. **在AI问答输入框输入问题**:
   - "CT和MRI有什么区别?"
   - "这个检查需要空腹吗?"
   - "检查大概需要多长时间?"

2. **点击发送按钮**

3. **观察响应**:
   - 应显示加载状态
   - 应返回AI回答

**预期结果**:
- ✅ 问题成功发送
- ✅ 收到AI回答
- ✅ 回答内容相关且准确

## 调试技巧

### 1. 查看网络请求

打开Chrome DevTools (Ctrl+Shift+I 或 Cmd+Option+I):

1. **切换到Network标签**
2. **点击"刷新推荐"**
3. **查找ACRAC API请求**:
   - URL: `http://localhost:5173/api/v1/acrac/rag-llm/intelligent-recommendation`
   - Method: POST
   - Status: 200 OK

4. **查看请求详情**:
   - Headers: 检查Content-Type
   - Payload: 检查请求参数
   - Response: 检查响应数据

### 2. 查看控制台日志

```javascript
// 在浏览器控制台查看日志
// 成功调用ACRAC服务时:
// "调用ACRAC服务成功"

// ACRAC服务不可用时:
// "调用ACRAC服务失败: ..."
// "使用模拟数据作为降级方案"
```

### 3. 手动测试API调用

在浏览器控制台直接调用函数:

```javascript
// 测试获取推荐
const testPatient = {
  name: '测试患者',
  gender: '男',
  age: 40,
  chiefComplaint: '头痛',
  history: '无'
};

getAIRecommendations(testPatient).then(recs => {
  console.log('推荐结果:', recs);
});

// 测试转换函数
const mockACRACData = {
  success: true,
  llm_recommendations: {
    recommendations: [
      {
        procedure_name: '测试检查',
        modality: 'CT',
        body_part: '头颅',
        appropriateness_rating: 8,
        appropriateness_category_zh: '通常适用',
        reasoning_zh: '测试理由'
      }
    ]
  }
};

const converted = convertACRACResponse(mockACRACData);
console.log('转换结果:', converted);
```

## 常见问题

### Q1: ACRAC服务连接失败

**症状**: 
- 控制台显示 "调用ACRAC服务失败"
- 显示模拟数据

**解决方案**:
1. 检查ACRAC服务是否运行: `curl http://localhost:5173/api/v1/acrac/rag-llm/rag-llm-status`
2. 检查端口是否正确(5173)
3. 检查防火墙设置

### Q2: CORS错误

**症状**:
- 控制台显示 "Access-Control-Allow-Origin" 错误

**解决方案**:
1. 在ACRAC服务中配置CORS
2. 或在Electron中配置webSecurity: false (仅开发环境)

### Q3: 推荐结果为空

**症状**:
- API调用成功但没有推荐

**解决方案**:
1. 检查ACRAC响应数据结构
2. 检查 `convertACRACResponse` 函数逻辑
3. 降低 `similarity_threshold` 参数

### Q4: 推荐质量不佳

**症状**:
- 推荐不相关或不准确

**解决方案**:
1. 优化 `clinical_query` 构建逻辑
2. 调整 `top_scenarios` 和 `top_recommendations_per_scenario` 参数
3. 调整 `similarity_threshold` 参数
4. 检查ACRAC服务的数据质量

## 性能测试

### 响应时间测试

```javascript
// 测试推荐生成时间
async function testPerformance() {
  const start = Date.now();
  
  const recs = await getAIRecommendations({
    name: '测试',
    gender: '男',
    age: 40,
    chiefComplaint: '头痛',
    history: ''
  });
  
  const end = Date.now();
  console.log(`推荐生成耗时: ${end - start}ms`);
  console.log(`推荐数量: ${recs.length}`);
}

testPerformance();
```

**预期性能**:
- 响应时间: 1-3秒
- 推荐数量: 3-5个

## 下一步优化

1. **添加缓存机制**: 相同查询不重复调用API
2. **优化加载体验**: 添加骨架屏、进度条
3. **增强错误提示**: 更友好的错误信息
4. **添加重试机制**: API调用失败自动重试
5. **性能监控**: 记录API调用时间和成功率

