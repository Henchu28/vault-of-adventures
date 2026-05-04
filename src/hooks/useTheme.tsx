import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface ThemeContextType {
  themeColor: string; // hex
  setThemeColor: (hex: string) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const DEFAULT_HEX = '#a32c3d';

// Convert hex to HSL components (h, s, l) where s/l are percentages
function hexToHsl(hex: string): { h: number; s: number; l: number } {
  const m = hex.replace('#', '');
  const bigint = parseInt(m.length === 3 ? m.split('').map(c => c + c).join('') : m, 16);
  const r = ((bigint >> 16) & 255) / 255;
  const g = ((bigint >> 8) & 255) / 255;
  const b = (bigint & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

function applyTheme(hex: string) {
  const root = document.documentElement;
  const isDark = root.classList.contains('dark');
  const { h, s, l } = hexToHsl(hex);
  // Adjust lightness slightly based on dark mode for contrast
  const adjustedL = isDark ? Math.min(Math.max(l, 50), 65) : Math.min(Math.max(l, 30), 45);
  const primary = `${h} ${s}% ${adjustedL}%`;
  const fg = adjustedL > 55 ? '220 15% 8%' : '45 15% 97%';
  root.style.setProperty('--primary', primary);
  root.style.setProperty('--primary-foreground', fg);
  root.style.setProperty('--ring', primary);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [themeColor, setThemeColorState] = useState<string>(() => {
    return localStorage.getItem('theme-color-hex') || DEFAULT_HEX;
  });

  const setThemeColor = (hex: string) => {
    setThemeColorState(hex);
    localStorage.setItem('theme-color-hex', hex);
  };

  useEffect(() => {
    applyTheme(themeColor);
  }, [themeColor]);

  useEffect(() => {
    const observer = new MutationObserver(() => applyTheme(themeColor));
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
