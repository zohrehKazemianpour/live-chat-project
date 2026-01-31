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
    const newMessages = await res.json();
    if (newMessages.length > 0) {
      state.messages = [...state.messages, ...newMessages];

      newMessages.forEach((msg) => {
        const div = document.createElement("div");
        div.innerHTML = `<strong>${msg.from}:</strong> ${msg.text}`;
        messageList.appendChild(div);
      });
      //START THE NEXT REQUEST IMMEDIATELY
      keepFetchingMessages();
    }
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
