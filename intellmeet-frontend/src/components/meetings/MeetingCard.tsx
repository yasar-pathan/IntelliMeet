import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Video, Eye, Clipboard, ArrowRight, User } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/common/Avatar';
import { formatDateTime } from '@/lib/utils';
import type { Meeting, User as UserType } from '@/types/models';

interface MeetingCardProps {
  meeting: Meeting;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting }) => {
  const navigate = useNavigate();
  const host = meeting.host as UserType;

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (meeting.status === 'ended') {
      navigate(`/meetings/${meeting._id}/summary`);
    } else {
      navigate(`/meeting/${meeting.meetingCode}`);
    }
  };

  return (
    <Card
      onClick={() =>
        meeting.status === 'ended'
          ? navigate(`/meetings/${meeting._id}/summary`)
          : navigate(`/meeting/${meeting.meetingCode}`)
      }
      className="hover:shadow-md cursor-pointer transition-all duration-200 flex flex-col justify-between h-full bg-card hover:-translate-y-0.5 border-border/60"
    >
      <CardHeader className="pb-3 text-left">
        <div className="flex items-center justify-between gap-2 mb-2">
          <StatusBadge status={meeting.status} />
          <span className="font-mono text-xs text-muted-foreground select-all bg-muted/60 px-2 py-0.5 rounded border border-border/30">
            {meeting.meetingCode}
          </span>
        </div>
        <CardTitle className="text-base font-bold text-foreground line-clamp-1 leading-snug">
          {meeting.title}
        </CardTitle>
        {meeting.description && (
          <CardDescription className="text-xs line-clamp-2 mt-1 leading-relaxed">
            {meeting.description}
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="py-2 text-left">
        {/* Host User Info */}
        {host && (
          <div className="flex items-center gap-2 mb-3">
            <Avatar name={host.name} src={host.avatar} size="sm" />
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-foreground leading-none">{host.name}</p>
              <p className="text-[9px] text-muted-foreground leading-none mt-0.5">Host</p>
            </div>
          </div>
        )}

        {/* Date Display */}
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {meeting.scheduledAt
              ? formatDateTime(meeting.scheduledAt)
              : meeting.startedAt
              ? formatDateTime(meeting.startedAt)
              : 'Unscheduled'}
          </span>
        </div>
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/30 mt-4 flex items-center justify-between">
        <span className="text-[10px] text-muted-foreground">
          {meeting.participants?.length || 0} participants
        </span>

        <Button size="sm" onClick={handleActionClick} className="gap-1 cursor-pointer">
          {meeting.status === 'ended' ? (
            <>
              <Eye className="h-3.5 w-3.5" /> AI Summary
            </>
          ) : (
            <>
              <Video className="h-3.5 w-3.5" /> Join Room
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};
