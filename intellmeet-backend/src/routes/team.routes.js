const express = require('express');
const teamController = require('../controllers/team.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const { 
  createTeamSchema, 
  updateTeamSchema, 
  updateMemberRoleSchema 
} = require('../validators/team.validator');

const router = express.Router();

// Apply JWT verification to all team routes
router.use(verifyJWT);

// Team collection endpoints
router.post('/', validate(createTeamSchema), teamController.createTeam);
router.get('/', teamController.getMyTeams);

// Join workspace via URL invite code
router.post('/join/:inviteCode', teamController.joinTeamByInviteCode);

// Single team operations
router.get('/:teamId', teamController.getTeamById);
router.patch('/:teamId', validate(updateTeamSchema), teamController.updateTeam);
router.delete('/:teamId', teamController.deleteTeam);

// Invite links operations
router.post('/:teamId/invite', teamController.generateInviteLink);

// Workspace member management operations
router.delete('/:teamId/members/:userId', teamController.removeMember);
router.patch('/:teamId/members/:userId/role', validate(updateMemberRoleSchema), teamController.updateMemberRole);

module.exports = router;
