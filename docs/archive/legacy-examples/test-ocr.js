// OCR功能测试脚本
// 在浏览器控制台中运行此脚本

// 检查当前配置
async function checkConfig() {
  console.log('=== 当前配置检查 ===');
  
  // 检查是否有configStore
  if (typeof window.useConfigStore !== 'undefined') {
    const store = window.useConfigStore.getState();
    console.log('配置存储:', store);
    console.log('桌面识别配置:', store.config?.desktopRecognition);
  } else {
    console.log('配置存储不可用，检查localStorage...');
    const config = localStorage.getItem('config');
    if (config) {
      const parsedConfig = JSON.parse(config);
      console.log('localStorage配置:', parsedConfig);
    }
  }
  
  // 检查electronAPI
  console.log('ElectronAPI可用性:');
  console.log('- window.electronAPI:', !!window.electronAPI);
  console.log('- screen.capture:', !!window.electronAPI?.screen?.capture);
  console.log('- processWithAI:', !!window.electronAPI?.processWithAI);
}

// 启用桌面识别
async function enableDesktopRecognition() {
  console.log('=== 启用桌面识别 ===');
  
  try {
    if (window.useConfigStore) {
      const store = window.useConfigStore.getState();
      await store.updateConfig({
        desktopRecognition: {
          ...store.config.desktopRecognition,
          enabled: true,
          ocrEnabled: true,
          autoAnalyze: true
        }
      });
      console.log('✅ 桌面识别已启用');
      return true;
    } else {
      console.log('❌ 无法访问配置存储');
      return false;
    }
  } catch (error) {
    console.error('❌ 启用桌面识别失败:', error);
    return false;
  }
}

// 测试屏幕截图API
async function testScreenCapture() {
  console.log('=== 测试屏幕截图API ===');
  
  if (!window.electronAPI?.screen?.capture) {
    console.error('❌ 屏幕截图API不可用');
    return null;
  }
  
  try {
    console.log('📸 正在截图...');
    const result = await window.electronAPI.screen.capture();
    
    if (result && result.dataURL) {
      console.log('✅ 截图成功');
      console.log('数据URL长度:', result.dataURL.length);
      console.log('数据URL前缀:', result.dataURL.substring(0, 50) + '...');
      
      // 创建图像预览
      const img = document.createElement('img');
      img.src = result.dataURL;
      img.style.maxWidth = '300px';
      img.style.maxHeight = '200px';
      img.style.border = '2px solid #007acc';
      img.style.borderRadius = '8px';
      img.style.margin = '10px';
      
      // 添加到页面
      const container = document.getElementById('screenshot-preview') || document.body;
      const existingImg = container.querySelector('img[data-test="screenshot"]');
      if (existingImg) {
        existingImg.remove();
      }
      
      img.setAttribute('data-test', 'screenshot');
      container.appendChild(img);
      
      console.log('🖼️ 截图预览已添加到页面');
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

// 测试AI处理
async function testAIProcessing(imageData) {
  console.log('=== 测试AI处理 ===');
  
  if (!window.electronAPI?.processWithAI) {
    console.error('❌ AI处理API不可用');
    return null;
  }
  
  if (!imageData) {
    console.error('❌ 没有图像数据');
    return null;
  }
  
  try {
    console.log('🤖 正在进行AI分析...');
    const analysis = await window.electronAPI.processWithAI({
      message: '请分析这个桌面截图，识别其中的文本内容和UI元素',
      attachments: [{
        type: 'image',
        name: 'desktop-screenshot.png',
        url: imageData.dataURL,
      }],
      context: 'desktop-analysis',
    });
    
    if (analysis) {
      console.log('✅ AI分析完成');
      console.log('分析结果:', analysis);
      return analysis;
    } else {
      console.error('❌ AI分析返回空结果');
      return null;
    }
  } catch (error) {
    console.error('❌ AI分析失败:', error);
    return null;
  }
}

// 运行完整测试
async function runFullTest() {
  console.log('🚀 开始OCR功能完整测试...\n');
  
  // 1. 检查配置
  await checkConfig();
  console.log('\n');
  
  // 2. 启用桌面识别
  const enabled = await enableDesktopRecognition();
  if (!enabled) {
    console.log('❌ 测试终止：无法启用桌面识别');
    return;
  }
  console.log('\n');
  
  // 3. 测试截图
  const imageData = await testScreenCapture();
  if (!imageData) {
    console.log('❌ 测试终止：截图失败');
    return;
  }
  console.log('\n');
  
  // 4. 测试AI处理
  const analysis = await testAIProcessing(imageData);
  console.log('\n');
  
  // 5. 总结
  console.log('=== 测试总结 ===');
  console.log('✅ 配置检查: 完成');
  console.log('✅ 桌面识别启用: 完成');
  console.log('✅ 屏幕截图: 完成');
  console.log(analysis ? '✅ AI分析: 完成' : '❌ AI分析: 失败');
  console.log('\n🎉 OCR功能测试完成！');
}

// 帮助函数
function showHelp() {
  console.log(`
=== OCR测试脚本帮助 ===

可用函数:
- checkConfig()           : 检查当前配置
- enableDesktopRecognition() : 启用桌面识别功能
- testScreenCapture()     : 测试屏幕截图API
- testAIProcessing(data)  : 测试AI处理功能
- runFullTest()          : 运行完整测试流程
- showHelp()             : 显示此帮助信息

使用示例:
1. 运行完整测试: runFullTest()
2. 单独测试截图: testScreenCapture()
3. 检查配置: checkConfig()
  `);
}

// 导出到全局作用域
window.ocrTest = {
  checkConfig,
  enableDesktopRecognition,
  testScreenCapture,
  testAIProcessing,
  runFullTest,
  showHelp
};

console.log('📋 OCR测试脚本已加载！');
console.log('💡 输入 ocrTest.showHelp() 查看帮助');
console.log('🚀 输入 ocrTest.runFullTest() 开始完整测试');