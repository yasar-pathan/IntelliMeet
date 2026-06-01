import * as React from 'react';
import { VideoTile } from './VideoTile';
import { useAuthStore } from '@/stores/authStore';
import type { ParticipantInfo } from '@/types/models';
import { cn } from '@/lib/utils';

interface VideoGridProps {
  localStream: MediaStream | null;
  isVideoOn: boolean;
  isAudioOn: boolean;
  participants: Map<string, ParticipantInfo>;
  screenStream: MediaStream | null;
  isLocalScreenSharing: boolean;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  isVideoOn,
  isAudioOn,
  participants,
  screenStream,
  isLocalScreenSharing,
}) => {
  const { user } = useAuthStore();
  const remotePeers = Array.from(participants.values());
  const totalTiles = remotePeers.length + 1; // Remote peers + Local user

  // Handle active screen share layouts
  // Find if any remote peer is sharing their screen
  const remoteScreenSharePeer = remotePeers.find((p) => p.isScreenSharing && p.stream);
  const activeScreenShareStream = isLocalScreenSharing
    ? screenStream
    : remoteScreenSharePeer?.stream;

  const getGridCols = (count: number) => {
    if (count <= 1) return 'grid-cols-1 max-w-3xl mx-auto';
    if (count === 2) return 'grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto';
    if (count <= 4) return 'grid-cols-1 sm:grid-cols-2 max-w-5xl mx-auto';
    return 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 max-w-6xl mx-auto';
  };

  if (activeScreenShareStream) {
    return (
      <div className="flex flex-col lg:flex-row gap-4 h-full w-full">
        {/* Large Screen Share Panel */}
        <div className="flex-1 rounded-xl overflow-hidden bg-black border border-border/40 relative flex items-center justify-center min-h-[300px]">
          <video
            ref={(ref) => {
              if (ref && activeScreenShareStream) ref.srcObject = activeScreenShareStream;
            }}
            autoPlay
            playsInline
            className="w-full h-full object-contain"
          />
          <div className="absolute bottom-3 left-3 bg-black/60 px-3 py-1 rounded-md text-xs font-semibold text-white">
            {isLocalScreenSharing ? 'Your screen' : `${remoteScreenSharePeer?.name}'s screen`}
          </div>
        </div>

        {/* Vertical sidebar for camera feeds */}
        <div className="w-full lg:w-64 flex flex-row lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto lg:max-h-[600px] custom-scrollbar shrink-0 p-1">
          {/* Local camera tile */}
          <div className="w-48 lg:w-full shrink-0">
            <VideoTile
              stream={localStream || undefined}
              name={user?.name || 'Local'}
              avatar={user?.avatar}
              isVideoOn={isVideoOn}
              isAudioOn={isAudioOn}
              isLocal={true}
            />
          </div>

          {/* Remote camera tiles */}
          {remotePeers.map((peer) => (
            <div key={peer.socketId} className="w-48 lg:w-full shrink-0">
              <VideoTile
                stream={peer.stream}
                name={peer.name}
                avatar={peer.avatar}
                isVideoOn={peer.isVideoOn}
                isAudioOn={peer.isAudioOn}
                isLocal={false}
              />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Standard camera grid layout
  return (
    <div className={cn('grid gap-4 w-full h-full p-2 items-center justify-center', getGridCols(totalTiles))}>
      {/* Local Video Tile */}
      <VideoTile
        stream={localStream || undefined}
        name={user?.name || 'Local'}
        avatar={user?.avatar}
        isVideoOn={isVideoOn}
        isAudioOn={isAudioOn}
        isLocal={true}
      />

      {/* Remote Video Tiles */}
      {remotePeers.map((peer) => (
        <VideoTile
          key={peer.socketId}
          stream={peer.stream}
          name={peer.name}
          avatar={peer.avatar}
          isVideoOn={peer.isVideoOn}
          isAudioOn={peer.isAudioOn}
          isLocal={false}
        />
      ))}
    </div>
  );
};
