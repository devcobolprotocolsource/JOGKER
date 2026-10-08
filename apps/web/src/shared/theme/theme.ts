import { createSignal } from 'solid-js';

export type ThemeMode = 'light' | 'dark';
const [theme, setThemeSignal] = createSignal<ThemeMode>('light');
const storageKey = 'jokger.theme.v1';

export function applyTheme(mode: ThemeMode): void {
  setThemeSignal(mode);
  document.documentElement.dataset.theme = mode;
  document.documentElement.style.colorScheme = mode;
  try {
    localStorage.setItem(storageKey, mode);
  } catch {
    return;
  }
}

export function initializeTheme(): void {
  let saved: string | null = null;
  try {
    saved = localStorage.getItem(storageKey);
  } catch {
    saved = null;
  }
  const prefersDark =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initial =
    saved === 'light' || saved === 'dark'
      ? saved
      : prefersDark
        ? 'dark'
        : 'light';
  applyTheme(initial);
}

export function toggleTheme(): void {
  applyTheme(theme() === 'light' ? 'dark' : 'light');
}

export { theme };
