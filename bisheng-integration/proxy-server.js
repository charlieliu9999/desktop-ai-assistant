const http = require('http');
const https = require('https');
const url = require('url');

const TARGET_HOST = '203.83.233.236';
const TARGET_PORT = 5186;
const PROXY_PORT = 8889;

const server = http.createServer((req, res) => {
    console.log(`\n📥 收到请求: ${req.method} ${req.url}`);
    
    // 处理预检请求
    if (req.method === 'OPTIONS') {
        res.writeHead(200, {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
            'Access-Control-Max-Age': '86400'
        });
        res.end();
        return;
    }
    
    // 转发请求到目标服务器
    const options = {
        hostname: TARGET_HOST,
        port: TARGET_PORT,
        path: req.url,
        method: req.method,
        headers: {
            ...req.headers,
            host: `${TARGET_HOST}:${TARGET_PORT}`
        }
    };
    
    // 删除可能导致问题的头
    delete options.headers['origin'];
    delete options.headers['referer'];
    
    console.log(`🔄 转发到: http://${TARGET_HOST}:${TARGET_PORT}${req.url}`);
    
    const proxyReq = http.request(options, (proxyRes) => {
        console.log(`✅ 目标服务器响应: ${proxyRes.statusCode}`);
        
        // 设置 CORS 头
        const headers = {
            ...proxyRes.headers,
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept'
        };
        
        res.writeHead(proxyRes.statusCode, headers);
        proxyRes.pipe(res);
    });
    
    proxyReq.on('error', (error) => {
        console.error('❌ 代理请求错误:', error.message);
        res.writeHead(500, {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        });
        res.end(JSON.stringify({
            error: '代理请求失败',
            message: error.message
        }));
    });
    
    // 转发请求体
    req.pipe(proxyReq);
});

server.listen(PROXY_PORT, () => {
    console.log(`\n🚀 CORS 代理服务器已启动`);
    console.log(`📍 本地地址: http://localhost:${PROXY_PORT}`);
    console.log(`🎯 目标服务器: http://${TARGET_HOST}:${TARGET_PORT}`);
    console.log(`\n💡 使用方式：将 Bisheng 服务地址改为 http://localhost:${PROXY_PORT}\n`);
});

