import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type ThemeColor = 'red' | 'green' | 'blue' | 'purple' | 'amber';

interface ThemeContextType {
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const themeConfigs: Record<ThemeColor, { light: Record<string, string>; dark: Record<string, string> }> = {
  red: {
    light: {
      '--primary': '350 70% 35%',
      '--primary-foreground': '45 15% 97%',
      '--ring': '350 70% 35%',
    },
    dark: {
      '--primary': '350 65% 55%',
      '--primary-foreground': '220 15% 8%',
      '--ring': '350 65% 55%',
    },
  },
  green: {
    light: {
      '--primary': '150 60% 30%',
      '--primary-foreground': '45 15% 97%',
      '--ring': '150 60% 30%',
    },
    dark: {
      '--primary': '150 55% 50%',
      '--primary-foreground': '220 15% 8%',
      '--ring': '150 55% 50%',
    },
  },
  blue: {
    light: {
      '--primary': '215 70% 40%',
      '--primary-foreground': '45 15% 97%',
      '--ring': '215 70% 40%',
    },
    dark: {
      '--primary': '215 65% 55%',
      '--primary-foreground': '220 15% 8%',
      '--ring': '215 65% 55%',
    },
  },
  purple: {
    light: {
      '--primary': '270 60% 40%',
      '--primary-foreground': '45 15% 97%',
      '--ring': '270 60% 40%',
    },
    dark: {
      '--primary': '270 60% 65%',
      '--primary-foreground': '220 15% 8%',
      '--ring': '270 60% 65%',
    },
  },
  amber: {
    light: {
      '--primary': '30 80% 40%',
      '--primary-foreground': '45 15% 97%',
      '--ring': '30 80% 40%',
    },
    dark: {
      '--primary': '30 75% 55%',
      '--primary-foreground': '220 15% 8%',
      '--ring': '30 75% 55%',
    },
  },
};

function applyTheme(color: ThemeColor) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const config = isDark ? themeConfigs[color].dark : themeConfigs[color].light;
  Object.entries(config).forEach(([key, value]) => {
    root.style.setProperty(key, value);
  });
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<ThemeColor>(() => {
    return (localStorage.getItem('theme-color') as ThemeColor) || 'red';
  });

  const setThemeColor = (color: ThemeColor) => {
    setThemeColorState(color);
    localStorage.setItem('theme-color', color);
  };

  useEffect(() => {
    applyTheme(themeColor);
  }, [themeColor]);

  // Re-apply when dark mode changes
  useEffect(() => {
    const observer = new MutationObserver(() => {
      applyTheme(themeColor);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, [themeColor]);

  return (
    <ThemeContext.Provider value={{ themeColor, setThemeColor }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
