import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useSocket } from '@/hooks/useSocket';
import { useMeetingStore } from '@/stores/meetingStore';
import type { ParticipantInfo, TranscriptChunk } from '@/types/models';

interface UseMeetingSocketProps {
  meetingCode: string;
  isJoined: boolean;
  createPeerConnection: (socketId: string, isInitiator: boolean) => Promise<RTCPeerConnection>;
  closePeerConnection: (socketId: string) => void;
  onReaction: (reaction: { emoji: string; userId: string; socketId: string }) => void;
}

export function useMeetingSocket({
  meetingCode,
  isJoined,
  createPeerConnection,
  closePeerConnection,
  onReaction,
}: UseMeetingSocketProps) {
  const socket = useSocket();
  const navigate = useNavigate();
  const {
    addParticipant,
    removeParticipant,
    updateParticipant,
    appendTranscript,
  } = useMeetingStore();

  const createPeerConnectionRef = React.useRef(createPeerConnection);
  const closePeerConnectionRef = React.useRef(closePeerConnection);
  const onReactionRef = React.useRef(onReaction);

  createPeerConnectionRef.current = createPeerConnection;
  closePeerConnectionRef.current = closePeerConnection;
  onReactionRef.current = onReaction;

  React.useEffect(() => {
    if (!socket || !meetingCode || !isJoined) return;

    console.log(`[Socket] Joining meeting room: ${meetingCode}`);

    socket.emit('meeting:join-room', { meetingCode });

    const handleParticipantsList = (list: ParticipantInfo[]) => {
      console.log('[Socket] Received participants list:', list.length);
      list.forEach((peer) => {
        addParticipant(peer.socketId, peer);
      });
    };

    const handleUserJoined = async (peer: ParticipantInfo) => {
      console.log('[Socket] User joined:', peer.name, peer.socketId);
      addParticipant(peer.socketId, peer);
      await createPeerConnectionRef.current(peer.socketId, true);
    };

    const handleUserLeft = ({ socketId }: { socketId: string; userId: string }) => {
      console.log('[Socket] User left:', socketId);
      closePeerConnectionRef.current(socketId);
      removeParticipant(socketId);
    };

    const handleVideoToggled = ({ socketId, isVideoOn }: { socketId: string; isVideoOn: boolean }) => {
      updateParticipant(socketId, { isVideoOn });
    };

    const handleAudioToggled = ({ socketId, isAudioOn }: { socketId: string; isAudioOn: boolean }) => {
      updateParticipant(socketId, { isAudioOn });
    };

    const handleScreenShareStarted = ({ socketId }: { socketId: string }) => {
      updateParticipant(socketId, { isScreenSharing: true });
    };

    const handleScreenShareStopped = ({ socketId }: { socketId: string }) => {
      updateParticipant(socketId, { isScreenSharing: false });
    };

    const handleHandRaised = ({ socketId }: { socketId: string }) => {
      updateParticipant(socketId, { isHandRaised: true });
    };

    const handleHandLowered = ({ socketId }: { socketId: string }) => {
      updateParticipant(socketId, { isHandRaised: false });
    };

    const handleReaction = (reaction: { emoji: string; userId: string; socketId: string }) => {
      onReactionRef.current(reaction);
    };

    const handleTranscriptUpdate = (chunk: TranscriptChunk) => {
      appendTranscript(chunk);
    };

    const handleMeetingEnded = () => {
      console.log('[Socket] Meeting ended');
      toast.info('The meeting has ended.');
      navigate('/meetings');
    };

    const handleMeetingCancelled = () => {
      console.log('[Socket] Meeting cancelled');
      toast.info('The meeting has been cancelled by the host.');
      navigate('/meetings');
    };

    socket.on('meeting:participants-list', handleParticipantsList);
    socket.on('meeting:user-joined', handleUserJoined);
    socket.on('meeting:user-left', handleUserLeft);
    socket.on('meeting:video-toggled', handleVideoToggled);
    socket.on('meeting:audio-toggled', handleAudioToggled);
    socket.on('meeting:screen-share-started', handleScreenShareStarted);
    socket.on('meeting:screen-share-stopped', handleScreenShareStopped);
    socket.on('meeting:hand-raised', handleHandRaised);
    socket.on('meeting:hand-lowered', handleHandLowered);
    socket.on('meeting:reaction', handleReaction);
    socket.on('meeting:transcript-update', handleTranscriptUpdate);
    socket.on('meeting:ended', handleMeetingEnded);
    socket.on('meeting:cancelled', handleMeetingCancelled);

    return () => {
      console.log(`[Socket] Leaving meeting room: ${meetingCode}`);
      socket.emit('meeting:leave-room');

      socket.off('meeting:participants-list', handleParticipantsList);
      socket.off('meeting:user-joined', handleUserJoined);
      socket.off('meeting:user-left', handleUserLeft);
      socket.off('meeting:video-toggled', handleVideoToggled);
      socket.off('meeting:audio-toggled', handleAudioToggled);
      socket.off('meeting:screen-share-started', handleScreenShareStarted);
      socket.off('meeting:screen-share-stopped', handleScreenShareStopped);
      socket.off('meeting:hand-raised', handleHandRaised);
      socket.off('meeting:hand-lowered', handleHandLowered);
      socket.off('meeting:reaction', handleReaction);
      socket.off('meeting:transcript-update', handleTranscriptUpdate);
      socket.off('meeting:ended', handleMeetingEnded);
      socket.off('meeting:cancelled', handleMeetingCancelled);
    };
  }, [
    meetingCode,
    isJoined,
    socket,
    navigate,
    addParticipant,
    removeParticipant,
    updateParticipant,
    appendTranscript,
  ]);
}
