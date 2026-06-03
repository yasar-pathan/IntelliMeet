const fs = require('fs').promises;
const path = require('path');
const s3Service = require('./s3.service');
const logger = require('../utils/logger');

const useLocalOnly = () =>
  process.env.RECORDING_STORAGE === 'local' || process.env.RECORDING_STORAGE === 'disk';

const isS3Configured = () =>
  !useLocalOnly() &&
  Boolean(
    process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME
  );

const allowLocalFallback = () => process.env.RECORDING_FALLBACK_LOCAL !== 'false';

const getLocalFilePath = (key) => path.join(process.cwd(), 'uploads', key);

const saveLocal = async (fileBuffer, key) => {
  const localPath = getLocalFilePath(key);
  await fs.mkdir(path.dirname(localPath), { recursive: true });
  await fs.writeFile(localPath, fileBuffer);
  logger.info(`Recording saved locally: ${key}`);
  return { storage: 'local', s3Url: null, s3Key: key };
};

/**
 * Persist meeting recording to S3 when configured, otherwise local disk (dev).
 */
const saveRecording = async (fileBuffer, key, mimeType) => {
  if (isS3Configured()) {
    try {
      const s3Url = await s3Service.uploadFile(fileBuffer, key, mimeType);
      return { storage: 's3', s3Url, s3Key: key };
    } catch (err) {
      logger.error(`S3 recording upload failed: ${err.message}`);
      if (!allowLocalFallback()) {
        throw err;
      }
      logger.warn('Falling back to local disk storage for this recording');
      return saveLocal(fileBuffer, key);
    }
  }

  return saveLocal(fileBuffer, key);
};

const getApiBase = () =>
  process.env.API_PUBLIC_URL || `http://localhost:${process.env.PORT || 5000}/api/v1`;

/**
 * Resolve a URL the client can use for playback (presigned S3 or authenticated stream path).
 */
const getPlaybackUrl = async (meetingId, s3Key) => {
  if (await localFileExists(s3Key)) {
    return `${getApiBase()}/meetings/${meetingId}/recording/stream`;
  }

  if (isS3Configured()) {
    return s3Service.generatePresignedDownloadUrl(s3Key, 3600);
  }

  return `${getApiBase()}/meetings/${meetingId}/recording/stream`;
};

const getStorageType = async (s3Key) => {
  if (await localFileExists(s3Key)) {
    return 'local';
  }
  return isS3Configured() ? 's3' : 'local';
};

const resolveLocalFilePath = (s3Key) => getLocalFilePath(s3Key);

const localFileExists = async (s3Key) => {
  try {
    await fs.access(getLocalFilePath(s3Key));
    return true;
  } catch {
    return false;
  }
};

module.exports = {
  isS3Configured,
  saveRecording,
  getPlaybackUrl,
  getStorageType,
  resolveLocalFilePath,
  localFileExists,
};
