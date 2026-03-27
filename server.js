/**
 * 🍪 OREO - Complete Real-Time Messaging Server
 * WhatsApp-like messaging with full features:
 * - Real-time messaging with status (sent/delivered/seen)
 * - Typing indicators
 * - Message reactions
 * - Edit/Delete messages
 * - WebRTC signaling for voice/video calls
 * - User presence tracking
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

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Root route
app.get('/', (req, res) => {
    res.sendFile(path.join(webappPath, 'index.html'));
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        users: Object.keys(clients),
        connections: wss.clients.size,
        pendingMessages: Object.keys(messageQueue).length,
        messageStore: messageStore.length
    });
});

// Last seen endpoint
app.get('/api/last_seen/:username', (req, res) => {
    const username = req.params.username;
    res.json({
        username,
        lastSeen: getLastSeen(username)
    });
});

// Create WebSocket server with proper configuration for Render
const wss = new WebSocket.Server({
    server,
    pingInterval: 30000,
    pingTimeout: 10000,
    maxPayload: 10 * 1024 * 1024 // 10MB max payload
});

// =============================================================================
// STATE MANAGEMENT
// =============================================================================

// Connected clients: username -> { ws, connectedAt, lastSeen }
const clients = {};

// Offline message queue: username -> [messages]
const messageQueue = {};

// Message store for edit/delete/reactions (in-memory, limited)
const messageStore = [];
const MAX_MESSAGES = 10000;

// Last seen tracking: username -> timestamp
const lastSeen = {};

// Recently processed message IDs to prevent duplicates (timestamp-based cleanup)
const processedMessageIds = new Set();
const MAX_PROCESSED_IDS = 10000;

// Call sessions: callId -> { from, to, status, isVideo }
const callSessions = {};

console.log('\n🍪 OREO SERVER STARTING...\n');

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

// Generate unique message ID
function generateMessageId() {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Generate unique call ID
function generateCallId() {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Get last seen status
function getLastSeen(username) {
    if (clients[username]) {
        return 'online';
    }
    const seen = lastSeen[username];
    if (seen) {
        const diff = Date.now() - seen;
        if (diff < 60000) return 'just now';
        if (diff < 3600000) return `${Math.floor(diff/60000)}m ago`;
        return `${Math.floor(diff/3600000)}h ago`;
    }
    return 'a long time ago';
}

// Format last seen for display
function formatLastSeen(username) {
    const status = getLastSeen(username);
    if (status === 'online') return 'online';
    return `last seen ${status}`;
}

// Broadcast to all connected clients
function broadcast(data, excludeWs = null) {
    const message = JSON.stringify(data);
    wss.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN && client !== excludeWs) {
            client.send(message);
        }
    });
}

// Send to specific user
function sendToUser(username, data) {
    if (clients[username] && clients[username].ws.readyState === WebSocket.OPEN) {
        clients[username].ws.send(JSON.stringify(data));
        return true;
    }
    return false;
}

// Trim message store if too large
function trimMessageStore() {
    if (messageStore.length > MAX_MESSAGES) {
        const toRemove = messageStore.length - MAX_MESSAGES;
        messageStore.splice(0, toRemove);
        console.log(`   🗑️ Trimmed ${toRemove} old messages from store`);
    }
}

// =============================================================================
// WEBSOCKET CONNECTION HANDLER
// =============================================================================

wss.on('connection', (ws) => {
    console.log('🟢 NEW CONNECTION - Total:', wss.clients.size);

    let username = null;
    ws.isAlive = true;
    ws.lastActivity = Date.now();

    // Handle incoming messages
    ws.on('message', (rawMessage) => {
        try {
            // Handle both string and buffer
            const messageStr = rawMessage.toString('utf8');
            const data = JSON.parse(messageStr);
            
            ws.lastActivity = Date.now();
            console.log('📥 RECEIVED:', data.type, JSON.stringify(data).substring(0, 100));

            switch(data.type) {
                case 'join':
                    handleJoin(ws, data);
                    break;

                case 'message':
                    handleMessage(ws, data);
                    break;

                case 'message_read':
                    handleMessageRead(ws, data);
                    break;

                case 'typing':
                    handleTyping(ws, data);
                    break;

                case 'edit_message':
                    handleEditMessage(ws, data);
                    break;

                case 'delete_message':
                    handleDeleteMessage(ws, data);
                    break;

                case 'reaction':
                    handleReaction(ws, data);
                    break;

                case 'call':
                    handleCall(ws, data);
                    break;

                case 'get_users':
                    handleGetUsers(ws);
                    break;

                case 'leave':
                    handleLeave(ws, data);
                    break;

                case 'ping':
                    ws.send(JSON.stringify({ type: 'pong', timestamp: Date.now() }));
                    break;

                default:
                    console.log('   ⚠️ Unknown message type:', data.type);
            }
        } catch (e) {
            console.error('❌ ERROR parsing message:', e.message);
            ws.send(JSON.stringify({ type: 'error', message: 'Invalid message format' }));
        }
    });

    // Handle disconnect
    ws.on('close', (code, reason) => {
        console.log('🔴 CONNECTION CLOSED - Code:', code);
        handleDisconnect(ws, 'closed');
    });

    // Handle errors
    ws.on('error', (error) => {
        console.error('❌ WebSocket ERROR:', error.message);
        handleDisconnect(ws, 'error');
    });

    // Handle pong (heartbeat response)
    ws.on('pong', () => {
        ws.isAlive = true;
        if (username && clients[username]) {
            clients[username].lastPong = Date.now();
        }
    });
});

// =============================================================================
// MESSAGE HANDLERS
// =============================================================================

function handleJoin(ws, data) {
    const newUsername = data.username;
    if (!newUsername || typeof newUsername !== 'string') {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid username' }));
        return;
    }

    const username = newUsername.trim().substring(0, 30);
    
    // Remove from previous connection if exists
    if (clients[username]) {
        console.log('   ⚠️ User', username, 'reconnecting...');
        try {
            clients[username].ws.close(4000, 'Reconnected elsewhere');
        } catch(e) {}
    }

    // Add to clients
    clients[username] = { 
        ws, 
        connectedAt: Date.now(),
        lastPong: Date.now()
    };
    
    // Store username on ws for cleanup
    ws.username = username;

    // Clear last seen
    delete lastSeen[username];

    console.log('   ✅ USER JOINED:', username);
    console.log('   👥 ONLINE:', Object.keys(clients));

    // Send welcome message
    ws.send(JSON.stringify({
        type: 'welcome',
        username,
        timestamp: new Date().toISOString()
    }));

    // Deliver pending messages
    deliverPendingMessages(username);

    // Send user list to EVERYONE
    broadcast({
        type: 'user_list',
        users: Object.keys(clients).sort()
    });

    // Send join notification
    broadcast({
        type: 'user_joined',
        user: username
    }, ws);
}

function handleMessage(ws, data) {
    const { sender, receiver, message: msgContent } = data;

    if (!sender || !receiver || !msgContent) {
        ws.send(JSON.stringify({ type: 'error', message: 'Missing required fields' }));
        return;
    }

    const messageId = data.messageId || generateMessageId();
    
    // PREVENT DUPLICATE: Check if we already processed this message ID
    if (processedMessageIds.has(messageId)) {
        console.log('   ⚠️ DUPLICATE message detected, ignoring:', messageId);
        return;
    }
    processedMessageIds.add(messageId);
    
    // Clean up old processed IDs
    if (processedMessageIds.size > MAX_PROCESSED_IDS) {
        const arr = Array.from(processedMessageIds);
        processedMessageIds.clear();
        arr.slice(-5000).forEach(id => processedMessageIds.add(id));
    }

    console.log('   💬 MESSAGE:', sender, '->', receiver, ':', msgContent.substring(0, 50));
    const timestamp = data.timestamp || new Date().toISOString();

    const messageData = {
        type: 'message',
        messageId,
        sender,
        receiver,
        message: msgContent,
        timestamp,
        status: 'sent',
        edited: false,
        reactions: {},
        attachments: data.attachments || []
    };

    // Store message
    messageStore.push(messageData);
    trimMessageStore();

    // If receiver is online, deliver instantly
    if (clients[receiver] && clients[receiver].ws.readyState === WebSocket.OPEN) {
        console.log('   ✅ Delivered to', receiver);
        console.log('   📤 Sending FULL message to RECEIVER only:', receiver);
        messageData.status = 'delivered';
        sendToUser(receiver, messageData);

        // Send ONLY status (not full message) to sender
        console.log('   📤 Sending STATUS ONLY to sender:', sender);
        sendToUser(sender, {
            type: 'message_status',
            messageId,
            status: 'delivered'
        });
    } else {
        // Store for offline delivery
        console.log('   💾 User', receiver, 'offline - storing message');
        if (!messageQueue[receiver]) {
            messageQueue[receiver] = [];
        }
        messageQueue[receiver].push(messageData);

        // Also send delivery confirmation to sender
        console.log('   📤 Sending STATUS ONLY to sender (receiver offline):', sender);
        sendToUser(sender, {
            type: 'message_status',
            messageId,
            status: 'sent'
        });
    }
}

function handleMessageRead(ws, data) {
    const { messageId, from, sender: originalSender } = data;
    
    if (!messageId || !from || !originalSender) {
        return;
    }
    
    console.log('   👁️ Message read:', messageId, 'by', from);

    const msg = messageStore.find(m => m.messageId === messageId);
    if (msg) {
        msg.status = 'seen';
        msg.seenAt = new Date().toISOString();
    }
    
    // Notify original sender
    sendToUser(originalSender, {
        type: 'message_status',
        messageId,
        status: 'seen'
    });
}

function handleTyping(ws, data) {
    const { user, to } = data;
    
    if (!to || !user) {
        return;
    }
    
    // Forward typing indicator to receiver
    sendToUser(to, {
        type: 'typing',
        user
    });
}

function handleEditMessage(ws, data) {
    const { messageId, newMessage, sender } = data;
    
    if (!messageId || !newMessage || !sender) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid edit request' }));
        return;
    }
    
    console.log('   ✏️ Edit message:', messageId);

    const editMsg = messageStore.find(m => m.messageId === messageId);
    if (editMsg && editMsg.sender === sender) {
        editMsg.message = newMessage;
        editMsg.edited = true;
        editMsg.editedAt = new Date().toISOString();

        // Broadcast edit to both parties
        const editData = {
            type: 'message_edited',
            messageId,
            message: newMessage,
            edited: true,
            editedAt: editMsg.editedAt
        };

        // Send to sender
        sendToUser(sender, editData);
        
        // Send to receiver
        sendToUser(editMsg.receiver, editData);
    } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Message not found or unauthorized' }));
    }
}

function handleDeleteMessage(ws, data) {
    const { messageId, sender, forEveryone } = data;
    
    if (!messageId || !sender) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid delete request' }));
        return;
    }
    
    console.log('   🗑️ Delete message:', messageId, 'forEveryone:', forEveryone);

    const deleteIndex = messageStore.findIndex(m => m.messageId === messageId);
    if (deleteIndex !== -1) {
        const deleteMsg = messageStore[deleteIndex];

        // Only sender can delete, or delete for everyone
        if (deleteMsg.sender === sender || forEveryone) {
            messageStore.splice(deleteIndex, 1);

            const deleteData = {
                type: 'message_deleted',
                messageId,
                forEveryone
            };

            // Broadcast delete to both parties
            sendToUser(sender, deleteData);
            sendToUser(deleteMsg.receiver, deleteData);
        } else {
            ws.send(JSON.stringify({ type: 'error', message: 'Unauthorized to delete this message' }));
        }
    } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Message not found' }));
    }
}

function handleReaction(ws, data) {
    const { messageId, sender, receiver, emoji } = data;
    
    if (!messageId || !sender || !emoji) {
        ws.send(JSON.stringify({ type: 'error', message: 'Invalid reaction' }));
        return;
    }
    
    console.log('   👍 Reaction:', emoji, 'on', messageId);

    const reactMsg = messageStore.find(m => m.messageId === messageId);
    if (reactMsg) {
        if (!reactMsg.reactions) reactMsg.reactions = {};
        if (!reactMsg.reactions[emoji]) reactMsg.reactions[emoji] = [];

        // Add or remove reaction (toggle)
        const userIndex = reactMsg.reactions[emoji].indexOf(sender);
        if (userIndex !== -1) {
            reactMsg.reactions[emoji].splice(userIndex, 1);
            if (reactMsg.reactions[emoji].length === 0) {
                delete reactMsg.reactions[emoji];
            }
        } else {
            reactMsg.reactions[emoji].push(sender);
        }

        // Broadcast reaction update
        const reactionData = {
            type: 'reaction_update',
            messageId,
            reactions: reactMsg.reactions
        };

        // Send to sender of reaction
        sendToUser(sender, reactionData);
        
        // Send to message receiver
        if (receiver) {
            sendToUser(receiver, reactionData);
        }
        
        // Also send to message sender if different
        if (reactMsg.sender !== sender && reactMsg.sender !== receiver) {
            sendToUser(reactMsg.sender, reactionData);
        }
    } else {
        ws.send(JSON.stringify({ type: 'error', message: 'Message not found' }));
    }
}

function handleCall(ws, data) {
    const { action, from, to, callId, isVideo, signal } = data;
    
    if (!from || !to) {
        return;
    }

    console.log('   📞 Call', action, ':', from, '->', to);

    switch(action) {
        case 'offer':
            // Start new call
            const newCallId = callId || generateCallId();
            callSessions[newCallId] = {
                from,
                to,
                status: 'offering',
                isVideo: isVideo || false,
                createdAt: Date.now()
            };
            
            sendToUser(to, {
                type: 'call',
                action: 'offer',
                callId: newCallId,
                from,
                to,
                isVideo: isVideo || false,
                signal
            });
            break;

        case 'answer':
            // Accept call
            if (callSessions[callId]) {
                callSessions[callId].status = 'active';
                sendToUser(to, {
                    type: 'call',
                    action: 'answer',
                    callId,
                    from,
                    signal
                });
            }
            break;

        case 'ice-candidate':
            // Forward ICE candidate
            sendToUser(to, {
                type: 'call',
                action: 'ice-candidate',
                callId,
                from,
                signal
            });
            break;

        case 'end':
            // End call
            if (callSessions[callId]) {
                delete callSessions[callId];
            }
            sendToUser(to, {
                type: 'call',
                action: 'end',
                callId,
                from
            });
            break;

        case 'reject':
            // Reject call
            if (callSessions[callId]) {
                delete callSessions[callId];
            }
            sendToUser(to, {
                type: 'call',
                action: 'reject',
                callId,
                from
            });
            break;
    }
}

function handleGetUsers(ws) {
    ws.send(JSON.stringify({
        type: 'user_list',
        users: Object.keys(clients).sort()
    }));
}

function handleLeave(ws, data) {
    const leaveUsername = data.user || ws.username;
    if (leaveUsername && clients[leaveUsername]) {
        handleDisconnect(ws, 'left');
    }
}

// =============================================================================
// CONNECTION CLEANUP
// =============================================================================

function handleDisconnect(ws, reason) {
    const username = ws.username || Object.keys(clients).find(u => clients[u].ws === ws);
    
    if (username) {
        // Set last seen
        lastSeen[username] = Date.now();
        delete clients[username];
        
        console.log('   ❌ USER LEFT:', username, '(' + reason + ')');
        console.log('   👥 ONLINE:', Object.keys(clients));

        // Broadcast user left
        broadcast({
            type: 'user_left',
            user: username
        });

        // Broadcast updated user list
        broadcast({
            type: 'user_list',
            users: Object.keys(clients).sort()
        });
    }
}

// =============================================================================
// PENDING MESSAGE DELIVERY
// =============================================================================

function deliverPendingMessages(username) {
    const messages = messageQueue[username];
    if (messages && messages.length > 0) {
        console.log('   📬 Delivering', messages.length, 'pending messages to', username);

        messages.forEach(msg => {
            msg.status = 'delivered';
            sendToUser(username, msg);
        });

        // Clear the queue
        delete messageQueue[username];
        console.log('   ✅ Pending messages delivered');
    }
}

// =============================================================================
// HEARTBEAT / CLEANUP
// =============================================================================

const heartbeat = setInterval(() => {
    const now = Date.now();
    
    wss.clients.forEach(ws => {
        // Check if connection is alive
        if (ws.isAlive === false) {
            console.log('   🔴 Terminating dead connection');
            return ws.terminate();
        }
        
        // Check for inactive connections (5 minutes)
        if (now - ws.lastActivity > 300000) {
            console.log('   🔴 Terminating inactive connection');
            return ws.terminate();
        }
        
        ws.isAlive = false;
        ws.ping();
    });
    
    // Clean up old call sessions (10 minutes)
    Object.keys(callSessions).forEach(callId => {
        if (now - callSessions[callId].createdAt > 600000) {
            delete callSessions[callId];
        }
    });
    
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeat);
});

// =============================================================================
// START SERVER
// =============================================================================

server.listen(PORT, '0.0.0.0', () => {
    console.log('✅ SERVER READY!');
    console.log('   🌐 HTTP: http://localhost:' + PORT);
    console.log('   🔌 WebSocket: ws://localhost:' + PORT);
    console.log('   🏥 Health: http://localhost:' + PORT + '/api/health\n');
    console.log('   👥 Online users:', Object.keys(clients));
    console.log('   💾 Pending messages:', Object.keys(messageQueue).length, 'users');
    console.log('   📦 Stored messages:', messageStore.length, '\n');
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('\n👋 SIGTERM received, shutting down gracefully...');
    clearInterval(heartbeat);
    
    // Notify all clients
    broadcast({ type: 'server_shutdown' });
    
    // Close all connections
    wss.clients.forEach(client => {
        client.close(1001, 'Server shutting down');
    });
    
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
    
    // Force exit after 5 seconds
    setTimeout(() => {
        console.log('⚠️ Force exit');
        process.exit(1);
    }, 5000);
});

process.on('SIGINT', () => {
    console.log('\n👋 SIGINT received, shutting down...');
    process.emit('SIGTERM');
});

// Error handling
process.on('uncaughtException', (err) => {
    console.error('❌ Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

module.exports = { app, server, wss };
