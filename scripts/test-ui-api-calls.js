#!/usr/bin/env node
/**
 * UI API调用功能测试脚本
 * 
 * 测试前端UI调用后端API的各项功能
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ORIGIN = 'http://127.0.0.1:8010';

let report = [];
let testResults = {
  settings: {},
  business: {},
  agent: {}
};

function log(msg) {
  console.log(msg);
  report.push(msg);
}

function section(title) {
  const line = '='.repeat(60);
  log(`\n${line}`);
  log(`  ${title}`);
  log(line);
}

/**
 * 一、AI设置测试
 */
async function testAISettings() {
  section('一、AI设置测试');
  
  // 1.1 Provider列表加载
  log('\n### 1.1 Provider列表加载');
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/providers`);
    const data = await res.json();
    
    if (res.status === 200 && data.success) {
      const providers = data.data?.providers || [];
      log(`✅ 成功加载 ${providers.length} 个provider`);
      log(`   Providers: ${providers.join(', ')}`);
      testResults.settings.providerList = true;
    } else {
      log(`❌ 失败: ${JSON.stringify(data)}`);
      testResults.settings.providerList = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.settings.providerList = false;
  }
  
  // 1.2 模型列表加载
  log('\n### 1.2 模型列表加载');
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/models`);
    const data = await res.json();
    
    if (res.status === 200 && data.success) {
      const models = data.data?.models || {};
      const totalModels = Object.values(models).reduce((sum, arr) => sum + arr.length, 0);
      log(`✅ 成功加载 ${totalModels} 个模型`);
      for (const [provider, modelList] of Object.entries(models)) {
        log(`   ${provider}: ${modelList.join(', ')}`);
      }
      testResults.settings.modelList = true;
    } else {
      log(`❌ 失败: ${JSON.stringify(data)}`);
      testResults.settings.modelList = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.settings.modelList = false;
  }
  
  // 1.3 场景配置列表
  log('\n### 1.3 场景配置列表');
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/api/model-config/configs`);
    const data = await res.json();

    if (res.status === 200) {
      const scenarios = data.scenarios || [];
      log(`✅ 成功加载 ${scenarios.length} 个场景`);
      scenarios.forEach(s => {
        log(`   - ${s}`);
      });
      testResults.settings.scenarioList = true;
    } else {
      log(`❌ 失败: ${JSON.stringify(data)}`);
      testResults.settings.scenarioList = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.settings.scenarioList = false;
  }
  
  // 1.4 模型测试(Dashscope)
  log('\n### 1.4 模型测试 (Dashscope)');
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/chat?scene=ai_chat_aliyun`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hi' }],
        provider: 'dashscope',
        options: {
          model: 'qwen3-max',
          max_tokens: 20
        }
      })
    });
    
    const data = await res.json();
    
    if (res.status === 200 && data.success) {
      log(`✅ Dashscope模型测试成功`);
      log(`   响应: ${data.data?.message?.content?.substring(0, 50)}...`);
      testResults.settings.modelTestDashscope = true;
    } else {
      log(`❌ 失败: ${JSON.stringify(data)}`);
      testResults.settings.modelTestDashscope = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.settings.modelTestDashscope = false;
  }
}

/**
 * 二、AI图片设置测试
 */
async function testVisionSettings() {
  section('二、AI图片设置测试');
  
  const imagePath = path.join(__dirname, '../tests/images/patient_info_sample.png');
  
  if (!fs.existsSync(imagePath)) {
    log('⚠️  测试图片不存在,跳过视觉测试');
    testResults.settings.visionTest = false;
    return;
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  
  // 2.1 基本识别测试
  log('\n### 2.1 基本识别测试 (Dashscope)');
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/vision/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_data: `data:image/png;base64,${base64}`,
        prompt: '请描述这张图片',
        provider: 'dashscope',
        model: 'qwen-vl-plus',
        max_tokens: 200
      })
    });
    
    const data = await res.json();
    
    if (res.status === 200 && data.success) {
      log(`✅ 视觉识别测试成功`);
      log(`   描述长度: ${data.result?.description?.length || 0} 字符`);
      testResults.settings.visionTest = true;
    } else {
      log(`❌ 失败: ${JSON.stringify(data)}`);
      testResults.settings.visionTest = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.settings.visionTest = false;
  }
  
  // 2.2 结构化数据提取测试
  log('\n### 2.2 结构化数据提取测试');
  try {
    const prompt = '你是医疗信息抽取助手。请从这张医疗信息系统截图中提取患者关键信息,并严格以JSON格式输出,不要任何解释或代码块标记。\n\n输出JSON的键名(必须全部包含,没有的信息使用空字符串或0):\n- patient_name: 姓名\n- gender: 性别(男/女/未知)\n- age: 年龄(数字)\n- medical_record_number: 病历号\n- chief_complaint: 主诉\n- diagnosis: 诊断\n- confidence: 置信度(0-1)\n\n只返回JSON,不要```json标记,不要其他说明。';

    const res = await fetch(`${BACKEND_ORIGIN}/v1/vision/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_data: `data:image/png;base64,${base64}`,
        prompt: prompt,
        provider: 'dashscope',
        model: 'qwen-vl-plus',
        schema_name: 'patient_info_v1',
        temperature: 0.1,
        max_tokens: 500
      })
    });
    
    const data = await res.json();
    
    if (res.status === 200 && data.success && data.result?.structured) {
      log(`✅ 结构化提取成功`);
      const info = data.result.structured;
      log(`   姓名: ${info.patient_name || 'N/A'}`);
      log(`   年龄: ${info.age || 'N/A'}`);
      log(`   诊断: ${info.diagnosis?.substring(0, 30) || 'N/A'}...`);
      testResults.settings.visionStructured = true;
    } else {
      log(`❌ 未提取到结构化数据`);
      testResults.settings.visionStructured = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.settings.visionStructured = false;
  }
}

/**
 * 三、AI语音设置测试
 */
async function testVoiceSettings() {
  section('三、AI语音设置测试');
  
  const audioPath = path.join(__dirname, '../tests/audio/test.wav');
  
  if (!fs.existsSync(audioPath)) {
    log('⚠️  测试音频不存在,跳过语音测试');
    testResults.settings.voiceTest = false;
    return;
  }
  
  const audioBuffer = fs.readFileSync(audioPath);
  const base64 = audioBuffer.toString('base64');
  
  // 3.1 语音识别测试
  log('\n### 3.1 语音识别测试 (OpenAI Whisper)');
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/voice/stt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_data: `data:audio/wav;base64,${base64}`,
        language: 'zh',
        audio_mime: 'audio/wav'
      })
    });
    
    const data = await res.json();
    
    if (res.status === 200 && data.success) {
      log(`✅ 语音识别成功`);
      log(`   识别文本: "${data.result?.text}"`);
      log(`   置信度: ${data.result?.confidence || 'N/A'}`);
      testResults.settings.voiceTest = true;
    } else {
      log(`❌ 失败: ${JSON.stringify(data)}`);
      testResults.settings.voiceTest = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.settings.voiceTest = false;
  }
}

/**
 * 四、智能体平台设置测试
 */
async function testAgentSettings() {
  section('四、智能体平台设置测试');
  
  // 4.1 连接测试
  log('\n### 4.1 连接测试');
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/agent/workflows`);
    const data = await res.json();
    
    if (res.status === 200) {
      const count = Array.isArray(data) ? data.length : 0;
      log(`✅ 连接成功`);
      log(`   Workflow数量: ${count}`);
      testResults.settings.agentConnection = true;
    } else {
      log(`❌ 连接失败: ${JSON.stringify(data)}`);
      testResults.settings.agentConnection = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.settings.agentConnection = false;
  }
}

/**
 * 五、业务页面功能测试
 */
async function testBusinessPages() {
  section('五、业务页面功能测试');
  
  // 5.1 AI对话
  log('\n### 5.1 AI对话功能');
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/chat?scene=ai_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '你好,我是一名医生' }
        ],
        provider: 'dashscope',
        options: {
          model: 'qwen3-max',
          max_tokens: 100
        }
      })
    });
    
    const data = await res.json();
    
    if (res.status === 200 && data.success) {
      log(`✅ AI对话功能正常`);
      log(`   回复: ${data.data?.message?.content?.substring(0, 50)}...`);
      testResults.business.aiChat = true;
    } else {
      log(`❌ 失败`);
      testResults.business.aiChat = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.business.aiChat = false;
  }
  
  // 5.2 患者信息提取(已在视觉测试中完成)
  log('\n### 5.2 患者信息提取');
  log(`${testResults.settings.visionStructured ? '✅' : '❌'} 已在视觉设置测试中验证`);
  testResults.business.patientExtraction = testResults.settings.visionStructured;
  
  // 5.3 AI推荐流程
  log('\n### 5.3 AI推荐流程');
  try {
    const prompt = `
患者信息:
- 姓名: 张某
- 年龄: 45岁
- 性别: 男
- 主诉: 突发胸痛
- 诊断: 急性心肌梗死

请提供诊疗建议。
`;
    
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/chat?scene=ai_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
        provider: 'dashscope',
        options: {
          model: 'qwen3-max',
          max_tokens: 300
        }
      })
    });
    
    const data = await res.json();
    
    if (res.status === 200 && data.success) {
      log(`✅ AI推荐功能正常`);
      log(`   推荐内容长度: ${data.data?.message?.content?.length || 0} 字符`);
      testResults.business.aiRecommendation = true;
    } else {
      log(`❌ 失败`);
      testResults.business.aiRecommendation = false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    testResults.business.aiRecommendation = false;
  }
}

/**
 * 生成测试报告
 */
function generateReport() {
  section('测试总结');
  
  const allTests = {
    ...testResults.settings,
    ...testResults.business,
    ...testResults.agent
  };
  
  const total = Object.keys(allTests).length;
  const passed = Object.values(allTests).filter(v => v === true).length;
  const failed = total - passed;
  const successRate = ((passed / total) * 100).toFixed(1);
  
  log(`\n总测试数: ${total}`);
  log(`通过: ${passed}`);
  log(`失败: ${failed}`);
  log(`成功率: ${successRate}%`);
  
  log('\n详细结果:');
  log('\n【设置功能】');
  log(`  Provider列表: ${testResults.settings.providerList ? '✅' : '❌'}`);
  log(`  模型列表: ${testResults.settings.modelList ? '✅' : '❌'}`);
  log(`  场景配置: ${testResults.settings.scenarioList ? '✅' : '❌'}`);
  log(`  模型测试: ${testResults.settings.modelTestDashscope ? '✅' : '❌'}`);
  log(`  视觉识别: ${testResults.settings.visionTest ? '✅' : '❌'}`);
  log(`  结构化提取: ${testResults.settings.visionStructured ? '✅' : '❌'}`);
  log(`  语音识别: ${testResults.settings.voiceTest ? '✅' : '❌'}`);
  log(`  智能体连接: ${testResults.settings.agentConnection ? '✅' : '❌'}`);
  
  log('\n【业务功能】');
  log(`  AI对话: ${testResults.business.aiChat ? '✅' : '❌'}`);
  log(`  患者信息提取: ${testResults.business.patientExtraction ? '✅' : '❌'}`);
  log(`  AI推荐: ${testResults.business.aiRecommendation ? '✅' : '❌'}`);
  
  return { total, passed, failed, successRate };
}

/**
 * 主函数
 */
async function main() {
  console.log('🧪 UI API调用功能测试开始...\n');
  console.log(`后端地址: ${BACKEND_ORIGIN}\n`);
  
  report = [];
  report.push('# UI API调用功能测试报告');
  report.push(`生成时间: ${new Date().toISOString()}`);
  report.push(`后端地址: ${BACKEND_ORIGIN}\n`);
  
  // 执行测试
  await testAISettings();
  await testVisionSettings();
  await testVoiceSettings();
  await testAgentSettings();
  await testBusinessPages();
  
  // 生成报告
  const summary = generateReport();
  
  // 保存报告
  const reportPath = path.join(__dirname, '../docs/UI_API_TEST_REPORT.md');
  fs.writeFileSync(reportPath, report.join('\n'));
  log(`\n✅ 报告已保存: ${reportPath}`);
  
  // 返回退出码
  process.exit(summary.passed === summary.total ? 0 : 1);
}

main().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});

