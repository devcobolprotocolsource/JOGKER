import { createSignal, type Accessor } from 'solid-js';

export type ThemeMode = 'light' | 'dark';
const [themeSignal, setThemeSignal] = createSignal<ThemeMode>('light');
const storageKey = 'jokger.theme.v1';

export interface ColorTokens {
  primary: string;
  accent: string;
}

export function applyTheme(mode: ThemeMode): void {
  setThemeSignal(mode);
  document.documentElement.dataset['theme'] = mode;
  document.documentElement.style.colorScheme = mode;
  try {
    localStorage.setItem(storageKey, mode);
  } catch {
    return;
  }
}

export function applyColorTokens(tokens: ColorTokens): void {
  const root = document.documentElement;
  root.style.setProperty('--color-brand', tokens.primary);
  root.style.setProperty('--color-accent', tokens.accent);

  const primaryHex = tokens.primary.replace('#', '');
  const r = parseInt(primaryHex.slice(0, 2), 16);
  const g = parseInt(primaryHex.slice(2, 4), 16);
  const b = parseInt(primaryHex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const contrastColor = luminance > 0.5 ? '#1B1410' : '#FFFFFF';
  root.style.setProperty('--color-brand-contrast', contrastColor);

  const brandHover =
    luminance > 0.5 ? adjustColor(tokens.primary, -8) : adjustColor(tokens.primary, 8);
  root.style.setProperty('--color-brand-hover', brandHover);
}

function adjustColor(hex: string, percent: number): string {
  const color = hex.replace('#', '');
  const r = Math.max(
    0,
    Math.min(255, parseInt(color.slice(0, 2), 16) + Math.round((255 * percent) / 100))
  );
  const g = Math.max(
    0,
    Math.min(255, parseInt(color.slice(2, 4), 16) + Math.round((255 * percent) / 100))
  );
  const b = Math.max(
    0,
    Math.min(255, parseInt(color.slice(4, 6), 16) + Math.round((255 * percent) / 100))
  );
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
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
  const initial = saved === 'light' || saved === 'dark' ? saved : prefersDark ? 'dark' : 'light';
  applyTheme(initial);
}

export function toggleTheme(): void {
  applyTheme(themeSignal() === 'light' ? 'dark' : 'light');
}

export const theme: Accessor<ThemeMode> = themeSignal;

export function getContrastRatio(hex1: string, hex2: string): number {
  const luminance = (hex: string) => {
    const c = hex.replace('#', '');
    const rgb = [0, 1, 2].map((i) => {
      const v = parseInt(c.slice(i * 2, i * 2 + 2), 16) / 255;
      return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
    }) as [number, number, number];
    return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
  };
  const l1 = luminance(hex1);
  const l2 = luminance(hex2);
  return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
}

export function validateContrast(textColor: string, bgColor: string, largeText = false): boolean {
  const ratio = getContrastRatio(textColor, bgColor);
  return largeText ? ratio >= 3 : ratio >= 4.5;
}
