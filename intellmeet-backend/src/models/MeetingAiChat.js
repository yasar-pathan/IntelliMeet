const mongoose = require('mongoose');

const meetingAiChatSchema = new mongoose.Schema(
  {
    meeting: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Meeting',
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    question: {
      type: String,
      required: [true, 'Question is required'],
      trim: true,
    },
    answer: {
      type: String,
      required: [true, 'Answer is required'],
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

meetingAiChatSchema.index({ meeting: 1, createdAt: 1 });

const MeetingAiChat = mongoose.model('MeetingAiChat', meetingAiChatSchema);

module.exports = MeetingAiChat;
