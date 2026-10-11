import { useEffect, useState } from 'react';

const themeStorageKey = 'app-theme';

function ThemeToggle() {
  const [isDark, setIsDark] = useState(() => localStorage.getItem(themeStorageKey) === 'dark');

  useEffect(() => {
    document.documentElement.dataset.theme = isDark ? 'dark' : 'light';
    localStorage.setItem(themeStorageKey, isDark ? 'dark' : 'light');
  }, [isDark]);

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={() => setIsDark((current) => !current)}
      aria-label={isDark ? 'เปิดโหมดสว่าง' : 'เปิดโหมดมืด'}
      title={isDark ? 'เปิดโหมดสว่าง' : 'เปิดโหมดมืด'}
    >
      {isDark ? '☀' : '☾'}
    </button>
  );
}

export default ThemeToggle;
