import * as React from 'react';
import { Settings, Users, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Team } from '@/types/models';

interface TeamCardProps {
  team: Team;
  onManageClick: () => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, onManageClick }) => {
  return (
    <Card className="hover:shadow-md transition-all duration-200 flex flex-col justify-between h-full bg-card border-border/60">
      <CardHeader className="pb-3 text-left">
        <div className="flex items-center justify-between gap-2">
          {/* Avatar Icon */}
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-base select-none">
            {team.name.charAt(0).toUpperCase()}
          </div>
          <button
            onClick={onManageClick}
            className="p-1.5 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer transition-colors"
            title="Workspace Settings"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <CardTitle className="text-base font-bold text-foreground mt-3 line-clamp-1 leading-snug">
          {team.name}
        </CardTitle>
        {team.description && (
          <CardDescription className="text-xs line-clamp-2 mt-1 leading-relaxed">
            {team.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="py-2 text-left">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Users className="h-4 w-4 text-primary" />
          <span>{team.members?.length || 0} members active</span>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/30 mt-4">
        <Button onClick={onManageClick} size="sm" variant="outline" className="w-full gap-1.5 cursor-pointer">
          Manage Workspace <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </CardFooter>
    </Card>
  );
};
export default TeamCard;
