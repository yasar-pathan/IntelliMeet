const express = require('express');
const userController = require('../controllers/user.controller');
const { verifyJWT } = require('../middleware/auth.middleware');
const validate = require('../middleware/validate.middleware');
const upload = require('../middleware/upload.middleware');
const { 
  updateProfileSchema, 
  preferencesSchema, 
  searchQuerySchema 
} = require('../validators/user.validator');

const router = express.Router();

// Apply JWT verification to all user routes
router.use(verifyJWT);

// Search endpoint - placed first to prevent matching as /:userId parameter
router.get('/search', validate(searchQuerySchema, 'query'), userController.searchUsers);

// Self routes
router.get('/me', userController.getProfile);
router.patch('/me', validate(updateProfileSchema), userController.updateProfile);
router.patch('/me/avatar', upload.single('avatar'), userController.updateAvatar);
router.patch('/me/preferences', validate(preferencesSchema), userController.updatePreferences);
router.delete('/me', userController.deleteUser);

// Public profile retrieval by ID
router.get('/:userId', userController.getPublicProfile);

module.exports = router;
