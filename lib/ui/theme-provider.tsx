import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode = 'system' | 'light' | 'dark';

type ThemeContextValue = {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  effectiveScheme: 'light' | 'dark';
};

const STORAGE_KEY = 'polaris.theme.mode';
const ThemeContext = createContext<ThemeContextValue | null>(null);

/**
 * Read persisted theme preference from localStorage (web).
 * On native this returns null and falls back to system preference.
 */
function readStoredMode(): ThemeMode | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'system' || stored === 'light' || stored === 'dark') {
      return stored;
    }
    return null;
  } catch {
    return null;
  }
}

function persistMode(mode: ThemeMode): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(STORAGE_KEY, mode);
  } catch {
    // silent — fallback to in-memory
  }
}

/**
 * Wraps the app with a user-controlled theme override.
 *
 *  - mode='system' (default): follows the OS via useColorScheme
 *  - mode='light' / 'dark': overrides the OS preference
 *
 * The user's selection persists across sessions via localStorage.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [hydrated, setHydrated] = useState(false);

  // Read persisted preference on mount
  useEffect(() => {
    const stored = readStoredMode();
    if (stored) {
      setModeState(stored);
    }
    setHydrated(true);
  }, []);

  function setMode(next: ThemeMode) {
    setModeState(next);
    persistMode(next);
  }

  const effectiveScheme: 'light' | 'dark' =
    mode === 'system' ? (systemScheme === 'dark' ? 'dark' : 'light') : mode;

  // Avoid flash of system theme before hydration completes
  if (!hydrated) {
    return null;
  }

  return (
    <ThemeContext.Provider value={{ mode, setMode, effectiveScheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

/**
 * Hook for reading/setting the user's theme preference.
 * Returns sensible defaults if used outside a ThemeProvider.
 */
export function useThemeMode(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  const systemScheme = useColorScheme();

  if (!ctx) {
    return {
      mode: 'system',
      setMode: () => {
        // no-op outside provider
      },
      effectiveScheme: systemScheme === 'dark' ? 'dark' : 'light'
    };
  }
  return ctx;
}
