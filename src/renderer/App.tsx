import React, { useEffect } from 'react';
import { Toaster } from 'sonner';
import MainWindow from './components/MainWindow';
import { useConfigStore } from './stores/configStore';
import { useGlassEffect } from './hooks/useGlassEffect';

function App() {
  const { config } = useConfigStore();

  // Apply glass effect based on config and theme
  useGlassEffect();

  // Apply dark mode (glass 主题跟随系统深浅色)
  useEffect(() => {
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark =
      config.theme === 'dark' ||
      (config.theme === 'auto' && isSystemDark) ||
      (config.theme === 'glass' && isSystemDark);

    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [config.theme]);

  // Apply language
  useEffect(() => {
    document.documentElement.lang = config.language;
  }, [config.language]);

  return (
    <div className="h-screen overflow-hidden">
      <MainWindow />
      <Toaster
        position="top-right"
        theme={(config.theme === 'dark') ||
               (config.theme === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches) ||
               (config.theme === 'glass' && window.matchMedia('(prefers-color-scheme: dark)').matches)
               ? 'dark' : 'light'}
        richColors
      />
    </div>
  );
}

export default App;
