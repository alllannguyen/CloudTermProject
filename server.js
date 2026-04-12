require("dotenv").config();

const express = require("express");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

const { createPost, deletePost, listPosts, getPost } = require("./src/services/postStore");
const { deleteImage, uploadImage } = require("./src/services/imageStore");
const { sendContactEmail, isEmailConfigured } = require("./src/services/emailService");
const {
  buildPostFromRequest,
  formatValidationErrors,
  validateContactRequest,
  validatePostImage
} = require("./src/validation");

const app = express();
const PORT = process.env.PORT || 3000;
const publicDirectory = path.join(__dirname, "public");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024
  },
  fileFilter: (_request, file, callback) => {
    if (file.mimetype && file.mimetype.startsWith("image/")) {
      callback(null, true);
      return;
    }

    callback(new Error("Please upload an image file."));
  }
});

function normalizeOrigin(origin) {
  const trimmedOrigin = (origin || "").trim().replace(/\/$/, "");

  if (!trimmedOrigin) {
    return "";
  }

  try {
    return new URL(trimmedOrigin).origin;
  } catch (_error) {
    return trimmedOrigin;
  }
}

function getAllowedOrigins() {
  const configuredOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";
  return configuredOrigin
    .split(",")
    .map(normalizeOrigin)
    .filter(Boolean);
}

function isSameHostRequest(origin, request) {
  const requestHost = request.get("host");

  if (!origin || !requestHost) {
    return false;
  }

  try {
    return new URL(origin).host === requestHost;
  } catch (_error) {
    return false;
  }
}

const corsOptions = (request, callback) => {
  callback(null, {
    origin(origin, originCallback) {
      const allowedOrigins = getAllowedOrigins();
      const normalizedOrigin = normalizeOrigin(origin);

      // Requests from the same Express server, curl, or health checks usually do not send an Origin header.
      if (
        !origin ||
        allowedOrigins.includes("*") ||
        allowedOrigins.includes(normalizedOrigin) ||
        isSameHostRequest(origin, request)
      ) {
        originCallback(null, true);
        return;
      }

      originCallback(new Error("This frontend origin is not allowed by CORS."));
    }
  });
};

app.use(cors(corsOptions));
app.use(express.json({ limit: "25kb" }));
app.use(express.static(publicDirectory));

app.get("/api/health", (_request, response) => {
  response.json({
    status: "ok",
    storage: "dynamodb-s3",
    emailConfigured: isEmailConfigured()
  });
});

app.get("/api/posts", async (request, response) => {
  try {
    const posts = await listPosts({
      type: request.query.type,
      sort: request.query.sort
    });

    response.json(posts);
  } catch (error) {
    console.error("Could not load posts:", error);
    response.status(500).json({ message: "Could not load posts." });
  }
});

app.post("/api/posts", upload.single("image"), async (request, response) => {
  const newPost = buildPostFromRequest(request.body);
  const validationErrors = formatValidationErrors(newPost);
  const imageError = validatePostImage(request.file);
  let uploadedImageKey = "";

  if (imageError) {
    validationErrors.push(imageError);
  }

  if (validationErrors.length > 0) {
    response.status(400).json({ message: validationErrors[0], errors: validationErrors });
    return;
  }

  try {
    const image = await uploadImage({
      file: request.file,
      postId: newPost.id
    });
    uploadedImageKey = image.key;

    const savedPost = {
      ...newPost,
      imageKey: image.key,
      imageUrl: image.url
    };

    await createPost(savedPost);
    response.status(201).json(savedPost);
  } catch (error) {
    if (uploadedImageKey) {
      await deleteImage(uploadedImageKey);
    }

    console.error("Could not save post:", error);
    response.status(500).json({ message: "Could not save the post." });
  }
});

app.post("/api/posts/:id/contact", async (request, response) => {
  const contactRequest = request.body || {};
  const validationErrors = validateContactRequest(contactRequest);

  if (validationErrors.length > 0) {
    response.status(400).json({ message: validationErrors[0], errors: validationErrors });
    return;
  }

  if (!isEmailConfigured()) {
    response.status(503).json({
      message: "Email service is not configured yet.",
      fallback: "mailto"
    });
    return;
  }

  try {
    const post = await getPost(request.params.id);

    if (!post) {
      response.status(404).json({ message: "Post not found." });
      return;
    }

    await sendContactEmail({
      post,
      senderEmail: contactRequest.senderEmail,
      message: contactRequest.message
    });

    response.json({ message: "Contact email sent successfully." });
  } catch (error) {
    console.error("Could not send contact email:", error);
    response.status(502).json({
      message: "Could not send the contact email. SES may still be in sandbox mode.",
      fallback: "mailto"
    });
  }
});

app.delete("/api/posts/:id", async (request, response) => {
  try {
    const deletedPost = await deletePost(request.params.id);

    if (!deletedPost) {
      response.status(404).json({ message: "Post not found." });
      return;
    }

    await deleteImage(deletedPost.imageKey);
    response.json({ message: "Post deleted successfully." });
  } catch (error) {
    console.error("Could not delete post:", error);
    response.status(500).json({ message: "Could not delete the post." });
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    response.status(400).json({ message: "Image must be 5 MB or smaller." });
    return;
  }

  if (error && error.message && error.message.includes("CORS")) {
    response.status(403).json({ message: error.message });
    return;
  }

  if (error) {
    response.status(400).json({ message: error.message || "Something went wrong." });
    return;
  }

  response.status(500).json({ message: "Unexpected server error." });
});

app.listen(PORT, (error) => {
  if (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }

  console.log(`Lost & Found Board API is running on http://localhost:${PORT}`);
});
