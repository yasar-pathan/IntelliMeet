import * as React from 'react';
import { MicOff, VideoOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Avatar } from '@/components/common/Avatar';

interface VideoTileProps {
  stream?: MediaStream | null;
  name: string;
  avatar?: string;
  isVideoOn?: boolean;
  isAudioOn?: boolean;
  isLocal?: boolean;
  isScreenShare?: boolean;
}

const hasActiveVideoTrack = (stream?: MediaStream | null) =>
  Boolean(
    stream?.getVideoTracks().some((track) => track.enabled && track.readyState !== 'ended')
  );

export const VideoTile: React.FC<VideoTileProps> = ({
  stream,
  name,
  avatar = '',
  isVideoOn = true,
  isAudioOn = true,
  isLocal = false,
  isScreenShare = false,
}) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const showVideo = isVideoOn && hasActiveVideoTrack(stream);

  React.useEffect(() => {
    const el = videoRef.current;
    if (!el) return;

    if (!showVideo || !stream) {
      el.srcObject = null;
      return;
    }

    el.srcObject = stream;
    void el.play().catch(() => {
      /* autoplay policies or track pause */
    });

    return () => {
      if (el.srcObject === stream) {
        el.srcObject = null;
      }
    };
  }, [stream, showVideo]);

  return (
    <div className="relative w-full h-full rounded-xl overflow-hidden bg-muted border border-border/40 shadow-sm flex items-center justify-center min-h-[180px] group aspect-video">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className={cn(
          'w-full h-full object-cover bg-muted',
          showVideo ? 'opacity-100' : 'opacity-0 pointer-events-none absolute inset-0',
          {
            'transform scale-x-[-1]': isLocal && !isScreenShare,
          }
        )}
      />

      {!showVideo && (
        <div className="flex flex-col items-center gap-3 z-10">
          <Avatar name={name} src={avatar} size="lg" className="shadow" />
          <span className="text-xs font-bold text-muted-foreground select-none">{name}</span>
        </div>
      )}

      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between pointer-events-none select-none z-10">
        <span className="px-2.5 py-1 rounded-md bg-black/60 backdrop-blur-sm text-xs font-semibold text-white truncate max-w-[150px]">
          {name} {isLocal && '(You)'}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {!isAudioOn && (
            <div className="p-1 rounded-md bg-destructive/90 text-destructive-foreground">
              <MicOff className="h-3.5 w-3.5" />
            </div>
          )}
          {!isVideoOn && (
            <div className="p-1 rounded-md bg-destructive/90 text-destructive-foreground">
              <VideoOff className="h-3.5 w-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default VideoTile;
