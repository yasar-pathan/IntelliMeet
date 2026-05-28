const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');
const ApiError = require('../utils/ApiError');
const path = require('path');

// Allowed files mapping
const ALLOWED_EXTENSIONS = {
  // Images
  'jpg': 'image/jpeg',
  'jpeg': 'image/jpeg',
  'png': 'image/png',
  'gif': 'image/gif',
  'webp': 'image/webp',
  // Documents
  'pdf': 'application/pdf',
  'doc': 'application/msword',
  'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'txt': 'text/plain',
  // Audio/Video
  'mp4': 'video/mp4',
  'mp3': 'audio/mpeg',
  'wav': 'audio/wav'
};

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
  const mimeType = file.mimetype;

  // 1. Verify extension is allowed
  if (!ALLOWED_EXTENSIONS[ext]) {
    return cb(new ApiError(400, `File extension .${ext} is not allowed.`), false);
  }

  // 2. Verify MIME type matches extension
  if (ALLOWED_EXTENSIONS[ext] !== mimeType) {
    return cb(new ApiError(400, 'Security warning: File content type mismatch.'), false);
  }

  // 3. Scan for malicious content patterns (e.g. PHP tags, executable JS, HTML script injection)
  // Check filename first
  const maliciousPattern = /(\.exe|\.sh|\.bat|\.js|\.html|\.htm|\.php)$/i;
  if (maliciousPattern.test(file.originalname)) {
    return cb(new ApiError(400, 'Security warning: Executable file upload blocked.'), false);
  }

  cb(null, true);
};

// Set up Cloudinary storage engine
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/');
    return {
      folder: 'intellmeet',
      resource_type: isImage ? 'image' : 'raw', // use 'raw' for docs/audio/video to keep original files
      public_id: `${Date.now()}-${path.parse(file.originalname).name}`,
      allowed_formats: isImage ? ['jpg', 'jpeg', 'png', 'gif', 'webp'] : undefined
    };
  }
});

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

module.exports = upload;
