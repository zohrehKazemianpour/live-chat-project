import express from "express";

const app = express();
app.use(express.static("public"));
app.use(express.json());

const port = 3000;

const messages = [{ from: "Zohreh", text: "Welcome to the chat!" }];

let waitingClients = []

app.get("/messages", (req, res) => {
  const since = req.query.since;
  //check for the new message
  const filtered = messages.filter((m) => m.timestamp > since);

  //if yes send immediately
  if (filtered.length > 0) {
    return res.json(filtered);
  }

  //if no new message put the client in the waiting room
  waitingClients.push(res);

  // 3. Safety: If the client closes the tab, remove them from the room
  req.on("close", () => {
    waitingClients = waitingClients.filter((client) => client !== res);
  })
});

app.post("/messages", (req, res) => {
  const newMessage = {
    id: Date.now(),
    from: req.body.from,
    text: req.body.text,
    timestamp: new Date().toISOString(),
  };
  messages.push(newMessage);

  // 4.Tell everyone in the waiting room that a message arrived!
  waitingClients.forEach((clientRes) => {
    clientRes.json([newMessage]);
  });

  // Clear the waiting room since they all just got the message
  waitingClients = [];

  res.status(201).json(newMessage);
});

app.delete("/messages/:id", (req, res) => {
  // 1. Find out which ID the user clicked on
  const idToDelete = Number(req.params.id);

  // 2. Look through the 'messages' array and find that ID
  const index = messages.findIndex((m) => m.id === idToDelete);

  if (index !== -1) {
    // 3. If found, pull it out of the array
    messages.splice(index, 1);

    // 4. Update the waiting room 
    waitingClients.forEach((client) => {
      client.json({ deletedId: idToDelete });
    });
    waitingClients = [];

    res.json({ success: true });
  }
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
