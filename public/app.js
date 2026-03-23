const postForm = document.getElementById("postForm");
const typeFilter = document.getElementById("typeFilter");
const sortFilter = document.getElementById("sortFilter");
const refreshButton = document.getElementById("refreshButton");
const postsContainer = document.getElementById("postsContainer");
const formMessage = document.getElementById("formMessage");
const listMessage = document.getElementById("listMessage");
const postsSummary = document.getElementById("postsSummary");
const dateInput = document.getElementById("date");
const contactModal = document.getElementById("contactModal");
const contactForm = document.getElementById("contactForm");
const contactFormMessage = document.getElementById("contactFormMessage");
const senderEmailInput = document.getElementById("senderEmail");
const contactMessageInput = document.getElementById("contactMessage");
const contactModalSubtitle = document.getElementById("contactModalSubtitle");
const closeContactModalButton = document.getElementById("closeContactModal");
const cancelContactButton = document.getElementById("cancelContactButton");

const CONTACT_EMAIL_STORAGE_KEY = "lost-found-contact-email";

let activeContactPost = null;

dateInput.value = new Date().toISOString().split("T")[0];
senderEmailInput.value = window.localStorage.getItem(CONTACT_EMAIL_STORAGE_KEY) || "";

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
}

function hideMessage(element) {
  element.textContent = "";
  element.className = "message hidden";
}

function buildMailtoLink(post, senderEmail, message) {
  const subject = `Inquiry about your ${post.type} item post`;
  const body = [
    `Hi, I am contacting you about your post for ${post.title}.`,
    "",
    message,
    "",
    `Reply to: ${senderEmail}`
  ].join("\n");

  return `mailto:${post.ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function formatPostType(type) {
  return type === "lost" ? "Lost" : "Found";
}

function createInfoRow(label, value) {
  const row = document.createElement("p");
  const strong = document.createElement("strong");

  strong.textContent = `${label}: `;
  row.appendChild(strong);
  row.append(value);

  return row;
}

function renderEmptyState(message) {
  postsContainer.innerHTML = "";

  const emptyState = document.createElement("div");
  emptyState.className = "empty-state";

  const title = document.createElement("h3");
  title.textContent = "No posts to show";

  const text = document.createElement("p");
  text.textContent = message;

  emptyState.append(title, text);
  postsContainer.appendChild(emptyState);
}

function openContactModal(post) {
  activeContactPost = post;
  contactForm.reset();
  hideMessage(contactFormMessage);

  const savedEmail = window.localStorage.getItem(CONTACT_EMAIL_STORAGE_KEY) || "";
  senderEmailInput.value = savedEmail;
  contactMessageInput.value = `Hi, I am contacting you about your post for ${post.title}.`;
  contactModalSubtitle.textContent = `This will create an email draft to ${post.ownerEmail}.`;
  contactModal.classList.remove("hidden");
  senderEmailInput.focus();
}

function closeContactModal() {
  activeContactPost = null;
  contactForm.reset();
  hideMessage(contactFormMessage);
  contactModal.classList.add("hidden");
}

function renderPosts(posts) {
  postsContainer.innerHTML = "";
  postsSummary.textContent = `${posts.length} post${posts.length === 1 ? "" : "s"}`;

  if (!posts.length) {
    renderEmptyState("Try changing the filters or create a new post.");
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "post-card";

    const image = document.createElement("img");
    image.className = "post-image";
    image.src = post.imageUrl;
    image.alt = post.title;

    const content = document.createElement("div");
    content.className = "post-content";

    const title = document.createElement("h3");
    title.className = "post-title";
    title.textContent = post.title;

    const badge = document.createElement("span");
    badge.className = `type-badge ${post.type}`;
    badge.textContent = formatPostType(post.type);

    const description = createInfoRow("Description", post.description);
    const location = createInfoRow("Location", post.location);
    const date = createInfoRow("Date", post.date);
    const email = createInfoRow("Owner Email", post.ownerEmail);

    const createdAt = document.createElement("p");
    createdAt.className = "meta-text";
    createdAt.textContent = `Posted on ${new Date(post.createdAt).toLocaleString()}`;

    const actions = document.createElement("div");
    actions.className = "post-actions";

    const contactLink = document.createElement("button");
    contactLink.className = "card-link";
    contactLink.type = "button";
    contactLink.textContent = "Contact Owner";
    contactLink.addEventListener("click", () => openContactModal(post));

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deletePost(post.id));

    actions.append(contactLink, deleteButton);
    content.append(title, badge, description, location, date, email, createdAt, actions);
    card.append(image, content);
    postsContainer.appendChild(card);
  });
}

async function loadPosts() {
  hideMessage(listMessage);

  const params = new URLSearchParams();

  if (typeFilter.value !== "all") {
    params.set("type", typeFilter.value);
  }

  params.set("sort", sortFilter.value);

  try {
    const response = await fetch(`/api/posts?${params.toString()}`);
    const posts = await response.json();

    if (!response.ok) {
      throw new Error(posts.message || "Could not load posts.");
    }

    renderPosts(posts);
  } catch (error) {
    postsSummary.textContent = "";
    renderEmptyState("Posts could not be loaded.");
    showMessage(listMessage, error.message, "error");
  }
}

async function createPost(event) {
  event.preventDefault();
  hideMessage(formMessage);

  const formData = new FormData(postForm);

  try {
    const response = await fetch("/api/posts", {
      method: "POST",
      body: formData
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Could not create post.");
    }

    postForm.reset();
    dateInput.value = new Date().toISOString().split("T")[0];
    showMessage(formMessage, "Post created successfully.", "success");
    await loadPosts();
  } catch (error) {
    showMessage(formMessage, error.message, "error");
  }
}

async function deletePost(postId) {
  const confirmed = window.confirm("Delete this post?");

  if (!confirmed) {
    return;
  }

  hideMessage(listMessage);

  try {
    const response = await fetch(`/api/posts/${postId}`, {
      method: "DELETE"
    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Could not delete post.");
    }

    await loadPosts();
    showMessage(listMessage, "Post deleted successfully.", "success");
  } catch (error) {
    showMessage(listMessage, error.message, "error");
  }
}

function submitContactForm(event) {
  event.preventDefault();

  if (!activeContactPost) {
    showMessage(contactFormMessage, "Please choose a post to contact first.", "error");
    return;
  }

  const senderEmail = senderEmailInput.value.trim();
  const message = contactMessageInput.value.trim();

  if (!senderEmail || !message) {
    showMessage(contactFormMessage, "Please enter your email and a message.", "error");
    return;
  }

  window.localStorage.setItem(CONTACT_EMAIL_STORAGE_KEY, senderEmail);
  window.location.href = buildMailtoLink(activeContactPost, senderEmail, message);
  closeContactModal();
}

postForm.addEventListener("submit", createPost);
typeFilter.addEventListener("change", loadPosts);
sortFilter.addEventListener("change", loadPosts);
refreshButton.addEventListener("click", loadPosts);
contactForm.addEventListener("submit", submitContactForm);
closeContactModalButton.addEventListener("click", closeContactModal);
cancelContactButton.addEventListener("click", closeContactModal);
contactModal.addEventListener("click", (event) => {
  if (event.target.dataset.closeModal === "true") {
    closeContactModal();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !contactModal.classList.contains("hidden")) {
    closeContactModal();
  }
});

loadPosts();
