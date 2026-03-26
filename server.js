/**
 * SIMPLEST POSSIBLE REAL-TIME CHAT
 * No complexity - just pure working code
 */
const express = require('express');
const WebSocket = require('ws');
const path = require('path');
const http = require('http');

const app = express();
const PORT = process.env.PORT || 3000;

// Create HTTP server
const server = http.createServer(app);

// Serve static files from webapp folder
const webappPath = path.join(__dirname, 'webapp');
app.use(express.static(webappPath));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(webappPath, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        users: Object.keys(clients),
        connections: wss.clients.size
    });
});

// Create WebSocket server
const wss = new WebSocket.Server({ 
    server,
    pingInterval: 25000,
    pingTimeout: 5000
});

// Store clients: username -> { ws, connectedAt }
const clients = {};

console.log('\n🍪 OREO SERVER STARTING...\n');

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('🟢 NEW CONNECTION - Total:', wss.clients.size);
    
    let username = null;

    // Handle incoming messages
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            console.log('📥 RECEIVED:', data.type, data);

            switch(data.type) {
                case 'join':
                    username = data.username;
                    if (username && !clients[username]) {
                        clients[username] = { ws, connectedAt: Date.now() };
                        console.log('   ✅ USER JOINED:', username);
                        console.log('   👥 ONLINE:', Object.keys(clients));
                        
                        // Send user list to EVERYONE including sender
                        broadcast({
                            type: 'user_list',
                            users: Object.keys(clients)
                        });
                        
                        // Send join notification
                        broadcast({
                            type: 'user_joined',
                            user: username
                        });
                    }
                    break;

                case 'message':
                    const { sender, receiver, message: msgContent } = data;
                    console.log('   💬 MESSAGE:', sender, '->', receiver, ':', msgContent);
                    
                    // Send to receiver
                    if (clients[receiver] && clients[receiver].ws.readyState === WebSocket.OPEN) {
                        console.log('   ✅ Delivered to', receiver);
                        clients[receiver].ws.send(JSON.stringify({
                            type: 'message',
                            sender: sender,
                            receiver: receiver,
                            message: msgContent,
                            timestamp: new Date().toISOString()
                        }));
                    } else {
                        console.log('   ❌ Receiver', receiver, 'not found or not connected');
                    }
                    
                    // Send confirmation back to sender
                    if (clients[sender] && clients[sender].ws.readyState === WebSocket.OPEN) {
                        clients[sender].ws.send(JSON.stringify({
                            type: 'message',
                            sender: sender,
                            receiver: receiver,
                            message: msgContent,
                            timestamp: new Date().toISOString(),
                            confirmed: true
                        }));
                    }
                    break;

                case 'typing':
                    // Forward typing indicator to receiver
                    if (data.to && clients[data.to]) {
                        clients[data.to].ws.send(JSON.stringify({
                            type: 'typing',
                            user: data.user
                        }));
                    }
                    break;

                case 'get_users':
                    // Send current user list
                    ws.send(JSON.stringify({
                        type: 'user_list',
                        users: Object.keys(clients)
                    }));
                    break;

                case 'call':
                    // Forward call signal
                    if (data.to && clients[data.to]) {
                        clients[data.to].ws.send(JSON.stringify({
                            type: 'call',
                            action: data.action,
                            from: data.from,
                            to: data.to,
                            isVideo: data.isVideo
                        }));
                    }
                    break;

                case 'leave':
                    if (data.user && clients[data.user]) {
                        delete clients[data.user];
                        broadcast({
                            type: 'user_left',
                            user: data.user
                        });
                        broadcast({
                            type: 'user_list',
                            users: Object.keys(clients)
                        });
                    }
                    break;
            }
        } catch (e) {
            console.error('❌ ERROR:', e.message);
        }
    });

    // Handle disconnect
    ws.on('close', () => {
        console.log('🔴 CONNECTION CLOSED');
        if (username && clients[username]) {
            delete clients[username];
            console.log('   ❌ USER LEFT:', username);
            console.log('   👥 ONLINE:', Object.keys(clients));
            
            broadcast({
                type: 'user_left',
                user: username
            });
            
            broadcast({
                type: 'user_list',
                users: Object.keys(clients)
            });
        }
    });

    ws.on('error', (error) => {
        console.error('❌ WebSocket ERROR:', error.message);
    });

    ws.on('pong', () => {
        if (username && clients[username]) {
            clients[username].lastPong = Date.now();
        }
    });
});

// Broadcast to all connected clients
function broadcast(data) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Heartbeat interval
const heartbeat = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeat);
});

// Start server
server.listen(PORT, () => {
    console.log('✅ SERVER READY!');
    console.log('   🌐 HTTP: http://localhost:' + PORT);
    console.log('   🔌 WebSocket: ws://localhost:' + PORT);
    console.log('   🏥 Health: http://localhost:' + PORT + '/api/health\n');
});
