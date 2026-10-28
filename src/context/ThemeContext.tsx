import React, { createContext, useContext, useEffect, useState } from 'react';

export type AccentColor = 'emerald' | 'lime' | 'cyan' | 'blue';

interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  isDark: true,
  toggleTheme: () => {},
  accent: 'emerald',
  setAccent: () => {},
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDark, setIsDark] = useState<boolean>(() => {
    const saved = localStorage.getItem('fe_theme');
    return saved !== null ? saved === 'dark' : true;
  });

  const [accent, setAccentState] = useState<AccentColor>(() => {
    return (localStorage.getItem('fe_accent') as AccentColor) || 'emerald';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('fe_theme', isDark ? 'dark' : 'light');
  }, [isDark]);

  const toggleTheme = () => setIsDark((prev) => !prev);

  const setAccent = (newAccent: AccentColor) => {
    setAccentState(newAccent);
    localStorage.setItem('fe_accent', newAccent);
  };

  return (
    <ThemeContext.Provider value={{ isDark, toggleTheme, accent, setAccent }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
