import type { ElectronAPI } from '../renderer/preload';

declare global {
  interface Window {
    electronAPI: ElectronAPI;
    versions: {
      node: string;
      chrome: string;
      electron: string;
      app: string;
    };
    debug?: {
      log: (...args: any[]) => void;
      error: (...args: any[]) => void;
      warn: (...args: any[]) => void;
      info: (...args: any[]) => void;
    };
  }
}

export {};
