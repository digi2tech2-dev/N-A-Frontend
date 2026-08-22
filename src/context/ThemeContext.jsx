import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const ThemeContext = createContext();
const THEME_STORAGE_KEY = 'kanz-coins-theme';

const normalizeTheme = (value) => (value === 'light' || value === 'dark' ? value : null);

const getInitialTheme = () => {
  try {
    return normalizeTheme(window.localStorage.getItem(THEME_STORAGE_KEY)) || 'dark';
  } catch {
    return 'dark';
  }
};

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
  const [theme, setThemeState] = useState(getInitialTheme);

  const isDark = theme === 'dark';

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.dataset.theme = theme;

    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // Storage can be blocked in private browsing; the visual theme still applies.
    }
  }, [isDark, theme]);

  const setTheme = useCallback((nextTheme) => {
    setThemeState((currentTheme) => {
      const resolvedTheme = typeof nextTheme === 'function' ? nextTheme(currentTheme) : nextTheme;
      return normalizeTheme(resolvedTheme) || currentTheme;
    });
  }, []);

  const toggleTheme = useCallback(() => {
    setTheme((currentTheme) => (currentTheme === 'dark' ? 'light' : 'dark'));
  }, [setTheme]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      toggleTheme,
      setTheme
    }),
    [theme, isDark, toggleTheme, setTheme]
  );

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};
