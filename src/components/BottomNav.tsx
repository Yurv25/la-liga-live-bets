import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Trophy, Users } from 'lucide-react';

export default function BottomNav() {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { path: '/', label: t('nav.matches'), icon: Trophy },
    { path: '/groups', label: t('nav.groups'), icon: Users },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 glass flex justify-around pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] max-w-lg mx-auto z-40">
      {navItems.map((item) => {
        const active = location.pathname === item.path;
        return (
          <button
            key={item.path}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center text-xs font-medium gap-1 transition-colors ${
              active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
