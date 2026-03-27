/**
 * 🍪 OREO CHAT - Complete Implementation
 * Real-time messaging with WebRTC voice/video calling
 */

// ==================== CONFIGURATION ====================
const getServerUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    return `${protocol}//${host}`;
};
const SERVER_URL = getServerUrl();

// WebRTC STUN servers
const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' }
    ]
};

// Emoji reactions available
const REACTION_EMOJIS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

// ==================== STATE ====================
let state = {
    username: null,
    profilePic: null,
    about: "Hey there! I'm using Oreo.",
    currentChat: null,
    messages: {},
    messageStatus: {},
    messageReactions: {},
    ws: null,
    isConnected: false,
    onlineUsers: [],
    theme: 'light',
    sentMessageIds: new Set(),
    typingTimeout: null,
    isSending: false,  // Prevent double-sending
    
    // Call state
    callState: {
        active: false,
        callId: null,
        peerConnection: null,
        localStream: null,
        remoteStream: null,
        isVideo: false,
        isMuted: false,
        isSpeakerOn: true,
        timer: null,
        startTime: 0,
        incomingCall: null
    }
};

// ==================== DOM ELEMENTS ====================
const elements = {};

function initElements() {
    // Login
    elements.loginScreen = document.getElementById('login-screen');
    elements.appScreen = document.getElementById('app-screen');
    elements.usernameInput = document.getElementById('username-input');
    elements.loginBtn = document.getElementById('login-btn');
    elements.loginProfilePic = document.getElementById('login-profile-pic');
    elements.loginProfilePreview = document.getElementById('login-profile-preview');

    // Main UI
    elements.myProfileImg = document.getElementById('my-profile-img');
    elements.myUsername = document.getElementById('my-username');
    elements.myProfileBtn = document.getElementById('my-profile-btn');
    elements.newChatBtn = document.getElementById('new-chat-btn');
    elements.menuBtn = document.getElementById('menu-btn');
    elements.searchInput = document.getElementById('search-input');
    elements.contactsList = document.getElementById('contacts-list');

    // Chat
    elements.welcomeScreen = document.getElementById('welcome-screen');
    elements.chatHeader = document.getElementById('chat-header');
    elements.backBtn = document.getElementById('back-btn');
    elements.chatName = document.getElementById('chat-name');
    elements.chatStatus = document.getElementById('chat-status');
    elements.chatProfileImg = document.getElementById('chat-profile-img');
    elements.messagesContainer = document.getElementById('messages-container');
    elements.messagesWrapper = document.getElementById('messages-wrapper');
    elements.messageInputContainer = document.getElementById('message-input-container');
    elements.messageInput = document.getElementById('message-input');
    elements.sendBtn = document.getElementById('send-btn');

    // Modals
    elements.settingsModal = document.getElementById('settings-modal');
    elements.settingsBackBtn = document.getElementById('settings-back-btn');
    elements.newChatModal = document.getElementById('new-chat-modal');
    elements.newChatBackBtn = document.getElementById('new-chat-back-btn');
    elements.onlineUsersList = document.getElementById('online-users');
    elements.manualUsername = document.getElementById('manual-username');
    elements.startChatBtn = document.getElementById('start-chat-btn');
    elements.profileEditModal = document.getElementById('profile-edit-modal');
    elements.confirmModal = document.getElementById('confirm-modal');
    elements.callModal = document.getElementById('call-modal');

    // Settings
    elements.settingsUsername = document.getElementById('settings-username');
    elements.settingsAbout = document.getElementById('settings-about');
    elements.settingsProfileImg = document.getElementById('settings-profile-img');
    elements.editProfileBtn = document.getElementById('edit-profile-btn');
    elements.themeToggle = document.getElementById('theme-toggle');
    elements.clearChatHistoryBtn = document.getElementById('clear-chat-history');
    elements.exportChatsBtn = document.getElementById('export-chats');
    elements.logoutBtn = document.getElementById('logout-btn');

    // Profile Edit
    elements.profileEditBackBtn = document.getElementById('profile-edit-back-btn');
    elements.saveProfileBtn = document.getElementById('save-profile-btn');
    elements.editProfileImg = document.getElementById('edit-profile-img');
    elements.editProfilePicInput = document.getElementById('edit-profile-pic-input');
    elements.editUsernameInput = document.getElementById('edit-username-input');
    elements.editAboutInput = document.getElementById('edit-about-input');

    // Confirmation
    elements.confirmTitle = document.getElementById('confirm-title');
    elements.confirmMessage = document.getElementById('confirm-message');
    elements.confirmCancel = document.getElementById('confirm-cancel');
    elements.confirmOk = document.getElementById('confirm-ok');

    // Settings options
    elements.changeProfilePicBtn = document.getElementById('change-profile-pic');
    elements.changeUsernameBtn = document.getElementById('change-username');
    elements.changeAboutBtn = document.getElementById('change-about');
    elements.changeChatWallpaperBtn = document.getElementById('change-chat-wallpaper');

    // Call modal
    elements.callBackBtn = document.getElementById('call-back-btn');
    elements.callTitle = document.getElementById('call-title');
    elements.callUsername = document.getElementById('call-username');
    elements.callStatus = document.getElementById('call-status');
    elements.endCallBtn = document.getElementById('end-call-btn');
    elements.muteBtn = document.getElementById('mute-btn');
    elements.speakerBtn = document.getElementById('speaker-btn');
    elements.callTimer = document.getElementById('call-timer');

    // Call buttons in header
    elements.voiceCallBtn = document.getElementById('voice-call-btn');
    elements.videoCallBtn = document.getElementById('video-call-btn');
    elements.chatMenuBtn = document.getElementById('chat-menu-btn');

    // Chat options modal
    elements.chatOptionsModal = document.getElementById('chat-options-modal');
    elements.chatOptionsBackBtn = document.getElementById('chat-options-back-btn');
    elements.searchInChat = document.getElementById('search-in-chat');
    elements.clearChat = document.getElementById('clear-chat');
    elements.deleteChat = document.getElementById('delete-chat');
    elements.exportChat = document.getElementById('export-chat');

    // Emoji picker
    elements.emojiBtn = document.getElementById('emoji-btn');
    elements.attachBtn = document.getElementById('attach-btn');
}

// ==================== INITIALIZATION ====================
function init() {
    initElements();
    loadFromStorage();
    setupEventListeners();
    applyTheme();

    if (state.username) {
        showAppScreen();
    }
}

// ==================== LOCAL STORAGE ====================
function loadFromStorage() {
    const data = localStorage.getItem('oreo_data');
    if (data) {
        const parsed = JSON.parse(data);
        state.username = parsed.username;
        state.profilePic = parsed.profilePic;
        state.about = parsed.about || "Hey there! I'm using Oreo.";
        state.theme = parsed.theme || 'light';
    }

    const msgs = localStorage.getItem('oreo_messages');
    if (msgs) {
        state.messages = JSON.parse(msgs);
    }
}

function saveToStorage() {
    localStorage.setItem('oreo_data', JSON.stringify({
        username: state.username,
        profilePic: state.profilePic,
        about: state.about,
        theme: state.theme
    }));
    localStorage.setItem('oreo_messages', JSON.stringify(state.messages));
}

// ==================== THEME ====================
function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    if (elements.themeToggle) {
        elements.themeToggle.checked = state.theme === 'dark';
    }
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveToStorage();
}

// ==================== SCREENS ====================
function showAppScreen() {
    elements.loginScreen.classList.add('hidden');
    elements.appScreen.classList.remove('hidden');

    elements.myUsername.textContent = state.username;
    elements.myProfileImg.src = state.profilePic || getDefaultAvatar();

    renderContacts();
    connectToServer();
}

// ==================== WEBSOCKET ====================
function connectToServer() {
    console.log('🔌 Connecting to:', SERVER_URL);

    state.ws = new WebSocket(SERVER_URL);

    state.ws.onopen = () => {
        state.isConnected = true;
        console.log('✅ Connected to server');

        state.ws.send(JSON.stringify({
            type: 'join',
            username: state.username
        }));
    };

    state.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📩 Received:', data.type, data);
        handleServerMessage(data);
    };

    state.ws.onclose = () => {
        state.isConnected = false;
        console.log('🔴 Disconnected');
        updateConnectionStatus();
        setTimeout(connectToServer, 3000);
    };

    state.ws.onerror = (error) => {
        console.error('❌ WebSocket error:', error);
    };
}

function sendMessage(data) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify(data));
        return true;
    }
    console.log('❌ Cannot send - not connected');
    return false;
}

function handleServerMessage(data) {
    switch(data.type) {
        case 'welcome':
            console.log('✅ Welcome:', data.username);
            break;
            
        case 'user_list':
            state.onlineUsers = data.users.filter(u => u !== state.username);
            console.log('👥 Online users:', state.onlineUsers);
            renderOnlineUsers();
            updateConnectionStatus();
            break;

        case 'message':
            handleIncomingMessage(data);
            break;

        case 'message_status':
            handleMessageStatus(data);
            break;

        case 'message_edited':
            handleEditedMessage(data);
            break;

        case 'message_deleted':
            handleDeletedMessage(data);
            break;

        case 'reaction_update':
            handleReactionUpdate(data);
            break;

        case 'user_joined':
            console.log('✅ User joined:', data.user);
            if (!state.onlineUsers.includes(data.user)) {
                state.onlineUsers.push(data.user);
                renderOnlineUsers();
            }
            break;

        case 'user_left':
            console.log('❌ User left:', data.user);
            state.onlineUsers = state.onlineUsers.filter(u => u !== data.user);
            renderOnlineUsers();
            break;

        case 'typing':
            if (state.currentChat === data.user) {
                elements.chatStatus.textContent = 'typing...';
                setTimeout(() => {
                    if (state.currentChat === data.user && elements.chatStatus.textContent === 'typing...') {
                        elements.chatStatus.textContent = isUserOnline(data.user) ? 'online' : 'offline';
                    }
                }, 2000);
            }
            break;

        case 'call':
            handleCallMessage(data);
            break;
            
        case 'server_shutdown':
            console.log('⚠️ Server shutting down');
            break;
    }
}

function handleIncomingMessage(data) {
    const { sender, receiver, message, messageId } = data;
    const myUsername = state.username;

    // Prevent duplicate display
    if (state.sentMessageIds.has(messageId)) {
        console.log('⚠️ Duplicate message detected, skipping');
        return;
    }

    // Save message to local storage
    saveMessage(sender, receiver, message, messageId, data.status, data.reactions);

    // Mark as seen
    state.sentMessageIds.add(messageId);

    // Clean up old message IDs
    if (state.sentMessageIds.size > 1000) {
        const arr = Array.from(state.sentMessageIds);
        state.sentMessageIds = new Set(arr.slice(-500));
    }

    // Only display if I'm the receiver
    const isForMe = (receiver === myUsername);
    if (!isForMe) return;

    // Send read receipt
    sendMessage({
        type: 'message_read',
        messageId,
        from: myUsername,
        sender: sender
    });

    // Display if currently chatting with sender
    const shouldDisplay = (state.currentChat === sender);
    if (shouldDisplay) {
        appendMessage({
            sender: sender,
            message: message,
            timestamp: data.timestamp || new Date().toISOString(),
            isMine: false,
            status: data.status || 'delivered',
            messageId,
            reactions: data.reactions || {}
        });
        scrollToBottom();
    }

    updateContactPreview(sender, message);
}

function handleMessageStatus(data) {
    const { messageId, status } = data;
    console.log('📊 Message status update:', messageId, status);

    state.messageStatus[messageId] = status;

    // Update UI if message is visible
    const msgElement = document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
    if (msgElement) {
        const timeEl = msgElement.querySelector('.message-time');
        if (timeEl) {
            const ticks = status === 'seen' ? '✓✓' : (status === 'delivered' ? '✓✓' : '✓');
            if (status === 'seen') {
                timeEl.style.color = '#34b7f1';
            }
            let timeText = timeEl.textContent.replace(/[✓]+/g, '').trim();
            timeEl.innerHTML = `${ticks} ${timeText}`;
        }
    }
}

function handleEditedMessage(data) {
    const { messageId, message, editedAt } = data;
    console.log('✏️ Message edited:', messageId);

    const msgElement = document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
    if (msgElement) {
        const textEl = msgElement.querySelector('.message-text');
        if (textEl) {
            textEl.innerHTML = `${escapeHtml(message)} <em style="color: var(--text-muted); font-size: 11px;">(edited)</em>`;
        }
    }

    updateMessageInStorage(messageId, { message, edited: true, editedAt });
}

function handleDeletedMessage(data) {
    const { messageId, forEveryone } = data;
    console.log('🗑️ Message deleted:', messageId);

    const msgElement = document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
    if (msgElement) {
        if (forEveryone) {
            msgElement.remove();
        } else {
            const textEl = msgElement.querySelector('.message-text');
            if (textEl) {
                textEl.innerHTML = '<em style="color: var(--text-muted);">This message was deleted</em>';
            }
        }
    }

    removeMessageFromStorage(messageId);
}

function handleReactionUpdate(data) {
    const { messageId, reactions } = data;
    console.log('👍 Reaction update:', messageId, reactions);

    state.messageReactions[messageId] = reactions;

    const msgElement = document.querySelector(`[data-message-id="${CSS.escape(messageId)}"]`);
    if (msgElement) {
        let reactionEl = msgElement.querySelector('.message-reactions');

        if (Object.keys(reactions).length === 0) {
            if (reactionEl) reactionEl.remove();
        } else {
            if (!reactionEl) {
                reactionEl = document.createElement('div');
                reactionEl.className = 'message-reactions';
                msgElement.appendChild(reactionEl);
            }

            reactionEl.innerHTML = Object.entries(reactions)
                .filter(([_, users]) => users.length > 0)
                .map(([emoji, users]) => `
                    <span class="reaction-badge" data-emoji="${emoji}" title="${users.join(', ')}">
                        ${emoji} ${users.length}
                    </span>
                `).join('');
        }
    }
}

function handleCallMessage(data) {
    const { action, callId, from, to, isVideo, signal } = data;
    console.log('📞 Call', action, ':', from, '->', to);

    switch(action) {
        case 'offer':
            handleIncomingCall(callId, from, isVideo, signal);
            break;
        case 'answer':
            handleCallAnswer(signal);
            break;
        case 'ice-candidate':
            handleIceCandidate(signal);
            break;
        case 'end':
            handleCallEnd();
            break;
        case 'reject':
            handleCallReject();
            break;
    }
}

// ==================== MESSAGING ====================
function saveMessage(sender, receiver, text, messageId, status, reactions) {
    const key = getChatKey(sender, receiver);
    if (!state.messages[key]) state.messages[key] = [];

    state.messages[key].push({
        sender, receiver, message: text,
        timestamp: new Date().toISOString(),
        messageId,
        status: status || 'sent',
        reactions: reactions || {}
    });

    if (state.messages[key].length > 1000) {
        state.messages[key] = state.messages[key].slice(-1000);
    }
    saveToStorage();
}

function updateMessageInStorage(messageId, updates) {
    Object.values(state.messages).forEach(msgs => {
        const msg = msgs.find(m => m.messageId === messageId);
        if (msg) {
            Object.assign(msg, updates);
            saveToStorage();
        }
    });
}

function removeMessageFromStorage(messageId) {
    Object.values(state.messages).forEach(msgs => {
        const idx = msgs.findIndex(m => m.messageId === messageId);
        if (idx !== -1) {
            msgs.splice(idx, 1);
            saveToStorage();
        }
    });
}

function getChatKey(user1, user2) {
    return [user1, user2].sort().join('::');
}

function sendChatMessage() {
    // Prevent double-sending
    if (state.isSending) {
        console.log('⚠️ Already sending, ignoring duplicate');
        return;
    }
    
    const text = elements.messageInput.value.trim();
    if (!text || !state.currentChat) return;

    const timestamp = new Date().toISOString();
    const messageId = `${state.username}-${state.currentChat}-${timestamp}-${text}`;

    // Prevent duplicate message IDs
    if (state.sentMessageIds.has(messageId)) {
        console.log('⚠️ Duplicate message ID, skipping');
        return;
    }

    console.log('📤 Sending:', text, 'to', state.currentChat, 'messageId:', messageId);

    sendMessage({
        type: 'message',
        sender: state.username,
        receiver: state.currentChat,
        message: text,
        timestamp,
        messageId
    });

    state.sentMessageIds.add(messageId);
    state.messageStatus[messageId] = 'sent';
    state.isSending = true;

    if (state.sentMessageIds.size > 1000) {
        const arr = Array.from(state.sentMessageIds);
        state.sentMessageIds = new Set(arr.slice(-500));
    }

    saveMessage(state.username, state.currentChat, text, messageId, 'sent', {});

    appendMessage({
        sender: state.username,
        message: text,
        timestamp,
        isMine: true,
        status: 'sent',
        messageId,
        reactions: {}
    });

    updateContactPreview(state.currentChat, text);

    elements.messageInput.value = '';
    scrollToBottom();

    // Reset sending flag after short delay
    setTimeout(() => {
        state.isSending = false;
    }, 300);
}

function appendMessage(msg) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.isMine ? 'sent' : 'received'}`;
    if (msg.messageId) {
        bubble.dataset.messageId = msg.messageId;
    }

    const time = formatTime(msg.timestamp);
    const ticks = msg.isMine ? getStatusTicks(msg.status) : '';
    const ticksColor = msg.status === 'seen' ? 'color: #34b7f1;' : '';

    let html = '';
    if (!msg.isMine) {
        html += `<div class="message-sender">${escapeHtml(msg.sender)}</div>`;
    }
    html += `<div class="message-text-wrapper">`;
    html += `<div class="message-text">${escapeHtml(msg.message)}</div>`;

    if (msg.reactions && Object.keys(msg.reactions).length > 0) {
        html += `<div class="message-reactions">`;
        html += Object.entries(msg.reactions)
            .filter(([_, users]) => users.length > 0)
            .map(([emoji, users]) => `
                <span class="reaction-badge" data-emoji="${emoji}" title="${users.join(', ')}">
                    ${emoji}
                </span>
            `).join('');
        html += `</div>`;
    }

    html += `</div>`;
    html += `<div class="message-meta">`;
    html += `<span class="message-time" style="${ticksColor}">${ticks} ${time}</span>`;

    if (msg.isMine) {
        html += `<button class="message-context-btn" data-message-id="${msg.messageId}" data-message-text="${escapeHtml(msg.message)}">⋮</button>`;
    }
    html += `</div>`;

    bubble.innerHTML = html;

    // Add click handler for context button
    const contextBtn = bubble.querySelector('.message-context-btn');
    if (contextBtn) {
        contextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showMessageContext(e, msg.messageId, msg.message, msg.isMine);
        });
    }

    bubble.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        showReactionPicker(e, msg.messageId);
    });

    let pressTimer;
    bubble.addEventListener('touchstart', () => {
        pressTimer = setTimeout(() => showReactionPicker({ target: bubble }, msg.messageId), 500);
    });
    bubble.addEventListener('touchend', () => clearTimeout(pressTimer));
    bubble.addEventListener('touchmove', () => clearTimeout(pressTimer));

    elements.messagesWrapper.appendChild(bubble);
    console.log('✅ Message added to UI');
}

function getStatusTicks(status) {
    switch(status) {
        case 'seen': return '✓✓';
        case 'delivered': return '✓✓';
        case 'sent': return '✓';
        default: return '✓';
    }
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function openChat(username) {
    state.currentChat = username;

    elements.welcomeScreen.classList.add('hidden');
    elements.chatHeader.classList.remove('hidden');
    elements.messagesContainer.classList.remove('hidden');
    elements.messageInputContainer.classList.remove('hidden');

    elements.chatName.textContent = username;
    elements.chatStatus.textContent = isUserOnline(username) ? 'online' : 'offline';
    elements.chatProfileImg.src = getDefaultAvatar();

    loadChatHistory(username);
    elements.messageInput.focus();

    elements.newChatModal.classList.add('hidden');
}

function loadChatHistory(username) {
    const messages = getMessagesForChat(username);
    elements.messagesWrapper.innerHTML = '';

    messages.forEach(msg => {
        appendMessage({
            sender: msg.sender,
            message: msg.message,
            timestamp: msg.timestamp,
            isMine: msg.sender === state.username,
            status: msg.status || 'sent',
            messageId: msg.messageId,
            reactions: msg.reactions || {}
        });
    });
    scrollToBottom();
}

function closeChat() {
    state.currentChat = null;
    elements.welcomeScreen.classList.remove('hidden');
    elements.chatHeader.classList.add('hidden');
    elements.messagesContainer.classList.add('hidden');
    elements.messageInputContainer.classList.add('hidden');
    elements.messagesWrapper.innerHTML = '';
}

function getMessagesForChat(otherUser) {
    const key = getChatKey(state.username, otherUser);
    return state.messages[key] || [];
}

function isUserOnline(username) {
    return state.onlineUsers.includes(username);
}

// ==================== CONTACTS ====================
function renderContacts() {
    if (!elements.contactsList) return;

    const contacts = getUniqueContacts();
    elements.contactsList.innerHTML = '';

    if (contacts.length === 0) {
        elements.contactsList.innerHTML = `
            <div style="padding:40px;text-align:center;color:var(--text-secondary);">
                <i class="fas fa-comments" style="font-size:48px;margin-bottom:16px;opacity:0.5;"></i>
                <p>No chats yet</p>
                <p style="font-size:13px;">Click + to start a new conversation</p>
            </div>`;
        return;
    }

    contacts.forEach(contact => {
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.dataset.username = contact.username;

        const lastMsg = contact.lastMessage;
        const time = lastMsg ? formatTime(lastMsg.timestamp) : '';
        const preview = lastMsg ? lastMsg.message : 'Start a conversation';
        const online = isUserOnline(contact.username);

        item.innerHTML = `
            <div style="position:relative;">
                <img src="${getDefaultAvatar()}" class="contact-avatar">
                ${online ? '<span class="online-indicator"></span>' : ''}
            </div>
            <div class="contact-info">
                <div class="contact-header">
                    <span class="contact-name">${escapeHtml(contact.username)}</span>
                    <span class="contact-time">${time}</span>
                </div>
                <div class="contact-preview">${escapeHtml(preview)}</div>
            </div>`;

        item.addEventListener('click', () => openChat(contact.username));
        elements.contactsList.appendChild(item);
    });
}

function getUniqueContacts() {
    const map = new Map();
    Object.keys(state.messages).forEach(key => {
        const msgs = state.messages[key];
        if (!msgs.length) return;

        const [u1, u2] = key.split('::');
        const other = u1 === state.username ? u2 : u1;
        const last = msgs[msgs.length - 1];

        if (!map.has(other) || new Date(last.timestamp) > new Date(map.get(other).lastMessage.timestamp)) {
            map.set(other, { username: other, lastMessage: last });
        }
    });

    return Array.from(map.values()).sort((a, b) =>
        new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );
}

function updateContactPreview(username, message) {
    const item = elements.contactsList.querySelector(`[data-username="${CSS.escape(username)}"]`);
    if (item) {
        item.querySelector('.contact-preview').textContent = message;
        item.querySelector('.contact-time').textContent = formatTime(new Date());
        elements.contactsList.insertBefore(item, elements.contactsList.firstChild);
    } else {
        addNewContactToList(username, message);
    }
}

function addNewContactToList(username, message) {
    const existing = elements.contactsList.querySelector(`[data-username="${CSS.escape(username)}"]`);
    if (existing) return;

    const item = document.createElement('div');
    item.className = 'contact-item';
    item.dataset.username = username;

    const online = isUserOnline(username);
    item.innerHTML = `
        <div style="position:relative;">
            <img src="${getDefaultAvatar()}" class="contact-avatar">
            ${online ? '<span class="online-indicator"></span>' : ''}
        </div>
        <div class="contact-info">
            <div class="contact-header">
                <span class="contact-name">${escapeHtml(username)}</span>
                <span class="contact-time">now</span>
            </div>
            <div class="contact-preview">${escapeHtml(message)}</div>
        </div>`;

    item.addEventListener('click', () => openChat(username));
    elements.contactsList.insertBefore(item, elements.contactsList.firstChild);
}

function renderOnlineUsers() {
    if (!elements.onlineUsersList) return;

    elements.onlineUsersList.innerHTML = '';

    if (state.onlineUsers.length === 0) {
        elements.onlineUsersList.innerHTML = '<p style="padding:20px;text-align:center;color:var(--text-secondary);">No other users online</p>';
        return;
    }

    state.onlineUsers.forEach(user => {
        const item = document.createElement('div');
        item.className = 'online-user-item';
        item.innerHTML = `
            <div style="position:relative;display:inline-block;">
                <img src="${getDefaultAvatar()}" class="online-user-avatar">
                <span class="online-indicator"></span>
            </div>
            <span class="online-user-name">${escapeHtml(user)}</span>`;

        item.addEventListener('click', () => {
            openChat(user);
            elements.newChatModal.classList.add('hidden');
        });
        elements.onlineUsersList.appendChild(item);
    });
}

function updateConnectionStatus() {
    const statusEl = document.querySelector('.status-text');
    if (statusEl) {
        statusEl.textContent = state.isConnected ? 'Online' : 'Disconnected';
        statusEl.style.color = state.isConnected ? '#10b981' : '#ef4444';
    }
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Login
    elements.loginBtn?.addEventListener('click', handleLogin);
    elements.usernameInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLogin();
    });
    elements.loginProfilePic?.addEventListener('change', handleProfilePicUpload);

    // Main UI
    elements.myProfileBtn?.addEventListener('click', () => {
        elements.settingsModal.classList.remove('hidden');
    });
    elements.newChatBtn?.addEventListener('click', openNewChatModal);
    elements.menuBtn?.addEventListener('click', () => {
        elements.settingsModal.classList.remove('hidden');
    });
    elements.searchInput?.addEventListener('input', handleSearch);

    // Chat
    elements.backBtn?.addEventListener('click', closeChat);
    elements.sendBtn?.addEventListener('click', sendChatMessage);
    elements.messageInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();  // Prevent form submission
            sendChatMessage();
        }
    });
    elements.messageInput?.addEventListener('input', handleTyping);

    // Call buttons
    elements.voiceCallBtn?.addEventListener('click', () => startCall(false));
    elements.videoCallBtn?.addEventListener('click', () => startCall(true));

    // Chat header menu (3 dots)
    elements.chatMenuBtn?.addEventListener('click', openChatOptions);

    // Settings
    elements.settingsBackBtn?.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
    });
    elements.themeToggle?.addEventListener('change', toggleTheme);
    elements.clearChatHistoryBtn?.addEventListener('click', clearChatHistory);
    elements.exportChatsBtn?.addEventListener('click', exportChats);
    elements.logoutBtn?.addEventListener('click', handleLogout);

    // Profile Edit
    elements.editProfileBtn?.addEventListener('click', openProfileEdit);
    elements.profileEditBackBtn?.addEventListener('click', () => {
        elements.profileEditModal.classList.add('hidden');
    });
    elements.saveProfileBtn?.addEventListener('click', saveProfileEdit);
    elements.editProfilePicInput?.addEventListener('change', handleEditProfilePic);

    // New Chat Modal
    elements.newChatBackBtn?.addEventListener('click', () => {
        elements.newChatModal.classList.add('hidden');
    });
    elements.startChatBtn?.addEventListener('click', startManualChat);
    elements.manualUsername?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') startManualChat();
    });

    // Confirmation modal
    elements.confirmCancel?.addEventListener('click', () => {
        elements.confirmModal.classList.add('hidden');
    });
    elements.confirmOk?.addEventListener('click', () => {
        if (state.confirmCallback) state.confirmCallback();
        elements.confirmModal.classList.add('hidden');
    });

    // Settings options
    elements.changeProfilePicBtn?.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
        elements.profileEditModal.classList.remove('hidden');
        elements.editProfilePicInput.click();
    });
    elements.changeUsernameBtn?.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
        elements.profileEditModal.classList.remove('hidden');
        elements.editUsernameInput.focus();
    });
    elements.changeAboutBtn?.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
        elements.profileEditModal.classList.remove('hidden');
        elements.editAboutInput.focus();
    });

    // Call modal
    elements.callBackBtn?.addEventListener('click', endCall);
    elements.endCallBtn?.addEventListener('click', endCall);
    elements.muteBtn?.addEventListener('click', toggleMute);
    elements.speakerBtn?.addEventListener('click', toggleSpeaker);

    // Chat options modal
    elements.chatOptionsBackBtn?.addEventListener('click', () => {
        elements.chatOptionsModal.classList.add('hidden');
    });
    elements.searchInChat?.addEventListener('click', searchInChat);
    elements.clearChat?.addEventListener('click', () => {
        elements.chatOptionsModal.classList.add('hidden');
        clearChat();
    });
    elements.deleteChat?.addEventListener('click', () => {
        elements.chatOptionsModal.classList.add('hidden');
        deleteChat();
    });
    elements.exportChat?.addEventListener('click', () => {
        elements.chatOptionsModal.classList.add('hidden');
        exportChat();
    });
}

// ==================== LOGIN ====================
function handleLogin() {
    const username = elements.usernameInput.value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }

    state.username = username;
    state.profilePic = null;

    // Check if profile pic was uploaded
    const picInput = document.getElementById('login-profile-pic');
    if (picInput && picInput.files && picInput.files[0]) {
        const reader = new FileReader();
        reader.onload = (e) => {
            state.profilePic = e.target.result;
            saveToStorage();
            showAppScreen();
        };
        reader.readAsDataURL(picInput.files[0]);
    } else {
        saveToStorage();
        showAppScreen();
    }
}

function handleProfilePicUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = e.target.result;
        elements.loginProfilePreview.innerHTML = `<img src="${img}" alt="Profile">`;
        elements.loginProfilePreview.dataset.image = img;
    };
    reader.readAsDataURL(file);
}

// ==================== TYPING INDICATOR ====================
function handleTyping() {
    if (!state.currentChat) return;

    if (state.typingTimeout) {
        clearTimeout(state.typingTimeout);
    }

    sendMessage({
        type: 'typing',
        user: state.username,
        to: state.currentChat
    });

    state.typingTimeout = setTimeout(() => {
        state.typingTimeout = null;
    }, 3000);
}

// ==================== SEARCH ====================
function handleSearch(e) {
    const query = e.target.value.toLowerCase();
    const items = elements.contactsList.querySelectorAll('.contact-item');

    items.forEach(item => {
        const name = item.dataset.username.toLowerCase();
        if (name.includes(query)) {
            item.style.display = '';
        } else {
            item.style.display = 'none';
        }
    });
}

// ==================== NEW CHAT ====================
function openNewChatModal() {
    elements.newChatModal.classList.remove('hidden');
    renderOnlineUsers();
}

function startManualChat() {
    const username = elements.manualUsername.value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }

    openChat(username);
    elements.manualUsername.value = '';
}

// ==================== PROFILE EDIT ====================
function openProfileEdit() {
    elements.settingsModal.classList.add('hidden');
    elements.profileEditModal.classList.remove('hidden');

    elements.editProfileImg.src = state.profilePic || getDefaultAvatar();
    elements.editUsernameInput.value = state.username;
    elements.editAboutInput.value = state.about;
}

function handleEditProfilePic(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        elements.editProfileImg.src = e.target.result;
        elements.editProfileImg.dataset.image = e.target.result;
    };
    reader.readAsDataURL(file);
}

function saveProfileEdit() {
    const newPic = elements.editProfileImg.dataset.image;
    const newUsername = elements.editUsernameInput.value.trim();
    const newAbout = elements.editAboutInput.value.trim();

    if (newUsername) {
        state.username = newUsername;
    }
    if (newPic) {
        state.profilePic = newPic;
    }
    if (newAbout) {
        state.about = newAbout;
    }

    saveToStorage();
    elements.profileEditModal.classList.add('hidden');

    // Update UI
    elements.myUsername.textContent = state.username;
    elements.myProfileImg.src = state.profilePic || getDefaultAvatar();
    elements.settingsUsername.textContent = state.username;
    elements.settingsAbout.textContent = state.about;
    elements.settingsProfileImg.src = state.profilePic || getDefaultAvatar();

    // Reconnect with new username
    if (state.ws) {
        state.ws.send(JSON.stringify({ type: 'leave', user: state.username }));
    }
    setTimeout(() => {
        connectToServer();
    }, 500);
}

// ==================== SETTINGS ====================
function clearChatHistory() {
    showConfirmation('Clear Chat History?', 'This will delete all your messages. This cannot be undone.', () => {
        state.messages = {};
        saveToStorage();
        renderContacts();
        if (state.currentChat) {
            loadChatHistory(state.currentChat);
        }
    });
}

function exportChats() {
    const data = {
        username: state.username,
        exportDate: new Date().toISOString(),
        messages: state.messages
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oreo-chat-export-${state.username}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function handleLogout() {
    showConfirmation('Logout?', 'You will need to login again to continue chatting.', () => {
        if (state.ws) {
            state.ws.send(JSON.stringify({ type: 'leave', user: state.username }));
        }
        localStorage.removeItem('oreo_data');
        localStorage.removeItem('oreo_messages');
        window.location.reload();
    });
}

function showConfirmation(title, message, callback) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    state.confirmCallback = callback;
    elements.confirmModal.classList.remove('hidden');
}

// ==================== CHAT OPTIONS ====================
function openChatOptions() {
    if (!state.currentChat) {
        alert('Please open a chat first');
        return;
    }
    elements.chatOptionsModal.classList.remove('hidden');
}

function searchInChat() {
    const query = prompt('Search in chat:');
    if (!query || !state.currentChat) return;

    const messages = getMessagesForChat(state.currentChat);
    const results = messages.filter(msg => 
        msg.message.toLowerCase().includes(query.toLowerCase())
    );

    if (results.length === 0) {
        alert(`No messages found containing "${query}"`);
    } else {
        alert(`Found ${results.length} message(s) containing "${query}"`);
        // Highlight first result
        highlightSearchResults(query);
    }
}

function highlightSearchResults(query) {
    // Remove existing highlights
    document.querySelectorAll('.search-highlight').forEach(el => {
        el.classList.remove('search-highlight');
        el.style.background = '';
    });

    // Highlight matching messages
    const messages = elements.messagesWrapper.querySelectorAll('.message-bubble');
    messages.forEach(bubble => {
        const textEl = bubble.querySelector('.message-text');
        if (textEl && textEl.textContent.toLowerCase().includes(query.toLowerCase())) {
            textEl.style.background = '#fef08a';
            textEl.classList.add('search-highlight');
            bubble.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    });
}

function clearChat() {
    if (!state.currentChat) return;

    showConfirmation('Clear Chat?', `This will delete all messages with ${state.currentChat} for you. This cannot be undone.`, () => {
        // Clear messages for this chat from local storage
        const key = getChatKey(state.username, state.currentChat);
        delete state.messages[key];
        saveToStorage();

        // Clear UI
        elements.messagesWrapper.innerHTML = '';
        
        // Update contacts list
        renderContacts();

        alert('Chat cleared successfully');
    });
}

function deleteChat() {
    if (!state.currentChat) return;

    showConfirmation('Delete Chat?', `This will delete the entire conversation with ${state.currentChat}. This cannot be undone.`, () => {
        // Clear messages for this chat from local storage
        const key = getChatKey(state.username, state.currentChat);
        delete state.messages[key];
        saveToStorage();

        // Close chat
        closeChat();

        // Update contacts list
        renderContacts();

        alert('Chat deleted successfully');
    });
}

function exportChat() {
    if (!state.currentChat) {
        alert('Please open a chat first');
        return;
    }

    const messages = getMessagesForChat(state.currentChat);
    
    if (messages.length === 0) {
        alert('No messages to export');
        return;
    }

    // Format messages for export
    let exportText = `Chat with ${state.currentChat}\n`;
    exportText += `Exported on: ${new Date().toLocaleString()}\n`;
    exportText += '='.repeat(50) + '\n\n';

    messages.forEach(msg => {
        const timestamp = new Date(msg.timestamp).toLocaleString();
        const sender = msg.sender === state.username ? 'You' : msg.sender;
        exportText += `[${timestamp}] ${sender}: ${msg.message}\n`;
    });

    // Download as text file
    const blob = new Blob([exportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chat-${state.currentChat}-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);

    alert('Chat exported successfully!');
}

// ==================== MESSAGE CONTEXT MENU ====================
function showMessageContext(event, messageId, messageText, isMine) {
    // Remove any existing context menu
    const existingMenu = document.querySelector('.message-context-menu');
    if (existingMenu) {
        existingMenu.remove();
    }

    // Create context menu
    const menu = document.createElement('div');
    menu.className = 'message-context-menu';
    menu.innerHTML = `
        <div class="context-menu-item" data-action="react">
            <i class="far fa-smile"></i>
            <span>Add Reaction</span>
        </div>
        ${isMine ? `
        <div class="context-menu-item" data-action="edit">
            <i class="fas fa-pen"></i>
            <span>Edit</span>
        </div>
        <div class="context-menu-item" data-action="delete_me">
            <i class="fas fa-trash"></i>
            <span>Delete for Me</span>
        </div>
        <div class="context-menu-item" data-action="delete_all">
            <i class="fas fa-trash-alt"></i>
            <span>Delete for Everyone</span>
        </div>
        ` : ''}
        <div class="context-menu-item" data-action="copy">
            <i class="fas fa-copy"></i>
            <span>Copy Text</span>
        </div>
    `;

    // Position menu near the button
    const rect = event.target.getBoundingClientRect();
    menu.style.position = 'fixed';
    menu.style.top = (rect.bottom + 5) + 'px';
    menu.style.left = (rect.right - 150) + 'px';
    menu.style.zIndex = '1000';

    document.body.appendChild(menu);

    // Handle menu clicks
    menu.addEventListener('click', (e) => {
        const item = e.target.closest('.context-menu-item');
        if (!item) return;

        const action = item.dataset.action;
        handleContextMenuAction(action, messageId, messageText);
        menu.remove();
    });

    // Close menu when clicking elsewhere
    setTimeout(() => {
        document.addEventListener('click', function closeMenu(e) {
            if (!menu.contains(e.target)) {
                menu.remove();
                document.removeEventListener('click', closeMenu);
            }
        });
    }, 100);
}

function handleContextMenuAction(action, messageId, messageText) {
    switch(action) {
        case 'react':
            const emoji = prompt('Enter emoji reaction (e.g., 👍, ❤️, 😂):', '👍');
            if (emoji && state.currentChat) {
                sendMessage({
                    type: 'reaction',
                    messageId,
                    sender: state.username,
                    receiver: state.currentChat,
                    emoji
                });
            }
            break;

        case 'edit':
            const newText = prompt('Edit message:', messageText);
            if (newText && newText !== messageText) {
                sendMessage({
                    type: 'edit_message',
                    messageId,
                    newMessage: newText,
                    sender: state.username
                });
            }
            break;

        case 'delete_me':
            showConfirmation('Delete for You?', 'This will delete the message only for you.', () => {
                sendMessage({
                    type: 'delete_message',
                    messageId,
                    sender: state.username,
                    forEveryone: false
                });
            });
            break;

        case 'delete_all':
            showConfirmation('Delete for Everyone?', 'This will delete the message for all participants.', () => {
                sendMessage({
                    type: 'delete_message',
                    messageId,
                    sender: state.username,
                    forEveryone: true
                });
            });
            break;

        case 'copy':
            navigator.clipboard.writeText(messageText).then(() => {
                alert('Message copied to clipboard!');
            }).catch(() => {
                // Fallback for older browsers
                const textarea = document.createElement('textarea');
                textarea.value = messageText;
                document.body.appendChild(textarea);
                textarea.select();
                document.execCommand('copy');
                document.body.removeChild(textarea);
                alert('Message copied to clipboard!');
            });
            break;
    }
}

function showReactionPicker(e, messageId) {
    // Simple prompt-based reaction
    const emoji = prompt('React with emoji:', '👍');
    if (emoji && REACTION_EMOJIS.includes(emoji)) {
        sendMessage({
            type: 'reaction',
            messageId,
            sender: state.username,
            receiver: state.currentChat,
            emoji
        });
    }
}

// ==================== WEBRTC CALLING (WhatsApp-like) ====================

// Enhanced WebRTC configuration with more STUN servers
const RTC_CONFIG = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'stun:stun2.l.google.com:19302' },
        { urls: 'stun:stun3.l.google.com:19302' },
        { urls: 'stun:stun4.l.google.com:19302' },
        { urls: 'stun:stun.services.mozilla.com' }
    ],
    iceCandidatePoolSize: 10,
    bundlePolicy: 'max-bundle',
    rtcpMuxPolicy: 'require'
};

let callTimeout = null;
let iceCandidatesQueue = [];

async function startCall(isVideo) {
    if (!state.currentChat) {
        alert('Please select a user to call');
        return;
    }
    if (state.callState.active || state.callState.callId) {
        alert('Call already in progress');
        return;
    }

    const peer = state.currentChat;
    console.log('📞 Starting', isVideo ? 'video' : 'voice', 'call with', peer);

    try {
        // Show calling UI immediately
        showCallingUI(peer, isVideo);

        // Get media stream FIRST
        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: isVideo ? {
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 },
                facingMode: 'user'
            } : false
        };

        console.log('🎤 Requesting media access...');
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Media access granted');
        state.callState.localStream = stream;
        state.callState.isVideo = isVideo;

        // Create peer connection
        createPeerConnection(peer);

        // Add local stream tracks to peer connection
        stream.getTracks().forEach(track => {
            console.log('📺 Adding track:', track.kind);
            state.callState.peerConnection.addTrack(track, stream);
        });

        // Create offer
        const offer = await state.callState.peerConnection.createOffer({
            offerToReceiveAudio: true,
            offerToReceiveVideo: isVideo
        });
        await state.callState.peerConnection.setLocalDescription(offer);
        console.log('📝 Local description set (offer)');

        // Wait for ICE candidates to gather
        await waitForIceGathering();

        // Send offer via signaling server
        const callId = generateCallId();
        state.callState.callId = callId;
        state.callState.peerUsername = peer;

        console.log('📞 Sending call offer to', peer);
        sendMessage({
            type: 'call',
            action: 'offer',
            callId,
            from: state.username,
            to: peer,
            isVideo,
            signal: state.callState.peerConnection.localDescription
        });

        // Set call timeout (60 seconds)
        callTimeout = setTimeout(() => {
            if (!state.callState.active) {
                console.log('⏰ Call timeout - no answer');
                alert('Call was not answered');
                endCall();
            }
        }, 60000);

    } catch (error) {
        console.error('❌ Call error:', error);
        endCall();
        if (error.name === 'NotAllowedError') {
            alert('Microphone/Camera access denied. Please allow access and try again.');
        } else if (error.name === 'NotFoundError') {
            alert('No microphone/camera found on this device.');
        } else {
            alert('Could not start call: ' + error.message);
        }
    }
}

function handleIncomingCall(callId, from, isVideo, signal) {
    console.log('📞 Incoming call from', from, isVideo ? '(video)' : '(voice)');

    if (state.callState.active || state.callState.callId) {
        // Already in a call, reject
        sendMessage({
            type: 'call',
            action: 'reject',
            callId,
            from: state.username,
            to: from
        });
        alert('You are already in a call');
        return;
    }

    state.callState.incomingCall = { callId, from, isVideo, signal };

    // Show incoming call UI with accept/reject buttons
    showIncomingCallUI(from, isVideo);
}

function showIncomingCallUI(from, isVideo) {
    elements.callModal.classList.remove('hidden');
    elements.callUsername.textContent = from;
    elements.callTitle.textContent = isVideo ? 'Video Call' : 'Voice Call';
    elements.callStatus.textContent = 'Incoming call...';
    elements.callTimer.textContent = '';

    // Show accept/reject buttons
    const controlsHtml = `
        <div class="call-controls">
            <button class="call-btn reject-btn" id="incoming-reject-btn" style="background:#ef4444;color:white;">
                <i class="fas fa-phone-slash"></i>
                <span>Decline</span>
            </button>
            <button class="call-btn accept-btn" id="incoming-accept-btn" style="background:#10b981;color:white;">
                <i class="fas fa-phone"></i>
                <span>Accept</span>
            </button>
        </div>
    `;

    // Replace controls
    const existingControls = document.querySelector('.call-controls');
    if (existingControls) {
        existingControls.outerHTML = controlsHtml;
    }

    // Add event listeners
    setTimeout(() => {
        document.getElementById('incoming-reject-btn')?.addEventListener('click', () => {
            rejectCall(state.callState.incomingCall.callId, state.callState.incomingCall.from);
        });
        document.getElementById('incoming-accept-btn')?.addEventListener('click', () => {
            acceptCall(state.callState.incomingCall.callId, state.callState.incomingCall.from, 
                      state.callState.incomingCall.isVideo, state.callState.incomingCall.signal);
        });
    }, 100);
}

async function acceptCall(callId, from, isVideo, signal) {
    console.log('✅ Accepting call from', from);

    // Remove accept/reject buttons, show normal controls
    elements.callStatus.textContent = 'Connecting...';
    const controls = document.querySelector('.call-controls');
    if (controls) {
        controls.outerHTML = `
            <div class="call-controls">
                <button class="call-btn mute-btn" id="mute-btn">
                    <i class="fas fa-microphone"></i>
                    <span>Mute</span>
                </button>
                <button class="call-btn speaker-btn" id="speaker-btn">
                    <i class="fas fa-volume-up"></i>
                    <span>Speaker</span>
                </button>
                <button class="call-btn end-btn" id="end-call-btn">
                    <i class="fas fa-phone-slash"></i>
                    <span>End</span>
                </button>
            </div>
        `;
    }

    state.callState.callId = callId;
    state.callState.isVideo = isVideo;
    state.callState.peerUsername = from;

    try {
        const constraints = {
            audio: {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true
            },
            video: isVideo ? {
                width: { ideal: 640, max: 1280 },
                height: { ideal: 480, max: 720 },
                facingMode: 'user'
            } : false
        };

        console.log('🎤 Requesting media for answer...');
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        console.log('✅ Media obtained for answer');
        state.callState.localStream = stream;

        createPeerConnection(from);

        // Add tracks
        stream.getTracks().forEach(track => {
            state.callState.peerConnection.addTrack(track, stream);
        });

        // Set remote description (the offer)
        await state.callState.peerConnection.setRemoteDescription(new RTCSessionDescription(signal));
        console.log('📝 Remote description set (offer)');

        // Create answer
        const answer = await state.callState.peerConnection.createAnswer();
        await state.callState.peerConnection.setLocalDescription(answer);
        console.log('📝 Local description set (answer)');

        // Wait for ICE candidates
        await waitForIceGathering();

        // Send answer
        sendMessage({
            type: 'call',
            action: 'answer',
            callId,
            from: state.username,
            to: from,
            signal: state.callState.peerConnection.localDescription
        });

        // Setup call UI
        setupCallControls();
        
        // Show video if video call
        if (isVideo) {
            setupVideoElements();
        }

    } catch (error) {
        console.error('❌ Call accept error:', error);
        endCall();
        alert('Could not accept call: ' + error.message);
    }
}

function rejectCall(callId, from) {
    console.log('❌ Rejecting call from', from);
    sendMessage({
        type: 'call',
        action: 'reject',
        callId,
        from: state.username,
        to: from
    });
    state.callState.incomingCall = null;
    elements.callModal.classList.add('hidden');
}

function handleCallAnswer(signal) {
    console.log('📞 Call answered by peer, processing answer...');
    
    if (callTimeout) {
        clearTimeout(callTimeout);
        callTimeout = null;
    }

    if (state.callState.peerConnection && signal) {
        state.callState.peerConnection.setRemoteDescription(new RTCSessionDescription(signal))
            .then(() => console.log('📝 Remote description set (answer)'))
            .catch(e => console.error('❌ Error setting remote description:', e));
    }
}

function handleIceCandidate(signal) {
    console.log('📡 ICE candidate received');
    
    if (!signal) return;
    
    if (state.callState.peerConnection) {
        state.callState.peerConnection.addIceCandidate(new RTCIceCandidate(signal))
            .then(() => console.log('✅ ICE candidate added'))
            .catch(e => console.error('❌ ICE candidate error:', e));
    } else {
        // Queue for later
        iceCandidatesQueue.push(signal);
    }
}

function handleCallEnd() {
    console.log('📞 Call ended by peer');
    if (callTimeout) {
        clearTimeout(callTimeout);
        callTimeout = null;
    }
    endCall();
}

function handleCallReject() {
    console.log('📞 Call rejected by peer');
    if (callTimeout) {
        clearTimeout(callTimeout);
        callTimeout = null;
    }
    alert('Call was rejected by the recipient.');
    endCall();
}

function createPeerConnection(peer) {
    console.log('🔗 Creating peer connection to', peer);
    
    const pc = new RTCPeerConnection(RTC_CONFIG);

    // ICE candidate handler
    pc.onicecandidate = (e) => {
        if (e.candidate) {
            console.log('📡 Sending ICE candidate');
            sendMessage({
                type: 'call',
                action: 'ice-candidate',
                callId: state.callState.callId,
                from: state.username,
                to: peer,
                signal: e.candidate
            });
        }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
        console.log('📡 Connection state:', pc.connectionState);
        
        switch(pc.connectionState) {
            case 'connecting':
                elements.callStatus.textContent = 'Connecting...';
                break;
            case 'connected':
                console.log('✅ Call connected!');
                elements.callStatus.textContent = 'Connected';
                state.callState.active = true;
                state.callState.startTime = Date.now();
                startCallTimer();
                break;
            case 'disconnected':
            case 'failed':
                console.log('❌ Call failed/disconnected');
                elements.callStatus.textContent = 'Call ended';
                setTimeout(() => endCall(), 1000);
                break;
            case 'closed':
                console.log('📞 Call closed');
                break;
        }
    };

    // Handle incoming tracks (remote stream)
    pc.ontrack = (e) => {
        console.log('📺 Remote track received:', e.track.kind);
        state.callState.remoteStream = e.streams[0];
        
        // Attach to video element if exists
        const remoteVideo = document.getElementById('remote-video');
        if (remoteVideo) {
            remoteVideo.srcObject = e.streams[0];
            console.log('📺 Remote stream attached to video element');
        }
    };

    // Handle ICE connection state
    pc.oniceconnectionstatechange = () => {
        console.log('🧊 ICE state:', pc.iceConnectionState);
    };

    // Process queued ICE candidates
    iceCandidatesQueue.forEach(candidate => {
        pc.addIceCandidate(new RTCIceCandidate(candidate));
    });
    iceCandidatesQueue = [];

    state.callState.peerConnection = pc;
    console.log('✅ Peer connection created');
}

// Wait for ICE gathering to complete
function waitForIceGathering() {
    return new Promise((resolve) => {
        if (state.callState.peerConnection.iceGatheringState === 'complete') {
            resolve();
        } else {
            const checkState = () => {
                if (state.callState.peerConnection.iceGatheringState === 'complete') {
                    state.callState.peerConnection.removeEventListener('icegatheringstatechange', checkState);
                    resolve();
                }
            };
            state.callState.peerConnection.addEventListener('icegatheringstatechange', checkState);
            // Timeout after 2 seconds anyway
            setTimeout(resolve, 2000);
        }
    });
}

function showCallingUI(peer, isVideo) {
    elements.callModal.classList.remove('hidden');
    elements.callUsername.textContent = peer;
    elements.callTitle.textContent = isVideo ? 'Video Call' : 'Voice Call';
    elements.callStatus.textContent = 'Calling...';
    elements.callTimer.textContent = '';

    // Show calling controls (just end button)
    const controlsHtml = `
        <div class="call-controls">
            <button class="call-btn end-btn" id="end-call-btn">
                <i class="fas fa-phone-slash"></i>
                <span>Cancel</span>
            </button>
        </div>
    `;

    const existingControls = document.querySelector('.call-controls');
    if (existingControls) {
        existingControls.outerHTML = controlsHtml;
    }

    // Setup end button
    setTimeout(() => {
        document.getElementById('end-call-btn')?.addEventListener('click', endCall);
    }, 100);

    // Show video preview for video calls
    if (isVideo) {
        setupVideoElements();
    }
}

function setupCallControls() {
    elements.callStatus.textContent = 'Connected';
    
    const controlsHtml = `
        <div class="call-controls">
            <button class="call-btn mute-btn" id="mute-btn">
                <i class="fas fa-microphone"></i>
                <span>Mute</span>
            </button>
            <button class="call-btn speaker-btn" id="speaker-btn">
                <i class="fas fa-volume-up"></i>
                <span>Speaker</span>
            </button>
            <button class="call-btn end-btn" id="end-call-btn">
                <i class="fas fa-phone-slash"></i>
                <span>End</span>
            </button>
        </div>
    `;

    const existingControls = document.querySelector('.call-controls');
    if (existingControls) {
        existingControls.outerHTML = controlsHtml;
    }

    // Setup button handlers
    setTimeout(() => {
        document.getElementById('end-call-btn')?.addEventListener('click', endCall);
        document.getElementById('mute-btn')?.addEventListener('click', toggleMute);
        document.getElementById('speaker-btn')?.addEventListener('click', toggleSpeaker);
    }, 100);
}

function setupVideoElements() {
    let videoContainer = document.querySelector('.call-video-container');
    if (!videoContainer) {
        videoContainer = document.createElement('div');
        videoContainer.className = 'call-video-container';
        videoContainer.innerHTML = `
            <video id="remote-video" autoplay playsinline style="width:100%;height:100%;object-fit:cover;border-radius:12px;background:#000;"></video>
            <video id="local-video" autoplay playsinline muted style="position:absolute;bottom:20px;right:20px;width:100px;height:140px;object-fit:cover;border-radius:8px;border:2px solid white;box-shadow:0 4px 12px rgba(0,0,0,0.3);"></video>
        `;
        const callContent = document.querySelector('.call-content');
        if (callContent) {
            callContent.insertBefore(videoContainer, callContent.firstChild);
            callContent.classList.add('has-video');
        }
    }

    // Attach local stream
    if (state.callState.localStream) {
        const localVideo = document.getElementById('local-video');
        if (localVideo) {
            localVideo.srcObject = state.callState.localStream;
            console.log('📺 Local stream attached');
        }
    }

    // Attach remote stream if available
    if (state.callState.remoteStream) {
        const remoteVideo = document.getElementById('remote-video');
        if (remoteVideo) {
            remoteVideo.srcObject = state.callState.remoteStream;
            console.log('📺 Remote stream attached');
        }
    }
}

function endCall() {
    console.log('📞 Ending call');

    if (callTimeout) {
        clearTimeout(callTimeout);
        callTimeout = null;
    }

    // Send end signal
    if (state.callState.callId && state.callState.peerUsername) {
        sendMessage({
            type: 'call',
            action: 'end',
            callId: state.callState.callId,
            from: state.username,
            to: state.callState.peerUsername
        });
    }

    // Close peer connection
    if (state.callState.peerConnection) {
        state.callState.peerConnection.close();
        state.callState.peerConnection = null;
    }

    // Stop local stream
    if (state.callState.localStream) {
        state.callState.localStream.getTracks().forEach(track => {
            track.stop();
        });
        state.callState.localStream = null;
    }

    // Stop timer
    if (state.callState.timer) {
        clearInterval(state.callState.timer);
        state.callState.timer = null;
    }

    // Remove video container
    const videoContainer = document.querySelector('.call-video-container');
    if (videoContainer) {
        videoContainer.remove();
    }

    // Remove has-video class
    const callContent = document.querySelector('.call-content');
    if (callContent) {
        callContent.classList.remove('has-video');
    }

    // Reset state
    state.callState.active = false;
    state.callState.callId = null;
    state.callState.peerUsername = null;
    state.callState.incomingCall = null;
    state.callState.startTime = 0;

    // Hide call UI
    elements.callModal.classList.add('hidden');
    
    // Reset call status
    elements.callTimer.textContent = '';
}

function toggleMute() {
    if (!state.callState.localStream) return;

    const audioTrack = state.callState.localStream.getAudioTracks()[0];
    if (audioTrack) {
        state.callState.isMuted = !state.callState.isMuted;
        audioTrack.enabled = !state.callState.isMuted;

        const muteBtn = document.getElementById('mute-btn');
        if (muteBtn) {
            muteBtn.innerHTML = state.callState.isMuted 
                ? '<i class="fas fa-microphone-slash"></i><span>Unmute</span>'
                : '<i class="fas fa-microphone"></i><span>Mute</span>';
            muteBtn.style.background = state.callState.isMuted ? '#ef4444' : '';
            muteBtn.style.color = 'white';
        }
        console.log('🎤 Mute toggled:', state.callState.isMuted);
    }
}

function toggleSpeaker() {
    state.callState.isSpeakerOn = !state.callState.isSpeakerOn;
    
    const speakerBtn = document.getElementById('speaker-btn');
    if (speakerBtn) {
        speakerBtn.innerHTML = state.callState.isSpeakerOn
            ? '<i class="fas fa-volume-up"></i><span>Speaker</span>'
            : '<i class="fas fa-volume-mute"></i><span>Earpiece</span>';
        speakerBtn.style.background = state.callState.isSpeakerOn ? '#00a884' : '';
        speakerBtn.style.color = 'white';
    }
    
    // Note: Actual speaker selection requires device selection API
    console.log('🔊 Speaker toggled:', state.callState.isSpeakerOn);
}

function startCallTimer() {
    const updateTimer = () => {
        const elapsed = Math.floor((Date.now() - state.callState.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60).toString().padStart(2, '0');
        const seconds = (elapsed % 60).toString().padStart(2, '0');
        elements.callTimer.textContent = `${minutes}:${seconds}`;
    };

    updateTimer();
    state.callState.timer = setInterval(updateTimer, 1000);
}

function generateCallId() {
    return `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ==================== UTILITIES ====================
function formatTime(timestamp) {
    if (!timestamp) return '';
    try {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
        return '';
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function getDefaultAvatar() {
    return 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect fill="%2300a884" width="100" height="100" rx="50"/><text x="50" y="65" font-size="50" text-anchor="middle" fill="white">👤</text></svg>';
}

// ==================== START APP ====================
document.addEventListener('DOMContentLoaded', init);
