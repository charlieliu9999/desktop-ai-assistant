#!/usr/bin/env node
/**
 * 前端E2E烟测脚本 - 完整版
 * 
 * 测试所有后端服务:
 * 1. 健康检查
 * 2. AI对话 (多provider)
 * 3. 视觉理解 (多图片)
 * 4. 语音识别
 * 5. 智能体服务
 */

const fs = require('fs');
const path = require('path');

const BACKEND_ORIGIN = process.env.BACKEND_URL || 'http://127.0.0.1:8010';
const REPORT_PATH = path.join(__dirname, '../docs/FRONTEND_E2E_REPORT.md');

// 测试配置
const AI_PROVIDERS = [
  { provider: 'openai', model: 'gpt-4o-mini', scene: 'ai_chat' },
  { provider: 'deepseek', model: 'deepseek-chat', scene: 'ai_chat' },
  { provider: 'dashscope', model: 'qwen3-max', scene: 'ai_chat_aliyun' },
  { provider: 'local', model: 'qwen2.5:32b', scene: 'ai_chat' }
];

const VISION_TESTS = [
  {
    name: 'patient_info_sample.png',
    scene: 'screen_recognition_aliyun',
    provider: 'dashscope',
    schema_name: 'patient_info_v1',  // 使用内置schema提取结构化数据
    temperature: 0.1,
    max_tokens: 500
  }
];

let report = [];

function log(msg) {
  console.log(msg);
  report.push(msg);
}

async function testHealth() {
  log('\n## /health');
  const start = Date.now();
  
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/health`);
    const data = await res.json();
    const elapsed = Date.now() - start;
    
    log('```json');
    log(JSON.stringify(data, null, 2));
    log('```');
    log(`Status: ${res.status}, Time: ${elapsed}ms\n`);
    
    return res.status === 200;
  } catch (err) {
    log(`❌ Error: ${err.message}\n`);
    return false;
  }
}

async function testAIChat(config) {
  const { provider, model, scene } = config;
  log(`\n## /v1/ai/chat (${provider}:${model}, scene=${scene})`);

  const start = Date.now();

  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/chat?scene=${scene}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: 'Hello' }],
        provider,
        options: {
          model,
          max_tokens: 32
        }
      })
    });

    const data = await res.json();
    const elapsed = Date.now() - start;

    log(`[${elapsed}ms] status=${res.status}`);
    log('```json');
    log(JSON.stringify(data, null, 2));
    log('```\n');

    return res.status === 200 && data.success;
  } catch (err) {
    log(`❌ Error: ${err.message}\n`);
    return false;
  }
}

async function testVision(config) {
  const { name, scene, provider, schema_name, temperature, max_tokens } = config;
  log(`\n## /v1/vision/understand (${provider}, scene=${scene}, file=${name})`);

  const imagePath = path.join(__dirname, '../tests/images', name);

  if (!fs.existsSync(imagePath)) {
    log(`⚠️  Image not found: ${imagePath}\n`);
    return false;
  }

  const imageBuffer = fs.readFileSync(imagePath);
  const base64 = imageBuffer.toString('base64');
  const mimeType = name.endsWith('.png') ? 'image/png' : 'image/jpeg';

  const start = Date.now();

  try {
    const requestBody = {
      image_data: `data:${mimeType};base64,${base64}`,
      prompt: '请识别图片中的患者信息',
      provider
    };

    // 添加可选参数
    if (schema_name) requestBody.schema_name = schema_name;
    if (temperature !== undefined) requestBody.temperature = temperature;
    if (max_tokens) requestBody.max_tokens = max_tokens;

    const res = await fetch(`${BACKEND_ORIGIN}/v1/vision/understand?scene=${scene}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    const data = await res.json();
    const elapsed = Date.now() - start;

    log(`[${elapsed}ms] status=${res.status}`);

    if (res.status === 200 && data.success) {
      log('✅ Success');
      log('```json');
      // 显示结构化数据
      const summary = {
        description_length: data.result?.description?.length || 0,
        has_structured: !!data.result?.structured,
        structured_data: data.result?.structured || null
      };
      log(JSON.stringify(summary, null, 2));
      log('```\n');
      return true;
    } else {
      log('```json');
      log(JSON.stringify(data, null, 2));
      log('```\n');
      return false;
    }
  } catch (err) {
    log(`❌ Error: ${err.message}\n`);
    return false;
  }
}

async function testVoiceSTT() {
  log('\n## /v1/voice/stt (OpenAI Whisper API)');

  const testAudioPath = path.join(__dirname, '../tests/audio/test.wav');

  if (!fs.existsSync(testAudioPath)) {
    log('⚠️  Test audio not found, skipping...\n');
    return false;
  }

  const audioBuffer = fs.readFileSync(testAudioPath);
  const base64 = audioBuffer.toString('base64');

  const start = Date.now();

  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/voice/stt`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        audio_data: `data:audio/wav;base64,${base64}`,  // 添加data URI前缀
        language: 'zh',
        audio_mime: 'audio/wav'
      })
    });
    
    const data = await res.json();
    const elapsed = Date.now() - start;
    
    log(`[${elapsed}ms] status=${res.status}`);
    log('```json');
    log(JSON.stringify(data, null, 2));
    log('```\n');
    
    return res.status === 200 && data.success;
  } catch (err) {
    log(`❌ Error: ${err.message}\n`);
    return false;
  }
}

async function testAgentList() {
  log('\n## /v1/agent/workflows (不带token)');

  const start = Date.now();

  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/agent/workflows`);
    const data = await res.json();
    const elapsed = Date.now() - start;

    log(`[${elapsed}ms] status=${res.status}`);

    if (res.status === 200) {
      log(`✅ Success - Found ${Array.isArray(data) ? data.length : 0} workflows`);
      log('```json');
      log(JSON.stringify({ workflow_count: Array.isArray(data) ? data.length : 0 }, null, 2));
      log('```\n');
      return true;
    } else {
      log('```json');
      log(JSON.stringify(data, null, 2));
      log('```\n');
      return false;
    }
  } catch (err) {
    log(`❌ Error: ${err.message}\n`);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Frontend E2E Tests...\n');
  console.log(`Backend: ${BACKEND_ORIGIN}\n`);
  
  report = [];
  report.push('# Frontend E2E Smoke Report');
  report.push(`Generated: ${new Date().toISOString()}`);
  report.push(`Backend origin: ${BACKEND_ORIGIN}\n`);
  
  const results = {
    health: false,
    ai: [],
    vision: [],
    voice: false,
    agent: false
  };
  
  // 1. 健康检查
  results.health = await testHealth();
  
  // 2. AI对话测试
  for (const config of AI_PROVIDERS) {
    const success = await testAIChat(config);
    results.ai.push({ ...config, success });
  }
  
  // 3. 视觉理解测试
  for (const config of VISION_TESTS) {
    const success = await testVision(config);
    results.vision.push({ ...config, success });
  }
  
  // 4. 语音识别测试
  results.voice = await testVoiceSTT();
  
  // 5. 智能体测试
  results.agent = await testAgentList();
  
  // 生成摘要
  log('\n---\n');
  log('## Test Summary\n');
  log(`- Health: ${results.health ? '✅' : '❌'}`);
  log(`- AI Chat: ${results.ai.filter(r => r.success).length}/${results.ai.length} passed`);
  log(`- Vision: ${results.vision.filter(r => r.success).length}/${results.vision.length} passed`);
  log(`- Voice STT: ${results.voice ? '✅' : '❌'}`);
  log(`- Agent: ${results.agent ? '✅' : '❌'}`);
  
  // 保存报告
  fs.writeFileSync(REPORT_PATH, report.join('\n'), 'utf-8');
  console.log(`\n✅ Report saved to: ${REPORT_PATH}`);
  
  // 返回退出码
  const allPassed = results.health && 
                    results.ai.every(r => r.success) &&
                    results.vision.some(r => r.success) &&
                    results.agent;
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});

