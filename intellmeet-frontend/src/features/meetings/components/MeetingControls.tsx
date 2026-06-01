import * as React from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  MonitorOff,
  Hand,
  Smile,
  MessageSquare,
  Users,
  Languages,
  PhoneOff,
  Circle,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface MeetingControlsProps {
  isVideoOn: boolean;
  isAudioOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isChatOpen: boolean;
  isParticipantsOpen: boolean;
  isTranscriptOpen: boolean;
  onToggleVideo: () => void;
  onToggleAudio: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onToggleChat: () => void;
  onToggleParticipants: () => void;
  onToggleTranscript: () => void;
  onLeave: () => void;
  onSendReaction: (emoji: string) => void;
  isHost?: boolean;
  isRecording?: boolean;
  isRecordingBusy?: boolean;
  onToggleRecording?: () => void;
}

export const MeetingControls: React.FC<MeetingControlsProps> = ({
  isVideoOn,
  isAudioOn,
  isScreenSharing,
  isHandRaised,
  isChatOpen,
  isParticipantsOpen,
  isTranscriptOpen,
  onToggleVideo,
  onToggleAudio,
  onToggleScreenShare,
  onToggleHand,
  onToggleChat,
  onToggleParticipants,
  onToggleTranscript,
  onLeave,
  onSendReaction,
  isHost = false,
  isRecording = false,
  isRecordingBusy = false,
  onToggleRecording,
}) => {
  const [reactionOpen, setReactionOpen] = React.useState(false);
  const reactionRef = React.useRef<HTMLDivElement>(null);

  const emojis = ['👍', '👏', '🎉', '❤️', '😮', '😂'];

  React.useEffect(() => {
    const clickOutside = (e: MouseEvent) => {
      if (reactionRef.current && !reactionRef.current.contains(e.target as Node)) {
        setReactionOpen(false);
      }
    };
    document.addEventListener('mousedown', clickOutside);
    return () => document.removeEventListener('mousedown', clickOutside);
  }, []);

  return (
    <div className="h-20 bg-card border-t border-border flex items-center justify-between px-6 select-none shrink-0 relative">
      {/* Left side actions (Live captions, panels) */}
      <div className="flex items-center gap-2">
        <Button
          variant={isTranscriptOpen ? 'primary' : 'outline'}
          size="sm"
          onClick={onToggleTranscript}
          className="gap-1.5 cursor-pointer"
          title="Toggle live captions"
        >
          <Languages className="h-4 w-4" />
          <span className="hidden sm:inline">Captions</span>
        </Button>
      </div>

      {/* Center media toggles */}
      <div className="flex items-center gap-3">
        {/* Audio Toggle */}
        <Button
          variant={isAudioOn ? 'secondary' : 'danger'}
          size="icon"
          onClick={onToggleAudio}
          className="rounded-full h-11 w-11 shadow cursor-pointer transition-all duration-200"
          title={isAudioOn ? 'Mute Mic' : 'Unmute Mic'}
        >
          {isAudioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>

        {/* Video Toggle */}
        <Button
          variant={isVideoOn ? 'secondary' : 'danger'}
          size="icon"
          onClick={onToggleVideo}
          className="rounded-full h-11 w-11 shadow cursor-pointer transition-all duration-200"
          title={isVideoOn ? 'Stop Camera' : 'Start Camera'}
        >
          {isVideoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>

        {/* Screen Share Toggle */}
        <Button
          variant={isScreenSharing ? 'primary' : 'secondary'}
          size="icon"
          onClick={onToggleScreenShare}
          className="rounded-full h-11 w-11 shadow cursor-pointer transition-all duration-200"
          title={isScreenSharing ? 'Stop Screen Share' : 'Share Screen'}
        >
          {isScreenSharing ? <MonitorOff className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
        </Button>

        {isHost && onToggleRecording && (
          <Button
            variant={isRecording ? 'danger' : 'secondary'}
            size="icon"
            onClick={onToggleRecording}
            disabled={isRecordingBusy}
            className="rounded-full h-11 w-11 shadow cursor-pointer transition-all duration-200"
            title={isRecording ? 'Stop Recording' : 'Start Recording'}
          >
            <Circle className={cn('h-5 w-5', isRecording && 'fill-current animate-pulse')} />
          </Button>
        )}

        {/* Hand Raise Toggle */}
        <Button
          variant={isHandRaised ? 'primary' : 'secondary'}
          size="icon"
          onClick={onToggleHand}
          className="rounded-full h-11 w-11 shadow cursor-pointer transition-all duration-200"
          title={isHandRaised ? 'Lower Hand' : 'Raise Hand'}
        >
          <Hand className={cn('h-5 w-5', { 'animate-bounce': isHandRaised })} />
        </Button>

        {/* Floating Reactions Trigger */}
        <div ref={reactionRef} className="relative">
          <Button
            variant="secondary"
            size="icon"
            onClick={() => setReactionOpen(!reactionOpen)}
            className="rounded-full h-11 w-11 shadow cursor-pointer"
            title="Reactions"
          >
            <Smile className="h-5 w-5" />
          </Button>

          {reactionOpen && (
            <div className="absolute bottom-14 left-1/2 -translate-x-1/2 bg-card border border-border px-3 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-bottom-2 duration-150 z-50">
              {emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => {
                    onSendReaction(emoji);
                    setReactionOpen(false);
                  }}
                  className="text-xl hover:scale-125 transition-transform duration-100 cursor-pointer p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Right side panels & End room */}
      <div className="flex items-center gap-2">
        <Button
          variant={isParticipantsOpen ? 'primary' : 'outline'}
          size="icon"
          onClick={onToggleParticipants}
          className="h-10 w-10 cursor-pointer"
          title="Participants list"
        >
          <Users className="h-4 w-4" />
        </Button>

        <Button
          variant={isChatOpen ? 'primary' : 'outline'}
          size="icon"
          onClick={onToggleChat}
          className="h-10 w-10 cursor-pointer"
          title="Meeting chat"
        >
          <MessageSquare className="h-4 w-4" />
        </Button>

        <Button
          variant="danger"
          onClick={onLeave}
          className="gap-2 px-4 cursor-pointer font-bold shadow-sm"
          title="Leave Meeting"
        >
          <PhoneOff className="h-4 w-4" />
          <span className="hidden sm:inline">Leave</span>
        </Button>
      </div>
    </div>
  );
};
