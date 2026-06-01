// ── Socket Event Payload Types ────────────────────────────────────

// Meeting Socket Events
export interface MeetingUserJoined {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
}

export interface MeetingUserLeft {
  socketId: string;
  userId: string;
}

export interface WebRTCOffer {
  senderSocketId: string;
  offer: RTCSessionDescriptionInit;
}

export interface WebRTCAnswer {
  senderSocketId: string;
  answer: RTCSessionDescriptionInit;
}

export interface WebRTCIceCandidate {
  senderSocketId: string;
  candidate: RTCIceCandidateInit;
}

export interface VideoToggled {
  socketId: string;
  userId: string;
  isVideoOn: boolean;
}

export interface AudioToggled {
  socketId: string;
  userId: string;
  isAudioOn: boolean;
}

export interface ScreenShareEvent {
  socketId: string;
  userId: string;
}

export interface HandRaiseEvent {
  socketId: string;
  userId: string;
}

export interface ReactionEvent {
  emoji: string;
  userId: string;
  socketId: string;
}

export interface TranscriptUpdate {
  meetingId: string;
  text: string;
  speakerName: string;
  timestamp: string;
}

// Chat Socket Events
export interface TypingStartEvent {
  userId: string;
  name: string;
  avatar: string;
}

export interface TypingStopEvent {
  userId: string;
}

export interface MessageDeletedEvent {
  messageId: string;
}

export interface ReactionUpdatedEvent {
  messageId: string;
  reactions: Array<{ emoji: string; users: string[] }>;
}

export interface MessagesReadEvent {
  meetingId: string;
  userId: string;
  readAt: string;
}

// Presence Socket Events
export interface PresenceUpdate {
  userId: string;
  name: string;
  avatar: string;
  isOnline: boolean;
  lastSeen: string;
}
