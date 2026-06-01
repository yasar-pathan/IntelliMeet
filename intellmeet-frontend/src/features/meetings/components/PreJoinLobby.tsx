import * as React from 'react';
import { Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { VideoTile } from '@/features/meetings/components/VideoTile';
import type { Meeting } from '@/types/models';

export interface PreJoinChoices {
  video: boolean;
  audio: boolean;
}

interface PreJoinLobbyProps {
  meeting: Meeting;
  meetingCode: string;
  userName: string;
  userAvatar?: string;
  isHost?: boolean;
  onJoin: (choices: PreJoinChoices) => void;
  onCancel: () => void;
  isJoining?: boolean;
}

export const PreJoinLobby: React.FC<PreJoinLobbyProps> = ({
  meeting,
  meetingCode,
  userName,
  userAvatar,
  isHost = false,
  onJoin,
  onCancel,
  isJoining = false,
}) => {
  const [previewStream, setPreviewStream] = React.useState<MediaStream | null>(null);
  const previewStreamRef = React.useRef<MediaStream | null>(null);
  const [videoOn, setVideoOn] = React.useState(true);
  const [audioOn, setAudioOn] = React.useState(true);
  const [mediaError, setMediaError] = React.useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = React.useState(true);

  const startPreview = React.useCallback(async (video: boolean, audio: boolean) => {
    setPreviewLoading(true);
    setMediaError(null);

    if (previewStreamRef.current) {
      previewStreamRef.current.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
      setPreviewStream(null);
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video,
        audio,
      });
      stream.getVideoTracks().forEach((t) => {
        t.enabled = video;
      });
      stream.getAudioTracks().forEach((t) => {
        t.enabled = audio;
      });
      previewStreamRef.current = stream;
      setPreviewStream(stream);
      setVideoOn(video && stream.getVideoTracks().length > 0);
      setAudioOn(audio && stream.getAudioTracks().length > 0);
    } catch {
      if (audio && video) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          previewStreamRef.current = audioStream;
          setPreviewStream(audioStream);
          setVideoOn(false);
          setAudioOn(true);
        } catch {
          setMediaError('Camera and microphone access denied. You can still join with media off.');
          setPreviewStream(null);
          setVideoOn(false);
          setAudioOn(false);
        }
      } else {
        setMediaError('Could not access the selected devices. Adjust toggles or check browser permissions.');
        setPreviewStream(null);
      }
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void startPreview(true, true);
    return () => {
      previewStreamRef.current?.getTracks().forEach((t) => t.stop());
      previewStreamRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount preview only
  }, []);

  const togglePreviewVideo = () => {
    const next = !videoOn;
    const track = previewStream?.getVideoTracks()[0];
    if (track) {
      track.enabled = next;
      setVideoOn(next);
      return;
    }
    void startPreview(next, audioOn);
  };

  const togglePreviewAudio = () => {
    const next = !audioOn;
    const track = previewStream?.getAudioTracks()[0];
    if (track) {
      track.enabled = next;
      setAudioOn(next);
      return;
    }
    void startPreview(videoOn, next);
  };

  const handleJoin = () => {
    previewStreamRef.current?.getTracks().forEach((t) => t.stop());
    previewStreamRef.current = null;
    setPreviewStream(null);
    onJoin({ video: videoOn, audio: audioOn });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background px-4 py-8">
      <div className="w-full max-w-lg text-center mb-6">
        <p className="text-[11px] font-bold uppercase tracking-wider text-primary mb-2">
          Ready to join
        </p>
        <h1 className="text-xl font-bold text-foreground">{meeting.title}</h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono select-all">{meetingCode}</p>
        {isHost && (
          <p className="text-[11px] text-muted-foreground mt-2">You are the meeting host</p>
        )}
      </div>

      <div className="w-full max-w-md aspect-video mb-6">
        {previewLoading ? (
          <div className="w-full h-full min-h-[220px] rounded-xl border border-border/60 bg-muted/30 flex flex-col items-center justify-center gap-2">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground font-semibold">Starting camera preview...</span>
          </div>
        ) : (
          <VideoTile
            stream={previewStream}
            name={userName}
            avatar={userAvatar}
            isVideoOn={videoOn}
            isAudioOn={audioOn}
            isLocal
          />
        )}
      </div>

      {mediaError && (
        <p className="text-xs text-amber-600 dark:text-amber-400 max-w-md text-center mb-4">{mediaError}</p>
      )}

      <div className="flex items-center gap-3 mb-8">
        <Button
          type="button"
          variant={audioOn ? 'secondary' : 'danger'}
          size="icon"
          className="rounded-full h-12 w-12 cursor-pointer"
          onClick={togglePreviewAudio}
          disabled={previewLoading || isJoining}
          title={audioOn ? 'Mute microphone' : 'Unmute microphone'}
        >
          {audioOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
        </Button>
        <Button
          type="button"
          variant={videoOn ? 'secondary' : 'danger'}
          size="icon"
          className="rounded-full h-12 w-12 cursor-pointer"
          onClick={togglePreviewVideo}
          disabled={previewLoading || isJoining}
          title={videoOn ? 'Turn off camera' : 'Turn on camera'}
        >
          {videoOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
        </Button>
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isJoining} className="cursor-pointer">
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleJoin}
          isLoading={isJoining}
          disabled={previewLoading}
          className="min-w-[140px] cursor-pointer"
        >
          Join meeting
        </Button>
      </div>
    </div>
  );
};

export default PreJoinLobby;
