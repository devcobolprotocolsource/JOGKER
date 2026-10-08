export interface RGBColor {
  red: number;
  green: number;
  blue: number;
}

export function parseHexColor(value: string): RGBColor | null {
  const normalized = value.trim().replace(/^#/, '');
  if (/^[\da-fA-F]{3}$/.test(normalized)) {
    const [red = '0', green = '0', blue = '0'] = normalized;
    return {
      red: Number.parseInt(red + red, 16),
      green: Number.parseInt(green + green, 16),
      blue: Number.parseInt(blue + blue, 16),
    };
  }
  if (!/^[\da-fA-F]{6}$/.test(normalized)) return null;
  return {
    red: Number.parseInt(normalized.slice(0, 2), 16),
    green: Number.parseInt(normalized.slice(2, 4), 16),
    blue: Number.parseInt(normalized.slice(4, 6), 16),
  };
}

function linearize(channel: number): number {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function luminance(color: RGBColor): number {
  return (
    0.2126 * linearize(color.red) + 0.7152 * linearize(color.green) + 0.0722 * linearize(color.blue)
  );
}

export function contrastRatio(foreground: string, background: string): number | null {
  const foregroundColor = parseHexColor(foreground);
  const backgroundColor = parseHexColor(background);
  if (!foregroundColor || !backgroundColor) return null;
  const first = luminance(foregroundColor);
  const second = luminance(backgroundColor);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

export function hasWcagAAContrast(foreground: string, background: string, minimum = 4.5): boolean {
  const ratio = contrastRatio(foreground, background);
  return ratio !== null && ratio >= minimum;
}

export function getContrastText(background: string): '#1B1410' | '#FFFFFF' {
  const darkRatio = contrastRatio('#1B1410', background);
  const lightRatio = contrastRatio('#FFFFFF', background);
  return (darkRatio ?? 0) >= (lightRatio ?? 0) ? '#1B1410' : '#FFFFFF';
}
