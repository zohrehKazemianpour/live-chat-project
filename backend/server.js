import express from "express";

const app = express();
app.use(express.static("public"));
app.use(express.json());

const port = 3000;

const messages = [{ from: "Zohreh", text: "Welcome to the chat!" }];

app.get("/messages", (req, res) => {
  const since = req.query.since;

  if (since) {
    const filtered = messages.filter((m) => m.timestamp > since);
    res.json(filtered);
  } else {
    res.json(messages);
  }
});

app.post("/messages", (req, res) => {
  const newMessage = {
    from: req.body.from,
    text: req.body.text,
    timestamp: new Date().toISOString(),
  };
  messages.push(newMessage);
  res.status(201).json(newMessage);
});

app.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
