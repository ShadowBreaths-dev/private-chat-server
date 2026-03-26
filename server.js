const express = require("express");
const WebSocket = require("ws");

const app = express();

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

const wss = new WebSocket.Server({ server });

let clients = {};

wss.on("connection", (ws) => {
  ws.on("message", (message) => {
    const data = JSON.parse(message);

    if (data.type === "join") {
      clients[data.username] = ws;
      console.log(`${data.username} joined`);
    }

    if (data.type === "message") {
      const target = clients[data.to];
      if (target) {
        target.send(JSON.stringify({
          from: data.from,
          message: data.message
        }));
      }
    }
  });

  ws.on("close", () => {
    for (let user in clients) {
      if (clients[user] === ws) {
        delete clients[user];
        console.log(`${user} disconnected`);
      }
    }
  });
});