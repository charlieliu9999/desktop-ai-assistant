/**
 * iframe 代理服务器
 * 
 * 功能：代理 Bisheng 前端服务，移除 X-Frame-Options 响应头
 * 使用：node iframe-proxy.js
 * 然后在 iframe 中使用 http://localhost:3002 替代 http://localhost:3001
 */

const http = require('http');
const httpProxy = require('http-proxy');

const PROXY_PORT = 3002;
const TARGET_HOST = 'localhost';
const TARGET_PORT = 3001;

// 创建代理服务器
const proxy = httpProxy.createProxyServer({
    target: `http://${TARGET_HOST}:${TARGET_PORT}`,
    changeOrigin: true,
    ws: true, // 支持 WebSocket
});

// 监听代理响应，修改响应头
proxy.on('proxyRes', function(proxyRes, req, res) {
    // 移除 X-Frame-Options
    delete proxyRes.headers['x-frame-options'];
    
    // 添加允许 iframe 嵌入的 CSP
    proxyRes.headers['content-security-policy'] = "frame-ancestors 'self' http://localhost:* http://127.0.0.1:*";
    
    // 添加 CORS 头（如果需要）
    proxyRes.headers['access-control-allow-origin'] = '*';
});

// 处理代理错误
proxy.on('error', function(err, req, res) {
    console.error('❌ 代理错误:', err.message);
    res.writeHead(500, {
        'Content-Type': 'text/plain'
    });
    res.end('代理服务器错误: ' + err.message);
});

// 创建 HTTP 服务器
const server = http.createServer(function(req, res) {
    proxy.web(req, res);
});

// 处理 WebSocket 升级
server.on('upgrade', function(req, socket, head) {
    proxy.ws(req, socket, head);
});

// 启动服务器
server.listen(PROXY_PORT, function() {
    console.log('\n🚀 iframe 代理服务器已启动');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`📍 代理地址: http://localhost:${PROXY_PORT}`);
    console.log(`🎯 目标服务: http://${TARGET_HOST}:${TARGET_PORT}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 使用方法：');
    console.log('   在 bisheng-test.html 中使用代理地址');
    console.log(`   iframe src: http://localhost:${PROXY_PORT}/chat/flow/auth/...`);
    console.log('\n✅ 功能：');
    console.log('   - 移除 X-Frame-Options 响应头');
    console.log('   - 添加 CSP frame-ancestors 允许嵌入');
    console.log('   - 支持 WebSocket 连接');
    console.log('   - 支持所有 Bisheng 功能');
    console.log('\n按 Ctrl+C 停止服务器\n');
});

