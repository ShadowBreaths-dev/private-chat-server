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
const indexPath = path.join(webappPath, 'index.html');

// Serve static files (css, js, images)
app.use(express.static(webappPath));

// Serve index.html for root
app.get('/', (req, res) => {
  res.sendFile(indexPath);
});

// Health check endpoint (MUST be before wildcard)
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    onlineUsers: getOnlineUsers().length,
    users: getOnlineUsers()
  });
});

// Handle all other routes - serve index.html (for SPA routing)
app.get('*', (req, res) => {
  res.sendFile(indexPath);
});

// =============================================================================
// WEBSOCKET SERVER WITH PING/PONG
// =============================================================================

const wss = new WebSocket.Server({
  server,
  pingInterval: 20000,  // Ping every 20 seconds
  pingTimeout: 5000     // Wait 5 seconds for pong
});

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

// WebSocket heartbeat for each connection
wss.on("connection", (ws) => {
  console.log(`\n🟢 New connection`);
  console.log(`   Total connections: ${wss.clients.size}`);
  
  // Mark connection as alive
  ws.isAlive = true;
  
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  let username = null;

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message);
      console.log(`📥 Received:`, JSON.stringify(data));

      switch(data.type) {
        case "join":
          // User joined with username
          username = data.username;
          if (username) {
            clients[username] = ws;
            console.log(`   ${username} joined`);
            console.log(`   Online users: ${JSON.stringify(Object.keys(clients))}`);

            // Send user list to everyone
            const userList = getOnlineUsers();
            console.log(`   Broadcasting user list: ${JSON.stringify(userList)}`);
            broadcast({
              type: "user_list",
              users: userList
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

        case "call":
          // Voice/Video call signaling
          const { action, from, to, isVideo } = data;
          console.log(`   📞 Call ${action}: ${from} -> ${to} (${isVideo ? 'video' : 'voice'})`);
          
          // Forward call signal to receiver
          sendToUser(to, {
            type: "call",
            action: action,
            from: from,
            to: to,
            isVideo: isVideo
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

// Interval to ping clients and close dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);

wss.on('close', () => {
  clearInterval(interval);
});

console.log(`\n✅ Server ready!`);
console.log(`   Web App: http://localhost:${PORT}`);
console.log(`   API: http://localhost:${PORT}/api/health`);
