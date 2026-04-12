const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { S3Client } = require("@aws-sdk/client-s3");
const { SESClient } = require("@aws-sdk/client-ses");

function getAwsRegion() {
  if (!process.env.AWS_REGION) {
    throw new Error("AWS_REGION is required.");
  }

  return process.env.AWS_REGION;
}

const region = getAwsRegion();

const dynamoDbClient = DynamoDBDocumentClient.from(
  new DynamoDBClient({
    region
  })
);

const s3Client = new S3Client({
  region
});

const sesClient = new SESClient({
  region: process.env.SES_REGION || region
});

module.exports = {
  dynamoDbClient,
  s3Client,
  sesClient
};
