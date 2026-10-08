import { Moon, Sun } from 'lucide-solid';
import { IconButton } from './IconButton';
import { theme, toggleTheme } from '../theme/theme';
import { strings } from '../strings';

export function ThemeToggle() {
  const label = () =>
    theme() === 'light'
      ? strings.sharedUi.darkTheme
      : strings.sharedUi.lightTheme;
  return (
    <IconButton
      label={label()}
      icon={theme() === 'light' ? Moon : Sun}
      onClick={toggleTheme}
    />
  );
}
