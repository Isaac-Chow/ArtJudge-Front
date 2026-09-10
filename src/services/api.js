// const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8000";
const API_BASE = import.meta.env.VITE_API_URL;

/**
 * Internal helper: adds the auth header and handles JSON errors.
 */
async function apiRequest(path, { method = "GET", body, headers = {}, token }) {
  const url = `${API_BASE}${path}`;
  const opts = {
    method,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
  };

  if (body && !(body instanceof FormData)) {
    opts.headers["Content-Type"] = "application/json";
    opts.body = JSON.stringify(body);
  } else if (body instanceof FormData) {
    opts.body = body;
  }

  const resp = await fetch(url, opts);

  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const json = await resp.json();
      detail = json.detail || json.message || detail;
    } catch {
      // non-JSON error body
    }
    throw new Error(`${resp.status}: ${detail}`);
  }

  return resp.json();
}

// -----------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------

/**
 * Send a text message (and optional image) to the agent.
 *
 * @param {string} text        - The user's message
 * @param {string} sessionId   - UUID for the conversation session
 * @param {string|null} imageBase64 - Base64 image string (optional)
 * @param {string} token       - Firebase ID token
 * @returns {Promise<ChatResponse>}
 */
export async function sendMessage(text, sessionId, imageBase64, token) {
  return apiRequest("/api/chat", {
    method: "POST",
    body: {
      text,
      session_id: sessionId,
      image_base64: imageBase64 || null,
    },
    token,
  });
}

/**
 * SSE event types emitted by the streaming endpoint.
 *
 * @typedef {Object} StreamCallbacks
 * @property {(status: string) => void} onThinking - called immediately when processing starts
 * @property {() => void} onStart     - called when the agent starts generating
 * @property {(delta: string) => void} onText  - called for each text chunk
 * @property {(meta: Object) => void} onMetadata - called with classification/sources
 * @property {(title: string) => void} onTitle  - called with auto-generated session title
 * @property {() => void} onDone      - called when the stream is complete
 * @property {(err: string) => void} onError   - called on error
 */

/**
 * Stream a chat response via Server-Sent Events.
 *
 * Uses POST + ReadableStream (not EventSource, which is GET-only).
 *
 * @param {string} text
 * @param {string} sessionId
 * @param {string|null} imageBase64
 * @param {string} token
 * @param {StreamCallbacks} callbacks
 */
export async function sendMessageStream(
  text,
  sessionId,
  imageBase64,
  token,
  callbacks
) {
  const url = `${API_BASE}/api/chat/stream`;

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      text,
      session_id: sessionId,
      image_base64: imageBase64 || null,
    }),
  });

  if (!resp.ok) {
    let detail = resp.statusText;
    try {
      const json = await resp.json();
      detail = json.detail || detail;
    } catch { }
    callbacks.onError?.(`${resp.status}: ${detail}`);
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });

    // Parse SSE frames from the buffer
    const frames = buffer.split("\n\n");
    // Keep the last (possibly incomplete) frame in the buffer
    buffer = frames.pop() || "";

    for (const frame of frames) {
      if (!frame.trim()) continue;

      let eventType = "message";
      let data = "";

      for (const line of frame.split("\n")) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          data = line.slice(6);
        }
      }

      if (!data) continue;

      try {
        const parsed = JSON.parse(data);

        switch (eventType) {
          case "thinking":
            callbacks.onThinking?.(parsed.status || "Thinking...");
            break;
          case "start":
            callbacks.onStart?.();
            break;
          case "text":
            callbacks.onText?.(parsed.delta || "");
            break;
          case "metadata":
            callbacks.onMetadata?.(parsed);
            break;
          case "title":
            callbacks.onTitle?.(parsed.title || "New Chat");
            break;
          case "done":
            callbacks.onDone?.();
            break;
          case "error":
            callbacks.onError?.(parsed.detail || "Unknown error");
            break;
        }
      } catch {
        // ignore malformed JSON lines
      }
    }
  }

  // Ensure done is called even if the stream ends abruptly
  callbacks.onDone?.();
}

/**
 * Upload an image file for art-style classification.
 *
 * @param {File} file         - The image file
 * @param {string} sessionId  - UUID for the session
 * @param {string} token      - Firebase ID token
 * @returns {Promise<ArtStyleClassification>}
 */
export async function uploadImage(file, sessionId, token) {
  const formData = new FormData();
  formData.append("image", file);
  formData.append("session_id", sessionId);

  return apiRequest("/api/classify", {
    method: "POST",
    body: formData,
    token,
  });
}

/**
 * Verify the current Firebase token with the backend.
 *
 * @param {string} token - Firebase ID token
 * @returns {Promise<UserInfo>}
 */
export async function verifyAuth(token) {
  return apiRequest("/api/auth/verify", {
    method: "POST",
    token,
  });
}

/**
 * Health check (no auth required).
 */
export async function healthCheck() {
  return apiRequest("/api/health");
}

// -----------------------------------------------------------------------
// Admin API
// -----------------------------------------------------------------------

const ADMIN_BASE = "/api/admin";

export async function adminGetStats(token) {
  return apiRequest(`${ADMIN_BASE}/stats`, { token });
}

export async function adminGetUsers(token, skip = 0, limit = 50) {
  return apiRequest(`${ADMIN_BASE}/users?skip=${skip}&limit=${limit}`, {
    token,
  });
}

export async function adminGetUserSessions(token, uid) {
  return apiRequest(`${ADMIN_BASE}/users/${uid}/sessions`, { token });
}

export async function adminGetSessionMessages(token, sessionId) {
  return apiRequest(`${ADMIN_BASE}/sessions/${sessionId}/messages`, {
    token,
  });
}

// -----------------------------------------------------------------------
// User Sessions API (chat history)
// -----------------------------------------------------------------------

const SESSIONS_BASE = "/api/sessions";

export async function getUserSessions(token) {
  return apiRequest(SESSIONS_BASE, { token });
}

export async function getSessionMessages(token, sessionId) {
  return apiRequest(`${SESSIONS_BASE}/${sessionId}/messages`, { token });
}
