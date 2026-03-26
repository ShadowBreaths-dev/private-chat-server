const express = require("express");
const WebSocket = require("ws");
const path = require("path");
const fs = require("fs");

const app = express();
const PORT = process.env.PORT || 3000;

// Create server that handles both HTTP and WebSocket
const server = app.listen(PORT, () => {
  console.log(`\n🍪 Oreo Server Running on port ${PORT}`);
  console.log(`   WebSocket: ws://localhost:${PORT}`);
  console.log(`   Web App: http://localhost:${PORT}`);
});

// =============================================================================
// SERVE STATIC FILES (Web App)
// =============================================================================

// Serve the webapp folder
const webappPath = path.join(__dirname, 'webapp');

// Serve static files FIRST (css, js, images) - this must come before any routes
app.use(express.static(webappPath));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(path.join(webappPath, 'index.html'));
});

// Health check endpoint (before wildcard)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    onlineUsers: getOnlineUsers().length,
    users: getOnlineUsers()
  });
});

// Handle all other routes - serve index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(path.join(webappPath, 'index.html'));
});

// =============================================================================
// WEBSOCKET SERVER
// =============================================================================

const wss = new WebSocket.Server({ server });

// Store connected users: { username: ws }
let clients = {};

// Store all online usernames
function getOnlineUsers() {
  return Object.keys(clients);
}

// Broadcast to all connected clients
function broadcast(data, excludeWs = null) {
  const message = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client !== excludeWs && client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  });
}

// Send to specific user
function sendToUser(username, data) {
  const ws = clients[username];
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

wss.on("connection", (ws) => {
  console.log(`\n🟢 New connection`);
  
  let username = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📥 Received:`, data);

      switch(data.type) {
        case "join":
          // User joined with username
          username = data.username;
          if (username) {
            clients[username] = ws;
            console.log(`   ${username} joined`);
            
            // Send user list to everyone
            broadcast({
              type: "user_list",
              users: getOnlineUsers()
            });
            
            // Send join notification
            broadcast({
              type: "join",
              user: username
            });
          }
          break;

        case "message":
          // Chat message from one user to another
          const { sender, receiver, message: msgContent } = data;
          console.log(`   ${sender} -> ${receiver}: ${msgContent}`);
          
          // Save message (in production, save to database)
          // For now, just forward to receiver
          
          // Send to receiver
          sendToUser(receiver, {
            type: "message",
            sender: sender,
            receiver: receiver,
            message: msgContent
          });
          
          // Also send back to sender (for confirmation)
          sendToUser(sender, {
            type: "message",
            sender: sender,
            receiver: receiver,
            message: msgContent
          });
          break;

        case "get_users":
          // Send current list of online users
          ws.send(JSON.stringify({
            type: "user_list",
            users: getOnlineUsers()
          }));
          break;

        case "typing":
          // Typing indicator
          const { user } = data;
          broadcast({
            type: "typing",
            user: user
          });
          break;

        case "leave":
          // User leaving
          const leavingUser = data.user;
          if (leavingUser && clients[leavingUser]) {
            delete clients[leavingUser];
            console.log(`   ${leavingUser} left`);
            
            broadcast({
              type: "leave",
              user: leavingUser
            });
            
            broadcast({
              type: "user_list",
              users: getOnlineUsers()
            });
          }
          break;

        default:
          console.log(`   Unknown message type:`, data.type);
      }
    } catch (e) {
      console.error(`❌ Error parsing message:`, e);
      ws.send(JSON.stringify({
        type: "error",
        message: "Invalid message format"
      }));
    }
  });

  ws.on("close", () => {
    console.log(`\n🔴 Connection closed`);
    
    if (username) {
      delete clients[username];
      console.log(`   ${username} disconnected`);
      
      // Notify others
      broadcast({
        type: "leave",
        user: username
      });
      
      broadcast({
        type: "user_list",
        users: getOnlineUsers()
      });
    }
  });

  ws.on("error", (error) => {
    console.error(`❌ WebSocket error:`, error);
  });
});

console.log(`\n✅ Server ready!`);
console.log(`   Web App: http://localhost:${PORT}`);
console.log(`   API: http://localhost:${PORT}/api/health`);
