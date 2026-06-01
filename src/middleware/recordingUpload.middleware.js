const multer = require('multer');

const ALLOWED_RECORDING_MIMES = new Set([
  'video/webm',
  'video/mp4',
  'audio/webm',
  'audio/mp4',
  'application/octet-stream',
]);

const ALLOWED_EXTENSIONS = new Set(['webm', 'mp4']);

const normalizeMime = (mimetype) => (mimetype || '').split(';')[0].trim().toLowerCase();

const getExtension = (originalname) => {
  const parts = (originalname || '').split('.');
  return parts.length > 1 ? parts.pop().toLowerCase() : '';
};

const isAllowedRecordingFile = (file) => {
  const mime = normalizeMime(file.mimetype);
  const ext = getExtension(file.originalname);

  if (ALLOWED_RECORDING_MIMES.has(mime)) {
    return true;
  }

  // Browsers often send Blob uploads as text/plain — trust .webm/.mp4 filename
  if (ALLOWED_EXTENSIONS.has(ext)) {
    return true;
  }

  return false;
};

const recordingUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
  fileFilter: (_req, file, cb) => {
    if (isAllowedRecordingFile(file)) {
      return cb(null, true);
    }
    cb(
      new Error(
        `Recording format not allowed (${file.mimetype || 'unknown'}). Upload a .webm or .mp4 file.`
      ),
      false
    );
  },
});

module.exports = recordingUpload;
module.exports.resolveRecordingContentType = (file) => {
  const ext = getExtension(file.originalname);
  if (ext === 'mp4') return 'video/mp4';
  if (ext === 'webm') return 'video/webm';
  const mime = normalizeMime(file.mimetype);
  if (mime.includes('mp4')) return 'video/mp4';
  return 'video/webm';
};
