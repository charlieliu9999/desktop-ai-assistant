const { app, BrowserWindow, screen, ipcMain, Tray, Menu } = require('electron');
const path = require('path');

let mainWindow;
let tray = null;

// 窗口尺寸
const WINDOW_WIDTH = 450;
const WINDOW_HEIGHT = 700;

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

  // 直接创建展开的窗口,位于屏幕右侧
  mainWindow = new BrowserWindow({
    width: WINDOW_WIDTH,
    height: WINDOW_HEIGHT,
    x: screenWidth - WINDOW_WIDTH - 20,
    y: Math.floor((screenHeight - WINDOW_HEIGHT) / 2),
    transparent: true,
    frame: false,
    alwaysOnTop: false,
    resizable: true,
    minWidth: 400,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });

  // 使用新版本文件
  mainWindow.loadFile('floating-window-v2.html');

  // 开发时打开开发者工具
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 窗口加载完成后,通知渲染进程直接显示展开状态
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('window-expanded');
  });
}

// 创建系统托盘图标
function createTray() {
  // 注意: 需要准备一个托盘图标文件,这里使用占位符
  // 实际使用时需要创建一个16x16或32x32的图标文件
  // tray = new Tray(path.join(__dirname, 'icon.png'));

  // 暂时不创建托盘图标,因为没有图标文件
  // 可以通过dock/任务栏图标直接打开
}

// 最小化到托盘(可选功能)
ipcMain.on('minimize-to-tray', () => {
  if (mainWindow) {
    mainWindow.hide();
  }
});

// 从托盘恢复窗口(可选功能)
ipcMain.on('restore-from-tray', () => {
  if (mainWindow) {
    mainWindow.show();
  }
});

app.whenReady().then(() => {
  createWindow();
  // createTray(); // 如果需要托盘图标,取消注释

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    } else if (mainWindow) {
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

