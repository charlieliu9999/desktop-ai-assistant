const http = require('http');

const BISHENG_BASE_URL = 'http://localhost:7860';
const TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJ7XCJ1c2VyX25hbWVcIjogXCJsemh5OTk5OUAxNjMuY29tXCIsIFwidXNlcl9pZFwiOiAxLCBcInJvbGVcIjogXCJhZG1pblwifSIsImlhdCI6MTc1OTg4NzE3MCwibmJmIjoxNzU5ODg3MTcwLCJqdGkiOiJmOTQ0NGJlNy0yYTNkLTQwZGEtYWNkMy00OTNhNjJiYWM3OGUiLCJleHAiOjE3NTk5NzM1NzAsInR5cGUiOiJhY2Nlc3MiLCJmcmVzaCI6ZmFsc2V9.ypEMBBhewSg8vMsSJ5RNOoPx-zpqcqhK19eZ3MZwhG4';

async function testContinueWorkflow() {
    const workflowId = 'd5e79601de8245768a38ee756a14a067';
    const url = `${BISHENG_BASE_URL}/api/v2/workflow/invoke`;
    
    console.log('🔍 测试继续工作流...');
    console.log(`📡 请求地址: ${url}`);
    console.log(`🆔 工作流 ID: ${workflowId}`);
    
    // 第一步：启动工作流
    console.log('\n📋 第一步：启动工作流');
    const startResponse = await makeRequest(url, {
        workflow_id: workflowId,
        stream: false
    });
    
    if (startResponse.status_code !== 200) {
        console.error('❌ 启动工作流失败:', startResponse);
        return;
    }
    
    const sessionId = startResponse.data.session_id;
    const events = startResponse.data.events || [];
    
    console.log('✅ 工作流启动成功');
    console.log('📝 会话ID:', sessionId);
    console.log('📊 事件数量:', events.length);
    
    // 查找输入节点
    let inputNodeId = null;
    let messageId = null;
    
    for (const event of events) {
        console.log(`🔍 事件: ${event.event}, 节点: ${event.node_id}, 状态: ${event.status}`);
        if (event.event === 'input') {
            inputNodeId = event.node_id;
            messageId = event.message_id;
            console.log('📥 找到输入节点:', inputNodeId, '消息ID:', messageId);
        }
    }
    
    if (!inputNodeId || !messageId) {
        console.error('❌ 未找到输入节点');
        return;
    }
    
    // 第二步：继续工作流
    console.log('\n📋 第二步：继续工作流');
    const continueResponse = await makeRequest(url, {
        workflow_id: workflowId,
        stream: false,
        input: {
            [inputNodeId]: {
                user_input: '头痛'
            }
        },
        message_id: messageId,
        session_id: sessionId
    });
    
    console.log('📊 继续工作流响应状态:', continueResponse.status_code);
    
    if (continueResponse.status_code === 200) {
        console.log('✅ 继续工作流成功');
        const continueEvents = continueResponse.data.events || [];
        console.log('📝 继续工作流事件数量:', continueEvents.length);
        
        for (const event of continueEvents) {
            console.log(`🔍 继续事件: ${event.event}, 节点: ${event.node_id}, 状态: ${event.status}`);
            if (event.output_schema?.message) {
                const message = Array.isArray(event.output_schema.message) 
                    ? event.output_schema.message.join('') 
                    : event.output_schema.message;
                console.log('💬 输出消息:', message);
            }
        }
    } else {
        console.error('❌ 继续工作流失败:', continueResponse);
    }
}

function makeRequest(url, data) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify(data);
        
        const options = {
            method: 'POST',
            headers: {
                'accept': 'application/json',
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${TOKEN}`,
                'Content-Length': Buffer.byteLength(postData)
            }
        };
        
        console.log('📤 发送请求:', data);
        
        const request = http.request(url, options, (response) => {
            console.log(`📊 响应状态: ${response.statusCode}`);
            
            let data = '';
            response.on('data', (chunk) => {
                data += chunk;
            });
            
            response.on('end', () => {
                try {
                    const jsonData = JSON.parse(data);
                    resolve(jsonData);
                } catch (e) {
                    console.error('❌ JSON 解析失败:', e.message);
                    console.error('原始响应:', data);
                    reject(e);
                }
            });
        });
        
        request.on('error', (error) => {
            console.error('❌ 请求失败:', error);
            reject(error);
        });
        
        request.write(postData);
        request.end();
    });
}

// 运行测试
testContinueWorkflow()
    .then(result => {
        console.log('🎉 测试完成');
    })
    .catch(error => {
        console.error('💥 测试失败:', error);
    });

