/**
 * 智能体服务主页面
 * 整合智能体列表、对话和 iframe 模式
 * 两栏布局：智能体列表 | 对话区域
 *
 * TODO: 历史记录功能已暂时移除
 * 未来需要从 Bisheng 服务端获取历史记录，而不是在前端保存
 * 可能的 API: GET /api/v2/workflow/history?workflow_id=xxx&session_id=xxx
 */

import React, { useState, useEffect } from 'react';
import { Settings, Bot, AlertCircle, LogIn } from 'lucide-react';
import { toast } from 'sonner';
// 为避免在renderer类型检查时拉入外部依赖，这里使用轻量占位组件。
// 运行时若需要接入bisheng集成，可后续按feature-flag动态加载。
const AgentList: React.FC<any> = () => null;
const AgentChat: React.FC<any> = () => null;
const AgentIframe: React.FC<any> = () => null;
import type { BishengWorkflow, BishengConfig } from '../../shared/types';

const AgentService: React.FC = () => {
  const [selectedAgent, setSelectedAgent] = useState<BishengWorkflow | null>(null);
  const [isListCollapsed, setIsListCollapsed] = useState(false);
  const [config, setConfig] = useState<BishengConfig | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // 加载配置和认证状态
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const bishengConfig = await window.electronAPI.bisheng.getConfig();
      setConfig(bishengConfig);

      if (bishengConfig) {
        // 检查认证状态
        const authenticated = await window.electronAPI.bisheng.isAuthenticated();
        setIsAuthenticated(authenticated);

        // 如果启用自动登录且未认证
        if (bishengConfig.autoLogin && !authenticated && bishengConfig.username && bishengConfig.password) {
          await handleAutoLogin(bishengConfig);
        } else if (!authenticated) {
          setShowLoginForm(true);
        }
      } else {
        toast.error('未配置 Bisheng 服务，请先在设置中配置');
      }
    } catch (error) {
      console.error('Failed to load Bisheng config:', error);
      toast.error('加载配置失败');
    }
  };

  // 自动登录
  const handleAutoLogin = async (cfg: BishengConfig) => {
    try {
      const result = await window.electronAPI.bisheng.login(cfg.username, cfg.password);
      if (result) {
        setIsAuthenticated(true);
        toast.success('自动登录成功');
      }
    } catch (error: any) {
      console.error('Auto login failed:', error);
      setShowLoginForm(true);
    }
  };

  // 手动登录
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!loginForm.username || !loginForm.password) {
      toast.error('请输入用户名和密码');
      return;
    }

    setIsLoggingIn(true);

    try {
      const result = await window.electronAPI.bisheng.login(loginForm.username, loginForm.password);
      
      if (result) {
        setIsAuthenticated(true);
        setShowLoginForm(false);
        toast.success('登录成功');
        
        // 如果用户选择保存密码,更新配置
        if (config?.savePassword) {
          await window.electronAPI.bisheng.updateConfig({
            username: loginForm.username,
            password: loginForm.password,
            accessToken: result.token,
            tokenExpiry: result.expiry,
          });
        }
      }
    } catch (error: any) {
      console.error('Login failed:', error);
      toast.error(error?.message || '登录失败');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // 选择智能体
  const handleSelectAgent = (agent: BishengWorkflow) => {
    setSelectedAgent(agent);
  };

  // 登录表单
  if (showLoginForm && !isAuthenticated) {
    return (
      <div className="flex items-center justify-center h-full bg-[rgb(var(--background))] p-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-[rgb(var(--primary)_/_0.1)] rounded-full mb-4">
              <Bot className="w-8 h-8 text-[rgb(var(--primary))]" />
            </div>
            <h2 className="text-2xl font-bold text-[rgb(var(--foreground))] mb-2">
              登录 Bisheng 智能体平台
            </h2>
            <p className="text-sm text-[rgb(var(--muted-foreground))]">
              请使用您的 Bisheng 账号登录
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
                用户名
              </label>
              <input
                type="text"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="请输入用户名或邮箱"
                className="w-full px-4 py-3 border border-[rgb(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] bg-[rgb(var(--input))] text-[rgb(var(--foreground))]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
                密码
              </label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="请输入密码"
                className="w-full px-4 py-3 border border-[rgb(var(--border))] rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))] bg-[rgb(var(--input))] text-[rgb(var(--foreground))]"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-[rgb(var(--primary))] hover:opacity-90 disabled:opacity-50 text-white font-medium rounded-lg transition-all disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoggingIn ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>登录中...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>登录</span>
                </>
              )}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-xs text-[rgb(var(--muted-foreground))]">
              服务地址: {config?.baseUrl || '未配置'}
            </p>
            <button
              type="button"
              onClick={() => window.electronAPI?.window?.showSettings?.()}
              className="text-xs text-[rgb(var(--primary))] hover:underline mt-2"
            >
              前往设置配置服务
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 未配置
  if (!config || !config.enabled) {
    return (
      <div className="flex items-center justify-center h-full bg-[rgb(var(--background))] p-8">
        <div className="max-w-md text-center">
          <AlertCircle className="w-16 h-16 text-[rgb(var(--warning))] mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-[rgb(var(--foreground))] mb-2">
            Bisheng 服务未配置
          </h3>
          <p className="text-sm text-[rgb(var(--muted-foreground))] mb-6">
            请先在设置中配置 Bisheng 智能体平台的连接信息
          </p>
          <button
            type="button"
            onClick={() => window.electronAPI?.window?.showSettings?.()}
            className="inline-flex items-center space-x-2 px-6 py-3 bg-[rgb(var(--primary))] hover:opacity-90 text-white rounded-lg transition-all"
          >
            <Settings className="w-5 h-5" />
            <span>前往设置</span>
          </button>
        </div>
      </div>
    );
  }

  // 主界面 - 三栏布局
  return (
    <div className="flex h-full bg-[rgb(var(--background))]">
      {/* 左侧：智能体列表 */}
      <AgentList
        onSelectAgent={handleSelectAgent}
        selectedAgent={selectedAgent || undefined}
        isCollapsed={isListCollapsed}
        onToggleCollapse={() => setIsListCollapsed(!isListCollapsed)}
      />

      {/* 中间：对话区域 */}
      <div className="flex-1 flex flex-col">
        {selectedAgent ? (
          config.mode === 'iframe' ? (
            <AgentIframe workflow={selectedAgent} />
          ) : (
            <AgentChat workflow={selectedAgent} />
          )
        ) : (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <Bot className="w-16 h-16 text-[rgb(var(--muted-foreground)_/_0.3)] mx-auto mb-4" />
              <h3 className="text-lg font-medium text-[rgb(var(--foreground))] mb-2">
                选择一个智能体开始对话
              </h3>
              <p className="text-sm text-[rgb(var(--muted-foreground))]">
                从左侧列表中选择一个智能体
              </p>
              <div className="mt-4 text-xs text-[rgb(var(--muted-foreground))]">
                当前模式: {config.mode === 'iframe' ? 'iframe 嵌入' : 'API 调用'}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* TODO: 右侧历史记录面板已暂时移除 */}
      {/* 未来需要从 Bisheng 服务端获取历史记录 */}
      {/* {config.mode === 'api' && (
        <div className="border-l border-gray-200 dark:border-gray-700">
          <AgentHistory onSelectWorkflow={handleSelectAgent} />
        </div>
      )} */}
    </div>
  );
};

export default AgentService;
