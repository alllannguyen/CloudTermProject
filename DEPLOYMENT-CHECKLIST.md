# Deployment Checklist

## Before AWS Setup

- Choose one AWS region, for example `us-west-2`.
- Choose unique bucket names for frontend and uploads.
- Keep frontend and uploaded images in separate S3 buckets.
- Do not create AWS credentials in frontend JavaScript.

## AWS Resources

- DynamoDB table created.
- Table name saved for `POSTS_TABLE_NAME`.
- Table partition key is `id` with type String.
- Uploads S3 bucket created for user images only.
- Uploads bucket allows public `s3:GetObject` for `posts/*`.
- Frontend S3 bucket created for static website files only.
- Static website hosting enabled with `index.html`.
- Frontend bucket allows public `s3:GetObject` for website files.
- SES sender identity verified.
- Demo recipient emails verified too if SES is still in sandbox.
- Elastic Beanstalk Node.js web server environment created.
- Elastic Beanstalk EC2 instance role identified.
- IAM policy attached for DynamoDB, S3 uploads bucket, and SES send access.

## Backend Environment Variables

- `AWS_REGION`
- `POSTS_TABLE_NAME`
- `UPLOADS_BUCKET_NAME`
- `FRONTEND_ORIGIN`
- `SES_FROM_EMAIL`
- `SES_REGION` if SES uses a different region

## Backend Deployment

- Run `npm install`.
- Run `npm run check`.
- Build a zip from inside `CloudTermProject/`.
- Confirm `package.json` is at the zip root.
- Exclude `node_modules/`, `.env`, `.git/`, `data/`, `uploads/`, and old zip files.
- Upload the backend zip to Elastic Beanstalk.
- Open `/api/health` on the Elastic Beanstalk URL.

## Frontend Deployment

- Set `public/config.js` `API_BASE_URL` to the Elastic Beanstalk URL.
- Upload `index.html`, `style.css`, `app.js`, and `config.js` to the frontend S3 bucket.
- Set Elastic Beanstalk `FRONTEND_ORIGIN` to the frontend S3 website endpoint.
- Open the S3 website endpoint.

## Verification

- Create a post with one image.
- Confirm the post appears in the UI.
- Confirm the DynamoDB item has `id`, `type`, `title`, `imageKey`, `imageUrl`, `description`, `location`, `date`, `ownerEmail`, and `createdAt`.
- Confirm the uploaded image object appears under `posts/` in the uploads bucket.
- Confirm image URLs render in the browser.
- Filter by lost and found.
- Sort newest and oldest.
- Send a contact email or confirm the `mailto:` fallback if SES sandbox blocks the send.
- Delete the post.
- Confirm the DynamoDB item is deleted.
- Confirm the S3 image object is deleted.
