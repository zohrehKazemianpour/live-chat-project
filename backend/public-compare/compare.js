// compare.js
// Mounts two chat clients on one page: polling and websocket

const API_BASE =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? ""
    : "https://zohreh-chatapp-backend.hosting.codeyourfuture.io";

/* Helpers */
function createMessageElement(msg, meName) {
  // Build message element
  const el = document.createElement("div");
  el.className = "message";
  el.style.position = "relative";

  const meta = document.createElement("span");
  meta.className = "meta";
  meta.textContent = `${msg.from} • ${new Date(msg.timestamp).toLocaleTimeString()}`;

  const text = document.createElement("div");
  text.className = "text";
  text.textContent = msg.text;

  const btn = document.createElement("button");
  btn.className = "delete-btn";
  btn.title = "Delete";
  btn.textContent = "×";
  btn.setAttribute("aria-label", "Delete message");

  // delete handler: optimistic removal, then call server
  btn.addEventListener("click", async (ev) => {
    ev.stopPropagation();
    btn.disabled = true;
    const parent = el.parentNode;
    // optimistic UI: remove from DOM immediately
    if (parent) parent.removeChild(el);
    try {
      await fetch(`${API_BASE}/messages/${msg.id}`, { method: "DELETE" });
    } catch (err) {
      console.error("delete failed", err);
      btn.disabled = false;
      // restore element on failure
      if (parent) parent.appendChild(el);
    }
  });
  // attach children and finalize
  el.appendChild(meta);
  el.appendChild(text);
  el.appendChild(btn);

  if (msg.from === meName) el.classList.add("msg-me");
  else el.classList.add("msg-from");
  el.dataset.id = msg.id;
  return el;
}

function initPolling(panelRoot) {
  const messagesEl = panelRoot.querySelector(".messages");
  const form = panelRoot.querySelector(".chat-form");
  const nameInput = panelRoot.querySelector('input[type="text"]');
  const textInput = panelRoot.querySelectorAll('input[type="text"]')[1];

  const state = { messages: [], initial: true };

  async function keepFetching() {
    const last = state.messages[state.messages.length - 1];
    const since = last ? last.timestamp : "";
    const url = state.initial
      ? `${API_BASE}/messages?initial=true`
      : `${API_BASE}/messages?since=${since}`;
    try {
      const res = await fetch(url);
      const data = await res.json();

      if (data.deletedId) {
        const el = messagesEl.querySelector(`[data-id='${data.deletedId}']`);
        if (el) el.remove();
        state.messages = state.messages.filter((m) => m.id !== data.deletedId);
      } else if (Array.isArray(data) && data.length) {
        // Defensive dedupe: only append messages we don't already have.
        const newMsgs = data.filter(
          (m) => !state.messages.find((x) => x.id === m.id),
        );
        if (newMsgs.length) {
          state.messages = [...state.messages, ...newMsgs];
          newMsgs.forEach((m) => {
            const el = createMessageElement(m, nameInput.value);
            messagesEl.appendChild(el);
            messagesEl.scrollTop = messagesEl.scrollHeight;
          });
        }
        // After an initial sync, mark that we've loaded history so future
        // requests use the `since` timestamp.
        if (state.initial) state.initial = false;
      }
      // immediately poll again
      keepFetching();
    } catch (err) {
      console.error("Polling error", err);
      setTimeout(keepFetching, 3000);
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const from = nameInput.value || "Anon";
    const text = textInput.value;
    if (!text) return;
    const res = await fetch(`${API_BASE}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from, text }),
    });
    if (res.ok) textInput.value = "";
  });

  // deletion via delegation (HTTP delete)
  messagesEl.addEventListener("click", async (e) => {
    const item = e.target.closest(".message");
    if (!item) return;
    // on click delete (simple UX for demo)
    const id = item.dataset.id;
    try {
      await fetch(`${API_BASE}/messages/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("delete failed", err);
    }
  });

  // start
  keepFetching();
}

/* WebSocket client */
function initWebSocket(panelRoot) {
  const messagesEl = panelRoot.querySelector(".messages");
  const form = panelRoot.querySelector(".chat-form");
  const nameInput = panelRoot.querySelector('input[type="text"]');
  const textInput = panelRoot.querySelectorAll('input[type="text"]')[1];

  let ws;
  function connect() {
    let wsUrl;
    if (
      window.location.hostname === "localhost" ||
      window.location.hostname === "127.0.0.1"
    ) {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      wsUrl = `${protocol}//${window.location.host}`;
    } else {
      wsUrl = "wss://zohreh-chatapp-backend.hosting.codeyourfuture.io";
    }
    ws = new WebSocket(wsUrl);

    ws.onopen = () => console.log("WS connected");
    ws.onmessage = (ev) => {
      try {
        const d = JSON.parse(ev.data);
        if (d.type === "initial") {
          // render all
          messagesEl.innerHTML = "";
          d.messages.forEach((m) => {
            const el = createMessageElement(m, nameInput.value);
            messagesEl.appendChild(el);
          });
          messagesEl.scrollTop = messagesEl.scrollHeight;
        } else if (d.type === "newMessage") {
          const el = createMessageElement(d.message, nameInput.value);
          messagesEl.appendChild(el);
          messagesEl.scrollTop = messagesEl.scrollHeight;
        } else if (d.type === "deleteMessage") {
          const el = messagesEl.querySelector(`[data-id='${d.id}']`);
          if (el) el.remove();
        }
      } catch (err) {
        console.error("ws parse", err);
      }
    };

    ws.onclose = () => {
      console.log("WS closed, reconnecting in 2s");
      setTimeout(connect, 2000);
    };
    ws.onerror = (e) => console.error("WS error", e);
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const from = nameInput.value || "Anon";
    const text = textInput.value;
    if (!text) return;
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ type: "newMessage", from, text }));
      textInput.value = "";
    } else {
      alert("WebSocket not connected yet");
    }
  });

  // deletion via HTTP to keep things simple (server will notify WS clients)
  messagesEl.addEventListener("click", async (e) => {
    const item = e.target.closest(".message");
    if (!item) return;
    const id = item.dataset.id;
    try {
      await fetch(`/messages/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error("delete failed", err);
    }
  });

  connect();
}

// bootstrap both panels
window.addEventListener("DOMContentLoaded", () => {
  const pollingRoot = document.getElementById("polling-panel");
  const wsRoot = document.getElementById("ws-panel");
  initPolling(pollingRoot);
  initWebSocket(wsRoot);
});
