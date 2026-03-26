/**
 * OREO CHAT - SIMPLE WORKING VERSION
 * Real-time messaging like WhatsApp
 */

// ==================== CONFIGURATION ====================
const getServerUrl = () => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host || 'localhost:3000';
    return `${protocol}//${host}/`;
};
const SERVER_URL = getServerUrl();

// ==================== STATE ====================
let state = {
    username: null,
    profilePic: null,
    about: "Hey there! I'm using Oreo.",
    currentChat: null,
    messages: {},
    ws: null,
    isConnected: false,
    onlineUsers: [],
    theme: 'light'
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
    elements.callModal = document.getElementById('call-modal');
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
        
        // Join with username
        console.log('📤 Joining as:', state.username);
        state.ws.send(JSON.stringify({
            type: 'join',
            username: state.username
        }));
    };
    
    state.ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        console.log('📩 Received:', data);
        handleServerMessage(data);
    };
    
    state.ws.onclose = () => {
        state.isConnected = false;
        console.log('🔴 Disconnected');
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
        case 'user_list':
            state.onlineUsers = data.users.filter(u => u !== state.username);
            console.log('👥 Online users:', state.onlineUsers);
            renderOnlineUsers();
            updateConnectionStatus();
            break;
            
        case 'message':
            handleIncomingMessage(data);
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
                    if (state.currentChat === data.user) {
                        elements.chatStatus.textContent = 'online';
                    }
                }, 2000);
            }
            break;
            
        case 'call':
            handleCallMessage(data);
            break;
    }
}

function handleIncomingMessage(data) {
    const { sender, message, receiver } = data;
    console.log('💬 Message:', { sender, receiver, message, myUsername: state.username, currentChat: state.currentChat });
    
    // Save message
    saveMessage(sender, receiver, message);
    
    // Display if in chat with this person
    const shouldDisplay = (
        (sender === state.currentChat) || 
        (receiver === state.currentChat && sender === state.username)
    );
    
    console.log('Should display:', shouldDisplay);
    
    if (shouldDisplay) {
        const isMine = sender === state.username;
        console.log('Adding to UI - isMine:', isMine);
        
        appendMessage({
            sender: sender,
            message: message,
            timestamp: data.timestamp || new Date().toISOString(),
            isMine: isMine
        });
        scrollToBottom();
    }
    
    // Update contact preview
    updateContactPreview(sender, message);
}

// ==================== MESSAGING ====================
function saveMessage(sender, receiver, text) {
    const key = getChatKey(sender, receiver);
    if (!state.messages[key]) state.messages[key] = [];
    
    state.messages[key].push({
        sender, receiver, message: text,
        timestamp: new Date().toISOString()
    });
    
    if (state.messages[key].length > 1000) {
        state.messages[key] = state.messages[key].slice(-1000);
    }
    saveToStorage();
}

function getChatKey(user1, user2) {
    return [user1, user2].sort().join('::');
}

function sendChatMessage() {
    const text = elements.messageInput.value.trim();
    if (!text || !state.currentChat) return;
    
    console.log('📤 Sending:', text, 'to', state.currentChat);
    
    // Send via WebSocket
    sendMessage({
        type: 'message',
        sender: state.username,
        receiver: state.currentChat,
        message: text
    });
    
    // Save locally
    saveMessage(state.username, state.currentChat, text);
    
    // Display immediately (my message on right)
    appendMessage({
        sender: state.username,
        message: text,
        timestamp: new Date().toISOString(),
        isMine: true
    });
    
    elements.messageInput.value = '';
    scrollToBottom();
}

function appendMessage(msg) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.isMine ? 'sent' : 'received'}`;
    
    const time = formatTime(msg.timestamp);
    
    let html = '';
    if (!msg.isMine) {
        html += `<div class="message-sender">${escapeHtml(msg.sender)}</div>`;
    }
    html += `<div class="message-text">${escapeHtml(msg.message)}</div>`;
    html += `<div class="message-time">${time}</div>`;
    
    bubble.innerHTML = html;
    elements.messagesWrapper.appendChild(bubble);
    console.log('✅ Message added to UI');
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
    elements.chatStatus.textContent = 'online';
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
            isMine: msg.sender === state.username
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
        
        item.innerHTML = `
            <img src="${getDefaultAvatar()}" class="contact-avatar">
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
    }
}

// ==================== ONLINE USERS ====================
function renderOnlineUsers() {
    if (!elements.onlineUsersList) return;
    
    elements.onlineUsersList.innerHTML = '';
    
    if (state.onlineUsers.length === 0) {
        elements.onlineUsersList.innerHTML = `
            <p style="text-align:center;color:var(--text-secondary);padding:20px;">
                <i class="fas fa-user-slash" style="font-size:24px;margin-bottom:10px;display:block;"></i>
                No other users online
            </p>`;
        return;
    }
    
    state.onlineUsers.forEach(username => {
        const item = document.createElement('div');
        item.className = 'online-user-item';
        item.innerHTML = `
            <img src="${getDefaultAvatar()}" class="online-user-avatar">
            <div class="online-user-info">
                <div class="online-user-name">${escapeHtml(username)}</div>
                <div class="online-user-status">online</div>
            </div>`;
        
        item.addEventListener('click', () => {
            openChat(username);
        });
        
        elements.onlineUsersList.appendChild(item);
    });
}

// ==================== UTILITIES ====================
function formatTime(iso) {
    const date = new Date(iso);
    const now = new Date();
    const today = date.toDateString() === now.toDateString();
    return today ? 
        date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) :
        date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getDefaultAvatar() {
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(state.username || 'User')}&background=00a884&color=fff&size=128`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateConnectionStatus() {
    const status = document.querySelector('.status-text');
    if (status) status.textContent = state.isConnected ? 'online' : 'connecting...';
}

function exportChats() {
    const data = { username: state.username, date: new Date().toISOString(), messages: state.messages };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `oreo-chat-${state.username}-${Date.now()}.json`;
    a.click();
}

function clearChatHistory() {
    state.messages = {};
    saveToStorage();
    if (state.currentChat) loadChatHistory(state.currentChat);
    renderContacts();
}

function logout() {
    sendMessage({ type: 'leave', user: state.username });
    if (state.ws) state.ws.close();
    localStorage.clear();
    location.reload();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Login
    elements.loginBtn.addEventListener('click', () => {
        const username = elements.usernameInput.value.trim();
        if (!username) {
            alert('Enter a username');
            return;
        }
        if (!/^[a-zA-Z0-9_]+$/.test(username)) {
            alert('Letters, numbers, underscores only');
            return;
        }
        state.username = username;
        saveToStorage();
        showAppScreen();
    });
    
    elements.usernameInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') elements.loginBtn.click();
    });
    
    elements.loginProfilePic.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = ev => {
                state.profilePic = ev.target.result;
                elements.loginProfilePreview.innerHTML = `<img src="${state.profilePic}">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Profile
    elements.myProfileBtn.addEventListener('click', openSettings);
    elements.menuBtn.addEventListener('click', openSettings);
    
    // New chat
    elements.newChatBtn.addEventListener('click', () => {
        elements.newChatModal.classList.remove('hidden');
        renderOnlineUsers();
    });
    
    elements.newChatBackBtn.addEventListener('click', () => {
        elements.newChatModal.classList.add('hidden');
    });
    
    elements.startChatBtn.addEventListener('click', () => {
        const username = elements.manualUsername.value.trim();
        if (username) {
            openChat(username);
            elements.manualUsername.value = '';
        }
    });
    
    elements.manualUsername.addEventListener('keypress', e => {
        if (e.key === 'Enter') elements.startChatBtn.click();
    });
    
    // Back button
    elements.backBtn.addEventListener('click', closeChat);
    
    // Send message
    elements.sendBtn.addEventListener('click', sendChatMessage);
    elements.messageInput.addEventListener('keypress', e => {
        if (e.key === 'Enter') sendChatMessage();
    });
    
    // Typing
    elements.messageInput.addEventListener('input', () => {
        if (state.currentChat && state.isConnected) {
            sendMessage({ type: 'typing', user: state.username, to: state.currentChat });
        }
    });
    
    // Settings
    elements.settingsBackBtn.addEventListener('click', closeSettings);
    elements.settingsModal.querySelector('.modal-overlay').addEventListener('click', closeSettings);
    
    elements.editProfileBtn.addEventListener('click', openProfileEdit);
    elements.profileEditBackBtn.addEventListener('click', closeProfileEdit);
    elements.profileEditModal.querySelector('.modal-overlay').addEventListener('click', closeProfileEdit);
    elements.saveProfileBtn.addEventListener('click', saveProfile);
    
    elements.changeProfilePicBtn.addEventListener('click', () => elements.editProfilePicInput.click());
    elements.editProfilePicInput.addEventListener('change', e => changeProfilePicture(e.target.files[0]));
    
    elements.changeUsernameBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
        openProfileEdit();
    });
    
    elements.changeAboutBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
        openProfileEdit();
    });
    
    elements.changeChatWallpaperBtn.addEventListener('click', () => {
        const url = prompt('Enter image URL (empty for default):');
        if (url !== null) {
            if (url.trim() === '') {
                document.documentElement.style.setProperty('--chat-wallpaper', 'none');
                localStorage.removeItem('oreo_wallpaper');
            } else {
                document.documentElement.style.setProperty('--chat-wallpaper', `url(${url})`);
                localStorage.setItem('oreo_wallpaper', url);
            }
        }
    });
    
    elements.themeToggle.addEventListener('change', toggleTheme);
    elements.clearChatHistoryBtn.addEventListener('click', () => {
        if (confirm('Clear all chat history?')) clearChatHistory();
    });
    elements.exportChatsBtn.addEventListener('click', exportChats);
    elements.logoutBtn.addEventListener('click', () => {
        if (confirm('Logout?')) logout();
    });
    
    // Search
    elements.searchInput.addEventListener('input', e => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.contact-item').forEach(item => {
            const name = item.dataset.username.toLowerCase();
            item.style.display = name.includes(query) ? 'flex' : 'none';
        });
    });
    
    // Call buttons
    if (elements.voiceCallBtn) elements.voiceCallBtn.addEventListener('click', () => startCall(false));
    if (elements.videoCallBtn) elements.videoCallBtn.addEventListener('click', () => startCall(true));
    if (elements.callBackBtn) elements.callBackBtn.addEventListener('click', endCall);
    if (elements.endCallBtn) elements.endCallBtn.addEventListener('click', endCall);
    if (elements.muteBtn) elements.muteBtn.addEventListener('click', toggleMute);
    if (elements.speakerBtn) elements.speakerBtn.addEventListener('click', toggleSpeaker);
    if (elements.callModal) elements.callModal.querySelector('.modal-overlay').addEventListener('click', endCall);
}

// ==================== SETTINGS ====================
function openSettings() {
    elements.settingsUsername.textContent = state.username;
    elements.settingsAbout.textContent = state.about;
    elements.settingsProfileImg.src = state.profilePic || getDefaultAvatar();
    elements.settingsModal.classList.remove('hidden');
}

function closeSettings() {
    elements.settingsModal.classList.add('hidden');
}

function openProfileEdit() {
    elements.editUsernameInput.value = state.username;
    elements.editAboutInput.value = state.about;
    elements.editProfileImg.src = state.profilePic || getDefaultAvatar();
    elements.profileEditModal.classList.remove('hidden');
}

function closeProfileEdit() {
    elements.profileEditModal.classList.add('hidden');
}

function saveProfile() {
    const username = elements.editUsernameInput.value.trim();
    const about = elements.editAboutInput.value.trim();
    
    if (!username) { alert('Username required'); return; }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) { alert('Invalid username'); return; }
    
    state.username = username;
    state.about = about || "Hey there! I'm using Oreo.";
    saveToStorage();
    
    elements.myUsername.textContent = state.username;
    elements.settingsUsername.textContent = state.username;
    elements.settingsAbout.textContent = state.about;
    
    closeProfileEdit();
    
    // Reconnect with new username
    sendMessage({ type: 'leave', user: state.username });
    setTimeout(() => {
        if (state.ws) state.ws.close();
    }, 500);
}

function changeProfilePicture(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
        state.profilePic = e.target.result;
        saveToStorage();
        elements.myProfileImg.src = state.profilePic;
        elements.settingsProfileImg.src = state.profilePic;
        elements.editProfileImg.src = state.profilePic;
    };
    reader.readAsDataURL(file);
}

// ==================== CALLS ====================
let callState = { active: false, timer: null, startTime: null };

function startCall(isVideo) {
    if (!state.currentChat) return;
    
    callState = { active: true, with: state.currentChat, isVideo, startTime: Date.now() };
    
    elements.callUsername.textContent = state.currentChat;
    elements.callTitle.textContent = isVideo ? 'Video Call' : 'Voice Call';
    elements.callStatus.textContent = 'Calling...';
    elements.callModal.classList.remove('hidden');
    
    sendMessage({ type: 'call', action: 'start', from: state.username, to: state.currentChat, isVideo });
    
    callState.timer = setInterval(() => {
        const sec = Math.floor((Date.now() - callState.startTime) / 1000);
        const m = String(Math.floor(sec / 60)).padStart(2, '0');
        const s = String(sec % 60).padStart(2, '0');
        if (elements.callTimer) elements.callTimer.textContent = `${m}:${s}`;
    }, 1000);
}

function endCall() {
    if (!callState.active) return;
    
    sendMessage({ type: 'call', action: 'end', from: state.username, to: callState.with });
    
    if (callState.timer) clearInterval(callState.timer);
    callState = { active: false };
    elements.callModal.classList.add('hidden');
}

function toggleMute() {
    elements.muteBtn.classList.toggle('active');
}

function toggleSpeaker() {
    elements.speakerBtn.classList.toggle('active');
}

function handleCallMessage(data) {
    if (data.action === 'start') {
        if (confirm(`${data.from} is calling. Accept?`)) {
            startCall(data.isVideo);
        }
    } else if (data.action === 'end') {
        endCall();
    }
}

// ==================== START ====================
window.addEventListener('DOMContentLoaded', init);
