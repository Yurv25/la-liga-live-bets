import { useAuth } from '@/lib/auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, User as UserIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

export default function UserMenu() {
  const { t } = useTranslation();
  const { user, displayName, signOut } = useAuth();
  const [imgFailed, setImgFailed] = useState(false);
  if (!user) return null;
  const initial = (displayName || '?').trim().charAt(0).toUpperCase();
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined;
  const showImg = !!avatarUrl && !imgFailed;

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
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="flex items-center gap-2">
          <UserIcon className="h-4 w-4" />
          <span className="truncate">{displayName}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer">
          <LogOut className="h-4 w-4 mr-2" />
          {t('userMenu.signOut')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
