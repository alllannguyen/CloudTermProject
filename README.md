# Lost & Found Board

A very simple local full-stack web app for a school cloud project idea. This version is intentionally beginner-friendly and runs only on your computer using Node.js, Express, plain HTML/CSS/JavaScript, a local JSON file, and a local `uploads/` folder.

## Features

- Create a lost or found item post
- Upload an image locally with `multer`
- View all posts on the home page
- Filter by all, lost, or found
- Sort by newest or oldest
- Contact the post owner with a `mailto:` link
- Delete a post
- Persist post data in `data/posts.json`

## Project Structure

```text
LostFoundBoard/
├── data/
│   └── posts.json
├── public/
│   ├── app.js
│   ├── index.html
│   └── style.css
├── uploads/
│   ├── sample-umbrella.svg
│   └── sample-water-bottle.svg
├── package.json
├── README.md
└── server.js
```

## Tech Stack

- Frontend: HTML, CSS, JavaScript
- Backend: Node.js + Express
- File upload: Multer
- Storage: local JSON file and local image uploads

## Setup Instructions

1. Open a terminal in the project folder.
2. Run `npm install`
3. Run `npm start`
4. Open your browser and go to `http://localhost:3000`

## How It Works

- The frontend is served from the `public/` folder.
- The backend API is handled in `server.js`.
- Uploaded images are saved in the local `uploads/` folder.
- Posts are stored in `data/posts.json`.
- The app loads and updates posts using `fetch()` without a full page reload.

## API Routes

- `GET /api/posts`
- `GET /api/posts?type=lost`
- `GET /api/posts?type=found`
- `GET /api/posts?sort=newest`
- `GET /api/posts?sort=oldest`
- `POST /api/posts`
- `DELETE /api/posts/:id`

## Required Post Fields

Each post includes:

- `type` (`lost` or `found`)
- `title`
- `image`
- `description`
- `location`
- `date`
- `ownerEmail`
- `id`
- `createdAt`

## Why `mailto:` Is Used Instead of Real Email

This project is a local-only demo, so it does not use any real email service. The "Contact Owner" button opens the user's default email client with a prefilled subject and message using a `mailto:` link. This keeps the app simple and avoids adding cloud services or email provider setup for the local version.

## How This Could Later Be Adapted to AWS

This local version could later be expanded into a cloud version by replacing the JSON file and local uploads with managed cloud services. For example:

- Store post data in a database service instead of `data/posts.json`
- Store uploaded images in cloud object storage instead of `uploads/`
- Send real contact emails through an email service instead of `mailto:`
- Deploy the Express app to a cloud hosting platform

This repository does not include any AWS code because the goal here is to keep the project local, simple, and easy to explain in a class demo.

## Notes

- Sample posts are included in `data/posts.json`.
- Sample images are included in `uploads/`.
- Deleting a post also removes its saved image file from the local uploads folder.
