const redis = require('../config/redis');
const User = require('../models/User');
const Meeting = require('../models/Meeting');
const logger = require('../utils/logger');

const registerMeetingHandlers = (io, socket) => {
  
  // 1. Join Meeting Room
  socket.on('meeting:join-room', async ({ meetingCode }) => {
    if (!meetingCode) return;

    try {
      const meeting = await Meeting.findOne({ meetingCode }).select('_id host participants');
      if (!meeting) {
        socket.emit('meeting:error', { message: 'Meeting room not found' });
        return;
      }

      const userId = socket.user._id.toString();
      const isHost = meeting.host.toString() === userId;
      const isActiveParticipant = meeting.participants.some(
        (participant) => participant.user.toString() === userId && !participant.leftAt
      );
      if (!isHost && !isActiveParticipant) {
        socket.emit('meeting:error', { message: 'Join meeting via API before opening room socket' });
        return;
      }

      const roomName = `meeting:${meetingCode}`;
      socket.join(roomName);

      // Track meeting context on socket object
      socket.meetingCode = meetingCode;
      socket.activeMeetingId = meeting._id.toString();

      const user = await User.findById(socket.user._id, 'name avatar');
      const userInfo = {
        socketId: socket.id,
        userId: socket.user._id,
        name: user ? user.name : 'Unknown User',
        avatar: user ? user.avatar : ''
      };

      // Broadcast join event to all other peers in the room
      socket.to(roomName).emit('meeting:user-joined', userInfo);

      // Fetch list of current active sockets in this room to return to joining user
      const roomSockets = await io.in(roomName).fetchSockets();
      const currentParticipants = [];

      for (const s of roomSockets) {
        if (s.id !== socket.id) {
          currentParticipants.push({
            socketId: s.id,
            userId: s.user._id,
            // Fallback if name/avatar is not stored on socket.user (standard Mongoose lookup or client parameters)
            name: s.user.name || 'Participant',
            avatar: s.user.avatar || ''
          });
        }
      }

      // Send list back to joiner
      socket.emit('meeting:participants-list', currentParticipants);
      logger.info(`User ${socket.user._id} joined meeting room ${roomName}`);
    } catch (err) {
      logger.error(`Error in meeting:join-room: ${err.message}`);
    }
  });

  // 2. Leave Meeting Room
  socket.on('meeting:leave-room', () => {
    const meetingCode = socket.meetingCode;
    if (!meetingCode) return;

    const roomName = `meeting:${meetingCode}`;
    socket.leave(roomName);
    socket.meetingCode = null;
    socket.activeMeetingId = null;

    // Broadcast departure
    socket.to(roomName).emit('meeting:user-left', {
      socketId: socket.id,
      userId: socket.user._id
    });
    logger.info(`User ${socket.user._id} left meeting room ${roomName}`);
  });

  // 3. WebRTC Signaling Relays (Offer, Answer, ICE Candidates)
  socket.on('meeting:webrtc-offer', ({ targetSocketId, offer }) => {
    io.to(targetSocketId).emit('meeting:webrtc-offer', {
      senderSocketId: socket.id,
      offer
    });
  });

  socket.on('meeting:webrtc-answer', ({ targetSocketId, answer }) => {
    io.to(targetSocketId).emit('meeting:webrtc-answer', {
      senderSocketId: socket.id,
      answer
    });
  });

  socket.on('meeting:webrtc-ice-candidate', ({ targetSocketId, candidate }) => {
    io.to(targetSocketId).emit('meeting:webrtc-ice-candidate', {
      senderSocketId: socket.id,
      candidate
    });
  });

  // 4. Toggle Media States (Video/Audio)
  socket.on('meeting:toggle-video', ({ isVideoOn }) => {
    const meetingCode = socket.meetingCode;
    if (!meetingCode) return;
    socket.to(`meeting:${meetingCode}`).emit('meeting:video-toggled', {
      socketId: socket.id,
      userId: socket.user._id,
      isVideoOn
    });
  });

  socket.on('meeting:toggle-audio', ({ isAudioOn }) => {
    const meetingCode = socket.meetingCode;
    if (!meetingCode) return;
    socket.to(`meeting:${meetingCode}`).emit('meeting:audio-toggled', {
      socketId: socket.id,
      userId: socket.user._id,
      isAudioOn
    });
  });

  // 5. Screen Share States
  socket.on('meeting:screen-share-start', () => {
    const meetingCode = socket.meetingCode;
    if (!meetingCode) return;
    socket.to(`meeting:${meetingCode}`).emit('meeting:screen-share-started', {
      socketId: socket.id,
      userId: socket.user._id
    });
  });

  socket.on('meeting:screen-share-stop', () => {
    const meetingCode = socket.meetingCode;
    if (!meetingCode) return;
    socket.to(`meeting:${meetingCode}`).emit('meeting:screen-share-stopped', {
      socketId: socket.id,
      userId: socket.user._id
    });
  });

  // 6. Hand Raise States
  socket.on('meeting:hand-raise', () => {
    const meetingCode = socket.meetingCode;
    if (!meetingCode) return;
    socket.to(`meeting:${meetingCode}`).emit('meeting:hand-raised', {
      socketId: socket.id,
      userId: socket.user._id
    });
  });

  socket.on('meeting:hand-lower', () => {
    const meetingCode = socket.meetingCode;
    if (!meetingCode) return;
    socket.to(`meeting:${meetingCode}`).emit('meeting:hand-lowered', {
      socketId: socket.id,
      userId: socket.user._id
    });
  });

  // 7. Interactive Reactions
  socket.on('meeting:reaction', ({ emoji }) => {
    const meetingCode = socket.meetingCode;
    if (!meetingCode) return;
    io.to(`meeting:${meetingCode}`).emit('meeting:reaction', {
      emoji,
      userId: socket.user._id,
      socketId: socket.id
    });
  });

  // 8. Live Captioning & Redis Transcript Aggregation
  socket.on('meeting:transcript-chunk', async ({ meetingId, text, timestamp, speakerName }) => {
    const meetingCode = socket.meetingCode;
    if (!meetingCode || !meetingId || !text) return;
    if (socket.activeMeetingId !== meetingId.toString()) return;

    const roomName = `meeting:${meetingCode}`;
    const formattedChunk = `[${timestamp || new Date().toISOString()}] ${speakerName || 'Speaker'}: ${text}\n`;
    const redisKey = `transcript:${meetingId}`;

    try {
      // Atomic Redis append operation
      await redis.append(redisKey, formattedChunk);

      // Verify and set expiration TTL to 24h if key is fresh
      const ttl = await redis.ttl(redisKey);
      if (ttl === -1) {
        await redis.expire(redisKey, 86400); // 24 hours
      }

      // Broadcast captions to the meeting room in real-time
      io.to(roomName).emit('meeting:transcript-update', {
        meetingId,
        text,
        speakerName,
        timestamp
      });
    } catch (err) {
      logger.error(`Error saving transcript chunk in Redis: ${err.message}`);
    }
  });

  // Cleanup on connection loss
  socket.on('disconnecting', () => {
    const meetingCode = socket.meetingCode;
    if (meetingCode) {
      socket.to(`meeting:${meetingCode}`).emit('meeting:user-left', {
        socketId: socket.id,
        userId: socket.user._id
      });
    }
  });
};

module.exports = registerMeetingHandlers;
