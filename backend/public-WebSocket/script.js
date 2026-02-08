const state = {
  messages: [],
};

const chatForm = document.getElementById("chat-form");
const messageList = document.getElementById("message-list");

let ws;

function connectWebSocket() {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  const wsUrl = `${protocol}//${window.location.host}`;

  ws = new WebSocket(wsUrl);

  ws.onopen = () => {
    console.log("Connected to WebSocket server!");
  };

  ws.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      if (data.type === "initial") {
        // Got all messages on connect
        state.messages = data.messages;
        renderMessages();
      } else if (data.type === "newMessage") {
        state.messages.push(data.message);
        addMessageToDOM(data.message);
      } else if (data.type === "deleteMessage") {
        const element = document.getElementById(`msg-${data.id}`);
        if (element) element.remove();
        state.messages = state.messages.filter((m) => m.id !== data.id);
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  };

  ws.onerror = (error) => {
    console.error("WebSocket error:", error);
  };

  ws.onclose = () => {
    console.log("WebSocket connection closed. Reconnecting in 3 seconds...");
    setTimeout(connectWebSocket, 3000);
  };
}

function renderMessages() {
  messageList.innerHTML = "";
  state.messages.forEach((msg) => {
    addMessageToDOM(msg);
  });
}

function addMessageToDOM(msg) {
  const div = document.createElement("div");
  div.id = `msg-${msg.id}`;
  div.innerHTML = `<strong>${msg.from}:</strong> ${msg.text}
    <button onclick="deleteMessage(${msg.id})"><i class="material-icons">delete</i></button>`;
  messageList.appendChild(div);
}

chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userName = document.getElementById("name-input").value;
  const userText = document.getElementById("message-input").value;

  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "newMessage",
        from: userName,
        text: userText,
      }),
    );

    console.log("Message sent via WebSocket!");
    document.getElementById("message-input").value = "";
  } else {
    alert("WebSocket connection not ready. Please wait...");
  }
});

function deleteMessage(id) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(
      JSON.stringify({
        type: "deleteMessage",
        id: id,
      }),
    );
    console.log("Delete request sent via WebSocket");
  }
}

connectWebSocket();
