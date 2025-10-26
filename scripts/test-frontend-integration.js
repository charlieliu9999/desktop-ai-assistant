#!/usr/bin/env node
/**
 * 前端集成测试脚本
 * 
 * 模拟前端调用后端API的方式,验证前端能否正确完成任务
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ORIGIN = 'http://127.0.0.1:8010';

let report = [];

function log(msg) {
  console.log(msg);
  report.push(msg);
}

/**
 * 测试1: AI对话 - 医疗咨询场景
 */
async function testMedicalConsultation() {
  log('\n## 测试1: AI医疗咨询');
  log('场景: 用户咨询健康问题');
  
  const start = Date.now();
  
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/chat?scene=ai_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '我最近经常头痛,应该注意什么?' }
        ],
        provider: 'dashscope',
        options: {
          model: 'qwen3-max',
          max_tokens: 200
        }
      })
    });
    
    const data = await res.json();
    const elapsed = Date.now() - start;
    
    log(`✅ 响应时间: ${elapsed}ms`);
    log(`✅ 状态: ${res.status}`);
    
    if (data.success && data.data?.message?.content) {
      log(`✅ AI回复: ${data.data.message.content.substring(0, 100)}...`);
      log(`✅ Token使用: ${data.data.usage?.total_tokens || 'N/A'}`);
      return true;
    } else {
      log(`❌ 失败: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    return false;
  }
}

/**
 * 测试2: 屏幕识别 - 患者信息提取
 */
async function testPatientInfoExtraction() {
  log('\n## 测试2: 患者信息提取');
  log('场景: 识别医疗系统截图中的患者信息');
  
  const imagePath = path.join(__dirname, '../tests/images/patient_info_sample.png');
  
  if (!fs.existsSync(imagePath)) {
    log('⚠️  测试图片不存在,跳过');
    return false;
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  
  const start = Date.now();
  
  try {
    const requestBody = {
      image_data: `data:image/png;base64,${base64}`,
      prompt: '你是医疗信息抽取助手。请从这张医疗信息系统截图中提取患者关键信息,并严格以JSON格式输出,不要任何解释或代码块标记。\n\n输出JSON的键名(必须全部包含,没有的信息使用空字符串或0):\n- patient_name: 姓名\n- gender: 性别(男/女/未知)\n- age: 年龄(数字)\n- medical_record_number: 病历号\n- chief_complaint: 主诉\n- diagnosis: 诊断\n- confidence: 置信度(0-1)\n\n只返回JSON,不要```json标记,不要其他说明。',
      provider: 'dashscope',
      model: 'qwen-vl-plus',
      schema_name: 'patient_info_v1',
      temperature: 0.1,
      max_tokens: 500
    };

    const res = await fetch(`${BACKEND_ORIGIN}/v1/vision/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    const data = await res.json();
    const elapsed = Date.now() - start;
    
    log(`✅ 响应时间: ${elapsed}ms`);
    log(`✅ 状态: ${res.status}`);
    
    if (data.success && data.result?.structured) {
      const info = data.result.structured;
      log(`✅ 提取成功:`);
      log(`   - 姓名: ${info.patient_name || 'N/A'}`);
      log(`   - 性别: ${info.gender || 'N/A'}`);
      log(`   - 年龄: ${info.age || 'N/A'}`);
      log(`   - 病历号: ${info.medical_record_number || 'N/A'}`);
      log(`   - 主诉: ${info.chief_complaint?.substring(0, 30) || 'N/A'}...`);
      log(`   - 诊断: ${info.diagnosis?.substring(0, 30) || 'N/A'}...`);
      log(`   - 置信度: ${info.confidence || 'N/A'}`);
      return true;
    } else {
      log(`❌ 未提取到结构化数据`);
      return false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    return false;
  }
}

/**
 * 测试3: 语音识别 - 医疗语音输入
 */
async function testVoiceInput() {
  log('\n## 测试3: 语音识别');
  log('场景: 识别医生的语音输入');
  
  const audioPath = path.join(__dirname, '../tests/audio/test.wav');
  
  if (!fs.existsSync(audioPath)) {
    log('⚠️  测试音频不存在,跳过');
    return false;
  }
  
  const audioBuffer = fs.readFileSync(audioPath);
  const base64 = audioBuffer.toString('base64');
  
  const start = Date.now();
  
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
    const elapsed = Date.now() - start;
    
    log(`✅ 响应时间: ${elapsed}ms`);
    log(`✅ 状态: ${res.status}`);
    
    if (data.success && data.result?.text) {
      log(`✅ 识别文本: "${data.result.text}"`);
      log(`✅ 语言: ${data.result.language || 'N/A'}`);
      log(`✅ 置信度: ${data.result.confidence || 'N/A'}`);
      return true;
    } else {
      log(`❌ 识别失败: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    return false;
  }
}

/**
 * 测试4: 完整工作流 - AI辅助诊断
 */
async function testCompleteWorkflow() {
  log('\n## 测试4: 完整工作流 - AI辅助诊断');
  log('场景: 1) 提取患者信息 -> 2) AI分析 -> 3) 生成建议');
  
  // 步骤1: 提取患者信息
  log('\n步骤1: 提取患者信息...');
  const imagePath = path.join(__dirname, '../tests/images/patient_info_sample.png');
  
  if (!fs.existsSync(imagePath)) {
    log('⚠️  测试图片不存在,跳过');
    return false;
  }
  
  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  
  try {
    const requestBody = {
      image_data: `data:image/png;base64,${base64}`,
      prompt: '你是医疗信息抽取助手。请从这张医疗信息系统截图中提取患者关键信息,并严格以JSON格式输出,不要任何解释或代码块标记。\n\n输出JSON的键名(必须全部包含,没有的信息使用空字符串或0):\n- patient_name: 姓名\n- gender: 性别(男/女/未知)\n- age: 年龄(数字)\n- medical_record_number: 病历号\n- chief_complaint: 主诉\n- diagnosis: 诊断\n- confidence: 置信度(0-1)\n\n只返回JSON,不要```json标记,不要其他说明。',
      provider: 'dashscope',
      model: 'qwen-vl-plus',
      schema_name: 'patient_info_v1',
      temperature: 0.1,
      max_tokens: 500
    };

    const visionRes = await fetch(`${BACKEND_ORIGIN}/v1/vision/understand`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });
    
    const visionData = await visionRes.json();
    
    if (!visionData.success || !visionData.result?.structured) {
      log('❌ 患者信息提取失败');
      return false;
    }
    
    const patientInfo = visionData.result.structured;
    log(`✅ 患者信息: ${patientInfo.patient_name}, ${patientInfo.age}岁, ${patientInfo.gender}`);
    log(`✅ 主诉: ${patientInfo.chief_complaint?.substring(0, 50)}...`);
    log(`✅ 诊断: ${patientInfo.diagnosis?.substring(0, 50)}...`);
    
    // 步骤2: AI分析
    log('\n步骤2: AI分析患者情况...');
    
    const analysisPrompt = `
患者信息:
- 姓名: ${patientInfo.patient_name}
- 年龄: ${patientInfo.age}岁
- 性别: ${patientInfo.gender}
- 主诉: ${patientInfo.chief_complaint}
- 初步诊断: ${patientInfo.diagnosis}

请作为医疗AI助手,分析该患者的情况并提供:
1. 病情评估
2. 需要注意的事项
3. 建议的检查项目
`;
    
    const aiRes = await fetch(`${BACKEND_ORIGIN}/v1/ai/chat?scene=ai_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: analysisPrompt }
        ],
        provider: 'dashscope',
        options: {
          model: 'qwen3-max',
          max_tokens: 500
        }
      })
    });
    
    const aiData = await aiRes.json();
    
    if (!aiData.success || !aiData.data?.message?.content) {
      log('❌ AI分析失败');
      return false;
    }
    
    log(`✅ AI分析结果:`);
    log(aiData.data.message.content);
    
    log('\n✅ 完整工作流测试成功!');
    return true;
    
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    return false;
  }
}

/**
 * 主函数
 */
async function main() {
  console.log('🧪 前端集成测试开始...\n');
  console.log(`后端地址: ${BACKEND_ORIGIN}\n`);
  
  report = [];
  report.push('# 前端集成测试报告');
  report.push(`生成时间: ${new Date().toISOString()}`);
  report.push(`后端地址: ${BACKEND_ORIGIN}\n`);
  
  const results = {
    medicalConsultation: false,
    patientExtraction: false,
    voiceInput: false,
    completeWorkflow: false
  };
  
  // 执行测试
  results.medicalConsultation = await testMedicalConsultation();
  results.patientExtraction = await testPatientInfoExtraction();
  results.voiceInput = await testVoiceInput();
  results.completeWorkflow = await testCompleteWorkflow();
  
  // 生成总结
  log('\n---\n');
  log('## 测试总结\n');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(r => r).length;
  
  log(`- 总测试数: ${total}`);
  log(`- 通过: ${passed}`);
  log(`- 失败: ${total - passed}`);
  log(`- 成功率: ${((passed / total) * 100).toFixed(1)}%\n`);
  
  log('详细结果:');
  log(`- AI医疗咨询: ${results.medicalConsultation ? '✅' : '❌'}`);
  log(`- 患者信息提取: ${results.patientExtraction ? '✅' : '❌'}`);
  log(`- 语音识别: ${results.voiceInput ? '✅' : '❌'}`);
  log(`- 完整工作流: ${results.completeWorkflow ? '✅' : '❌'}`);
  
  // 保存报告
  const reportPath = path.join(__dirname, '../docs/FRONTEND_INTEGRATION_TEST_REPORT.md');
  fs.writeFileSync(reportPath, report.join('\n'));
  log(`\n✅ 报告已保存: ${reportPath}`);
  
  // 返回退出码
  process.exit(passed === total ? 0 : 1);
}

main().catch(err => {
  console.error('测试执行失败:', err);
  process.exit(1);
});

