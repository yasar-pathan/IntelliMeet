import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { useMeetingStore } from '@/stores/meetingStore';
import { useMediaDevices } from '@/features/meetings/hooks/useMediaDevices';
import { useScreenShare } from '@/features/meetings/hooks/useScreenShare';
import { useWebRTC } from '@/features/meetings/hooks/useWebRTC';
import { useMeetingSocket } from '@/features/meetings/hooks/useMeetingSocket';
import { useLiveTranscript } from '@/features/meetings/hooks/useLiveTranscript';
import { useMeetingRecording } from '@/features/meetings/hooks/useMeetingRecording';
import { VideoGrid } from '@/features/meetings/components/VideoGrid';
import { MeetingControls } from '@/features/meetings/components/MeetingControls';
import { ParticipantsList } from '@/features/meetings/components/ParticipantsList';
import { LiveTranscript } from '@/features/meetings/components/LiveTranscript';
import { ChatPanel } from '@/features/chat/components/ChatPanel';
import { ReactionOverlay, type FloatingReaction } from '@/features/meetings/components/ReactionOverlay';
import { JoinMeetingDialog } from '@/features/meetings/components/JoinMeetingDialog';
import {
  PreJoinLobby,
  type PreJoinChoices,
} from '@/features/meetings/components/PreJoinLobby';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { LoadingSpinner } from '@/components/common/LoadingSpinner';
import { Button } from '@/components/ui/Button';
import { useSocket } from '@/hooks/useSocket';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { Meeting, TurnCredentials } from '@/types/models';

export const MeetingRoomPage: React.FC = () => {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();
  const socket = useSocket();
  const { user: currentUser } = useAuthStore();

  const {
    activeMeeting,
    setActiveMeeting,
    participants,
    isVideoOn,
    isAudioOn,
    isScreenSharing,
    isChatOpen,
    isParticipantsPanelOpen,
    isTranscriptOpen,
    toggleChat,
    toggleParticipantsPanel,
    toggleTranscript,
    reset: resetMeetingStore,
    setLocalStream,
    setVideoOn,
    setAudioOn,
  } = useMeetingStore();

  const [turnCreds, setTurnCreds] = React.useState<TurnCredentials | null>(null);
  const [showPasswordModal, setShowPasswordModal] = React.useState(false);
  const [pendingJoinChoices, setPendingJoinChoices] = React.useState<(PreJoinChoices & { stream?: MediaStream | null }) | null>(null);
  const [showLeaveModal, setShowLeaveModal] = React.useState(false);
  const [isHandRaised, setIsHandRaised] = React.useState(false);
  const [reactions, setReactions] = React.useState<FloatingReaction[]>([]);
  const [joining, setJoining] = React.useState(false);
  const joinedMeetingRef = React.useRef<Meeting | null>(null);

  const { data: meetingData, isLoading: fetchLoading, error: fetchError } = useQuery<ApiResponse<Meeting>>({
    queryKey: ['meeting', 'code', meetingCode],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Meeting>>(`/meetings/code/${meetingCode}`);
      return response.data;
    },
    enabled: !!meetingCode,
    retry: false,
  });

  const meeting = meetingData?.data;
  const hostId = typeof meeting?.host === 'string' ? meeting.host : meeting?.host?._id;
  const isHost = hostId === currentUser?._id;

  const { localStream, startMedia, stopMedia, toggleVideo: toggleCam, toggleAudio: toggleMic } =
    useMediaDevices();

  const { screenStream, startScreenShare, stopScreenShare } = useScreenShare();

  const { createPeerConnection, closePeerConnection } = useWebRTC(
    meetingCode || '',
    localStream,
    turnCreds
  );

  const handleReactionReceived = React.useCallback(({ emoji }: { emoji: string }) => {
    const newReaction: FloatingReaction = {
      id: Math.random().toString(),
      emoji,
      left: Math.random() * 60 + 20,
      drift: Math.random() * 200 - 100,
    };
    setReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 3000);
  }, []);

  useMeetingSocket({
    meetingCode: meetingCode || '',
    isJoined: !!activeMeeting,
    createPeerConnection,
    closePeerConnection,
    onReaction: handleReactionReceived,
  });

  const { startTranscript, stopTranscript } = useLiveTranscript(activeMeeting?._id || '');

  const { isRecording, isUploading, toggleRecording } = useMeetingRecording(
    activeMeeting?._id,
    localStream,
    isHost
  );

  React.useEffect(() => {
    if (isTranscriptOpen) {
      startTranscript();
    } else {
      stopTranscript();
    }
  }, [isTranscriptOpen, startTranscript, stopTranscript]);

  const joinMeetingMutation = useMutation({
    mutationFn: async ({
      password,
      media,
      stream,
    }: {
      password?: string;
      media: PreJoinChoices;
      stream?: MediaStream | null;
    }) => {
      const response = await api.post<ApiResponse<{ meeting: Meeting; turnCredentials: TurnCredentials }>>(
        `/meetings/${meeting?._id}/join`,
        { password }
      );
      return { ...response.data.data, media, stream };
    },
    onSuccess: async (data) => {
      joinedMeetingRef.current = data.meeting;
      setTurnCreds(data.turnCredentials);
      setActiveMeeting(data.meeting);
      setShowPasswordModal(false);
      setPendingJoinChoices(null);

      if (data.stream) {
        setLocalStream(data.stream);
        setVideoOn(data.media.video && data.stream.getVideoTracks().some((t) => t.enabled));
        setAudioOn(data.media.audio && data.stream.getAudioTracks().some((t) => t.enabled));
      } else {
        await startMedia({ video: data.media.video, audio: data.media.audio });
      }
    },
    onError: (err: unknown) => {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Access denied';
      toast.error(message);
    },
  });

  React.useEffect(() => {
    if (turnCreds && !activeMeeting && joinedMeetingRef.current) {
      setActiveMeeting(joinedMeetingRef.current);
    }
  }, [turnCreds, activeMeeting, setActiveMeeting]);

  React.useEffect(() => {
    if (fetchError) {
      toast.error('Meeting code not found');
      navigate('/meetings');
    }
  }, [fetchError, navigate]);

  const canShowPreJoin = Boolean(meeting) && !activeMeeting && !turnCreds;

  const handlePasswordSubmit = (password: string) => {
    setShowPasswordModal(false);
    const choices = pendingJoinChoices ?? { video: true, audio: true };
    joinMeetingMutation.mutate({ password, media: choices, stream: pendingJoinChoices?.stream });
    setPendingJoinChoices(null);
  };

  const handlePreJoin = (choices: PreJoinChoices, stream: MediaStream | null) => {
    if (meeting?.isPasswordProtected && !isHost) {
      setPendingJoinChoices({ ...choices, stream });
      setShowPasswordModal(true);
      return;
    }
    joinMeetingMutation.mutate({ media: choices, stream });
  };

  const handleToggleCam = async () => {
    const enabled = await toggleCam();
    if (socket) {
      socket.emit('meeting:toggle-video', { isVideoOn: enabled });
    }
  };

  const handleToggleMic = async () => {
    const enabled = await toggleMic();
    if (socket) {
      socket.emit('meeting:toggle-audio', { isAudioOn: enabled });
    }
  };

  const handleToggleScreenShare = async () => {
    if (isScreenSharing) {
      stopScreenShare();
      socket?.emit('meeting:screen-share-stop');
    } else {
      const stream = await startScreenShare();
      if (stream && socket) {
        socket.emit('meeting:screen-share-start');
      }
    }
  };

  const handleToggleHand = () => {
    const nextState = !isHandRaised;
    setIsHandRaised(nextState);
    if (socket) {
      if (nextState) socket.emit('meeting:hand-raise');
      else socket.emit('meeting:hand-lower');
    }
  };

  const handleSendEmoji = (emoji: string) => {
    socket?.emit('meeting:reaction', { emoji });
    handleReactionReceived({ emoji });
  };

  const handleLeaveConfirm = async () => {
    setJoining(true);
    try {
      if (activeMeeting) {
        await api.post(`/meetings/${activeMeeting._id}/leave`);
      }
      toast.success('You have left the meeting');
      navigate('/meetings');
    } catch {
      navigate('/meetings');
    }
  };

  const stopMediaRef = React.useRef(stopMedia);
  const stopScreenShareRef = React.useRef(stopScreenShare);
  const stopTranscriptRef = React.useRef(stopTranscript);
  stopMediaRef.current = stopMedia;
  stopScreenShareRef.current = stopScreenShare;
  stopTranscriptRef.current = stopTranscript;

  React.useEffect(() => {
    return () => {
      stopMediaRef.current();
      stopScreenShareRef.current();
      stopTranscriptRef.current();
      resetMeetingStore();
    };
  }, [resetMeetingStore]);

  if (fetchLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-muted-foreground mt-3 font-semibold">Loading meeting details...</p>
      </div>
    );
  }

  if (fetchError || !meeting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <p className="text-lg text-red-500 font-semibold mb-4">Error loading meeting.</p>
        <Button onClick={() => navigate('/meetings')} variant="outline">
          Return to Meetings
        </Button>
      </div>
    );
  }

  if (canShowPreJoin) {
    return (
      <>
        <PreJoinLobby
          meeting={meeting}
          meetingCode={meetingCode || ''}
          userName={currentUser?.name || 'Guest'}
          userAvatar={currentUser?.avatar}
          isHost={isHost}
          onJoin={handlePreJoin}
          onCancel={() => navigate('/meetings')}
          isJoining={joinMeetingMutation.isPending}
        />
        <JoinMeetingDialog
          isOpen={showPasswordModal}
          onClose={() => {
            setShowPasswordModal(false);
            setPendingJoinChoices(null);
          }}
          onSubmit={handlePasswordSubmit}
          isLoading={joinMeetingMutation.isPending}
        />
      </>
    );
  }

  if (!activeMeeting && joinMeetingMutation.isPending) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-muted-foreground mt-3 font-semibold">Joining meeting room...</p>
      </div>
    );
  }

  if (!activeMeeting) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
        <LoadingSpinner size="lg" />
        <p className="text-xs text-muted-foreground mt-3 font-semibold">Connecting...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen w-screen bg-background overflow-hidden relative select-none">
      <header className="h-14 bg-card border-b border-border/60 flex items-center justify-between px-6 shrink-0 z-10">
        <div className="flex items-center gap-3">
          <span className="font-bold text-sm text-foreground">{activeMeeting?.title}</span>
          <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full select-all">
            {meetingCode}
          </span>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <div className="flex-1 flex p-4 items-center justify-center relative overflow-hidden bg-background/50">
          <VideoGrid
            localStream={localStream}
            isVideoOn={isVideoOn}
            isAudioOn={isAudioOn}
            participants={participants}
            screenStream={screenStream}
            isLocalScreenSharing={isScreenSharing}
          />
        </div>

        <ReactionOverlay reactions={reactions} />

        {isParticipantsPanelOpen && activeMeeting && (
          <ParticipantsList
            participants={participants}
            activeMeeting={activeMeeting}
            isVideoOn={isVideoOn}
            isAudioOn={isAudioOn}
            isHandRaised={isHandRaised}
          />
        )}

        {isChatOpen && activeMeeting && (
          <ChatPanel meetingId={activeMeeting._id} meetingCode={activeMeeting.meetingCode} />
        )}

        {isTranscriptOpen && <LiveTranscript />}
      </div>

      <MeetingControls
        isVideoOn={isVideoOn}
        isAudioOn={isAudioOn}
        isScreenSharing={isScreenSharing}
        isHandRaised={isHandRaised}
        isChatOpen={isChatOpen}
        isParticipantsOpen={isParticipantsPanelOpen}
        isTranscriptOpen={isTranscriptOpen}
        onToggleVideo={handleToggleCam}
        onToggleAudio={handleToggleMic}
        onToggleScreenShare={handleToggleScreenShare}
        onToggleHand={handleToggleHand}
        onToggleChat={toggleChat}
        onToggleParticipants={toggleParticipantsPanel}
        onToggleTranscript={toggleTranscript}
        onLeave={() => setShowLeaveModal(true)}
        onSendReaction={handleSendEmoji}
        isHost={isHost}
        isRecording={isRecording}
        isRecordingBusy={isUploading}
        onToggleRecording={toggleRecording}
      />

      <ConfirmDialog
        isOpen={showLeaveModal}
        onClose={() => setShowLeaveModal(false)}
        onConfirm={handleLeaveConfirm}
        title="Leave Meeting?"
        description="Are you sure you want to exit this meeting room?"
        confirmText="Leave Room"
        isLoading={joining}
      />
    </div>
  );
};

export default MeetingRoomPage;
