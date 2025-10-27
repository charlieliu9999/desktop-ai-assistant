import { useEffect } from 'react';
import { Toaster } from 'sonner';
import MainWindow from './components/MainWindow';
import { useConfigStore } from './stores/configStore';
import { useThemeStore } from './stores/themeStore';
import { useGlassEffect } from './hooks/useGlassEffect';

function App() {
  const { config } = useConfigStore();
  const { loadFromStorage, mode } = useThemeStore();

  // Initialize theme from storage
  useEffect(() => {
    loadFromStorage();
  }, [loadFromStorage]);

  // Apply glass effect based on config and theme
  useGlassEffect();

  // Apply language
  useEffect(() => {
    document.documentElement.lang = config.language;
  }, [config.language]);

  return (
    <div className="h-screen overflow-hidden">
      <MainWindow />
      <Toaster
        position="top-right"
        theme={mode === 'dark' ? 'dark' : 'light'}
        richColors
      />
    </div>
  );
}

export default App;
