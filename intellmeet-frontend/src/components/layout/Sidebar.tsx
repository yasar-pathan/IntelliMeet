import * as React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Home,
  Video,
  CheckSquare,
  Users,
  BarChart2,
  Settings,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  Plus,
  Loader2,
} from 'lucide-react';
import { useUIStore } from '@/stores/uiStore';
import { cn } from '@/lib/utils';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Team } from '@/types/models';

export const Sidebar: React.FC = () => {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const navigate = useNavigate();
  const [teamDropdownOpen, setTeamDropdownOpen] = React.useState(false);
  const [selectedTeam, setSelectedTeam] = React.useState<Team | null>(null);

  // Fetch user's teams
  const { data: teamsData, isLoading: teamsLoading } = useQuery<ApiResponse<Team[]>>({
    queryKey: ['teams'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Team[]>>('/teams');
      return response.data;
    },
  });

  const teams = teamsData?.data || [];

  React.useEffect(() => {
    if (teams.length > 0 && !selectedTeam) {
      setSelectedTeam(teams[0]);
    }
  }, [teams, selectedTeam]);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: Home },
    { to: '/meetings', label: 'Meetings', icon: Video },
    { to: '/tasks', label: 'Tasks', icon: CheckSquare },
    { to: '/teams', label: 'Teams', icon: Users },
    { to: '/analytics', label: 'Analytics', icon: BarChart2 },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside
      className={cn(
        'hidden md:flex flex-col h-screen sticky top-0 bg-sidebar border-r border-sidebar-border transition-all duration-300 z-30 select-none',
        {
          'w-60': !sidebarCollapsed,
          'w-16': sidebarCollapsed,
        }
      )}
    >
      {/* Logo & Header */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-black text-lg">
              I
            </div>
            <span className="font-bold text-base tracking-tight text-foreground">IntellMeet</span>
          </div>
        )}
        {sidebarCollapsed && (
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary text-primary-foreground font-black text-lg mx-auto">
            I
          </div>
        )}
        {!sidebarCollapsed && (
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Collapse button for expanded state */}
      {sidebarCollapsed && (
        <div className="flex justify-center py-2 border-b border-sidebar-border/30">
          <button
            onClick={toggleSidebar}
            className="p-1.5 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Team Switcher Section */}
      {!sidebarCollapsed && (
        <div className="px-3 py-3 border-b border-sidebar-border/30 relative">
          <label className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5 px-1.5">
            Workspace
          </label>
          {teamsLoading ? (
            <div className="flex items-center gap-2 px-1.5 py-1 text-sm text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin text-primary" />
              <span>Loading workspaces...</span>
            </div>
          ) : teams.length > 0 ? (
            <div>
              <button
                onClick={() => setTeamDropdownOpen(!teamDropdownOpen)}
                className="flex items-center justify-between w-full px-2 py-1.5 rounded-md bg-muted/50 hover:bg-muted border border-border/30 text-sm font-semibold text-foreground cursor-pointer transition-colors"
              >
                <span className="truncate">{selectedTeam?.name || 'Select Team'}</span>
                <span className="text-xs text-muted-foreground">▼</span>
              </button>

              {teamDropdownOpen && (
                <div className="absolute left-3 right-3 mt-1 bg-card border border-border rounded-lg shadow-lg z-50 py-1 max-h-40 overflow-y-auto custom-scrollbar">
                  {teams.map((team) => (
                    <button
                      key={team._id}
                      onClick={() => {
                        setSelectedTeam(team);
                        setTeamDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted text-foreground font-semibold truncate block cursor-pointer"
                    >
                      {team.name}
                    </button>
                  ))}
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={() => {
                        setTeamDropdownOpen(false);
                        navigate('/teams');
                      }}
                      className="w-full text-left px-3 py-1.5 text-xs text-primary hover:bg-muted font-semibold flex items-center gap-1.5 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" /> Create Team
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              onClick={() => navigate('/teams')}
              className="flex items-center gap-1.5 px-2 py-1.5 rounded-md hover:bg-muted text-xs text-primary font-semibold w-full cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" /> Create Team
            </button>
          )}
        </div>
      )}

      {/* Nav Items */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto custom-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150',
                  {
                    'bg-muted text-foreground font-semibold border-l-2 border-primary rounded-l-none':
                      isActive,
                    'justify-center px-0': sidebarCollapsed,
                  }
                )
              }
              title={sidebarCollapsed ? item.label : undefined}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {!sidebarCollapsed && <span>{item.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Help Section */}
      <div className="p-2 border-t border-sidebar-border">
        <NavLink
          to="/help"
          className={cn(
            'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-150',
            {
              'justify-center px-0': sidebarCollapsed,
            }
          )}
          title={sidebarCollapsed ? 'Help & Docs' : undefined}
        >
          <HelpCircle className="h-5 w-5 shrink-0" />
          {!sidebarCollapsed && <span>Help & Docs</span>}
        </NavLink>
      </div>
    </aside>
  );
};
