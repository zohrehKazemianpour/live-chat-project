import http from "http";
import express from "express";
import { WebSocketServer } from "ws";

//Initialise Engines
const app = express();
const wss = new WebSocketServer({ noServer: true });

// 2. State/Data
let socketClients = [];
let waitingClients = [];
const messages = [
  {
    id: Date.now(),
    from: "Zohreh",
    text: "Welcome to the chat!",
    timestamp: new Date().toISOString(),
  },
];

// 3. Middleware & Static Routes
app.use(express.json());
app.use("/polling", express.static("public-polling"));
app.use("/ws", express.static("public-WebSocket"));

// 4. Server Wrapper (Wrap express app in an HTTP server to handle protocol upgrades)
const server = http.createServer(app);

const port = 3000;

///////////---- HTTP- Long polling ----///////////

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
  });
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

  // Broadcast to any connected WebSocket clients as well
  socketClients.forEach((client) => {
    if (client.readyState === 1) {
      client.send(JSON.stringify({ type: "newMessage", message: newMessage }));
    }
  });

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

///////////---- WebSocket ----///////////

// Handle HTTP -> WS upgrade
server.on("upgrade", (request, socket, head) => {
  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit("connection", ws, request);
  });
});

wss.on("connection", (ws) => {
  console.log("Someone joined the WebSocket chat!");
  socketClients.push(ws);

  // Send existing messages to new client
  ws.send(JSON.stringify({ type: "initial", messages }));

  ws.on("message", (data) => {
    try {
      const parsed = JSON.parse(data);

      if (parsed.type === "newMessage") {
        const newMessage = {
          id: Date.now(),
          from: parsed.from,
          text: parsed.text,
          timestamp: new Date().toISOString(),
        };

        messages.push(newMessage);

        // Broadcast to all connected WebSocket clients
        socketClients.forEach((client) => {
          if (client.readyState === 1) {
            client.send(
              JSON.stringify({ type: "newMessage", message: newMessage }),
            );
          }
        });

        // Also notify waiting long-polling clients
        waitingClients.forEach((clientRes) => {
          clientRes.json([newMessage]);
        });
        waitingClients = [];
      } else if (parsed.type === "deleteMessage") {
        const idToDelete = parsed.id;
        const index = messages.findIndex((m) => m.id === idToDelete);

        if (index !== -1) {
          messages.splice(index, 1);

          socketClients.forEach((client) => {
            if (client.readyState === 1) {
              client.send(
                JSON.stringify({ type: "deleteMessage", id: idToDelete }),
              );
            }
          });

          // Also notify waiting long-polling clients
          waitingClients.forEach((client) => {
            client.json({ deletedId: idToDelete });
          });
          waitingClients = [];
        }
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  });

  ws.on("close", () => {
    console.log("Someone left the WebSocket chat!");
    socketClients = socketClients.filter((client) => client !== ws);
  });
});

// Start the server instance on port 3000
server.listen(port, () => {
  console.log(`server listening on port ${port}`);
});
