import * as React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Video, CheckSquare, Users, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

export const MobileNav: React.FC = () => {
  const navItems = [
    { to: '/', label: 'Home', icon: Home },
    { to: '/meetings', label: 'Meetings', icon: Video },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/teams', label: 'Teams', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-card border-t border-border flex items-center justify-around h-16 px-2 select-none shadow-lg">
      {navItems.map((item) => {
        const Icon = item.icon;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              cn(
                'flex flex-col items-center justify-center gap-1 flex-1 h-full py-1 text-xs font-medium text-muted-foreground transition-all duration-150',
                {
                  'text-primary font-semibold': isActive,
                }
              )
            }
          >
            <Icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        );
      })}
    </nav>
  );
};
