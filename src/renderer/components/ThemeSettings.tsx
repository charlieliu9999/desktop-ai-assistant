/**
 * 主题设置组件
 *
 * 提供可视化的主题配置界面
 * 支持主题切换、玻璃效果调节、颜色自定义
 */

import React, { useState } from 'react';
import { useThemeStore } from '../stores/themeStore';
import type { ThemeMode } from '../config/themes';
import { cn } from '../utils/styleUtils';

// 颜色转换辅助函数
const rgbToHex = (rgb: string): string => {
  const parts = rgb.split(' ').map(n => parseInt(n.trim()));
  if (parts.length !== 3 || parts.some(isNaN)) return '#000000';
  return '#' + parts.map(n => n.toString(16).padStart(2, '0')).join('');
};

const hexToRgb = (hex: string): string => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return '0 0 0';
  return `${parseInt(result[1], 16)} ${parseInt(result[2], 16)} ${parseInt(result[3], 16)}`;
};

// 默认颜色值
const DEFAULT_COLORS = {
  primary: '59 130 246',
  success: '34 197 94',
  warning: '251 146 60',
  error: '239 68 68',
};

export const ThemeSettings: React.FC = () => {
  const {
    mode,
    config,
    setMode,
    updateGlassEffect,
    updateColor,
    resetTheme,
  } = useThemeStore();

  const [activeTab, setActiveTab] = useState<'theme' | 'glass' | 'colors'>('theme');

  // 主题选项
  const themeOptions: { value: ThemeMode; label: string; description: string; icon: string }[] = [
    {
      value: 'glass',
      label: '玻璃主题',
      description: '半透明毛玻璃效果，现代科技感',
      icon: '✨',
    },
    {
      value: 'light',
      label: '浅色主题',
      description: '纯白背景，清晰易读',
      icon: '☀️',
    },
    {
      value: 'dark',
      label: '深色主题',
      description: '深色背景，护眼舒适',
      icon: '🌙',
    },
    {
      value: 'auto',
      label: '自动主题',
      description: '跟随系统主题自动切换',
      icon: '🔄',
    },
  ];

  return (
    <div className="theme-settings">
      {/* 标题 */}
      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-[rgb(var(--foreground))]">
          主题设置
        </h2>
        <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">
          自定义应用的外观和样式
        </p>
      </div>

      {/* 标签页 */}
      <div className="flex gap-2 mb-6 border-b border-[rgb(var(--border))]">
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            'border-b-2 -mb-px',
            activeTab === 'theme'
              ? 'border-[rgb(var(--primary))] text-[rgb(var(--primary))]'
              : 'border-transparent text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
          )}
          onClick={() => setActiveTab('theme')}
        >
          主题选择
        </button>
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            'border-b-2 -mb-px',
            activeTab === 'glass'
              ? 'border-[rgb(var(--primary))] text-[rgb(var(--primary))]'
              : 'border-transparent text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
          )}
          onClick={() => setActiveTab('glass')}
          disabled={mode !== 'glass'}
        >
          玻璃效果
        </button>
        <button
          className={cn(
            'px-4 py-2 text-sm font-medium transition-colors',
            'border-b-2 -mb-px',
            activeTab === 'colors'
              ? 'border-[rgb(var(--primary))] text-[rgb(var(--primary))]'
              : 'border-transparent text-[rgb(var(--muted-foreground))] hover:text-[rgb(var(--foreground))]'
          )}
          onClick={() => setActiveTab('colors')}
        >
          颜色自定义
        </button>
      </div>

      {/* 主题选择面板 */}
      {activeTab === 'theme' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                className={cn(
                  'flex items-start gap-4 p-4 rounded-lg border-2 transition-all',
                  'hover:border-[rgb(var(--primary))] hover:shadow-md',
                  mode === option.value
                    ? 'border-[rgb(var(--primary))] bg-[rgb(var(--primary)_/_0.05)]'
                    : 'border-[rgb(var(--border))] bg-[rgb(var(--card))]'
                )}
                onClick={() => setMode(option.value)}
              >
                <span className="text-3xl">{option.icon}</span>
                <div className="flex-1 text-left">
                  <div className="font-medium text-[rgb(var(--foreground))]">
                    {option.label}
                  </div>
                  <div className="mt-1 text-sm text-[rgb(var(--muted-foreground))]">
                    {option.description}
                  </div>
                </div>
                {mode === option.value && (
                  <div className="flex items-center justify-center w-6 h-6 rounded-full bg-[rgb(var(--primary))]">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
              </button>
            ))}
          </div>

          {/* 预览区域 */}
          <div className="mt-6 p-4 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--card))]">
            <h3 className="text-sm font-medium text-[rgb(var(--foreground))] mb-3">
              预览效果
            </h3>
            <div className="space-y-2">
              {/* 用户消息预览 */}
              <div className="flex justify-end">
                <div className="message-bubble message-user max-w-[80%]">
                  这是用户消息的预览效果
                </div>
              </div>
              {/* 助手消息预览 */}
              <div className="flex justify-start">
                <div className="message-bubble message-assistant max-w-[80%]">
                  这是助手消息的预览效果，支持实时主题切换
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 玻璃效果调节面板 */}
      {activeTab === 'glass' && (
        <div className="space-y-6">
          {mode !== 'glass' && (
            <div className="p-4 rounded-lg bg-[rgb(var(--warning)_/_0.1)] border border-[rgb(var(--warning)_/_0.3)]">
              <p className="text-sm text-[rgb(var(--warning))]">
                ⚠️ 玻璃效果仅在"玻璃主题"下可用，请先切换到玻璃主题。
              </p>
            </div>
          )}

          {/* 透明度 */}
          <div className={cn(mode !== 'glass' && 'opacity-50 pointer-events-none')}>
            <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
              透明度: {(config.glassEffect.opacity * 100).toFixed(0)}%
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.glassEffect.opacity * 100}
              onChange={(e) =>
                updateGlassEffect({ opacity: Number(e.target.value) / 100 })
              }
              className="w-full h-2 bg-[rgb(var(--muted))] rounded-lg appearance-none cursor-pointer"
              disabled={mode !== 'glass'}
            />
            <div className="flex justify-between mt-1 text-xs text-[rgb(var(--muted-foreground))]">
              <span>完全透明</span>
              <span>不透明</span>
            </div>
          </div>

          {/* 模糊度 */}
          <div className={cn(mode !== 'glass' && 'opacity-50 pointer-events-none')}>
            <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
              模糊度: {config.glassEffect.blur}px
            </label>
            <input
              type="range"
              min="0"
              max="100"
              value={config.glassEffect.blur}
              onChange={(e) =>
                updateGlassEffect({ blur: Number(e.target.value) })
              }
              className="w-full h-2 bg-[rgb(var(--muted))] rounded-lg appearance-none cursor-pointer"
              disabled={mode !== 'glass'}
            />
            <div className="flex justify-between mt-1 text-xs text-[rgb(var(--muted-foreground))]">
              <span>无模糊</span>
              <span>强模糊</span>
            </div>
          </div>

          {/* 饱和度 */}
          <div className={cn(mode !== 'glass' && 'opacity-50 pointer-events-none')}>
            <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
              饱和度: {config.glassEffect.saturation}%
            </label>
            <input
              type="range"
              min="100"
              max="300"
              value={config.glassEffect.saturation}
              onChange={(e) =>
                updateGlassEffect({ saturation: Number(e.target.value) })
              }
              className="w-full h-2 bg-[rgb(var(--muted))] rounded-lg appearance-none cursor-pointer"
              disabled={mode !== 'glass'}
            />
            <div className="flex justify-between mt-1 text-xs text-[rgb(var(--muted-foreground))]">
              <span>正常</span>
              <span>高饱和</span>
            </div>
          </div>

          {/* 预览区域 */}
          <div className="mt-6 p-4 rounded-lg border border-[rgb(var(--border))]">
            <h3 className="text-sm font-medium text-[rgb(var(--foreground))] mb-3">
              玻璃效果预览
            </h3>
            <div className="glass p-6 rounded-lg">
              <p className="text-[rgb(var(--foreground))]">
                这是玻璃效果的预览区域
              </p>
              <p className="mt-2 text-sm text-[rgb(var(--muted-foreground))]">
                调整上方的滑块可以实时看到效果变化
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 颜色自定义面板 */}
      {activeTab === 'colors' && (
        <div className="space-y-6">
          <div className="p-4 rounded-lg bg-[rgb(var(--info)_/_0.1)] border border-[rgb(var(--info)_/_0.3)]">
            <p className="text-sm text-[rgb(var(--info))]">
              💡 提示：可以使用颜色选择器或直接输入 RGB 格式（如 "59 130 246"），修改后立即生效。
            </p>
          </div>

          {/* 主色调 */}
          <div>
            <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
              主色调 (Primary)
            </label>
            <div className="flex gap-3 items-center">
              <div
                className="w-12 h-12 rounded-lg border-2 border-[rgb(var(--border))] cursor-pointer overflow-hidden"
                style={{ backgroundColor: `rgb(${config.colors.primary})` }}
              >
                <input
                  type="color"
                  value={rgbToHex(config.colors.primary)}
                  onChange={(e) => updateColor('primary', hexToRgb(e.target.value))}
                  className="w-full h-full opacity-0 cursor-pointer"
                  title="点击选择颜色"
                />
              </div>
              <input
                type="text"
                value={config.colors.primary}
                onChange={(e) => updateColor('primary', e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--input))] text-[rgb(var(--foreground))]"
                placeholder="59 130 246"
              />
              <button
                type="button"
                onClick={() => updateColor('primary', DEFAULT_COLORS.primary)}
                className="px-3 py-2 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] transition-colors"
                title="恢复默认颜色"
              >
                恢复
              </button>
            </div>
          </div>

          {/* 成功色 */}
          <div>
            <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
              成功色 (Success)
            </label>
            <div className="flex gap-3 items-center">
              <div
                className="w-12 h-12 rounded-lg border-2 border-[rgb(var(--border))] cursor-pointer overflow-hidden"
                style={{ backgroundColor: `rgb(${config.colors.success})` }}
              >
                <input
                  type="color"
                  value={rgbToHex(config.colors.success)}
                  onChange={(e) => updateColor('success', hexToRgb(e.target.value))}
                  className="w-full h-full opacity-0 cursor-pointer"
                  title="点击选择颜色"
                />
              </div>
              <input
                type="text"
                value={config.colors.success}
                onChange={(e) => updateColor('success', e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--input))] text-[rgb(var(--foreground))]"
                placeholder="34 197 94"
              />
              <button
                type="button"
                onClick={() => updateColor('success', DEFAULT_COLORS.success)}
                className="px-3 py-2 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] transition-colors"
                title="恢复默认颜色"
              >
                恢复
              </button>
            </div>
          </div>

          {/* 警告色 */}
          <div>
            <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
              警告色 (Warning)
            </label>
            <div className="flex gap-3 items-center">
              <div
                className="w-12 h-12 rounded-lg border-2 border-[rgb(var(--border))] cursor-pointer overflow-hidden"
                style={{ backgroundColor: `rgb(${config.colors.warning})` }}
              >
                <input
                  type="color"
                  value={rgbToHex(config.colors.warning)}
                  onChange={(e) => updateColor('warning', hexToRgb(e.target.value))}
                  className="w-full h-full opacity-0 cursor-pointer"
                  title="点击选择颜色"
                />
              </div>
              <input
                type="text"
                value={config.colors.warning}
                onChange={(e) => updateColor('warning', e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--input))] text-[rgb(var(--foreground))]"
                placeholder="251 146 60"
              />
              <button
                type="button"
                onClick={() => updateColor('warning', DEFAULT_COLORS.warning)}
                className="px-3 py-2 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] transition-colors"
                title="恢复默认颜色"
              >
                恢复
              </button>
            </div>
          </div>

          {/* 错误色 */}
          <div>
            <label className="block text-sm font-medium text-[rgb(var(--foreground))] mb-2">
              错误色 (Error)
            </label>
            <div className="flex gap-3 items-center">
              <div
                className="w-12 h-12 rounded-lg border-2 border-[rgb(var(--border))] cursor-pointer overflow-hidden"
                style={{ backgroundColor: `rgb(${config.colors.error})` }}
              >
                <input
                  type="color"
                  value={rgbToHex(config.colors.error)}
                  onChange={(e) => updateColor('error', hexToRgb(e.target.value))}
                  className="w-full h-full opacity-0 cursor-pointer"
                  title="点击选择颜色"
                />
              </div>
              <input
                type="text"
                value={config.colors.error}
                onChange={(e) => updateColor('error', e.target.value)}
                className="flex-1 px-3 py-2 rounded-lg border border-[rgb(var(--border))] bg-[rgb(var(--input))] text-[rgb(var(--foreground))]"
                placeholder="239 68 68"
              />
              <button
                type="button"
                onClick={() => updateColor('error', DEFAULT_COLORS.error)}
                className="px-3 py-2 text-sm rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--muted-foreground))] hover:bg-[rgb(var(--muted))] transition-colors"
                title="恢复默认颜色"
              >
                恢复
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 底部操作按钮 */}
      <div className="mt-8 pt-6 border-t border-[rgb(var(--border))] flex justify-end gap-3">
        <button
          onClick={resetTheme}
          className="px-4 py-2 rounded-lg border border-[rgb(var(--border))] text-[rgb(var(--foreground))] hover:bg-[rgb(var(--muted))] transition-colors"
        >
          重置为默认
        </button>
      </div>
    </div>
  );
};

