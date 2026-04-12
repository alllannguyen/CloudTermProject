const postForm = document.getElementById("postForm");
const typeFilter = document.getElementById("typeFilter");
const sortFilter = document.getElementById("sortFilter");
const refreshButton = document.getElementById("refreshButton");
const postsContainer = document.getElementById("postsContainer");
const formMessage = document.getElementById("formMessage");
const listMessage = document.getElementById("listMessage");
const postsSummary = document.getElementById("postsSummary");
const dateInput = document.getElementById("date");
const appConfig = window.LOST_FOUND_CONFIG || {};
const apiBaseUrl = (appConfig.API_BASE_URL || "").replace(/\/$/, "");

dateInput.value = new Date().toISOString().split("T")[0];

function getApiUrl(path) {
  return `${apiBaseUrl}${path}`;
}

function showMessage(element, text, type) {
  element.textContent = text;
  element.className = `message ${type}`;
}

function hideMessage(element) {
  element.textContent = "";
  element.className = "message hidden";
}

function buildMailtoLink(post) {
  const subject = `Inquiry about your ${post.type} item post`;
  const body = `Hi, I am contacting you about your post for ${post.title}.`;

  return `mailto:${post.ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function openMailFallback(post) {
  window.location.href = buildMailtoLink(post);
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

    const contactButton = document.createElement("button");
    contactButton.className = "card-link";
    contactButton.type = "button";
    contactButton.textContent = "Contact Owner";
    contactButton.addEventListener("click", () => contactOwner(post));

    const deleteButton = document.createElement("button");
    deleteButton.className = "delete-button";
    deleteButton.type = "button";
    deleteButton.textContent = "Delete";
    deleteButton.addEventListener("click", () => deletePost(post.id));

    actions.append(contactButton, deleteButton);
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
    const response = await fetch(getApiUrl(`/api/posts?${params.toString()}`));
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
    const response = await fetch(getApiUrl("/api/posts"), {
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

async function contactOwner(post) {
  const senderEmail = window.prompt("Enter your email so the owner can reply:");

  if (senderEmail === null) {
    return;
  }

  const message = window.prompt("Optional message to include:", "") || "";
  hideMessage(listMessage);

  try {
    const response = await fetch(getApiUrl(`/api/posts/${post.id}/contact`), {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        senderEmail,
        message
      })
    });

    const result = await response.json();

    if (!response.ok) {
      const error = new Error(result.message || "Could not contact owner.");
      error.fallback = result.fallback;
      throw error;
    }

    showMessage(listMessage, "Contact email sent successfully.", "success");
  } catch (error) {
    if (error.fallback === "mailto") {
      showMessage(listMessage, `${error.message} Opening your email app instead.`, "error");
      openMailFallback(post);
      return;
    }

    showMessage(listMessage, error.message, "error");
  }
}

async function deletePost(postId) {
  const confirmed = window.confirm("Delete this post?");

  if (!confirmed) {
    return;
  }

  hideMessage(listMessage);

  try {
    const response = await fetch(getApiUrl(`/api/posts/${postId}`), {
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

postForm.addEventListener("submit", createPost);
typeFilter.addEventListener("change", loadPosts);
sortFilter.addEventListener("change", loadPosts);
refreshButton.addEventListener("click", loadPosts);

loadPosts();
