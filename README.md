# Lost & Found Board

Lost & Found Board is a beginner-friendly full-stack school demo that is now prepared for AWS deployment.

The original version stored posts in `data/posts.json`, saved uploaded images in `uploads/`, and used `mailto:` for contact links. This version keeps the same plain HTML/CSS/JavaScript UI and Express API shape, but moves the deployed data path to AWS services:

- Static frontend files go in one Amazon S3 website bucket.
- Uploaded item images go in a separate Amazon S3 bucket.
- Post metadata goes in DynamoDB.
- Contact-owner emails are sent through Amazon SES, with a `mailto:` fallback when SES is not configured or still blocked by sandbox limits.
- The backend runs as a Node.js app on AWS Elastic Beanstalk.

The old `data/` and `uploads/` folders can remain in the local project for reference, but the deployed app no longer reads or writes them.

## Architecture Summary

```text
Browser
  -> Frontend S3 static website bucket: index.html, style.css, app.js, config.js
  -> Elastic Beanstalk backend: Express API
      -> DynamoDB table: post metadata
      -> Uploads S3 bucket: item images
      -> Amazon SES: contact-owner email
```

There is no CDK, Terraform, CloudFormation, SAM, or provisioning script in this project. Create the AWS resources manually in the AWS Console.

Useful AWS docs:

- S3 static website hosting: https://docs.aws.amazon.com/AmazonS3/latest/userguide/WebsiteHosting.html
- S3 CORS configuration: https://docs.aws.amazon.com/AmazonS3/latest/userguide/enabling-cors-examples.html
- DynamoDB getting started: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GettingStartedDynamoDB.html
- Elastic Beanstalk Node.js: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/create_deploy_nodejs_express.html
- Elastic Beanstalk environment properties: https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-softwaresettings.html
- SES sandbox: https://docs.aws.amazon.com/ses/latest/dg/request-production-access.html

## Project Structure

```text
CloudTermProject/
├── public/
│   ├── app.js
│   ├── config.js
│   ├── index.html
│   └── style.css
├── src/
│   ├── awsClients.js
│   ├── validation.js
│   └── services/
│       ├── emailService.js
│       ├── imageStore.js
│       └── postStore.js
├── .env.example
├── .ebignore
├── package.json
├── package-lock.json
├── Procfile
├── README.md
└── server.js
```

## API Routes

- `GET /api/health`
- `GET /api/posts`
- `GET /api/posts?type=lost`
- `GET /api/posts?type=found`
- `GET /api/posts?sort=newest`
- `GET /api/posts?sort=oldest`
- `POST /api/posts`
- `POST /api/posts/:id/contact`
- `DELETE /api/posts/:id`

## DynamoDB Table Schema

Create one DynamoDB table for post metadata.

- Table name: your choice, for example `LostFoundPosts`
- Partition key: `id`
- Partition key type: String
- Sort key: none
- Capacity mode: On-demand is easiest for a demo

Each item created by the app includes:

- `id`
- `type`
- `title`
- `imageKey`
- `imageUrl`
- `description`
- `location`
- `date`
- `ownerEmail`
- `createdAt`

## Environment Variables

Use these in your local `.env` file and in Elastic Beanstalk environment properties:

```bash
PORT=3000
AWS_REGION=us-west-2
POSTS_TABLE_NAME=LostFoundPosts
UPLOADS_BUCKET_NAME=your-lost-found-uploads-bucket
FRONTEND_ORIGIN=http://localhost:3000
SES_FROM_EMAIL=verified-sender@example.com
SES_REGION=us-west-2
```

Notes:

- Do not hardcode AWS access keys in the project.
- In Elastic Beanstalk, the backend should use the environment's EC2 instance role for AWS permissions.
- `FRONTEND_ORIGIN` must match the S3 static website origin after deployment, for example `http://your-frontend-bucket.s3-website-us-west-2.amazonaws.com`.
- `SES_REGION` is optional when SES uses the same region as `AWS_REGION`.
- `UPLOADS_PUBLIC_BASE_URL` is optional if you later serve images through CloudFront or a custom URL.

## Manual AWS Console Setup

### 1. Create the DynamoDB table

1. Open the AWS Console.
2. Go to DynamoDB.
3. Choose Tables, then Create table.
4. Table name: `LostFoundPosts` or your preferred name.
5. Partition key: `id`.
6. Type: String.
7. Leave sort key disabled.
8. Choose On-demand capacity for a simple demo.
9. Create the table.

Set `POSTS_TABLE_NAME` to this table name.

### 2. Create the uploads S3 bucket

1. Go to S3.
2. Create a bucket for uploaded images only, for example `your-name-lost-found-uploads`.
3. Use the same region as `AWS_REGION`.
4. Keep Object Ownership as Bucket owner enforced.
5. For a simple direct-image demo, disable Block all public access for this bucket and acknowledge the warning.
6. Create the bucket.

Add a bucket policy that allows public read for image objects under `posts/`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReadForUploadedPostImages",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-name-lost-found-uploads/posts/*"
    }
  ]
}
```

The backend uploads objects with keys like `posts/{postId}-{timestamp}.jpg`. It never uses user-provided filenames as final S3 keys.

Uploads bucket CORS is not required for normal `<img>` display because the browser is not directly uploading or reading image bytes with JavaScript. If your browser demo needs CORS for images, add this CORS configuration to the uploads bucket:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["GET", "HEAD"],
    "AllowedOrigins": ["http://your-frontend-bucket.s3-website-us-west-2.amazonaws.com"],
    "ExposeHeaders": []
  }
]
```

Set `UPLOADS_BUCKET_NAME` to this bucket name.

### 3. Create the frontend S3 static website bucket

1. Go to S3.
2. Create a separate bucket for static website files only, for example `your-name-lost-found-frontend`.
3. Open the bucket, then Properties.
4. Enable Static website hosting.
5. Hosting type: Host a static website.
6. Index document: `index.html`.
7. Save the website hosting settings.
8. In Permissions, disable Block all public access for this bucket and acknowledge the warning.
9. Add a bucket policy for public read of the website files:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowPublicReadForStaticWebsite",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::your-name-lost-found-frontend/*"
    }
  ]
}
```

Upload only these files from `public/` to this frontend bucket:

- `index.html`
- `style.css`
- `app.js`
- `config.js`

Do not upload backend files, `.env`, `node_modules/`, or uploaded user images to the frontend bucket.

### 4. Verify the SES sender identity

1. Go to Amazon SES.
2. Make sure you are in the SES region you will use, for example `us-west-2`.
3. Go to Verified identities.
4. Create identity.
5. Choose Email address for the simplest demo.
6. Enter the email address that will be used as `SES_FROM_EMAIL`.
7. Open the verification email and confirm it.

SES sandbox limitation:

- In the SES sandbox, you can only send from verified identities to verified recipient addresses.
- For a class demo, either verify the demo owner email addresses too or request production access in SES.
- If SES rejects the email because of sandbox limits, the frontend falls back to opening the old `mailto:` flow.

### 5. Create the Elastic Beanstalk backend

1. Go to Elastic Beanstalk.
2. Choose Create application.
3. Application name: `lost-found-board`.
4. Platform: Node.js.
5. Application code: upload your backend source bundle after you create it in the packaging step below.
6. Create a web server environment.
7. Let Elastic Beanstalk create or use an EC2 instance role.
8. Finish environment creation.

The app listens on `process.env.PORT`, which Elastic Beanstalk provides.

### 6. Attach IAM permissions to the Elastic Beanstalk EC2 instance role

Find the EC2 instance profile role used by your Elastic Beanstalk environment, then attach a policy like this. Replace region, account ID, table name, bucket name, and SES identity values.

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "LostFoundDynamoDbAccess",
      "Effect": "Allow",
      "Action": [
        "dynamodb:DeleteItem",
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Scan"
      ],
      "Resource": "arn:aws:dynamodb:us-west-2:123456789012:table/LostFoundPosts"
    },
    {
      "Sid": "LostFoundUploadsBucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:DeleteObject",
        "s3:PutObject"
      ],
      "Resource": "arn:aws:s3:::your-name-lost-found-uploads/posts/*"
    },
    {
      "Sid": "LostFoundSesSendAccess",
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "arn:aws:ses:us-west-2:123456789012:identity/verified-sender@example.com"
    }
  ]
}
```

### 7. Configure Elastic Beanstalk environment variables

In Elastic Beanstalk:

1. Open your environment.
2. Go to Configuration.
3. Edit Software or Environment properties.
4. Add:

```text
AWS_REGION=us-west-2
POSTS_TABLE_NAME=LostFoundPosts
UPLOADS_BUCKET_NAME=your-name-lost-found-uploads
FRONTEND_ORIGIN=http://your-frontend-bucket.s3-website-us-west-2.amazonaws.com
SES_FROM_EMAIL=verified-sender@example.com
SES_REGION=us-west-2
```

You normally do not need to set `PORT` in Elastic Beanstalk.

### 8. Package and deploy the backend

Run this from the `CloudTermProject/` folder:

```bash
npm install
npm run check
zip -r ../lost-found-board-eb.zip . -x "node_modules/*" ".env" ".git/*" "data/*" "uploads/*" "*.zip" "Presentation.pdf"
```

Important: the zip root must contain `package.json`, `server.js`, `src/`, `public/`, and `Procfile`. Do not zip the parent folder itself.

Upload `lost-found-board-eb.zip` to the Elastic Beanstalk environment.

### 9. Update and upload the frontend config

After Elastic Beanstalk finishes deploying, copy the backend environment URL, for example:

```text
http://lost-found-board-env.eba-example.us-west-2.elasticbeanstalk.com
```

Edit `public/config.js`:

```js
window.LOST_FOUND_CONFIG = {
  API_BASE_URL: "http://lost-found-board-env.eba-example.us-west-2.elasticbeanstalk.com"
};
```

Upload the four frontend files from `public/` to the frontend S3 website bucket again.

### 10. Test the deployed app

1. Open the S3 static website endpoint.
2. Create a lost post with an image.
3. Confirm the post appears in the list.
4. Confirm the image URL loads from the uploads S3 bucket.
5. Filter by Lost and Found.
6. Sort newest and oldest.
7. Click Contact Owner.
8. Delete the post.
9. Confirm the DynamoDB item is removed.
10. Confirm the uploaded S3 object is removed from the uploads bucket.

## Local Testing

Local testing now uses the real AWS services too.

1. Install dependencies:

```bash
npm install
```

2. Create a local `.env` from the example and fill in real values:

```bash
cp .env.example .env
```

3. Make sure your local AWS credentials are available through the AWS CLI profile, environment variables, or another standard AWS SDK credential source.
4. Keep `public/config.js` set to an empty API base URL for local same-origin testing:

```js
window.LOST_FOUND_CONFIG = {
  API_BASE_URL: ""
};
```

5. Start the app:

```bash
npm start
```

6. Open `http://localhost:3000`.

## Common Errors and Fixes

- `Could not load posts.`: Check `AWS_REGION`, `POSTS_TABLE_NAME`, and the Elastic Beanstalk instance role permission for `dynamodb:Scan`.
- `Could not save the post.`: Check `UPLOADS_BUCKET_NAME`, S3 `s3:PutObject` permission, DynamoDB `dynamodb:PutItem` permission, and the uploaded file size/type.
- Image is broken in the post card: Check the uploads bucket public read bucket policy and confirm the object exists under `posts/`.
- Browser CORS error: Set `FRONTEND_ORIGIN` to the exact S3 static website origin. Include `http://` and do not add a trailing slash.
- Contact email fails: Verify `SES_FROM_EMAIL`, `SES_REGION`, the SES identity, and sandbox recipient verification. In sandbox mode, the owner email must also be verified.
- Elastic Beanstalk says it cannot find `package.json`: Rebuild the zip so `package.json` is at the zip root.
- App works locally but not in Elastic Beanstalk: Check the environment properties and the EC2 instance profile role. Do not put AWS access keys in frontend JavaScript.

## What to Demo in Class

1. Show the architecture: frontend S3 bucket, uploads S3 bucket, Elastic Beanstalk backend, DynamoDB table, SES.
2. Open the S3 website URL and create a lost or found post with an image.
3. Show the new DynamoDB item with `imageKey` and `imageUrl`.
4. Open the uploads S3 bucket and show the object under `posts/`.
5. Filter and sort posts in the UI.
6. Click Contact Owner and explain SES sandbox verification if the fallback opens.
7. Delete a post and show that both the DynamoDB item and S3 object are removed.

## Security Notes

- The frontend contains only static files and a public backend URL.
- AWS credentials are never stored in frontend code.
- The backend uses AWS SDK v3 and should receive AWS permissions from the Elastic Beanstalk EC2 instance role.
- The uploads bucket is public-read in this simple demo because image URLs are stored in DynamoDB and rendered directly in the browser. For a more production-focused version, put CloudFront in front of the bucket or use private objects with signed URLs.
