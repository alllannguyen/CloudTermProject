const path = require("path");

const { DeleteObjectCommand, PutObjectCommand } = require("@aws-sdk/client-s3");

const { s3Client } = require("../awsClients");

const allowedExtensionsByMimeType = {
  "image/gif": ".gif",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/svg+xml": ".svg",
  "image/webp": ".webp"
};

function getUploadsBucketName() {
  if (!process.env.UPLOADS_BUCKET_NAME) {
    throw new Error("UPLOADS_BUCKET_NAME is required.");
  }

  return process.env.UPLOADS_BUCKET_NAME;
}

function getSafeExtension(file) {
  const extensionFromMimeType = allowedExtensionsByMimeType[file.mimetype];

  if (extensionFromMimeType) {
    return extensionFromMimeType;
  }

  const extensionFromName = path.extname(file.originalname || "").toLowerCase();
  return extensionFromName || ".img";
}

function encodeS3Key(key) {
  return key
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");
}

function buildPublicImageUrl(key) {
  if (process.env.UPLOADS_PUBLIC_BASE_URL) {
    return `${process.env.UPLOADS_PUBLIC_BASE_URL.replace(/\/$/, "")}/${encodeS3Key(key)}`;
  }

  const region = process.env.AWS_REGION;
  const bucketName = getUploadsBucketName();
  return `https://${bucketName}.s3.${region}.amazonaws.com/${encodeS3Key(key)}`;
}

async function uploadImage({ file, postId }) {
  const timestamp = Date.now();
  const extension = getSafeExtension(file);
  const key = `posts/${postId}-${timestamp}${extension}`;

  await s3Client.send(
    new PutObjectCommand({
      Bucket: getUploadsBucketName(),
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      CacheControl: "public, max-age=31536000"
    })
  );

  return {
    key,
    url: buildPublicImageUrl(key)
  };
}

async function deleteImage(key) {
  if (!key) {
    return;
  }

  try {
    await s3Client.send(
      new DeleteObjectCommand({
        Bucket: getUploadsBucketName(),
        Key: key
      })
    );
  } catch (error) {
    // A missing image should not prevent the post itself from being deleted.
    console.error(`Could not delete S3 image ${key}:`, error);
  }
}

module.exports = {
  deleteImage,
  uploadImage
};
