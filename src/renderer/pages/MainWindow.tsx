import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { MessageSquare, Settings, Mic, Monitor, Activity, Users } from 'lucide-react';
import Sidebar from '../components/Sidebar';
import ChatInterface from '../components/ChatInterface';
import DesktopCapture from '../components/DesktopCapture';
import MedicalDashboard from '../components/MedicalDashboard';
import VoiceControls from '../components/VoiceControls';
import SystemStatus from '../components/SystemStatus';
import { useConfigStore } from '../stores/configStore';
import { toast } from 'sonner';

const MainWindow: React.FC = () => {
  const { config } = useConfigStore();
  const [activeTab, setActiveTab] = useState('chat');
  const [isLoading, setIsLoading] = useState(true);

  // Navigation items
  const navigationItems = [
    {
      id: 'chat',
      label: '智能对话',
      icon: MessageSquare,
      component: ChatInterface,
    },
    {
      id: 'desktop',
      label: '桌面识别',
      icon: Monitor,
      component: DesktopCapture,
    },
    {
      id: 'medical',
      label: '医疗系统',
      icon: Activity,
      component: MedicalDashboard,
      disabled: !config.medical?.enabled,
    },
    {
      id: 'voice',
      label: '语音控制',
      icon: Mic,
      component: VoiceControls,
      disabled: !config.voice?.enabled,
    },
    {
      id: 'status',
      label: '系统状态',
      icon: Users,
      component: SystemStatus,
    },
  ];

  // Initialize main window
  useEffect(() => {
    const initializeWindow = async () => {
      try {
        // Notify main process that window is ready
        if (window.electronAPI?.windowReady) {
          await window.electronAPI.windowReady('main');
        }

        // Set up global shortcuts listener
        if (window.electronAPI?.onShortcut) {
          window.electronAPI.onShortcut((shortcut: string) => {
            handleGlobalShortcut(shortcut);
          });
        }

        // Set up voice activation listener
        if (window.electronAPI?.onVoiceActivation) {
          window.electronAPI.onVoiceActivation(() => {
            setActiveTab('voice');
            toast.success('语音激活');
          });
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Failed to initialize main window:', error);
        toast.error('窗口初始化失败');
        setIsLoading(false);
      }
    };

    initializeWindow();
  }, []);

  // Handle global shortcuts
  const handleGlobalShortcut = (shortcut: string) => {
    switch (shortcut) {
      case 'toggleMainWindow':
        // Main window toggle is handled by main process
        break;
      case 'quickCapture':
        setActiveTab('desktop');
        toast.info('快速截图模式');
        break;
      case 'openSettings':
        openSettings();
        break;
      default:
        console.log('Unhandled shortcut:', shortcut);
    }
  };

  // Open settings window
  const openSettings = async () => {
    try {
      if (window.electronAPI?.openWindow) {
        await window.electronAPI.openWindow('settings');
      }
    } catch (error) {
      console.error('Failed to open settings:', error);
      toast.error('无法打开设置');
    }
  };

  // Get active component
  const getActiveComponent = () => {
    const activeItem = navigationItems.find(item => item.id === activeTab);
    if (!activeItem || activeItem.disabled) {
      return ChatInterface;
    }
    return activeItem.component;
  };

  const ActiveComponent = getActiveComponent();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="flex flex-col items-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <p className="text-muted-foreground">正在初始化...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      {/* Sidebar */}
      <Sidebar
        items={navigationItems}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        onSettingsClick={openSettings}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="border-b border-border bg-card px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold">
                {navigationItems.find(item => item.id === activeTab)?.label || '智能助手'}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                桌面AI助手 - 不打扰、隐身、谁叫谁出
              </p>
            </div>
            
            {/* Quick actions */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setActiveTab('voice')}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="语音激活 (Ctrl+Shift+V)"
                disabled={!config.voice?.enabled}
              >
                <Mic className="h-4 w-4" />
              </button>
              <button
                onClick={openSettings}
                className="p-2 rounded-lg hover:bg-accent transition-colors"
                title="设置 (Ctrl+,)"
              >
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
        </header>

        {/* Content area */}
        <main className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/*" element={<ActiveComponent />} />
          </Routes>
        </main>
      </div>
    </div>
  );
};

export default MainWindow;