// ── User ──────────────────────────────────────────────────────────
export interface User {
  _id: string;
  name: string;
  email: string;
  avatar: string;
  role: 'admin' | 'member' | 'guest';
  isEmailVerified: boolean;
  teams: string[] | Team[];
  lastSeen: string;
  isOnline: boolean;
  isActive: boolean;
  preferences: UserPreferences;
  createdAt: string;
  updatedAt: string;
}

export interface UserPreferences {
  notifications: boolean;
  theme: 'light' | 'dark' | 'system';
  language: string;
}

export interface UserSearchResult {
  _id: string;
  name: string;
  avatar: string;
  email: string;
  isOnline: boolean;
}

// ── Meeting ───────────────────────────────────────────────────────
export interface MeetingSettings {
  muteOnEntry: boolean;
  allowScreenShare: boolean;
  enableWaitingRoom: boolean;
  enableRecording: boolean;
  maxParticipants: number;
}

export interface MeetingParticipant {
  user: string | User;
  joinedAt: string;
  leftAt?: string;
  role: 'host' | 'co-host' | 'participant';
}

export interface MeetingRecording {
  isRecording?: boolean;
  s3Key?: string;
  s3Url?: string;
  duration?: number;
}

export interface AISummary {
  summary: string;
  keyPoints: string[];
  decisions: string[];
  sentiment: string;
}

export interface ActionItem {
  text: string;
  assignee?: string;
  dueDate?: string;
  completed: boolean;
}

export interface Meeting {
  _id: string;
  title: string;
  description: string;
  meetingCode: string;
  host: string | User;
  participants: MeetingParticipant[];
  status: 'scheduled' | 'live' | 'active' | 'ended' | 'cancelled';
  scheduledAt?: string;
  startedAt?: string;
  endedAt?: string;
  duration?: number;
  settings: MeetingSettings;
  isPasswordProtected: boolean;
  recording?: MeetingRecording;
  aiSummary?: AISummary;
  actionItems: ActionItem[];
  transcript?: string;
  chat: string[];
  team?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

// ── Task ──────────────────────────────────────────────────────────
export type TaskStatus = 'todo' | 'in-progress' | 'review' | 'done' | 'cancelled';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface TaskComment {
  user: string | User;
  content: string;
  createdAt: string;
}

export interface TaskAttachment {
  url: string;
  name: string;
  type: string;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assignee?: string | User;
  reporter: string | User;
  dueDate?: string;
  order: number;
  meeting?: string | Meeting;
  team?: string | Team;
  isAiGenerated: boolean;
  comments: TaskComment[];
  attachments: TaskAttachment[];
  createdAt: string;
  updatedAt: string;
}

// ── Team ──────────────────────────────────────────────────────────
export interface TeamMember {
  user: string | User;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface TeamSettings {
  allowMemberInvites: boolean;
  defaultMeetingSettings: Record<string, unknown>;
}

export interface Team {
  _id: string;
  name: string;
  description: string;
  avatar?: string;
  owner: string | User;
  members: TeamMember[];
  inviteCode: string;
  settings: TeamSettings;
  createdAt: string;
  updatedAt: string;
}

// ── Message ───────────────────────────────────────────────────────
export interface MessageReaction {
  emoji: string;
  users: string[];
}

export interface ReadReceipt {
  user: string;
  readAt: string;
}

export interface Message {
  _id: string;
  meeting: string;
  sender: string | User;
  content: string;
  type: 'text' | 'file' | 'system';
  fileUrl?: string;
  fileName?: string;
  replyTo?: string | Message;
  reactions: MessageReaction[];
  readBy: ReadReceipt[];
  isEdited: boolean;
  editedAt?: string;
  isDeleted: boolean;
  deletedAt?: string;
  createdAt: string;
}

// ── Notification ──────────────────────────────────────────────────
export type NotificationType =
  | 'meeting_invite'
  | 'meeting_started'
  | 'task_assigned'
  | 'task_updated'
  | 'team_invite'
  | 'mention'
  | 'ai_summary_ready'
  | 'recording_ready'
  | 'system';

export interface Notification {
  _id: string;
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  data: Record<string, unknown>;
  isRead: boolean;
  createdAt: string;
}

// ── Analytics ─────────────────────────────────────────────────────
export interface AnalyticsTrendPoint {
  label: string;
  meetings?: number;
  minutes?: number;
  created?: number;
  completed?: number;
}

export interface PersonalAnalytics {
  period?: { start: string; end: string };
  meetings: {
    total: number;
    hosted: number;
    attended: number;
    cancelled: number;
    avgDuration: number;
  };
  tasks: {
    total: number;
    completed: number;
    overdue: number;
    completionRate: number;
  };
  collaboration: {
    messagesCount: number;
    mostActiveHour: number;
  };
  trends?: {
    meetingsByWeek: AnalyticsTrendPoint[];
    tasksByWeek: AnalyticsTrendPoint[];
  };
  meetingStatus?: Record<string, number>;
  taskStatus?: Record<string, number>;
  messagesByHour?: Array<{ hour: number; count: number }>;
  productivityIndex?: number;
  insights?: string[];
}

export interface TeamAnalytics {
  period?: { start: string; end: string };
  meetings: {
    total: number;
    avgDuration: number;
    avgParticipants: number;
    topHosts?: Array<{ name: string; avatar?: string; count: number }>;
  };
  tasks: {
    todo: number;
    inProgress: number;
    review: number;
    done: number;
    cancelled: number;
    breakdown?: Record<string, number>;
    topContributors: Array<{ user: User; count: number }>;
  };
  aiUsage: {
    summariesGenerated: number;
    actionItemsExtracted?: number;
    actionItemsCreated?: number;
  };
  trends?: {
    meetingsByWeek: AnalyticsTrendPoint[];
  };
  meetingStatus?: Record<string, number>;
  collaboration?: {
    messagesCount: number;
    mostActiveHour: number;
  };
  productivityIndex?: number;
  insights?: string[];
}

export interface MeetingAnalytics {
  duration: number;
  participantCount: number;
  messages: Array<{ user: User; messageCount: number }>;
  tasks: Record<string, number>;
  engagementScore: number;
  taskCompletionRate: number;
}

// ── Participant Info (for meeting room) ───────────────────────────
export interface ParticipantInfo {
  socketId: string;
  userId: string;
  name: string;
  avatar: string;
  isVideoOn?: boolean;
  isAudioOn?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
  stream?: MediaStream;
}

export interface TranscriptChunk {
  meetingId: string;
  text: string;
  speakerName: string;
  timestamp: string;
}
