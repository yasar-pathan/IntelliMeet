const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const logger = require('../utils/logger');

const bucketName = process.env.AWS_S3_BUCKET_NAME || 'intellmeet-recordings';

/**
 * Uploads a file buffer directly to S3.
 * @param {Buffer} fileBuffer - File buffer
 * @param {string} key - File path key in S3
 * @param {string} mimeType - File MIME type
 * @returns {Promise<string>} Public URL of the uploaded resource
 */
const uploadFile = async (fileBuffer, key, mimeType) => {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: fileBuffer,
      ContentType: mimeType
    });

    await s3Client.send(command);
    
    // Generate S3 object URL
    const region = process.env.AWS_REGION || 'ap-south-1';
    const s3Url = `https://${bucketName}.s3.${region}.amazonaws.com/${key}`;
    logger.info(`File uploaded to S3: ${key}`);
    return s3Url;
  } catch (error) {
    logger.error(`S3 upload error for key ${key}: ${error.message}`);
    throw error;
  }
};

/**
 * Generates a presigned upload (PUT) URL for frontend client uploads.
 * @param {string} key - Target S3 key
 * @param {number} expiresSeconds - Expiration time in seconds (default 1h)
 * @returns {Promise<string>} Presigned URL string
 */
const generatePresignedUploadUrl = async (key, expiresSeconds = 3600) => {
  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key
    });
    
    // Generate signed URL
    const url = await getSignedUrl(s3Client, command, { expiresIn: expiresSeconds });
    logger.info(`Presigned upload URL generated for key: ${key}`);
    return url;
  } catch (error) {
    logger.error(`Error generating S3 presigned upload URL for ${key}: ${error.message}`);
    throw error;
  }
};

/**
 * Generates a presigned download (GET) URL for secured resource retrieval.
 * @param {string} key - Target S3 key
 * @param {number} expiresSeconds - Expiration time in seconds (default 1h)
 * @returns {Promise<string>} Presigned URL string
 */
const generatePresignedDownloadUrl = async (key, expiresSeconds = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: expiresSeconds });
    logger.info(`Presigned download URL generated for key: ${key}`);
    return url;
  } catch (error) {
    logger.error(`Error generating S3 presigned download URL for ${key}: ${error.message}`);
    throw error;
  }
};

/**
 * Deletes a file from the S3 bucket.
 * @param {string} key - S3 key
 * @returns {Promise<boolean>} Success state
 */
const deleteFile = async (key) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucketName,
      Key: key
    });

    await s3Client.send(command);
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
  deleteFile
};
