import * as React from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useMeetingStore } from '@/stores/meetingStore';
import type { TurnCredentials } from '@/types/models';

export function useWebRTC(
  meetingCode: string,
  localStream: MediaStream | null,
  turnCredentials: TurnCredentials | null
) {
  const socket = useSocket();
  const {
    participants,
    addParticipant,
    removeParticipant,
    updateParticipant,
    screenStream,
    isScreenSharing,
  } = useMeetingStore();

  // Peer connections map: socketId -> RTCPeerConnection
  const pcsRef = React.useRef<Map<string, RTCPeerConnection>>(new Map());

  // Configuration for ICE servers
  const getIceConfig = React.useCallback(() => {
    const iceServers: RTCIceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
    ];
    if (turnCredentials) {
      iceServers.push({
        urls: turnCredentials.urls,
        username: turnCredentials.username,
        credential: turnCredentials.credential,
      });
    }
    return { iceServers };
  }, [turnCredentials]);

  // Clean up a specific peer connection
  const closePeerConnection = React.useCallback((socketId: string) => {
    const pc = pcsRef.current.get(socketId);
    if (pc) {
      pc.close();
      pcsRef.current.delete(socketId);
    }
  }, []);

  const activeVideoTrack = isScreenSharing
    ? (screenStream ? screenStream.getVideoTracks()[0] : null)
    : (localStream ? localStream.getVideoTracks()[0] : null);

  const activeAudioTrack = localStream ? localStream.getAudioTracks()[0] : null;

  // Create an RTCPeerConnection for a peer
  const createPeerConnection = React.useCallback(
    async (socketId: string, isInitiator: boolean) => {
      if (pcsRef.current.has(socketId)) {
        closePeerConnection(socketId);
      }

      const pcConfig = getIceConfig();
      const pc = new RTCPeerConnection(pcConfig);
      pcsRef.current.set(socketId, pc);

      console.log(`[WebRTC] Creating PC for ${socketId}. Initiator: ${isInitiator}`);

      // Add local stream tracks to this peer connection
      const currentVideoTrack = isScreenSharing
        ? (screenStream ? screenStream.getVideoTracks()[0] : null)
        : (localStream ? localStream.getVideoTracks()[0] : null);
      const currentAudioTrack = localStream ? localStream.getAudioTracks()[0] : null;

      if (currentVideoTrack) {
        const assocStream = isScreenSharing ? screenStream : localStream;
        if (assocStream) {
          pc.addTrack(currentVideoTrack, assocStream);
        }
      }
      if (currentAudioTrack && localStream) {
        pc.addTrack(currentAudioTrack, localStream);
      }

      // Relay ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('meeting:webrtc-ice-candidate', {
            targetSocketId: socketId,
            candidate: event.candidate,
          });
        }
      };

      // Hook up remote track listener
      pc.ontrack = (event) => {
        console.log(`[WebRTC] Received remote track from ${socketId}`);
        const remoteStream = event.streams[0];
        if (remoteStream) {
          updateParticipant(socketId, { stream: remoteStream });
        }
      };

      // Negotiate if initiator
      if (isInitiator) {
        try {
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socket) {
            socket.emit('meeting:webrtc-offer', {
              targetSocketId: socketId,
              offer,
            });
          }
        } catch (err) {
          console.error('[WebRTC] Failed to create or send offer:', err);
        }
      }

      return pc;
    },
    [localStream, screenStream, isScreenSharing, socket, getIceConfig, closePeerConnection, updateParticipant]
  );

  // Synchronize tracks to all existing peer connections when active tracks change
  React.useEffect(() => {
    pcsRef.current.forEach(async (pc, socketId) => {
      const senders = pc.getSenders();
      let negotiationNeeded = false;

      // 1. Synchronize Video Track
      const videoSender = senders.find((s) => s.track?.kind === 'video');
      if (activeVideoTrack) {
        if (videoSender) {
          if (videoSender.track !== activeVideoTrack) {
            console.log(`[WebRTC] Replacing video track for peer ${socketId}`);
            try {
              await videoSender.replaceTrack(activeVideoTrack);
            } catch (err) {
              console.error(`[WebRTC] Failed to replace video track for peer ${socketId}:`, err);
            }
          }
        } else {
          console.log(`[WebRTC] Adding video track for peer ${socketId}`);
          try {
            const assocStream = isScreenSharing ? screenStream : localStream;
            if (assocStream) {
              pc.addTrack(activeVideoTrack, assocStream);
              negotiationNeeded = true;
            }
          } catch (err) {
            console.error(`[WebRTC] Failed to add video track for peer ${socketId}:`, err);
          }
        }
      } else {
        if (videoSender) {
          console.log(`[WebRTC] Removing video track for peer ${socketId}`);
          try {
            pc.removeTrack(videoSender);
            negotiationNeeded = true;
          } catch (err) {
            console.error(`[WebRTC] Failed to remove video track for peer ${socketId}:`, err);
          }
        }
      }

      // 2. Synchronize Audio Track
      const audioSender = senders.find((s) => s.track?.kind === 'audio');
      if (activeAudioTrack) {
        if (audioSender) {
          if (audioSender.track !== activeAudioTrack) {
            console.log(`[WebRTC] Replacing audio track for peer ${socketId}`);
            try {
              await audioSender.replaceTrack(activeAudioTrack);
            } catch (err) {
              console.error(`[WebRTC] Failed to replace audio track for peer ${socketId}:`, err);
            }
          }
        } else {
          console.log(`[WebRTC] Adding audio track for peer ${socketId}`);
          try {
            if (localStream) {
              pc.addTrack(activeAudioTrack, localStream);
              negotiationNeeded = true;
            }
          } catch (err) {
            console.error(`[WebRTC] Failed to add audio track for peer ${socketId}:`, err);
          }
        }
      } else {
        if (audioSender) {
          console.log(`[WebRTC] Removing audio track for peer ${socketId}`);
          try {
            pc.removeTrack(audioSender);
            negotiationNeeded = true;
          } catch (err) {
            console.error(`[WebRTC] Failed to remove audio track for peer ${socketId}:`, err);
          }
        }
      }

      if (negotiationNeeded) {
        try {
          console.log(`[WebRTC] Triggering renegotiation (offer) for peer ${socketId}`);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          if (socket) {
            socket.emit('meeting:webrtc-offer', {
              targetSocketId: socketId,
              offer,
            });
          }
        } catch (err) {
          console.error(`[WebRTC] Renegotiation offer failed for peer ${socketId}:`, err);
        }
      }
    });
  }, [activeVideoTrack, activeAudioTrack, isScreenSharing, screenStream, localStream, socket]);

  // Set up socket listeners for WebRTC signaling
  React.useEffect(() => {
    if (!socket) return;

    // Incoming WebRTC offer
    const handleOffer = async ({
      senderSocketId,
      offer,
    }: {
      senderSocketId: string;
      offer: RTCSessionDescriptionInit;
    }) => {
      console.log(`[WebRTC] Received offer from ${senderSocketId}`);
      let pc = pcsRef.current.get(senderSocketId);

      if (!pc) {
        pc = await createPeerConnection(senderSocketId, false);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('meeting:webrtc-answer', {
          targetSocketId: senderSocketId,
          answer,
        });
      } catch (err) {
        console.error('[WebRTC] Error in offer handler:', err);
      }
    };

    // Incoming WebRTC answer
    const handleAnswer = async ({
      senderSocketId,
      answer,
    }: {
      senderSocketId: string;
      answer: RTCSessionDescriptionInit;
    }) => {
      console.log(`[WebRTC] Received answer from ${senderSocketId}`);
      const pc = pcsRef.current.get(senderSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(answer));
        } catch (err) {
          console.error('[WebRTC] Error setting remote description:', err);
        }
      }
    };

    // Incoming ICE candidate
    const handleIceCandidate = async ({
      senderSocketId,
      candidate,
    }: {
      senderSocketId: string;
      candidate: RTCIceCandidateInit;
    }) => {
      const pc = pcsRef.current.get(senderSocketId);
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.error('[WebRTC] Error adding ICE candidate:', err);
        }
      }
    };

    socket.on('meeting:webrtc-offer', handleOffer);
    socket.on('meeting:webrtc-answer', handleAnswer);
    socket.on('meeting:webrtc-ice-candidate', handleIceCandidate);

    return () => {
      socket.off('meeting:webrtc-offer', handleOffer);
      socket.off('meeting:webrtc-answer', handleAnswer);
      socket.off('meeting:webrtc-ice-candidate', handleIceCandidate);
    };
  }, [socket, createPeerConnection]);

  // Clean up all connections on unmount
  React.useEffect(() => {
    return () => {
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
    };
  }, []);

  return {
    createPeerConnection,
    closePeerConnection,
    peerConnections: pcsRef.current,
  };
}
