import { useLocation, useNavigate } from 'react-router-dom';
import { Trophy, Users } from 'lucide-react';

const navItems = [
  { path: '/', label: 'Matches', icon: Trophy },
  { path: '/groups', label: 'Groups', icon: Users },
];

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <div className="fixed bottom-0 left-0 right-0 glass flex justify-around py-3 max-w-lg mx-auto safe-area-inset-bottom z-40">
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
