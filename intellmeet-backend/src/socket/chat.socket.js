const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const User = require('../models/User');
const logger = require('../utils/logger');

const registerChatHandlers = (io, socket) => {
  const userId = socket.user._id;

  // 1. Send Message
  socket.on('chat:send-message', async ({ meetingId, content, replyTo }) => {
    if (!meetingId || !content || content.trim() === '') return;

    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) return;

      // Check membership
      const isParticipant = meeting.participants.some(p => p.user.toString() === userId.toString());
      const isHost = meeting.host.toString() === userId.toString();
      if (!isHost && !isParticipant) return;

      const message = await Message.create({
        meeting: meetingId,
        sender: userId,
        content,
        replyTo: replyTo || undefined
      });

      // Link message to meeting
      meeting.chat.push(message._id);
      await meeting.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'name avatar')
        .populate('replyTo');

      const roomName = `meeting:${meeting.meetingCode}`;

      // Broadcast to room excluding sender
      socket.to(roomName).emit('chat:new-message', populatedMessage);
      
      // Confirm to sender (optimistic UI sync)
      socket.emit('chat:message-sent', populatedMessage);
    } catch (err) {
      logger.error(`Socket chat:send-message error: ${err.message}`);
    }
  });

  // 2. Typing Indicators
  const typingTimers = {};

  socket.on('chat:typing-start', async ({ meetingCode }) => {
    if (!meetingCode) return;
    const roomName = `meeting:${meetingCode}`;

    try {
      const user = await User.findById(userId, 'name avatar');
      if (user) {
        socket.to(roomName).emit('chat:typing-start', {
          userId,
          name: user.name,
          avatar: user.avatar
        });

        // Server-side auto-clear after 3 seconds
        if (typingTimers[socket.id]) {
          clearTimeout(typingTimers[socket.id]);
        }

        typingTimers[socket.id] = setTimeout(() => {
          socket.to(roomName).emit('chat:typing-stop', { userId });
          delete typingTimers[socket.id];
        }, 3000);
      }
    } catch (err) {
      logger.error(`Error in typing-start socket handler: ${err.message}`);
    }
  });

  socket.on('chat:typing-stop', ({ meetingCode }) => {
    if (!meetingCode) return;
    const roomName = `meeting:${meetingCode}`;
    
    if (typingTimers[socket.id]) {
      clearTimeout(typingTimers[socket.id]);
      delete typingTimers[socket.id];
    }
    
    socket.to(roomName).emit('chat:typing-stop', { userId });
  });

  // 3. Edit Message
  socket.on('chat:edit-message', async ({ messageId, content }) => {
    if (!messageId || !content || content.trim() === '') return;

    try {
      const message = await Message.findById(messageId);
      if (!message || message.sender.toString() !== userId.toString()) return;

      message.content = content;
      message.isEdited = true;
      message.editedAt = new Date();
      await message.save();

      const populatedMessage = await Message.findById(message._id)
        .populate('sender', 'name avatar')
        .populate('replyTo');

      const meeting = await Meeting.findById(message.meeting);
      if (meeting) {
        io.to(`meeting:${meeting.meetingCode}`).emit('chat:message-edited', populatedMessage);
      }
    } catch (err) {
      logger.error(`Socket chat:edit-message error: ${err.message}`);
    }
  });

  // 4. Delete Message (Soft delete)
  socket.on('chat:delete-message', async ({ messageId }) => {
    if (!messageId) return;

    try {
      const message = await Message.findById(messageId);
      if (!message || message.sender.toString() !== userId.toString()) return;

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.content = 'This message was deleted';
      await message.save();

      const meeting = await Meeting.findById(message.meeting);
      if (meeting) {
        io.to(`meeting:${meeting.meetingCode}`).emit('chat:message-deleted', { messageId });
      }
    } catch (err) {
      logger.error(`Socket chat:delete-message error: ${err.message}`);
    }
  });

  // 5. Message Reactions
  socket.on('chat:react', async ({ messageId, emoji }) => {
    if (!messageId || !emoji) return;

    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      // Find reaction in message schema
      const reactIdx = message.reactions.findIndex(r => r.emoji === emoji);

      if (reactIdx !== -1) {
        const userIdx = message.reactions[reactIdx].users.indexOf(userId);
        if (userIdx !== -1) {
          // User already reacted, toggle/remove user from users array
          message.reactions[reactIdx].users.splice(userIdx, 1);
          // If empty users list, remove reaction emoji completely
          if (message.reactions[reactIdx].users.length === 0) {
            message.reactions.splice(reactIdx, 1);
          }
        } else {
          // React emoji exists, but user hasn't reacted yet. Add user.
          message.reactions[reactIdx].users.push(userId);
        }
      } else {
        // Emoji doesn't exist, create a fresh reaction block
        message.reactions.push({
          emoji,
          users: [userId]
        });
      }

      await message.save();

      const meeting = await Meeting.findById(message.meeting);
      if (meeting) {
        io.to(`meeting:${meeting.meetingCode}`).emit('chat:reaction-updated', {
          messageId,
          reactions: message.reactions
        });
      }
    } catch (err) {
      logger.error(`Socket chat:react error: ${err.message}`);
    }
  });

  // 6. Mark messages in room as read by user
  socket.on('chat:mark-read', async ({ meetingId }) => {
    if (!meetingId) return;

    try {
      const meeting = await Meeting.findById(meetingId);
      if (!meeting) return;

      // Add user to readBy array in all messages of the meeting
      const now = new Date();
      await Message.updateMany(
        { 
          meeting: meetingId, 
          'readBy.user': { $ne: userId }
        },
        { 
          $push: { readBy: { user: userId, readAt: now } } 
        }
      );

      const roomName = `meeting:${meeting.meetingCode}`;
      socket.to(roomName).emit('chat:messages-read', {
        meetingId,
        userId,
        readAt: now
      });
    } catch (err) {
      logger.error(`Socket chat:mark-read error: ${err.message}`);
    }
  });
};

module.exports = registerChatHandlers;
