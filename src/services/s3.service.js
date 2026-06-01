const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { getS3Client, getActiveRegion } = require('../config/s3');
const logger = require('../utils/logger');

const bucketName = process.env.AWS_S3_BUCKET_NAME || 'intellmeet-recordings';

const buildObjectUrl = (key) => {
  const region = getActiveRegion();
  const encodedKey = key.split('/').map(encodeURIComponent).join('/');
  if (region === 'us-east-1') {
    return `https://${bucketName}.s3.amazonaws.com/${encodedKey}`;
  }
  return `https://${bucketName}.s3.${region}.amazonaws.com/${encodedKey}`;
};

/**
 * Uploads a file buffer directly to S3.
 */
const uploadFile = async (fileBuffer, key, mimeType) => {
  try {
    const client = await getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await client.send(command);

    const s3Url = buildObjectUrl(key);
    logger.info(`File uploaded to S3: ${key}`);
    return s3Url;
  } catch (error) {
    logger.error(`S3 upload error for key ${key}: ${error.message}`);
    throw error;
  }
};

const generatePresignedUploadUrl = async (key, expiresSeconds = 3600) => {
  try {
    const client = await getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn: expiresSeconds });
    logger.info(`Presigned upload URL generated for key: ${key}`);
    return url;
  } catch (error) {
    logger.error(`Error generating S3 presigned upload URL for ${key}: ${error.message}`);
    throw error;
  }
};

const generatePresignedDownloadUrl = async (key, expiresSeconds = 3600) => {
  try {
    const client = await getS3Client();
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    const url = await getSignedUrl(client, command, { expiresIn: expiresSeconds });
    logger.info(`Presigned download URL generated for key: ${key}`);
    return url;
  } catch (error) {
    logger.error(`Error generating S3 presigned download URL for ${key}: ${error.message}`);
    throw error;
  }
};

const deleteFile = async (key) => {
  try {
    const client = await getS3Client();
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key,
    });

    await client.send(command);
    logger.info(`File deleted from S3: ${key}`);
    return true;
  } catch (error) {
    logger.error(`S3 deletion error for key ${key}: ${error.message}`);
    throw error;
  }
};

module.exports = {
  uploadFile,
  generatePresignedUploadUrl,
  generatePresignedDownloadUrl,
  deleteFile,
  buildObjectUrl,
};
