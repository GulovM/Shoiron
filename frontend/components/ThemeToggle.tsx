'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const isDark = theme === 'dark';

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      className="btn-secondary h-10 w-10 rounded-full p-0"
      aria-label="Переключить тему"
    >
      <span aria-hidden className="text-base leading-none">
        {isDark ? '☀' : '☾'}
      </span>
    </button>
  );
}
