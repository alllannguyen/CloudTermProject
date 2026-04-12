const crypto = require("crypto");

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const allowedImageTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/svg+xml", "image/webp"]);

function getTrimmedValue(value) {
  return typeof value === "string" ? value.trim() : "";
}

function buildPostFromRequest(body = {}) {
  return {
    id: crypto.randomUUID(),
    type: getTrimmedValue(body.type).toLowerCase(),
    title: getTrimmedValue(body.title),
    imageKey: "",
    imageUrl: "",
    description: getTrimmedValue(body.description),
    location: getTrimmedValue(body.location),
    date: getTrimmedValue(body.date),
    ownerEmail: getTrimmedValue(body.ownerEmail).toLowerCase(),
    createdAt: new Date().toISOString()
  };
}

function isValidDateString(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsedDate.getTime());
}

function formatValidationErrors(post) {
  const errors = [];

  if (!["lost", "found"].includes(post.type)) {
    errors.push("Post type must be lost or found.");
  }

  if (!post.title || post.title.length > 120) {
    errors.push("Title is required and must be 120 characters or fewer.");
  }

  if (!post.description || post.description.length > 1000) {
    errors.push("Description is required and must be 1000 characters or fewer.");
  }

  if (!post.location || post.location.length > 160) {
    errors.push("Location is required and must be 160 characters or fewer.");
  }

  if (!isValidDateString(post.date)) {
    errors.push("Please provide a valid date.");
  }

  if (!post.ownerEmail || !emailPattern.test(post.ownerEmail) || post.ownerEmail.length > 254) {
    errors.push("Please provide a valid owner email address.");
  }

  return errors;
}

function validatePostImage(file) {
  if (!file) {
    return "An image is required.";
  }

  if (!allowedImageTypes.has(file.mimetype)) {
    return "Please upload a PNG, JPG, GIF, SVG, or WebP image.";
  }

  return "";
}

function validateContactRequest(body = {}) {
  const senderEmail = getTrimmedValue(body.senderEmail).toLowerCase();
  const message = getTrimmedValue(body.message);
  const errors = [];

  if (!senderEmail || !emailPattern.test(senderEmail) || senderEmail.length > 254) {
    errors.push("Please provide a valid sender email address.");
  }

  if (message.length > 1000) {
    errors.push("Message must be 1000 characters or fewer.");
  }

  body.senderEmail = senderEmail;
  body.message = message;

  return errors;
}

module.exports = {
  buildPostFromRequest,
  formatValidationErrors,
  validateContactRequest,
  validatePostImage
};
