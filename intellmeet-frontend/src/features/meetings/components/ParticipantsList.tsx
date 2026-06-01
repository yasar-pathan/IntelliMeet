import * as React from 'react';
import { Users, Mic, MicOff, Video, VideoOff, Hand } from 'lucide-react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Avatar } from '@/components/common/Avatar';
import { useAuthStore } from '@/stores/authStore';
import type { ParticipantInfo, Meeting } from '@/types/models';

interface ParticipantsListProps {
  participants: Map<string, ParticipantInfo>;
  activeMeeting: Meeting | null;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isHandRaised: boolean;
}

export const ParticipantsList: React.FC<ParticipantsListProps> = ({
  participants,
  activeMeeting,
  isVideoOn,
  isAudioOn,
  isHandRaised,
}) => {
  const { user: currentUser } = useAuthStore();
  const remotePeers = Array.from(participants.values());

  const getMeetingRoleLabel = (userId: string) => {
    if (activeMeeting?.host && (typeof activeMeeting.host === 'string' ? activeMeeting.host === userId : activeMeeting.host._id === userId)) {
      return 'Host';
    }
    return 'Participant';
  };

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col select-none">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="font-bold text-sm text-foreground">Participants</span>
        </div>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">
          {remotePeers.length + 1}
        </span>
      </div>

      {/* Participants Scroll List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {/* Local User Row */}
          {currentUser && (
            <div className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors">
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={currentUser.name} src={currentUser.avatar} size="sm" />
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {currentUser.name} (You)
                  </p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    {getMeetingRoleLabel(currentUser._id)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                {isHandRaised && <Hand className="h-3.5 w-3.5 text-primary animate-bounce" />}
                {isAudioOn ? <Mic className="h-3.5 w-3.5 text-success" /> : <MicOff className="h-3.5 w-3.5 text-destructive" />}
                {isVideoOn ? <Video className="h-3.5 w-3.5 text-success" /> : <VideoOff className="h-3.5 w-3.5 text-destructive" />}
              </div>
            </div>
          )}

          {/* Remote Users Rows */}
          {remotePeers.map((peer) => (
            <div
              key={peer.socketId}
              className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={peer.name} src={peer.avatar} size="sm" />
                <div className="min-w-0 text-left">
                  <p className="text-xs font-semibold text-foreground truncate">{peer.name}</p>
                  <p className="text-[10px] text-muted-foreground leading-none mt-0.5">
                    {getMeetingRoleLabel(peer.userId)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1.5 text-muted-foreground flex-shrink-0">
                {peer.isHandRaised && <Hand className="h-3.5 w-3.5 text-primary animate-bounce" />}
                {peer.isAudioOn ? <Mic className="h-3.5 w-3.5 text-success" /> : <MicOff className="h-3.5 w-3.5 text-destructive" />}
                {peer.isVideoOn ? <Video className="h-3.5 w-3.5 text-success" /> : <VideoOff className="h-3.5 w-3.5 text-destructive" />}
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
};
