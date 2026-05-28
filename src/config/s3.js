const { S3Client } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');

const region = process.env.AWS_REGION || 'ap-south-1';
const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

if (!accessKeyId || !secretAccessKey) {
  logger.warn('AWS credentials are not fully configured. S3 operations will fail.');
}

const s3Client = new S3Client({
  region,
  credentials: {
    accessKeyId: accessKeyId || 'mock',
    secretAccessKey: secretAccessKey || 'mock'
  }
});

module.exports = s3Client;
