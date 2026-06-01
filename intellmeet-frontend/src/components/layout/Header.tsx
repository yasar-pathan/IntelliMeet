import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, LogOut, User, Settings, Sun, Moon, Laptop, Menu } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { useUIStore } from '@/stores/uiStore';
import { useLogout } from '@/hooks/useAuth';
import { Avatar } from '@/components/common/Avatar';
import { NotificationBell } from '@/components/feedback/NotificationBell';
import { cn } from '@/lib/utils';

export const Header: React.FC = () => {
  const { user } = useAuthStore();
  const logoutMutation = useLogout();
  const { toggleSidebar, setCommandPaletteOpen } = useUIStore();
  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [themeMenuOpen, setThemeMenuOpen] = React.useState(false);
  const userMenuRef = React.useRef<HTMLDivElement>(null);
  const themeMenuRef = React.useRef<HTMLDivElement>(null);

  // Close menus on click outside
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(target)) {
        setUserMenuOpen(false);
      }
      if (themeMenuRef.current && !themeMenuRef.current.contains(target)) {
        setThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getActiveThemeIcon = () => {
    const theme = localStorage.getItem('theme') || 'system';
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    return <Laptop className="h-4 w-4" />;
  };

  const changeTheme = (newTheme: 'light' | 'dark' | 'system') => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    if (newTheme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(newTheme);
    }

    localStorage.setItem('theme', newTheme);
    setThemeMenuOpen(false);
  };

  return (
    <header className="h-16 border-b border-border bg-card px-4 flex items-center justify-between sticky top-0 z-20 select-none">
      {/* Sidebar trigger for Mobile */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggleSidebar}
          className="md:hidden p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
        >
          <Menu className="h-5 w-5" />
        </button>

        {/* Global Search Bar (triggers Command Palette) */}
        <div
          onClick={() => setCommandPaletteOpen(true)}
          className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/70 hover:border-border bg-muted/30 hover:bg-muted/50 text-xs text-muted-foreground w-64 cursor-pointer select-none transition-colors"
        >
          <Search className="h-3.5 w-3.5" />
          <span>Search or command...</span>
          <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Notification Bell */}
        <NotificationBell />

        {/* Theme Selector */}
        <div ref={themeMenuRef} className="relative">
          <button
            onClick={() => setThemeMenuOpen(!themeMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground rounded-lg hover:bg-muted transition-colors cursor-pointer"
            title="Switch theme"
          >
            {getActiveThemeIcon()}
          </button>
          {themeMenuOpen && (
            <div className="absolute right-0 mt-2 w-36 bg-card border border-border rounded-xl shadow-xl z-50 py-1 animate-in fade-in slide-in-from-top-2 duration-150">
              <button
                onClick={() => changeTheme('light')}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-muted text-foreground font-semibold cursor-pointer"
              >
                <Sun className="h-3.5 w-3.5 text-orange-500" /> Light
              </button>
              <button
                onClick={() => changeTheme('dark')}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-muted text-foreground font-semibold cursor-pointer"
              >
                <Moon className="h-3.5 w-3.5 text-blue-500" /> Dark
              </button>
              <button
                onClick={() => changeTheme('system')}
                className="flex items-center gap-2 w-full px-3 py-2 text-left text-xs hover:bg-muted text-foreground font-semibold cursor-pointer"
              >
                <Laptop className="h-3.5 w-3.5 text-gray-500" /> System
              </button>
            </div>
          )}
        </div>

        {/* User Menu Dropdown */}
        <div ref={userMenuRef} className="relative">
          {user && (
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 focus:outline-none cursor-pointer"
            >
              <Avatar name={user.name} src={user.avatar} size="sm" />
            </button>
          )}

          {userMenuOpen && user && (
            <div className="absolute right-0 mt-2 w-56 bg-card border border-border rounded-xl shadow-xl z-50 py-1.5 animate-in fade-in slide-in-from-top-2 duration-150">
              {/* User Identity Details */}
              <div className="px-4 py-2 border-b border-border/50 text-left">
                <p className="text-xs font-bold text-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{user.email}</p>
              </div>

              {/* Menu Options */}
              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-left text-xs hover:bg-muted text-foreground font-semibold cursor-pointer"
                >
                  <User className="h-4 w-4 text-muted-foreground" /> Account Profile
                </button>
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    navigate('/settings');
                  }}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-left text-xs hover:bg-muted text-foreground font-semibold cursor-pointer"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" /> Settings
                </button>
              </div>

              {/* Logout Option */}
              <div className="border-t border-border/50 mt-1 pt-1">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2.5 w-full px-4 py-2 text-left text-xs hover:bg-muted text-destructive font-semibold cursor-pointer"
                >
                  <LogOut className="h-4 w-4" /> Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
