import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Video, Eye, Film } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { Avatar } from '@/components/common/Avatar';
import { formatDateTime } from '@/lib/utils';
import { useAuthStore } from '@/stores/authStore';
import { DeleteMeetingButton } from '@/features/meetings/components/DeleteMeetingButton';
import { getMeetingHostId } from '@/features/meetings/api/meetingsApi';
import type { Meeting, User as UserType } from '@/types/models';

interface MeetingCardProps {
  meeting: Meeting;
}

export const MeetingCard: React.FC<MeetingCardProps> = ({ meeting }) => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const host = meeting.host as UserType;
  const isEnded = meeting.status === 'ended';
  const hasRecording = Boolean(meeting.recording?.s3Key || meeting.recording?.s3Url);
  const isHost = Boolean(user?._id && getMeetingHostId(meeting) === user._id);

  const handleActionClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isEnded) {
      navigate(`/meetings/${meeting._id}/summary`);
    } else {
      navigate(`/meeting/${meeting.meetingCode}`);
    }
  };

  return (
    <Card
      onClick={() =>
        isEnded
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
            {isEnded && meeting.endedAt
              ? `Ended ${formatDateTime(meeting.endedAt)}`
              : meeting.scheduledAt
              ? formatDateTime(meeting.scheduledAt)
              : meeting.startedAt
              ? formatDateTime(meeting.startedAt)
              : 'Unscheduled'}
          </span>
        </div>
        {hasRecording && (
          <p className="flex items-center gap-1 text-[10px] text-primary font-semibold mt-2">
            <Film className="h-3 w-3" /> Recording available
          </p>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t border-border/30 mt-4 flex items-center justify-between gap-2">
        <span className="text-[10px] text-muted-foreground">
          {meeting.participants?.length || 0} participants
        </span>

        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {isHost && isEnded && (
            <DeleteMeetingButton
              meetingId={meeting._id}
              meetingTitle={meeting.title}
              hasRecording={hasRecording}
            />
          )}
          <Button size="sm" onClick={handleActionClick} className="gap-1 cursor-pointer">
            {isEnded ? (
              <>
                <Eye className="h-3.5 w-3.5" /> {hasRecording ? 'View Recording' : 'View Summary'}
              </>
            ) : (
              <>
                <Video className="h-3.5 w-3.5" /> Join Room
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};
