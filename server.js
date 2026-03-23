const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const dataDirectory = path.join(__dirname, "data");
const uploadsDirectory = path.join(__dirname, "uploads");
const postsFilePath = path.join(dataDirectory, "posts.json");
const publicDirectory = path.join(__dirname, "public");

async function ensureStorage() {
  await fs.promises.mkdir(dataDirectory, { recursive: true });
  await fs.promises.mkdir(uploadsDirectory, { recursive: true });

  try {
    await fs.promises.access(postsFilePath);
  } catch (error) {
    await fs.promises.writeFile(postsFilePath, "[]");
  }
}

async function readPosts() {
  await ensureStorage();
  const fileContents = await fs.promises.readFile(postsFilePath, "utf-8");

  try {
    const parsedPosts = JSON.parse(fileContents);
    return Array.isArray(parsedPosts) ? parsedPosts : [];
  } catch (error) {
    return [];
  }
}

async function writePosts(posts) {
  await fs.promises.writeFile(postsFilePath, JSON.stringify(posts, null, 2));
}

function getTrimmedValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function removeImageFile(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith("/uploads/")) {
    return;
  }

  const fileName = path.basename(imageUrl);
  const imagePath = path.join(uploadsDirectory, fileName);

  fs.promises.unlink(imagePath).catch(() => {
    // If the image is already missing, we do not need to stop the delete flow.
  });
}

const storage = multer.diskStorage({
  destination: (_request, _file, callback) => {
    callback(null, uploadsDirectory);
  },
  filename: (_request, file, callback) => {
    const extension = path.extname(file.originalname);
    const uniqueName = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    callback(null, uniqueName);
  }
});

const upload = multer({
  storage,
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

app.use(express.json());
app.use(express.static(publicDirectory));
app.use("/uploads", express.static(uploadsDirectory));

app.get("/api/posts", async (request, response) => {
  try {
    let posts = await readPosts();
    const { type, sort = "newest" } = request.query;

    if (type === "lost" || type === "found") {
      posts = posts.filter((post) => post.type === type);
    }

    posts.sort((firstPost, secondPost) => {
      const firstDate = new Date(firstPost.createdAt).getTime();
      const secondDate = new Date(secondPost.createdAt).getTime();

      if (sort === "oldest") {
        return firstDate - secondDate;
      }

      return secondDate - firstDate;
    });

    response.json(posts);
  } catch (error) {
    response.status(500).json({ message: "Could not load posts." });
  }
});

app.post("/api/posts", upload.single("image"), async (request, response) => {
  const type = getTrimmedValue(request.body.type).toLowerCase();
  const title = getTrimmedValue(request.body.title);
  const description = getTrimmedValue(request.body.description);
  const location = getTrimmedValue(request.body.location);
  const date = getTrimmedValue(request.body.date);
  const ownerEmail = getTrimmedValue(request.body.ownerEmail).toLowerCase();

  if (!request.file) {
    response.status(400).json({ message: "An image is required." });
    return;
  }

  if (!["lost", "found"].includes(type)) {
    removeImageFile(`/uploads/${request.file.filename}`);
    response.status(400).json({ message: "Post type must be lost or found." });
    return;
  }

  if (!title || !description || !location || !date || !ownerEmail) {
    removeImageFile(`/uploads/${request.file.filename}`);
    response.status(400).json({ message: "Please fill in all required fields." });
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(ownerEmail)) {
    removeImageFile(`/uploads/${request.file.filename}`);
    response.status(400).json({ message: "Please provide a valid email address." });
    return;
  }

  try {
    const posts = await readPosts();

    const newPost = {
      id: crypto.randomUUID(),
      type,
      title,
      imageUrl: `/uploads/${request.file.filename}`,
      description,
      location,
      date,
      ownerEmail,
      createdAt: new Date().toISOString()
    };

    posts.push(newPost);
    await writePosts(posts);

    response.status(201).json(newPost);
  } catch (error) {
    removeImageFile(`/uploads/${request.file.filename}`);
    response.status(500).json({ message: "Could not save the post." });
  }
});

app.delete("/api/posts/:id", async (request, response) => {
  try {
    const posts = await readPosts();
    const postToDelete = posts.find((post) => post.id === request.params.id);

    if (!postToDelete) {
      response.status(404).json({ message: "Post not found." });
      return;
    }

    const updatedPosts = posts.filter((post) => post.id !== request.params.id);
    await writePosts(updatedPosts);
    removeImageFile(postToDelete.imageUrl);

    response.json({ message: "Post deleted successfully." });
  } catch (error) {
    response.status(500).json({ message: "Could not delete the post." });
  }
});

app.use((error, _request, response, _next) => {
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    response.status(400).json({ message: "Image must be 5 MB or smaller." });
    return;
  }

  if (error) {
    response.status(400).json({ message: error.message || "Something went wrong." });
    return;
  }

  response.status(500).json({ message: "Unexpected server error." });
});

ensureStorage()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Lost & Found Board is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start the server:", error);
  });
