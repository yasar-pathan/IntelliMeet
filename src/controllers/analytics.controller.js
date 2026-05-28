const Team = require('../models/Team');
const Meeting = require('../models/Meeting');
const analyticsService = require('../services/analytics.service');
const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const asyncHandler = require('../utils/asyncHandler');

/**
 * @route   GET /api/v1/analytics/personal
 * @desc    Get user's personal statistics over a date range (defaults to last 30 days)
 * @access  Private
 * @query   { startDate, endDate }
 * @returns { ApiResponse } 200 OK status with personal analytics summary
 */
const getPersonalStats = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  
  // Default to last 30 days
  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const startDate = req.query.startDate 
    ? new Date(req.query.startDate) 
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stats = await analyticsService.getPersonalAnalytics(userId, startDate, endDate);

  res.status(200).json(
    new ApiResponse(200, { period: { start: startDate, end: endDate }, ...stats }, 'Personal analytics fetched')
  );
});

/**
 * @route   GET /api/v1/analytics/team/:teamId
 * @desc    Get team-wide productivity & AI usage statistics (owners/admins only)
 * @access  Private (team owner/admin only)
 * @query   { startDate, endDate }
 * @returns { ApiResponse } 200 OK status with team analytics
 */
const getTeamStats = asyncHandler(async (req, res) => {
  const { teamId } = req.params;
  const userId = req.user._id;

  const team = await Team.findById(teamId);
  if (!team) {
    throw new ApiError(404, 'Team not found');
  }

  // Ensure requester is owner or admin
  const member = team.members.find(m => m.user.toString() === userId.toString());
  if (!member || (member.role !== 'owner' && member.role !== 'admin')) {
    throw new ApiError(403, 'Forbidden: Insufficient workspace permissions to view team analytics');
  }

  const endDate = req.query.endDate ? new Date(req.query.endDate) : new Date();
  const startDate = req.query.startDate 
    ? new Date(req.query.startDate) 
    : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const stats = await analyticsService.getTeamAnalytics(teamId, startDate, endDate);

  res.status(200).json(
    new ApiResponse(200, { period: { start: startDate, end: endDate }, ...stats }, 'Team analytics fetched')
  );
});

/**
 * @route   GET /api/v1/analytics/meeting/:meetingId
 * @desc    Get detailed analysis of a completed meeting
 * @access  Private (meeting participant/host only)
 * @returns { ApiResponse } 200 OK status with meeting analytics report
 */
const getMeetingStats = asyncHandler(async (req, res) => {
  const { meetingId } = req.params;
  const userId = req.user._id;

  const meeting = await Meeting.findById(meetingId);
  if (!meeting) {
    throw new ApiError(404, 'Meeting not found');
  }

  // Ensure requester is participant or host
  const isParticipant = meeting.participants.some(p => p.user.toString() === userId.toString());
  const isHost = meeting.host.toString() === userId.toString();

  if (!isHost && !isParticipant) {
    throw new ApiError(403, 'Forbidden: You must be a participant of the meeting to view its analytics');
  }

  const stats = await analyticsService.getMeetingAnalytics(meetingId);

  res.status(200).json(new ApiResponse(200, stats, 'Meeting analytics report fetched'));
});

module.exports = {
  getPersonalStats,
  getTeamStats,
  getMeetingStats
};
