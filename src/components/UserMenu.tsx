import { useAuth } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Moon, Sun, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useTheme } from '@/hooks/useTheme';

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'es', label: 'ES' },
] as const;

export default function UserMenu() {
  const { t, i18n } = useTranslation();
  const { user, displayName, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [imgFailed, setImgFailed] = useState(false);
  if (!user) return null;
  const initial = (displayName || '?').trim().charAt(0).toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const showImg = !!avatarUrl && !imgFailed;
  const currentLanguage = i18n.language.startsWith('es') ? 'es' : 'en';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center text-primary text-sm font-bold hover:bg-primary/25 transition-colors overflow-hidden">
        {showImg ? (
          <img
            src={avatarUrl}
            alt={displayName}
            className="h-full w-full object-cover"
            onError={() => setImgFailed(true)}
          />
        ) : (
          initial
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 space-y-2 p-2">
        <div className="flex items-center gap-2 rounded-md px-3 py-2 hover:bg-secondary/50 transition-colors">
          <UserIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground truncate">{displayName}</span>
        </div>

        <div className="rounded-md border border-border/70 bg-background p-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-2">{t('common.language')}</p>
          <div className="flex gap-2">
            {LANGUAGES.map(({ code, label }) => (
              <button
                key={code}
                type="button"
                onClick={() => i18n.changeLanguage(code)}
                className={`flex-1 rounded-full px-3 py-2 text-xs font-semibold transition-colors ${
                  currentLanguage === code
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary/20 text-muted-foreground hover:bg-secondary/40'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-md border border-border/70 bg-background p-3">
          <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-2">{t('userMenu.theme')}</p>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm text-foreground">
              {theme === 'dark' ? t('userMenu.darkMode') : t('userMenu.lightMode')}
            </span>
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="h-9 w-9 rounded-full bg-secondary/20 flex items-center justify-center text-foreground hover:bg-secondary/40 transition-colors"
              aria-label={theme === 'dark' ? t('userMenu.lightMode') : t('userMenu.darkMode')}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
          <LogOut className="h-4 w-4 mr-2" />
          {t('userMenu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
