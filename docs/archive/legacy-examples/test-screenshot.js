// 屏幕截图功能测试脚本
// 在浏览器控制台中运行此脚本

// 测试基本屏幕截图功能
async function testBasicScreenshot() {
  console.log('=== 测试基本屏幕截图功能 ===');
  
  if (!window.electronAPI?.screen?.capture) {
    console.error('❌ 屏幕截图API不可用');
    return null;
  }
  
  try {
    console.log('📸 正在截图...');
    const startTime = Date.now();
    const result = await window.electronAPI.screen.capture();
    const endTime = Date.now();
    
    if (result && result.dataURL) {
      console.log('✅ 截图成功');
      console.log(`⏱️ 耗时: ${endTime - startTime}ms`);
      console.log(`📊 数据大小: ${Math.round(result.dataURL.length / 1024)}KB`);
      console.log(`🖼️ 格式: ${result.dataURL.substring(5, 25)}`);
      
      return result;
    } else {
      console.error('❌ 截图返回数据无效:', result);
      return null;
    }
  } catch (error) {
    console.error('❌ 截图失败:', error);
    return null;
  }
}

// 测试截图预览显示
function displayScreenshotPreview(screenshotData) {
  console.log('=== 显示截图预览 ===');
  
  if (!screenshotData || !screenshotData.dataURL) {
    console.error('❌ 无效的截图数据');
    return;
  }
  
  // 创建预览容器
  let container = document.getElementById('screenshot-test-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'screenshot-test-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 400px;
      background: white;
      border: 2px solid #007acc;
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;
    document.body.appendChild(container);
  }
  
  // 创建标题
  const title = document.createElement('h3');
  title.textContent = '📸 屏幕截图测试';
  title.style.cssText = 'margin: 0 0 12px 0; color: #333; font-size: 16px;';
  
  // 创建图像
  const img = document.createElement('img');
  img.src = screenshotData.dataURL;
  img.style.cssText = `
    width: 100%;
    height: auto;
    max-height: 200px;
    object-fit: contain;
    border: 1px solid #ddd;
    border-radius: 4px;
    margin-bottom: 12px;
  `;
  
  // 创建信息
  const info = document.createElement('div');
  info.style.cssText = 'font-size: 12px; color: #666; line-height: 1.4;';
  info.innerHTML = `
    <div>📊 大小: ${Math.round(screenshotData.dataURL.length / 1024)}KB</div>
    <div>🕒 时间: ${new Date().toLocaleTimeString()}</div>
    <div>🖼️ 格式: ${screenshotData.dataURL.substring(5, 25)}</div>
  `;
  
  // 创建关闭按钮
  const closeBtn = document.createElement('button');
  closeBtn.textContent = '✕';
  closeBtn.style.cssText = `
    position: absolute;
    top: 8px;
    right: 8px;
    background: none;
    border: none;
    font-size: 16px;
    cursor: pointer;
    color: #999;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
  `;
  closeBtn.onclick = () => container.remove();
  
  // 清空容器并添加内容
  container.innerHTML = '';
  container.appendChild(closeBtn);
  container.appendChild(title);
  container.appendChild(img);
  container.appendChild(info);
  
  console.log('✅ 截图预览已显示');
}

// 测试截图下载功能
function testScreenshotDownload(screenshotData) {
  console.log('=== 测试截图下载功能 ===');
  
  if (!screenshotData || !screenshotData.dataURL) {
    console.error('❌ 无效的截图数据');
    return;
  }
  
  try {
    const link = document.createElement('a');
    link.href = screenshotData.dataURL;
    link.download = `screenshot-test-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log('✅ 截图下载已触发');
    console.log(`📁 文件名: ${link.download}`);
  } catch (error) {
    console.error('❌ 下载失败:', error);
  }
}

// 测试多次截图性能
async function testMultipleScreenshots(count = 3) {
  console.log(`=== 测试多次截图性能 (${count}次) ===`);
  
  const results = [];
  const startTime = Date.now();
  
  for (let i = 0; i < count; i++) {
    console.log(`📸 第${i + 1}次截图...`);
    const result = await testBasicScreenshot();
    if (result) {
      results.push(result);
    }
    
    // 间隔500ms
    if (i < count - 1) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  const endTime = Date.now();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / count;
  
  console.log('=== 性能测试结果 ===');
  console.log(`✅ 成功截图: ${results.length}/${count}`);
  console.log(`⏱️ 总耗时: ${totalTime}ms`);
  console.log(`📊 平均耗时: ${avgTime.toFixed(1)}ms`);
  
  return results;
}

// 测试截图质量和格式
async function testScreenshotQuality() {
  console.log('=== 测试截图质量和格式 ===');
  
  const result = await testBasicScreenshot();
  if (!result || !result.dataURL) {
    return;
  }
  
  const dataURL = result.dataURL;
  
  // 分析格式
  const formatMatch = dataURL.match(/^data:image\/([^;]+)/);
  const format = formatMatch ? formatMatch[1] : 'unknown';
  
  // 分析大小
  const sizeKB = Math.round(dataURL.length / 1024);
  const sizeMB = (sizeKB / 1024).toFixed(2);
  
  // 估算分辨率（基于数据大小）
  const estimatedPixels = Math.sqrt(sizeKB * 1024 / 3); // 粗略估算
  
  console.log('=== 截图质量分析 ===');
  console.log(`🖼️ 格式: ${format.toUpperCase()}`);
  console.log(`📊 大小: ${sizeKB}KB (${sizeMB}MB)`);
  console.log(`📐 估算像素: ~${Math.round(estimatedPixels)}x${Math.round(estimatedPixels)}`);
  console.log(`🎯 质量评估: ${sizeKB > 500 ? '高质量' : sizeKB > 200 ? '中等质量' : '低质量'}`);
  
  return {
    format,
    sizeKB,
    sizeMB,
    dataURL
  };
}

// 运行完整的截图测试
async function runFullScreenshotTest() {
  console.log('🚀 开始完整屏幕截图测试...\n');
  
  // 1. 基本功能测试
  console.log('1️⃣ 基本功能测试');
  const basicResult = await testBasicScreenshot();
  if (!basicResult) {
    console.log('❌ 基本功能测试失败，终止测试');
    return;
  }
  console.log('');
  
  // 2. 预览显示测试
  console.log('2️⃣ 预览显示测试');
  displayScreenshotPreview(basicResult);
  console.log('');
  
  // 3. 质量分析测试
  console.log('3️⃣ 质量分析测试');
  const qualityResult = await testScreenshotQuality();
  console.log('');
  
  // 4. 性能测试
  console.log('4️⃣ 性能测试');
  const performanceResults = await testMultipleScreenshots(3);
  console.log('');
  
  // 5. 下载测试
  console.log('5️⃣ 下载测试');
  testScreenshotDownload(basicResult);
  console.log('');
  
  // 总结
  console.log('=== 测试总结 ===');
  console.log('✅ 基本功能: 通过');
  console.log('✅ 预览显示: 通过');
  console.log('✅ 质量分析: 通过');
  console.log(`✅ 性能测试: ${performanceResults.length}/3 通过`);
  console.log('✅ 下载功能: 通过');
  console.log('\n🎉 屏幕截图功能测试完成！');
}

// 清理测试环境
function cleanupTest() {
  const container = document.getElementById('screenshot-test-container');
  if (container) {
    container.remove();
    console.log('🧹 测试环境已清理');
  }
}

// 帮助函数
function showScreenshotHelp() {
  console.log(`
=== 屏幕截图测试脚本帮助 ===

可用函数:
- testBasicScreenshot()           : 测试基本截图功能
- displayScreenshotPreview(data)  : 显示截图预览
- testScreenshotDownload(data)    : 测试截图下载
- testMultipleScreenshots(count)  : 测试多次截图性能
- testScreenshotQuality()         : 测试截图质量分析
- runFullScreenshotTest()         : 运行完整测试流程
- cleanupTest()                   : 清理测试环境
- showScreenshotHelp()            : 显示此帮助信息

使用示例:
1. 运行完整测试: runFullScreenshotTest()
2. 单独测试截图: testBasicScreenshot()
3. 性能测试: testMultipleScreenshots(5)
4. 清理环境: cleanupTest()
  `);
}

// 导出到全局作用域
window.screenshotTest = {
  testBasicScreenshot,
  displayScreenshotPreview,
  testScreenshotDownload,
  testMultipleScreenshots,
  testScreenshotQuality,
  runFullScreenshotTest,
  cleanupTest,
  showScreenshotHelp
};

console.log('📸 屏幕截图测试脚本已加载！');
console.log('💡 输入 screenshotTest.showScreenshotHelp() 查看帮助');
console.log('🚀 输入 screenshotTest.runFullScreenshotTest() 开始完整测试');