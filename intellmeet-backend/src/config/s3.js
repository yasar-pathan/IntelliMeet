const { S3Client, GetBucketLocationCommand } = require('@aws-sdk/client-s3');
const logger = require('../utils/logger');

const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

let activeRegion = process.env.AWS_S3_REGION || process.env.AWS_REGION || 'ap-south-1';
let s3Client = null;
let regionResolved = false;

if (!accessKeyId || !secretAccessKey) {
  logger.warn('AWS credentials are not fully configured. S3 operations will fail.');
}

const buildClient = (region) => {
  const config = {
    region,
    credentials: {
      accessKeyId: accessKeyId || 'mock',
      secretAccessKey: secretAccessKey || 'mock',
    },
    followRegionRedirects: true,
  };

  if (process.env.AWS_S3_ENDPOINT) {
    config.endpoint = process.env.AWS_S3_ENDPOINT;
    config.forcePathStyle = process.env.AWS_S3_FORCE_PATH_STYLE === 'true';
  }

  return new S3Client(config);
};

const mapBucketLocation = (locationConstraint) => {
  if (!locationConstraint) return 'us-east-1';
  if (locationConstraint === 'EU') return 'eu-west-1';
  return locationConstraint;
};

/**
 * Detect the real AWS region for the configured bucket (fixes endpoint mismatch errors).
 */
const resolveBucketRegion = async (bucketName) => {
  const probeClient = buildClient('us-east-1');
  const result = await probeClient.send(new GetBucketLocationCommand({ Bucket: bucketName }));
  return mapBucketLocation(result.LocationConstraint);
};

const ensureClientRegion = async () => {
  if (regionResolved) return s3Client;

  s3Client = buildClient(activeRegion);

  if (process.env.AWS_S3_REGION) {
    regionResolved = true;
    return s3Client;
  }

  const bucketName = process.env.AWS_S3_BUCKET_NAME;
  if (!bucketName || !accessKeyId || !secretAccessKey) {
    regionResolved = true;
    return s3Client;
  }

  try {
    const bucketRegion = await resolveBucketRegion(bucketName);
    if (bucketRegion !== activeRegion) {
      logger.info(`S3 bucket "${bucketName}" is in ${bucketRegion} (env had ${activeRegion}). Using correct region.`);
      activeRegion = bucketRegion;
      s3Client = buildClient(activeRegion);
    }
  } catch (err) {
    logger.warn(`Could not auto-detect S3 bucket region: ${err.message}`);
  }

  regionResolved = true;
  return s3Client;
};

const getS3Client = async () => {
  if (!s3Client) {
    s3Client = buildClient(activeRegion);
  }
  await ensureClientRegion();
  return s3Client;
};

const getActiveRegion = () => activeRegion;

module.exports = {
  getS3Client,
  getActiveRegion,
  resolveBucketRegion,
};
