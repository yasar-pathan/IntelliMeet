import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Calendar, Copy, Check, Video, Loader2, ArrowRight, Plus, Clock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useClipboard } from '@/hooks/useClipboard';
import { formatDateTime, formatRelativeTime } from '@/lib/utils';
import { fetchMeetings } from '@/features/meetings/api/meetingsApi';
import type { Meeting } from '@/types/models';

interface UpcomingMeetingsProps {
  onCreateMeeting?: () => void;
}

export const UpcomingMeetings: React.FC<UpcomingMeetingsProps> = ({ onCreateMeeting }) => {
  const navigate = useNavigate();
  const { hasCopied, copy } = useClipboard();
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', 'dashboard-recent'],
    queryFn: () => fetchMeetings({ limit: 8 }),
  });

  const meetings = data?.meetings ?? [];

  const upcoming = meetings.filter((m) => m.status === 'scheduled' || m.status === 'live');
  const recent = meetings.filter((m) => m.status === 'ended').slice(0, 4);
  const displayMeetings: Meeting[] = upcoming.length > 0 ? upcoming.slice(0, 5) : recent.slice(0, 5);
  const sectionLabel = upcoming.length > 0 ? 'Upcoming & Live' : 'Recent Meetings';

  const handleCopyLink = (e: React.MouseEvent, meetingCode: string, id: string) => {
    e.stopPropagation();
    copy(`${window.location.origin}/meeting/${meetingCode}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Card className="shadow-sm flex flex-col h-full min-h-[320px] border-border/60">
      <CardHeader className="pb-3 border-b border-border/30 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" />
          {sectionLabel}
        </CardTitle>
        <button
          type="button"
          onClick={() => navigate('/meetings')}
          className="text-xs text-primary hover:underline font-semibold flex items-center gap-0.5 cursor-pointer"
        >
          View all <ArrowRight className="h-3 w-3" />
        </button>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-y-auto custom-scrollbar">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span>Loading meetings...</span>
          </div>
        ) : displayMeetings.length > 0 ? (
          <div className="divide-y divide-border/30">
            {displayMeetings.map((m) => (
              <div
                key={m._id}
                role="button"
                tabIndex={0}
                onClick={() => navigate(m.status === 'ended' ? `/meetings/${m._id}/summary` : `/meeting/${m.meetingCode}`)}
                onKeyDown={(e) => e.key === 'Enter' && navigate(m.status === 'ended' ? `/meetings/${m._id}/summary` : `/meeting/${m.meetingCode}`)}
                className="flex items-center justify-between p-4 hover:bg-muted/40 transition-colors cursor-pointer group"
              >
                <div className="min-w-0 pr-4 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <StatusBadge status={m.status} />
                    {m.isPasswordProtected && (
                      <span className="text-[9px] font-bold text-muted-foreground uppercase">Protected</span>
                    )}
                  </div>
                  <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                    {m.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {m.scheduledAt
                      ? formatDateTime(m.scheduledAt)
                      : m.endedAt
                        ? `Ended ${formatRelativeTime(m.endedAt)}`
                        : 'Instant meeting'}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopyLink(e, m.meetingCode, m._id)}
                    className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                    title="Copy meeting link"
                  >
                    {copiedId === m._id && hasCopied ? (
                      <Check className="h-3.5 w-3.5 text-success" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                  {m.status !== 'ended' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/meeting/${m.meetingCode}`);
                      }}
                      className="p-1.5 rounded-md bg-primary/10 hover:bg-primary text-primary hover:text-primary-foreground transition-all cursor-pointer"
                      title="Join meeting"
                    >
                      <Video className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center flex flex-col items-center justify-center min-h-[220px]">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <Video className="h-7 w-7 text-primary" />
            </div>
            <h3 className="text-sm font-bold text-foreground">No meetings yet</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-xs leading-relaxed">
              Start your first session to see live rooms, summaries, and AI notes here.
            </p>
            {onCreateMeeting && (
              <Button onClick={onCreateMeeting} size="sm" className="mt-4 gap-1.5 cursor-pointer">
                <Plus className="h-3.5 w-3.5" /> Create meeting
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default UpcomingMeetings;
