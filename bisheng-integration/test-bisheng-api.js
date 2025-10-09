#!/usr/bin/env node

/**
 * Bisheng API 测试脚本
 * 用于验证 Bisheng 服务是否正常运行
 */

const https = require('https');
const http = require('http');

const BISHENG_BASE_URL = 'http://localhost:7860';

// 测试工作流列表 API
async function testWorkflowList() {
  return new Promise((resolve, reject) => {
    const url = `${BISHENG_BASE_URL}/api/v1/workflow/list?page_size=10&page_num=1`;
    
    console.log('🔍 测试工作流列表 API...');
    console.log(`📡 请求地址: ${url}`);
    
    const request = http.get(url, {
      headers: {
        'accept': 'application/json',
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ7XCJ1c2VyX25hbWVcIjogXCJsemh5OTk5OUAxNjMuY29tXCIsIFwidXNlcl9pZFwiOiAxLCBcInJvbGVcIjogXCJhZG1pblwifSIsImlhdCI6MTc1OTg1MTkwOSwibmJmIjoxNzU5ODUxOTA5LCJqdGkiOiI1NjAyNTIyMC0yNGRjLTRkNmQtOWY1OS0xYTUxNGVjYmNhMWQiLCJleHAiOjE3NTk5MzgzMDksInR5cGUiOiJhY2Nlc3MiLCJmcmVzaCI6ZmFsc2V9.zckjzI4BrKYe1fVgVGUdMRsVmE1N8vvPxgRixE41_88'
      }
    }, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          console.log('📊 工作流列表 API 响应:');
          console.log(`   状态码: ${response.statusCode}`);
          
          if (response.statusCode === 401) {
            console.log('   ❌ 认证失败 (401)');
            console.log('   💡 可能需要在请求头中添加认证信息');
            console.log('   原始响应:', data);
            resolve({
              success: false,
              statusCode: response.statusCode,
              error: 'Authentication required',
              data: data
            });
            return;
          }
          
          if (response.statusCode === 404) {
            console.log('   ❌ 接口不存在 (404)');
            console.log('   💡 请检查 Bisheng 服务版本和 API 路径');
            console.log('   原始响应:', data);
            resolve({
              success: false,
              statusCode: response.statusCode,
              error: 'API not found',
              data: data
            });
            return;
          }
          
          if (response.statusCode >= 500) {
            console.log('   ❌ 服务器错误 (5xx)');
            console.log('   💡 请检查 Bisheng 服务状态');
            console.log('   原始响应:', data);
            resolve({
              success: false,
              statusCode: response.statusCode,
              error: 'Server error',
              data: data
            });
            return;
          }
          
          const result = JSON.parse(data);
          console.log(`   响应码: ${result.code || 'N/A'}`);
          console.log(`   消息: ${result.message || 'N/A'}`);
          console.log(`   原始响应:`, JSON.stringify(result, null, 2));
          
          // 处理不同的响应格式
          let workflows = [];
          if (result.data && result.data.data && Array.isArray(result.data.data)) {
            workflows = result.data.data;
          } else if (result.data && result.data.items) {
            workflows = result.data.items;
          } else if (Array.isArray(result.data)) {
            workflows = result.data;
          } else if (Array.isArray(result)) {
            workflows = result;
          }
          
          if (workflows.length > 0) {
            console.log(`   工作流数量: ${workflows.length}`);
            console.log('   第一个工作流:');
            console.log(`     ID: ${workflows[0].id || workflows[0].workflow_id || 'N/A'}`);
            console.log(`     名称: ${workflows[0].name || workflows[0].title || '未命名'}`);
            console.log(`     描述: ${workflows[0].description || workflows[0].desc || '无描述'}`);
          } else {
            console.log('   工作流数量: 0');
            console.log('   💡 可能没有配置工作流或使用了不同的数据结构');
          }
          
          resolve({
            success: response.statusCode === 200 && (result.status_code === 200 || result.code === 0),
            statusCode: response.statusCode,
            data: result,
            workflows: workflows
          });
        } catch (error) {
          console.error('❌ 解析响应失败:', error.message);
          console.log('原始响应:', data);
          resolve({
            success: false,
            statusCode: response.statusCode,
            error: 'Parse error',
            data: data
          });
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });
    
    request.setTimeout(10000, () => {
      console.error('❌ 请求超时');
      request.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 测试工作流调用 API
async function testWorkflowInvoke(workflowId) {
  return new Promise((resolve, reject) => {
    const url = `${BISHENG_BASE_URL}/api/v2/workflow/invoke`;
    
    console.log('\n🔍 测试工作流调用 API...');
    console.log(`📡 请求地址: ${url}`);
    console.log(`🆔 工作流 ID: ${workflowId}`);
    
    const postData = JSON.stringify({
      workflow_id: workflowId,
      stream: true,
      user_input: {
        query: "你好，这是一个测试消息"
      },
      message_id: 0,
      session_id: "test-session-" + Date.now()
    });
    
    const options = {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'Content-Type': 'application/json',
        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ7XCJ1c2VyX25hbWVcIjogXCJsemh5OTk5OUAxNjMuY29tXCIsIFwidXNlcl9pZFwiOiAxLCBcInJvbGVcIjogXCJhZG1pblwifSIsImlhdCI6MTc1OTg1MTkwOSwibmJmIjoxNzU5ODUxOTA5LCJqdGkiOiI1NjAyNTIyMC0yNGRjLTRkNmQtOWY1OS0xYTUxNGVjYmNhMWQiLCJleHAiOjE3NTk5MzgzMDksInR5cGUiOiJhY2Nlc3MiLCJmcmVzaCI6ZmFsc2V9.zckjzI4BrKYe1fVgVGUdMRsVmE1N8vvPxgRixE41_88',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const request = http.request(url, options, (response) => {
      let data = '';
      
      response.on('data', (chunk) => {
        data += chunk;
      });
      
      response.on('end', () => {
        try {
          console.log('✅ 工作流调用 API 响应:');
          console.log(`   状态码: ${response.statusCode}`);
          
          // 处理流式响应 (Server-Sent Events)
          if (data.startsWith('data: ')) {
            console.log('   响应类型: 流式响应 (SSE)');
            const lines = data.split('\n');
            let sessionId = '';
            let messageId = '';
            let answer = '';
            
            for (const line of lines) {
              if (line.startsWith('data: ')) {
                try {
                  const jsonData = JSON.parse(line.substring(6));
                  if (jsonData.session_id) sessionId = jsonData.session_id;
                  if (jsonData.data) {
                    if (jsonData.data.message_id) messageId = jsonData.data.message_id;
                    if (jsonData.data.output_schema && jsonData.data.output_schema.message) {
                      answer += jsonData.data.output_schema.message.join(' ');
                    }
                  }
                } catch (e) {
                  // 忽略解析错误，继续处理下一行
                }
              }
            }
            
            console.log(`   会话 ID: ${sessionId}`);
            console.log(`   消息 ID: ${messageId}`);
            console.log(`   回复内容: ${answer || '无回复'}`);
            
            resolve({
              success: response.statusCode === 200,
              statusCode: response.statusCode,
              data: { session_id: sessionId, message_id: messageId, answer: answer },
              isStream: true
            });
          } else {
            // 处理普通 JSON 响应
            const result = JSON.parse(data);
            console.log(`   响应码: ${result.code}`);
            console.log(`   消息: ${result.message}`);
            
            if (result.data) {
              console.log(`   会话 ID: ${result.data.session_id}`);
              console.log(`   消息 ID: ${result.data.message_id}`);
              console.log(`   回复内容: ${result.data.answer || '无回复'}`);
            }
            
            resolve({
              success: response.statusCode === 200 && result.code === 0,
              statusCode: response.statusCode,
              data: result,
              isStream: false
            });
          }
        } catch (error) {
          console.error('❌ 解析响应失败:', error.message);
          console.log('原始响应:', data);
          reject(error);
        }
      });
    });
    
    request.on('error', (error) => {
      console.error('❌ 请求失败:', error.message);
      reject(error);
    });
    
    request.write(postData);
    request.end();
    
    request.setTimeout(15000, () => {
      console.error('❌ 请求超时');
      request.destroy();
      reject(new Error('请求超时'));
    });
  });
}

// 主测试函数
async function runTests() {
  console.log('🚀 开始测试 Bisheng API...\n');
  
  try {
    // 测试工作流列表
    const workflowResult = await testWorkflowList();
    
    if (workflowResult.success && workflowResult.workflows && workflowResult.workflows.length > 0) {
      const firstWorkflow = workflowResult.workflows[0];
      console.log(`\n📋 找到工作流，开始测试调用...`);
      
      // 测试工作流调用
      const invokeResult = await testWorkflowInvoke(firstWorkflow.id);
      
      if (invokeResult.success) {
        console.log('\n🎉 所有测试通过！Bisheng API 工作正常。');
        console.log('\n📝 测试总结:');
        console.log('   ✅ 工作流列表 API 正常');
        console.log('   ✅ 工作流调用 API 正常');
        console.log('   ✅ 可以开始使用测试页面');
      } else {
        console.log('\n⚠️  工作流调用测试失败，但工作流列表正常。');
        console.log('   可能的原因:');
        console.log('   - 工作流配置问题');
        console.log('   - 模型服务未启动');
        console.log('   - 权限问题');
      }
    } else if (workflowResult.statusCode === 401) {
      console.log('\n🔐 认证问题检测到！');
      console.log('   Bisheng 服务需要认证才能访问。');
      console.log('\n💡 解决方案:');
      console.log('   1. 检查 Bisheng 服务配置');
      console.log('   2. 确认是否需要 API Key 或 Token');
      console.log('   3. 查看 Bisheng 文档了解认证方式');
      console.log('   4. 修改测试页面添加认证头');
    } else if (workflowResult.statusCode === 404) {
      console.log('\n🔍 API 路径问题检测到！');
      console.log('   Bisheng 服务可能使用了不同的 API 路径。');
      console.log('\n💡 解决方案:');
      console.log('   1. 检查 Bisheng 服务版本');
      console.log('   2. 确认正确的 API 路径');
      console.log('   3. 查看 Bisheng 服务文档');
    } else {
      console.log('\n⚠️  工作流列表获取失败。');
      console.log('   可能的原因:');
      console.log('   - Bisheng 服务未完全启动');
      console.log('   - 没有配置工作流');
      console.log('   - 数据库连接问题');
      console.log('   - 网络连接问题');
    }
    
  } catch (error) {
    console.log('\n❌ 测试失败:', error.message);
    console.log('\n🔧 故障排除建议:');
    console.log('   1. 检查 Bisheng 服务是否运行在 http://localhost:7860');
    console.log('   2. 检查防火墙设置');
    console.log('   3. 查看 Bisheng 服务日志');
    console.log('   4. 确认服务配置正确');
  }
  
  console.log('\n📖 使用说明:');
  console.log('   - 集成版本: 在主应用中点击 "Bisheng测试" 标签页');
  console.log('   - 独立版本: 在浏览器中打开 bisheng-test.html');
  console.log('   - 详细文档: 查看 docs/BISHENG_TEST_GUIDE.md');
}

// 运行测试
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { testWorkflowList, testWorkflowInvoke, runTests };
