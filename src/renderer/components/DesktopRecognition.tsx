import React from 'react';
import { OneClickDesktopChat } from './medical';

interface DesktopRecognitionProps {
  className?: string;
}

const DesktopRecognition: React.FC<DesktopRecognitionProps> = ({ className = '' }) => {
  return (
    <div className={`flex flex-col h-full bg-background ${className}`}>
      <div className="flex items-center justify-between p-4 border-b border-border">
        <div>
          <h2 className="text-lg font-semibold">桌面识别 · 一键屏幕对话</h2>
          <p className="text-sm text-muted-foreground">自动截屏、识别患者、生成推荐，并可继续对话</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <OneClickDesktopChat />
      </div>
    </div>
  );
};

export default DesktopRecognition;