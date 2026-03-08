'use client';

import { Theme, useTheme } from './ThemeContext';

const themes: { value: Theme; label: string; icon: string }[] = [
  { value: 'dark', label: 'Dark', icon: '🌙' },
  { value: 'light', label: 'Light', icon: '☀️' },
  { value: 'liquid-glass', label: 'Glass', icon: '💎' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="theme-switcher flex items-center">
      {themes.map((t) => (
        <button
          key={t.value}
          onClick={() => setTheme(t.value)}
          className={`px-2.5 py-1 text-xs rounded transition-all ${
            theme === t.value ? 'theme-btn-active' : 'theme-btn-inactive'
          }`}
          title={t.label}
        >
          <span className="mr-1">{t.icon}</span>
          <span className="hidden sm:inline">{t.label}</span>
        </button>
      ))}
    </div>
  );
}
