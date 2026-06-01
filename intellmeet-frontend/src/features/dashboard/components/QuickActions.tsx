import * as React from 'react';
import { Video, Keyboard, Plus, Users, ArrowUpRight } from 'lucide-react';

interface QuickActionsProps {
  onNewMeeting: () => void;
  onJoinMeeting: () => void;
  onCreateTask: () => void;
  onCreateTeam: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onNewMeeting,
  onJoinMeeting,
  onCreateTask,
  onCreateTeam,
}) => {
  const actions = [
    {
      label: 'New Meeting',
      description: 'Start or schedule an instant room',
      icon: Video,
      gradient: 'from-blue-500/15 to-blue-600/5',
      iconColor: 'text-blue-600',
      onClick: onNewMeeting,
    },
    {
      label: 'Join Meeting',
      description: 'Enter room code to connect',
      icon: Keyboard,
      gradient: 'from-emerald-500/15 to-emerald-600/5',
      iconColor: 'text-emerald-600',
      onClick: onJoinMeeting,
    },
    {
      label: 'Create Task',
      description: 'Add a Kanban action item',
      icon: Plus,
      gradient: 'from-violet-500/15 to-violet-600/5',
      iconColor: 'text-violet-600',
      onClick: onCreateTask,
    },
    {
      label: 'Create Team',
      description: 'Launch a collaboration workspace',
      icon: Users,
      gradient: 'from-amber-500/15 to-orange-500/5',
      iconColor: 'text-amber-600',
      onClick: onCreateTeam,
    },
  ];

  return (
    <div className="mb-6">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 text-left">
        Quick actions
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {actions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.label}
              type="button"
              onClick={act.onClick}
              className={`group relative flex items-center gap-4 p-4 rounded-xl border border-border/50 bg-gradient-to-br ${act.gradient} text-left cursor-pointer transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:-translate-y-0.5 overflow-hidden`}
            >
              <div className="p-2.5 rounded-xl bg-background/90 border border-border/40 shadow-sm">
                <Icon className={`h-5 w-5 ${act.iconColor}`} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground">{act.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{act.description}</p>
              </div>
              <ArrowUpRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors shrink-0" />
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default QuickActions;
