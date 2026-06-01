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
  const { participants, addParticipant, removeParticipant, updateParticipant } = useMeetingStore();

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
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
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
    [localStream, socket, getIceConfig, closePeerConnection, updateParticipant]
  );

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
