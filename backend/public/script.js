const chatForm = document.getElementById("chat-form");




    const messageList = document.getElementById("message-list");



    async function loadMessages() {
  try {
    const res = await fetch("/messages");
    const data = await res.json();

    messageList.innerHTML = '';

     data.forEach(msg => {
      const div = document.createElement('div');
      div.innerHTML = `<strong>${msg.from}:</strong> ${msg.text}`;
        messageList.appendChild(div);
     })
  } catch (error) {
    messageList.innerText = "Ouch! Something went wrong!"
    console.error("Fetch error:", error)
  }
   

}


chatForm.addEventListener("submit", async (event) => {
    event.preventDefault();

        const userName = document.getElementById("name-input").value;
        const userText = document.getElementById("message-input").value;

      const res = await fetch ("/messages", {
        method: "POST",
        headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from: userName, text: userText }),
    })

    if (res.ok) {
        console.log("Message sent successfully!");
        // Optional: Clear the message box so the user can type a new one
        document.getElementById("message-input").value = "";
        loadMessages();
    } else {
        const errorData = await res.json();
        alert("Error: " + errorData.message);
    }
});
    




loadMessages();