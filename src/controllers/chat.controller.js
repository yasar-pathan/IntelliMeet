const Message = require('../models/Message');
const Meeting = require('../models/Meeting');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger');
const { getIO } = require('../config/socket');

/**
 * @route   POST /api/v1/chat/messages
 * @desc    Send a message (text or file upload attachment)
 * @access  Private
 * @body    { meetingId, content, replyTo } (file uploads via multipart/form-data)
 * @returns { ApiResponse } 201 Created status with sent message
 */
const sendMessage = asyncHandler(async (req, res) => {
  const { meetingId, content, replyTo } = req.body;
  const senderId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  // Ensure sender is a participant
  const isParticipant = meeting.participants.some(p => p.user.toString() === senderId.toString());
  const isHost = meeting.host.toString() === senderId.toString();
  if (!isHost && !isParticipant) {
    throw new ApiError(403, 'Forbidden: You must join the meeting to participate in the chat');
  }

  let messageData = {
    meeting: meetingId,
    sender: senderId,
    replyTo: replyTo || undefined
  };

  // Check if file upload occurred
  if (req.file) {
    messageData.type = 'file';
    messageData.fileUrl = req.file.path; // Cloudinary secure URL
    messageData.fileName = req.file.originalname;
    messageData.fileSize = req.file.size;
    messageData.content = content || `Sent a file: ${req.file.originalname}`;
  } else {
    if (!content || content.trim() === '') {
      throw new ApiError(400, 'Message content cannot be empty');
    }
    messageData.type = 'text';
    messageData.content = content;
  }

  const message = await Message.create(messageData);
  
  // Link message to meeting
  meeting.chat.push(message._id);
  await meeting.save();

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'name avatar')
    .populate('replyTo');

  // Emit to socket room for real-time delivery
  try {
    const io = getIO();
    io.to(`meeting:${meeting.meetingCode}`).emit('chat:new-message', populatedMessage);
  } catch (sockErr) {
    logger.debug(`Real-time chat socket emit failed: ${sockErr.message}`);
  }

  res.status(201).json(
    new ApiResponse(201, populatedMessage, 'Message sent successfully')
  );
});

/**
 * @route   GET /api/v1/chat/meetings/:meetingId
 * @desc    Retrieve all chat messages in a meeting
 * @access  Private
 * @returns { ApiResponse } 200 OK status with message array
 */
const getMessages = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  // Ensure requester has access
  const isParticipant = meeting.participants.some(p => p.user.toString() === userId.toString());
  const isHost = meeting.host.toString() === userId.toString();
  if (!isHost && !isParticipant) {
    throw new ApiError(403, 'Forbidden: You do not have permissions to view this chat');
  }

  const messages = await Message.find({ meeting: meetingId })
    .populate('sender', 'name avatar')
    .populate('replyTo')
    .sort({ createdAt: 1 });

  res.status(200).json(
    new ApiResponse(200, messages, 'Chat messages retrieved successfully')
  );
});

/**
 * @route   PATCH /api/v1/chat/messages/:messageId
 * @desc    Edit a message content
 * @access  Private (sender only)
 * @body    { content }
 * @returns { ApiResponse } 200 OK status with updated message
 */
const editMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;
  const userId = req.user._id;

  if (!content || content.trim() === '') {
    throw new ApiError(400, 'Message content cannot be empty');
  }

  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden: Only the sender can edit their message');
  }

  if (message.type === 'file') {
    throw new ApiError(400, 'Cannot edit file attachments');
  }

  message.content = content;
  message.isEdited = true;
  message.editedAt = new Date();
  await message.save();

  const populatedMessage = await Message.findById(message._id)
    .populate('sender', 'name avatar')
    .populate('replyTo');

  // Emit update
  try {
    const io = getIO();
    const meeting = await Meeting.findById(message.meeting);
    io.to(`meeting:${meeting.meetingCode}`).emit('chat:message-edited', populatedMessage);
  } catch (sockErr) {}

  res.status(200).json(
    new ApiResponse(200, populatedMessage, 'Message edited successfully')
  );
});

/**
 * @route   DELETE /api/v1/chat/messages/:messageId
 * @desc    Soft-delete a message (keeps record for structural integrity)
 * @access  Private (sender only)
 * @returns { ApiResponse } 200 OK success message
 */
const deleteMessage = asyncHandler(async (req, res) => {
  const { messageId } = req.params;
  const userId = req.user._id;

  const message = await Message.findById(messageId);
  if (!message) {
    throw new ApiError(404, 'Message not found');
  }

  if (message.sender.toString() !== userId.toString()) {
    throw new ApiError(403, 'Forbidden: Only the sender can delete their message');
  }

  message.isDeleted = true;
  message.deletedAt = new Date();
  message.content = 'This message was deleted';
  await message.save();

  // Emit deletion update to room
  try {
    const io = getIO();
    const meeting = await Meeting.findById(message.meeting);
    io.to(`meeting:${meeting.meetingCode}`).emit('chat:message-deleted', { messageId });
  } catch (sockErr) {}

  res.status(200).json(
    new ApiResponse(200, null, 'Message deleted successfully')
  );
});

module.exports = {
  sendMessage,
  getMessages,
  editMessage,
  deleteMessage
};
