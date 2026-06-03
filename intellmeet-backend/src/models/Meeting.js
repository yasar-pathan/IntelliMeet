const mongoose = require('mongoose');

const participantSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  leftAt: {
    type: Date
  },
  role: {
    type: String,
    enum: ['host', 'co-host', 'participant'],
    default: 'participant'
  }
}, { _id: false });

const meetingSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Meeting title is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    meetingCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 8,
      maxlength: 8
    },
    host: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    participants: [participantSchema],
    status: {
      type: String,
      enum: ['scheduled', 'live', 'ended', 'cancelled'],
      default: 'scheduled'
    },
    type: {
      type: String,
      enum: ['instant', 'scheduled', 'recurring'],
      default: 'instant'
    },
    scheduledAt: {
      type: Date
    },
    startedAt: {
      type: Date
    },
    endedAt: {
      type: Date
    },
    duration: {
      type: Number, // in minutes
      default: 0
    },
    settings: {
      video: { type: Boolean, default: true },
      audio: { type: Boolean, default: true },
      chat: { type: Boolean, default: true },
      recording: { type: Boolean, default: false },
      waitingRoom: { type: Boolean, default: false },
      maxParticipants: { type: Number, default: 50 }
    },
    recording: {
      isRecording: { type: Boolean, default: false },
      s3Key: { type: String },
      s3Url: { type: String },
      duration: { type: Number, default: 0 }
    },
    transcript: {
      type: String,
      default: ''
    },
    aiSummary: {
      summary: { type: String },
      keyPoints: { type: [String], default: [] },
      decisions: { type: [String], default: [] },
      openQuestions: { type: [String], default: [] },
      sentiment: { type: String },
      generatedAt: { type: Date }
    },
    aiProcessing: {
      status: {
        type: String,
        enum: ['idle', 'queued', 'processing', 'completed', 'failed'],
        default: 'idle'
      },
      lastRunAt: { type: Date },
      lastSuccessAt: { type: Date },
      retryCount: { type: Number, default: 0 },
      error: { type: String }
    },
    actionItems: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Task'
      }
    ],
    chat: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message'
      }
    ],
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team'
    },
    tags: {
      type: [String],
      default: []
    },
    isPasswordProtected: {
      type: Boolean,
      default: false
    },
    password: {
      type: String,
      select: false
    },
    agenda: {
      type: [String],
      default: []
    }
  },
  {
    timestamps: true
  }
);

// Indexes
meetingSchema.index({ meetingCode: 1 }, { unique: true });
meetingSchema.index({ host: 1 });
meetingSchema.index({ status: 1, scheduledAt: 1 });
meetingSchema.index({ team: 1 });
meetingSchema.index({ 'participants.user': 1 });

const Meeting = mongoose.model('Meeting', meetingSchema);

module.exports = Meeting;
