const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member'
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

const teamSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Team name is required'],
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    avatar: {
      type: String,
      default: 'https://res.cloudinary.com/dqv67vquc/image/upload/v1700000000/default_team_avatar.png'
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    members: [memberSchema],
    inviteCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true
    },
    inviteCodeExpiry: {
      type: Date
    },
    settings: {
      isPublic: {
        type: Boolean,
        default: false
      },
      allowMemberInvite: {
        type: Boolean,
        default: true
      }
    }
  },
  {
    timestamps: true
  }
);

// Unique team name per owner
teamSchema.index({ name: 1, owner: 1 }, { unique: true });
teamSchema.index({ inviteCode: 1 }, { unique: true, sparse: true });

const Team = mongoose.model('Team', teamSchema);

module.exports = Team;
