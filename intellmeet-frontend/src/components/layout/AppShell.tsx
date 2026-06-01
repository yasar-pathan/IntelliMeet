import * as React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Search, Calendar, CheckSquare, Users, Settings, Home, X } from 'lucide-react';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { MobileNav } from '@/components/layout/MobileNav';
import { useUIStore } from '@/stores/uiStore';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import { Dialog, DialogContent } from '@/components/ui/Dialog';

export const AppShell: React.FC = () => {
  const navigate = useNavigate();
  const {
    sidebarCollapsed,
    setSidebarCollapsed,
    commandPaletteOpen,
    setCommandPaletteOpen,
  } = useUIStore();

  const [searchVal, setSearchVal] = React.useState('');

  // Register Global Keyboard Shortcuts: Cmd+K and Cmd+B
  useKeyboardShortcuts([
    {
      key: 'k',
      ctrl: true,
      handler: () => setCommandPaletteOpen(true),
    },
    {
      key: 'k',
      meta: true,
      handler: () => setCommandPaletteOpen(true),
    },
    {
      key: 'b',
      ctrl: true,
      handler: () => setSidebarCollapsed(!sidebarCollapsed),
    },
    {
      key: 'b',
      meta: true,
      handler: () => setSidebarCollapsed(!sidebarCollapsed),
    },
  ]);

  const commandItems = [
    { label: 'Go to Dashboard', icon: Home, action: () => navigate('/') },
    { label: 'Go to Meetings', icon: Calendar, action: () => navigate('/meetings') },
    { label: 'Go to Tasks', icon: CheckSquare, action: () => navigate('/tasks') },
    { label: 'Go to Teams', icon: Users, action: () => navigate('/teams') },
    { label: 'Go to Settings', icon: Settings, action: () => navigate('/settings') },
  ];

  const filteredItems = commandItems.filter((item) =>
    item.label.toLowerCase().includes(searchVal.toLowerCase())
  );

  const handleCommandRun = (action: () => void) => {
    action();
    setCommandPaletteOpen(false);
    setSearchVal('');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Collapsible Sidebar */}
      <Sidebar />

      {/* Main Container */}
      <div className="flex flex-col flex-1 h-full min-w-0 overflow-hidden relative">
        <Header />

        {/* Scrollable Content Area */}
        <main className="flex-1 overflow-y-auto custom-scrollbar pb-16 md:pb-0 bg-background">
          <Outlet />
        </main>

        {/* Bottom Nav on Mobile devices */}
        <MobileNav />
      </div>

      {/* Global Cmd+K Command Palette Modal */}
      <Dialog isOpen={commandPaletteOpen} onClose={() => setCommandPaletteOpen(false)}>
        <DialogContent className="max-w-lg p-0 border border-border overflow-hidden rounded-xl bg-card">
          <div className="flex items-center border-b border-border px-3 py-3">
            <Search className="h-4 w-4 mr-2.5 text-muted-foreground" />
            <input
              type="text"
              value={searchVal}
              onChange={(e) => setSearchVal(e.target.value)}
              placeholder="Type a navigation command..."
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
              autoFocus
            />
            <button
              onClick={() => setCommandPaletteOpen(false)}
              className="text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="py-2 max-h-64 overflow-y-auto custom-scrollbar">
            {filteredItems.length > 0 ? (
              <div className="px-2 space-y-0.5">
                {filteredItems.map((item, idx) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleCommandRun(item.action)}
                      className="flex items-center gap-3 w-full px-3 py-2 text-left text-sm hover:bg-muted text-foreground rounded-lg transition-colors font-medium cursor-pointer"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-center text-xs text-muted-foreground py-6">No commands found</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
