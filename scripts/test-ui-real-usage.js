#!/usr/bin/env node

/**
 * 测试UI的实际使用情况
 * 模拟用户在UI上的操作流程
 */

const BACKEND_ORIGIN = 'http://127.0.0.1:8010';

// 日志函数
function log(msg) {
  console.log(`[${new Date().toLocaleTimeString()}] ${msg}`);
}

function section(title) {
  console.log('\n' + '='.repeat(60));
  console.log(`  ${title}`);
  console.log('='.repeat(60) + '\n');
}

// 测试1: 检查后端健康状态
async function testBackendHealth() {
  section('测试1: 后端健康检查');
  
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/health`);
    const data = await res.json();
    
    if (data.status === 'healthy') {
      log(`✅ 后端服务正常: ${data.version}`);
      return true;
    } else {
      log(`❌ 后端服务异常: ${JSON.stringify(data)}`);
      return false;
    }
  } catch (err) {
    log(`❌ 无法连接后端: ${err.message}`);
    return false;
  }
}

// 测试2: 获取可用的providers
async function testGetProviders() {
  section('测试2: 获取AI Providers');
  
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/providers`);
    const data = await res.json();
    
    if (data.success && data.data?.providers) {
      const providers = data.data.providers;
      log(`✅ 可用providers: ${providers.join(', ')}`);
      return providers;
    } else {
      log(`❌ 获取providers失败: ${JSON.stringify(data)}`);
      return [];
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    return [];
  }
}

// 测试3: 获取每个provider的模型列表
async function testGetModels() {
  section('测试3: 获取模型列表');
  
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/models`);
    const data = await res.json();
    
    if (data.success && data.data?.providers) {
      const providers = data.data.providers;
      log(`✅ 模型列表:`);
      providers.forEach(p => {
        log(`   - ${p.name}: ${p.models.join(', ')}`);
      });
      return providers;
    } else {
      log(`❌ 获取模型列表失败: ${JSON.stringify(data)}`);
      return [];
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    return [];
  }
}

// 测试4: 测试Deepseek模型对话
async function testDeepseekChat() {
  section('测试4: Deepseek模型对话');
  
  log('发送消息: "你好,请简单介绍一下你自己"');
  log('Provider: deepseek');
  log('Scene: ai_chat');
  
  const start = Date.now();
  
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/chat?scene=ai_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '你好,请简单介绍一下你自己' }
        ],
        provider: 'deepseek',
        options: {
          max_tokens: 200
        }
      })
    });
    
    const data = await res.json();
    const elapsed = Date.now() - start;
    
    log(`响应时间: ${elapsed}ms`);
    log(`状态码: ${res.status}`);
    
    if (data.success && data.data?.message?.content) {
      log(`✅ AI回复: ${data.data.message.content.substring(0, 150)}...`);
      log(`✅ Token使用: ${data.data.usage?.total_tokens || 'N/A'}`);
      return true;
    } else {
      log(`❌ 失败: ${JSON.stringify(data, null, 2)}`);
      return false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    return false;
  }
}

// 测试5: 测试Dashscope模型对话
async function testDashscopeChat() {
  section('测试5: Dashscope模型对话');
  
  log('发送消息: "什么是人工智能?"');
  log('Provider: dashscope');
  log('Scene: ai_chat');
  
  const start = Date.now();
  
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/chat?scene=ai_chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '什么是人工智能?' }
        ],
        provider: 'dashscope',
        options: {
          max_tokens: 200
        }
      })
    });
    
    const data = await res.json();
    const elapsed = Date.now() - start;
    
    log(`响应时间: ${elapsed}ms`);
    log(`状态码: ${res.status}`);
    
    if (data.success && data.data?.message?.content) {
      log(`✅ AI回复: ${data.data.message.content.substring(0, 150)}...`);
      log(`✅ Token使用: ${data.data.usage?.total_tokens || 'N/A'}`);
      return true;
    } else {
      log(`❌ 失败: ${JSON.stringify(data, null, 2)}`);
      return false;
    }
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    return false;
  }
}

// 测试6: 测试流式对话
async function testStreamChat() {
  section('测试6: 流式对话 (Deepseek)');
  
  log('发送消息: "请用一句话介绍深度学习"');
  log('Provider: deepseek');
  log('Mode: stream');
  
  const start = Date.now();
  
  try {
    const res = await fetch(`${BACKEND_ORIGIN}/v1/ai/chat/stream?scene=ai_chat`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify({
        messages: [
          { role: 'user', content: '请用一句话介绍深度学习' }
        ],
        provider: 'deepseek',
        options: {
          max_tokens: 100,
          stream: true
        }
      })
    });
    
    if (!res.ok) {
      log(`❌ HTTP错误: ${res.status}`);
      return false;
    }
    
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let chunkCount = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;
          
          try {
            const json = JSON.parse(data);
            if (json.content) {
              fullContent += json.content;
              chunkCount++;
            }
          } catch {}
        }
      }
    }
    
    const elapsed = Date.now() - start;
    
    log(`✅ 响应时间: ${elapsed}ms`);
    log(`✅ 收到chunks: ${chunkCount}`);
    log(`✅ 完整回复: ${fullContent}`);
    return true;
  } catch (err) {
    log(`❌ 错误: ${err.message}`);
    return false;
  }
}

// 主测试函数
async function main() {
  console.log('\n🧪 开始测试UI的实际使用情况\n');
  
  const results = {
    health: false,
    providers: false,
    models: false,
    deepseek: false,
    dashscope: false,
    stream: false
  };
  
  // 测试1: 后端健康检查
  results.health = await testBackendHealth();
  if (!results.health) {
    log('\n❌ 后端服务未运行,请先启动后端服务');
    process.exit(1);
  }
  
  // 测试2: 获取providers
  const providers = await testGetProviders();
  results.providers = providers.length > 0;
  
  // 测试3: 获取模型列表
  const models = await testGetModels();
  results.models = models.length > 0;
  
  // 测试4: Deepseek对话
  if (providers.includes('deepseek')) {
    results.deepseek = await testDeepseekChat();
  } else {
    log('\n⚠️  跳过Deepseek测试 (provider不可用)');
  }
  
  // 测试5: Dashscope对话
  if (providers.includes('dashscope')) {
    results.dashscope = await testDashscopeChat();
  } else {
    log('\n⚠️  跳过Dashscope测试 (provider不可用)');
  }
  
  // 测试6: 流式对话
  if (providers.includes('deepseek')) {
    results.stream = await testStreamChat();
  } else {
    log('\n⚠️  跳过流式对话测试 (provider不可用)');
  }
  
  // 总结
  section('测试总结');
  
  const total = Object.keys(results).length;
  const passed = Object.values(results).filter(v => v).length;
  const failed = total - passed;
  
  console.log('测试结果:');
  console.log(`  ✅ 通过: ${passed}/${total}`);
  console.log(`  ❌ 失败: ${failed}/${total}`);
  console.log('');
  
  Object.entries(results).forEach(([name, passed]) => {
    const icon = passed ? '✅' : '❌';
    console.log(`  ${icon} ${name}`);
  });
  
  console.log('');
  
  if (passed === total) {
    log('🎉 所有测试通过!');
    process.exit(0);
  } else {
    log('⚠️  部分测试失败,请检查配置');
    process.exit(1);
  }
}

// 运行测试
main().catch(err => {
  console.error('测试失败:', err);
  process.exit(1);
});

