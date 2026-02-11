# Live Chat Demo — Long-Polling vs WebSocket

A compact demo that implements a chat server and two client patterns side-by-side: long-polling and WebSocket. Use the `/compare` page to see both approaches in action and observe how messages (and deletes) propagate across both clients.

This repository is intended as a demo and learning aid rather than a production-ready chat system. It keeps state in memory to keep the code minimal and easy to inspect.

## Tech stack
- Node.js + Express
- WebSocket server: `ws`
- Frontend: vanilla JavaScript, HTML, CSS (single compare page at `/compare`)

## What’s included
- `backend/server.js` — Express server, long-poll endpoints, and WebSocket handling (upgrade + broadcast). Messages are kept in-memory in `messages`.
- `backend/public-compare/` — single demo page that mounts two panels: a long-polling client and a WebSocket client for side-by-side comparison.

## Quick start
Prerequisites: Node.js (14+ recommended)

Open a terminal and run:

```bash
cd backend
npm install
node server.js
```

Then open your browser to:

http://localhost:3000/compare

The page shows two panels (left: long-polling, right: WebSocket). You can send messages from each panel and delete messages — deletes propagate to both implementations.

## API (for quick testing)

- GET /messages?since=<ISO-timestamp>
  - Long-polling endpoint. Returns an array of messages newer than `since`. If no new messages, connection is held open until a message arrives (server responds to waiting clients when new messages or deletes occur).

- POST /messages
  - Create a new message. JSON body: `{ "from": "Alice", "text": "Hello" }`
  - Returns the newly created message object.

- DELETE /messages/:id
  - Delete a message by numeric `id`. Returns `{ success: true }` on success.

Example curl to post a message:

```bash
curl -X POST http://localhost:3000/messages \
  -H "Content-Type: application/json" \
  -d '{"from":"Alex","text":"Hi there"}'
```

Example curl to delete (replace 1616161616161 with the message id):

```bash
curl -X DELETE http://localhost:3000/messages/1616161616161
```

WebSocket clients connect to the same host/port using a `ws://` URL. The server sends an initial message with existing messages, then `newMessage` and `deleteMessage` events as they occur.

## Notes & development
- The project uses an in-memory store for simplicity; if you restart the server the messages disappear.







