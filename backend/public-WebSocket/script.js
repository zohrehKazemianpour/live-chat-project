const state = {
  messages: [],
};

const chatForm = document.getElementById("chat-form");
const messageList = document.getElementById("message-list");

async function keepFetchingMessages() {
  const lastMessage = state.messages[state.messages.length - 1];
  const lastMessageTime = lastMessage ? lastMessage.timestamp : "";

  try {
    const res = await fetch(`/messages?since=${lastMessageTime}`);
    const data = await res.json();

    // Handle Deletion Signal
    if (data.deletedId) {
      const element = document.getElementById(`msg-${data.deletedId}`);
      if (element) element.remove();
      state.messages = state.messages.filter((m) => m.id !== data.deletedId);
    } else if (Array.isArray(data) && data.length > 0) {
      state.messages = [...state.messages, ...data];

      data.forEach((msg) => {
        const div = document.createElement("div");

        // We assign a unique ID to the HTML element itself
        div.id = `msg-${msg.id}`;
        div.innerHTML = `<strong>${msg.from}:</strong> ${msg.text}
        <button onclick="deleteMessage(${msg.id})"><i class="material-icons">delete</i></button>`;
        messageList.appendChild(div);
      });
    }

    keepFetchingMessages();

  } catch (error) {
    console.error("Fetch error:", error);
    //IF SERVER FAILS, WAIT 5 SECONDS BEFORE RETRYING
    setTimeout(keepFetchingMessages, 5000);
  }
}



chatForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const userName = document.getElementById("name-input").value;
  const userText = document.getElementById("message-input").value;

  const res = await fetch("/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: userName, text: userText }),
  });

  if (res.ok) {
    console.log("Message sent successfully!");
    // Optional: Clear the message box so the user can type a new one
    document.getElementById("message-input").value = "";
    
  } else {
    const errorData = await res.json();
    alert("Error: " + errorData.message);
  }
});

keepFetchingMessages()

async function deleteMessage(id) {
  try {
    const res = await fetch(`/messages/${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      console.log("Deleted message", id);
      // We don't manually remove it from the DOM here!
      // We wait for the Long Polling loop to tell us it's gone.
    }
  } catch (err) {
    console.error("Delete failed", err);
  }
}
