import { create } from 'zustand';
import type { Meeting, ParticipantInfo, TranscriptChunk } from '@/types/models';

interface MeetingState {
  activeMeeting: Meeting | null;
  participants: Map<string, ParticipantInfo>;
  localStream: MediaStream | null;
  screenStream: MediaStream | null;
  isVideoOn: boolean;
  isAudioOn: boolean;
  isScreenSharing: boolean;
  isChatOpen: boolean;
  isParticipantsPanelOpen: boolean;
  isTranscriptOpen: boolean;
  transcriptChunks: TranscriptChunk[];

  // Actions
  setActiveMeeting: (meeting: Meeting) => void;
  addParticipant: (socketId: string, info: ParticipantInfo) => void;
  removeParticipant: (socketId: string) => void;
  updateParticipant: (socketId: string, update: Partial<ParticipantInfo>) => void;
  setLocalStream: (stream: MediaStream | null) => void;
  setScreenStream: (stream: MediaStream | null) => void;
  setVideoOn: (isOn: boolean) => void;
  setAudioOn: (isOn: boolean) => void;
  toggleVideo: () => void;
  toggleAudio: () => void;
  setScreenSharing: (sharing: boolean) => void;
  toggleChat: () => void;
  toggleParticipantsPanel: () => void;
  toggleTranscript: () => void;
  appendTranscript: (chunk: TranscriptChunk) => void;
  reset: () => void;
}

const initialState = {
  activeMeeting: null,
  participants: new Map<string, ParticipantInfo>(),
  localStream: null,
  screenStream: null,
  isVideoOn: true,
  isAudioOn: true,
  isScreenSharing: false,
  isChatOpen: false,
  isParticipantsPanelOpen: false,
  isTranscriptOpen: false,
  transcriptChunks: [] as TranscriptChunk[],
};

export const useMeetingStore = create<MeetingState>((set) => ({
  ...initialState,

  setActiveMeeting: (meeting) => set({ activeMeeting: meeting }),

  addParticipant: (socketId, info) =>
    set((state) => {
      const newMap = new Map(state.participants);
      newMap.set(socketId, info);
      return { participants: newMap };
    }),

  removeParticipant: (socketId) =>
    set((state) => {
      const newMap = new Map(state.participants);
      newMap.delete(socketId);
      return { participants: newMap };
    }),

  updateParticipant: (socketId, update) =>
    set((state) => {
      const newMap = new Map(state.participants);
      const existing = newMap.get(socketId);
      if (existing) {
        newMap.set(socketId, { ...existing, ...update });
      }
      return { participants: newMap };
    }),

  setLocalStream: (stream) => set({ localStream: stream }),
  setScreenStream: (stream) => set({ screenStream: stream }),

  setVideoOn: (isOn) => set({ isVideoOn: isOn }),
  setAudioOn: (isOn) => set({ isAudioOn: isOn }),
  toggleVideo: () => set((state) => ({ isVideoOn: !state.isVideoOn })),
  toggleAudio: () => set((state) => ({ isAudioOn: !state.isAudioOn })),
  setScreenSharing: (sharing) => set({ isScreenSharing: sharing }),

  toggleChat: () =>
    set((state) => ({
      isChatOpen: !state.isChatOpen,
      isParticipantsPanelOpen: false,
      isTranscriptOpen: false,
    })),

  toggleParticipantsPanel: () =>
    set((state) => ({
      isParticipantsPanelOpen: !state.isParticipantsPanelOpen,
      isChatOpen: false,
      isTranscriptOpen: false,
    })),

  toggleTranscript: () =>
    set((state) => ({
      isTranscriptOpen: !state.isTranscriptOpen,
      isChatOpen: false,
      isParticipantsPanelOpen: false,
    })),

  appendTranscript: (chunk) =>
    set((state) => ({
      transcriptChunks: [...state.transcriptChunks, chunk],
    })),

  reset: () => set(initialState),
}));
