import { Moon, Sun, Monitor } from 'lucide-react';
import { useTheme } from './theme-provider';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { useTranslation } from 'react-i18next';

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();
  const { t } = useTranslation();

  return (
    <>
      <DropdownMenuItem onClick={() => setTheme('light')}>
        <Sun className="mr-2 size-4" />
        <span>{t('common.theme.light', 'Light')}</span>
        {theme === 'light' && <span className="ml-auto text-xs">v</span>}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('dark')}>
        <Moon className="mr-2 size-4" />
        <span>{t('common.theme.dark', 'Dark')}</span>
        {theme === 'dark' && <span className="ml-auto text-xs">v</span>}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('system')}>
        <Monitor className="mr-2 size-4" />
        <span>{t('common.theme.system', 'System')}</span>
        {theme === 'system' && <span className="ml-auto text-xs">v</span>}
      </DropdownMenuItem>
    </>
  );
}
