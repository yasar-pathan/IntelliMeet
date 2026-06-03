const mongoose = require('mongoose');

const analyticsSchema = new mongoose.Schema(
  {
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Team',
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true
    },
    period: {
      start: { type: Date, required: true },
      end: { type: Date, required: true }
    },
    meetings: {
      total: { type: Number, default: 0 },
      hosted: { type: Number, default: 0 },
      attended: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      avgDuration: { type: Number, default: 0 } // in minutes
    },
    tasks: {
      total: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 } // percentage
    },
    collaboration: {
      messagesCount: { type: Number, default: 0 },
      avgParticipants: { type: Number, default: 0 },
      mostActiveHour: { type: Number, default: 0 } // hour of day (0-23)
    },
    aiUsage: {
      summariesGenerated: { type: Number, default: 0 },
      actionItemsExtracted: { type: Number, default: 0 },
      avgSummaryAccuracy: { type: Number, default: 100 }
    }
  },
  {
    timestamps: true
  }
);

const Analytics = mongoose.model('Analytics', analyticsSchema);

module.exports = Analytics;
