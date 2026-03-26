/**
 * Oreo Web - Private Real-Time Messaging Application
 * 
 * Features:
 * - Real-time messaging via WebSocket
 * - Profile pictures stored in localStorage
 * - Chat history saved locally
 * - Settings panel with theme toggle
 * - WhatsApp-like UI
 */

// ==================== CONFIGURATION ====================
// Use relative URL - works both locally and on Render
const getServerUrl = () => {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.host || 'localhost:3000';
  return `${protocol}//${host}/`;
};
const SERVER_URL = getServerUrl();

// ==================== STATE MANAGEMENT ====================
const state = {
    username: null,
    profilePic: null,
    about: "Hey there! I'm using Oreo.",
    currentChat: null,
    contacts: [],
    messages: {}, // { username: [messages] }
    ws: null,
    isConnected: false,
    onlineUsers: [],
    theme: 'light',
    typingTimeout: null
};

// ==================== DOM ELEMENTS ====================
const elements = {
    // Screens
    loginScreen: document.getElementById('login-screen'),
    appScreen: document.getElementById('app-screen'),
    welcomeScreen: document.getElementById('welcome-screen'),
    
    // Login
    loginProfilePreview: document.getElementById('login-profile-preview'),
    loginProfilePic: document.getElementById('login-profile-pic'),
    usernameInput: document.getElementById('username-input'),
    loginBtn: document.getElementById('login-btn'),
    
    // Sidebar
    myProfileImg: document.getElementById('my-profile-img'),
    myUsername: document.getElementById('my-username'),
    myProfileBtn: document.getElementById('my-profile-btn'),
    newChatBtn: document.getElementById('new-chat-btn'),
    menuBtn: document.getElementById('menu-btn'),
    searchInput: document.getElementById('search-input'),
    contactsList: document.getElementById('contacts-list'),
    
    // Chat
    chatHeader: document.getElementById('chat-header'),
    backBtn: document.getElementById('back-btn'),
    chatProfileImg: document.getElementById('chat-profile-img'),
    chatName: document.getElementById('chat-name'),
    chatStatus: document.getElementById('chat-status'),
    messagesContainer: document.getElementById('messages-container'),
    messagesWrapper: document.getElementById('messages-wrapper'),
    messageInputContainer: document.getElementById('message-input-container'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    emojiBtn: document.getElementById('emoji-btn'),
    attachBtn: document.getElementById('attach-btn'),
    
    // Settings Modal
    settingsModal: document.getElementById('settings-modal'),
    settingsBackBtn: document.getElementById('settings-back-btn'),
    settingsProfileImg: document.getElementById('settings-profile-img'),
    settingsUsername: document.getElementById('settings-username'),
    settingsAbout: document.getElementById('settings-about'),
    editProfileBtn: document.getElementById('edit-profile-btn'),
    themeToggle: document.getElementById('theme-toggle'),
    
    // New Chat Modal
    newChatModal: document.getElementById('new-chat-modal'),
    newChatBackBtn: document.getElementById('new-chat-back-btn'),
    newChatSearch: document.getElementById('new-chat-search'),
    onlineUsers: document.getElementById('online-users'),
    manualUsername: document.getElementById('manual-username'),
    startChatBtn: document.getElementById('start-chat-btn'),
    
    // Profile Edit Modal
    profileEditModal: document.getElementById('profile-edit-modal'),
    profileEditBackBtn: document.getElementById('profile-edit-back-btn'),
    saveProfileBtn: document.getElementById('save-profile-btn'),
    editProfileImg: document.getElementById('edit-profile-img'),
    editProfilePicInput: document.getElementById('edit-profile-pic-input'),
    editUsernameInput: document.getElementById('edit-username-input'),
    editAboutInput: document.getElementById('edit-about-input'),
    
    // Confirmation Modal
    confirmModal: document.getElementById('confirm-modal'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmCancel: document.getElementById('confirm-cancel'),
    confirmOk: document.getElementById('confirm-ok'),
    
    // Settings Options
    changeProfilePicBtn: document.getElementById('change-profile-pic'),
    changeUsernameBtn: document.getElementById('change-username'),
    changeAboutBtn: document.getElementById('change-about'),
    changeChatWallpaperBtn: document.getElementById('change-chat-wallpaper'),
    toggleThemeBtn: document.getElementById('toggle-theme'),
    clearChatHistoryBtn: document.getElementById('clear-chat-history'),
    exportChatsBtn: document.getElementById('export-chats'),
    logoutBtn: document.getElementById('logout-btn')
};

// ==================== INITIALIZATION ====================
function init() {
    loadFromStorage();
    loadWallpaper();
    setupEventListeners();
    applyTheme();

    // Check if user is already logged in
    if (state.username) {
        showAppScreen();
    }
}

// ==================== LOCAL STORAGE ====================
function loadFromStorage() {
    const savedData = localStorage.getItem('oreo_user_data');
    if (savedData) {
        const data = JSON.parse(savedData);
        state.username = data.username;
        state.profilePic = data.profilePic;
        state.about = data.about || "Hey there! I'm using Oreo.";
        state.theme = data.theme || 'light';
    }

    // Load messages
    const savedMessages = localStorage.getItem('oreo_messages');
    if (savedMessages) {
        state.messages = JSON.parse(savedMessages);
    }

    // Load contacts
    const savedContacts = localStorage.getItem('oreo_contacts');
    if (savedContacts) {
        state.contacts = JSON.parse(savedContacts);
    }
}

function loadWallpaper() {
    const savedWallpaper = localStorage.getItem('oreo_chat_wallpaper');
    if (savedWallpaper) {
        document.documentElement.style.setProperty('--chat-wallpaper', `url(${savedWallpaper})`);
    }
}

function saveToStorage() {
    const userData = {
        username: state.username,
        profilePic: state.profilePic,
        about: state.about,
        theme: state.theme
    };
    localStorage.setItem('oreo_user_data', JSON.stringify(userData));
    localStorage.setItem('oreo_messages', JSON.stringify(state.messages));
    localStorage.setItem('oreo_contacts', JSON.stringify(state.contacts));
}

// ==================== THEME ====================
function applyTheme() {
    document.documentElement.setAttribute('data-theme', state.theme);
    elements.themeToggle.checked = state.theme === 'dark';
}

function toggleTheme() {
    state.theme = state.theme === 'light' ? 'dark' : 'light';
    applyTheme();
    saveToStorage();
}

// ==================== AUTHENTICATION ====================
function login() {
    const username = elements.usernameInput.value.trim();
    if (!username) {
        alert('Please enter a username');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        alert('Username can only contain letters, numbers, and underscores');
        return;
    }
    
    state.username = username;
    saveToStorage();
    showAppScreen();
    connectToServer();
}

function logout() {
    if (state.ws) {
        state.ws.close();
    }
    state.username = null;
    state.currentChat = null;
    state.isConnected = false;
    state.onlineUsers = [];
    localStorage.clear();
    location.reload();
}

// ==================== SCREEN NAVIGATION ====================
function showAppScreen() {
    elements.loginScreen.classList.add('hidden');
    elements.appScreen.classList.remove('hidden');
    
    // Update profile
    elements.myUsername.textContent = state.username;
    elements.myProfileImg.src = state.profilePic || getDefaultAvatar();
    
    // Render contacts
    renderContacts();
}

// ==================== WEBSOCKET CONNECTION ====================
function connectToServer() {
    console.log('🔌 Attempting to connect to WebSocket:', SERVER_URL);
    
    try {
        state.ws = new WebSocket(SERVER_URL);

        state.ws.onopen = function() {
            state.isConnected = true;
            console.log('✅ WebSocket Connected:', SERVER_URL);
            console.log('👤 Username:', state.username);

            // Send join message immediately
            const joinData = { type: 'join', username: state.username };
            console.log('📤 Sending join:', joinData);
            sendMessage(joinData);

            // Request user list
            setTimeout(() => {
                console.log('📤 Requesting user list...');
                sendMessage({ type: 'get_users' });
            }, 500);
        };

        state.ws.onmessage = function(event) {
            try {
                const data = JSON.parse(event.data);
                console.log('📩 Received from server:', data);
                handleServerMessage(data);
            } catch (e) {
                console.error('❌ Error parsing message:', e);
            }
        };

        state.ws.onclose = function() {
            state.isConnected = false;
            console.log('🔴 WebSocket Disconnected');
            updateConnectionStatus();

            // Auto-reconnect after 3 seconds
            setTimeout(() => {
                if (!state.ws || state.ws.readyState === WebSocket.CLOSED) {
                    console.log('🔄 Attempting to reconnect...');
                    connectToServer();
                }
            }, 3000);
        };

        state.ws.onerror = function(error) {
            console.error('❌ WebSocket Error:', error);
            console.log('WebSocket readyState:', state.ws.readyState);
        };

    } catch (e) {
        console.error('❌ Connection error:', e);
        state.isConnected = false;
    }
}

function sendMessage(data) {
    if (state.ws && state.ws.readyState === WebSocket.OPEN) {
        state.ws.send(JSON.stringify(data));
    }
}

function handleServerMessage(data) {
    console.log('Received:', data);
    
    switch(data.type) {
        case 'user_list':
            handleUserList(data.users || []);
            break;
            
        case 'message':
            handleIncomingMessage(data);
            break;
            
        case 'join':
            handleUserJoin(data.user);
            break;
            
        case 'leave':
            handleUserLeave(data.user);
            break;
            
        case 'typing':
            handleTypingIndicator(data.user);
            break;
            
        case 'error':
            console.error('Server error:', data.message);
            break;
    }
}

function handleUserList(users) {
    console.log('📋 Received user list:', users);
    state.onlineUsers = users.filter(u => u !== state.username);
    console.log('👥 Online users (excluding self):', state.onlineUsers);
    renderOnlineUsers();
    updateConnectionStatus();
}

function handleIncomingMessage(data) {
    const { sender, message, receiver } = data;
    
    // Save message to local storage
    saveMessage(sender, receiver, message);
    
    // If we're currently chatting with this person, display the message
    if (state.currentChat === sender) {
        appendMessage({
            sender: sender,
            message: message,
            timestamp: new Date().toISOString(),
            isMine: false
        });
        scrollToBottom();
    }
    
    // Update contact list
    updateContactPreview(sender, message);
    
    // Show browser notification
    if (document.hidden && state.currentChat !== sender) {
        showNotification(sender, message);
    }
}

function handleUserJoin(user) {
    console.log(`${user} joined`);
    if (!state.onlineUsers.includes(user)) {
        state.onlineUsers.push(user);
        renderOnlineUsers();
    }
}

function handleUserLeave(user) {
    console.log(`${user} left`);
    state.onlineUsers = state.onlineUsers.filter(u => u !== user);
    renderOnlineUsers();
}

function handleTypingIndicator(user) {
    if (state.currentChat === user) {
        elements.chatStatus.textContent = 'typing...';
        setTimeout(() => {
            if (state.currentChat === user) {
                elements.chatStatus.textContent = 'online';
            }
        }, 2000);
    }
}

// ==================== MESSAGING ====================
function saveMessage(sender, receiver, text) {
    const key = getChatKey(sender, receiver);
    
    if (!state.messages[key]) {
        state.messages[key] = [];
    }
    
    state.messages[key].push({
        sender: sender,
        receiver: receiver,
        message: text,
        timestamp: new Date().toISOString()
    });
    
    // Keep only last 1000 messages per chat
    if (state.messages[key].length > 1000) {
        state.messages[key] = state.messages[key].slice(-1000);
    }
    
    saveToStorage();
}

function getChatKey(user1, user2) {
    return [user1, user2].sort().join('::');
}

function getMessagesForChat(otherUser) {
    const key = getChatKey(state.username, otherUser);
    return state.messages[key] || [];
}

function sendChatMessage() {
    const text = elements.messageInput.value.trim();
    if (!text || !state.currentChat) return;
    
    // Send via WebSocket
    sendMessage({
        type: 'message',
        sender: state.username,
        receiver: state.currentChat,
        message: text
    });
    
    // Save locally
    saveMessage(state.username, state.currentChat, text);
    
    // Display immediately
    appendMessage({
        sender: state.username,
        message: text,
        timestamp: new Date().toISOString(),
        isMine: true
    });
    
    // Clear input
    elements.messageInput.value = '';
    scrollToBottom();
}

function appendMessage(msg) {
    const bubble = document.createElement('div');
    bubble.className = `message-bubble ${msg.isMine ? 'sent' : 'received'}`;
    
    const time = formatTime(msg.timestamp);
    
    let html = '';
    
    // Show sender name for received messages
    if (!msg.isMine) {
        html += `<div class="message-sender">${escapeHtml(msg.sender)}</div>`;
    }
    
    html += `<div class="message-text">${escapeHtml(msg.message)}</div>`;
    html += `<div class="message-time">${time}</div>`;
    
    bubble.innerHTML = html;
    elements.messagesWrapper.appendChild(bubble);
}

function scrollToBottom() {
    elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function openChat(username) {
    state.currentChat = username;
    
    // Hide welcome, show chat
    elements.welcomeScreen.classList.add('hidden');
    elements.chatHeader.classList.remove('hidden');
    elements.messagesContainer.classList.remove('hidden');
    elements.messageInputContainer.classList.remove('hidden');
    
    // Update header
    elements.chatName.textContent = username;
    elements.chatStatus.textContent = 'online';
    elements.chatProfileImg.src = getDefaultAvatar(); // Could load from contacts
    
    // Load chat history
    loadChatHistory(username);
    
    // Focus input
    elements.messageInput.focus();
    
    // Update active contact
    updateActiveContact();
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
    
    updateActiveContact();
}

// ==================== CONTACTS ====================
function renderContacts() {
    const contacts = getUniqueContacts();
    elements.contactsList.innerHTML = '';
    
    if (contacts.length === 0) {
        elements.contactsList.innerHTML = `
            <div style="padding: 40px; text-align: center; color: var(--text-secondary);">
                <i class="fas fa-comments" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
                <p>No chats yet</p>
                <p style="font-size: 13px;">Click + to start a new conversation</p>
            </div>
        `;
        return;
    }
    
    contacts.forEach(contact => {
        const lastMsg = contact.lastMessage;
        const time = lastMsg ? formatTime(lastMsg.timestamp) : '';
        const preview = lastMsg ? lastMsg.message : 'Start a conversation';
        
        const item = document.createElement('div');
        item.className = 'contact-item';
        item.dataset.username = contact.username;
        item.innerHTML = `
            <img src="${getDefaultAvatar()}" alt="${contact.username}" class="contact-avatar">
            <div class="contact-info">
                <div class="contact-header">
                    <span class="contact-name">${escapeHtml(contact.username)}</span>
                    <span class="contact-time">${time}</span>
                </div>
                <div class="contact-preview">${escapeHtml(preview)}</div>
            </div>
        `;
        
        item.addEventListener('click', () => openChat(contact.username));
        elements.contactsList.appendChild(item);
    });
}

function getUniqueContacts() {
    const contactMap = new Map();
    
    Object.keys(state.messages).forEach(key => {
        const msgs = state.messages[key];
        if (msgs.length === 0) return;
        
        const [user1, user2] = key.split('::');
        const otherUser = user1 === state.username ? user2 : user1;
        
        const lastMsg = msgs[msgs.length - 1];
        
        if (!contactMap.has(otherUser) || 
            new Date(lastMsg.timestamp) > new Date(contactMap.get(otherUser).lastMessage.timestamp)) {
            contactMap.set(otherUser, {
                username: otherUser,
                lastMessage: lastMsg
            });
        }
    });
    
    return Array.from(contactMap.values()).sort((a, b) => 
        new Date(b.lastMessage.timestamp) - new Date(a.lastMessage.timestamp)
    );
}

function updateContactPreview(username, message) {
    const item = elements.contactsList.querySelector(`[data-username="${CSS.escape(username)}"]`);
    if (item) {
        const preview = item.querySelector('.contact-preview');
        const time = item.querySelector('.contact-time');
        preview.textContent = message;
        time.textContent = formatTime(new Date().toISOString());
        
        // Move to top
        elements.contactsList.insertBefore(item, elements.contactsList.firstChild);
    }
}

function updateActiveContact() {
    document.querySelectorAll('.contact-item').forEach(item => {
        item.classList.toggle('active', item.dataset.username === state.currentChat);
    });
}

// ==================== ONLINE USERS ====================
function renderOnlineUsers() {
    console.log('🎨 Rendering online users:', state.onlineUsers);
    
    if (!elements.onlineUsers) {
        console.error('❌ elements.onlineUsers is null!');
        return;
    }
    
    elements.onlineUsers.innerHTML = '';

    if (state.onlineUsers.length === 0) {
        elements.onlineUsers.innerHTML = `
            <p style="text-align: center; color: var(--text-secondary); padding: 20px;">
                <i class="fas fa-user-slash" style="font-size: 24px; margin-bottom: 10px; display: block;"></i>
                No other users online
            </p>
        `;
        console.log('ℹ️ No other users to display');
        return;
    }

    state.onlineUsers.forEach(username => {
        const item = document.createElement('div');
        item.className = 'online-user-item';
        item.innerHTML = `
            <img src="${getDefaultAvatar()}" alt="${username}" class="online-user-avatar">
            <div class="online-user-info">
                <div class="online-user-name">${escapeHtml(username)}</div>
                <div class="online-user-status">online</div>
            </div>
        `;

        item.addEventListener('click', () => {
            openChat(username);
            elements.newChatModal.classList.add('hidden');
        });

        elements.onlineUsers.appendChild(item);
    });
    
    console.log('✅ Rendered', state.onlineUsers.length, 'online users');
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
    const newUsername = elements.editUsernameInput.value.trim();
    const newAbout = elements.editAboutInput.value.trim();
    
    if (!newUsername) {
        alert('Username cannot be empty');
        return;
    }
    
    if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        alert('Username can only contain letters, numbers, and underscores');
        return;
    }
    
    state.username = newUsername;
    state.about = newAbout || "Hey there! I'm using Oreo.";
    
    saveToStorage();
    updateProfileUI();
    closeProfileEdit();
    
    // Reconnect with new username
    if (state.ws) {
        state.ws.close();
    }
    setTimeout(() => connectToServer(), 500);
}

function updateProfileUI() {
    elements.myUsername.textContent = state.username;
    elements.settingsUsername.textContent = state.username;
    elements.settingsAbout.textContent = state.about;
}

function changeProfilePicture(file) {
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(e) {
        state.profilePic = e.target.result;
        saveToStorage();
        
        // Update all profile images
        elements.myProfileImg.src = state.profilePic;
        elements.settingsProfileImg.src = state.profilePic;
        elements.editProfileImg.src = state.profilePic;
    };
    reader.readAsDataURL(file);
}

// ==================== UTILITIES ====================
function formatTime(isoString) {
    const date = new Date(isoString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    
    if (isToday) {
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else {
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
}

function getDefaultAvatar() {
    // Generate a default avatar using UI Avatars
    const name = state.username || 'User';
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=00a884&color=fff&size=128`;
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(title, body) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
            body: body,
            icon: getDefaultAvatar()
        });
    }
}

function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

function updateConnectionStatus() {
    const status = state.isConnected ? 'online' : 'connecting...';
    document.querySelector('.status-text').textContent = status;
}

// ==================== EXPORT/IMPORT ====================
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

function clearChatHistory() {
    state.messages = {};
    saveToStorage();
    
    if (state.currentChat) {
        loadChatHistory(state.currentChat);
    }
    
    renderContacts();
}

// ==================== EVENT LISTENERS ====================
function setupEventListeners() {
    // Login
    elements.loginBtn.addEventListener('click', login);
    elements.usernameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') login();
    });
    
    elements.loginProfilePic.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                state.profilePic = ev.target.result;
                elements.loginProfilePreview.innerHTML = `<img src="${state.profilePic}" alt="Profile">`;
            };
            reader.readAsDataURL(file);
        }
    });
    
    // Profile button
    elements.myProfileBtn.addEventListener('click', openSettings);
    
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
            elements.newChatModal.classList.add('hidden');
            elements.manualUsername.value = '';
        }
    });
    
    elements.manualUsername.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            elements.startChatBtn.click();
        }
    });
    
    // Menu
    elements.menuBtn.addEventListener('click', openSettings);
    
    // Back button
    elements.backBtn.addEventListener('click', closeChat);
    
    // Send message
    elements.sendBtn.addEventListener('click', sendChatMessage);
    elements.messageInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            sendChatMessage();
        }
    });
    
    // Typing indicator
    elements.messageInput.addEventListener('input', () => {
        if (state.currentChat && state.isConnected) {
            sendMessage({
                type: 'typing',
                user: state.username
            });
        }
    });
    
    // Settings
    elements.settingsBackBtn.addEventListener('click', closeSettings);
    elements.settingsModal.querySelector('.modal-overlay').addEventListener('click', closeSettings);
    
    // Profile edit
    elements.editProfileBtn.addEventListener('click', openProfileEdit);
    elements.profileEditBackBtn.addEventListener('click', closeProfileEdit);
    elements.profileEditModal.querySelector('.modal-overlay').addEventListener('click', closeProfileEdit);
    elements.saveProfileBtn.addEventListener('click', saveProfile);
    
    // Change profile picture
    elements.changeProfilePicBtn.addEventListener('click', () => {
        elements.editProfilePicInput.click();
    });

    elements.editProfilePicInput.addEventListener('change', (e) => {
        changeProfilePicture(e.target.files[0]);
    });

    // Change username - open profile edit modal
    elements.changeUsernameBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
        openProfileEdit();
    });

    // Change about - open profile edit modal
    elements.changeAboutBtn.addEventListener('click', () => {
        elements.settingsModal.classList.add('hidden');
        openProfileEdit();
    });

    // Change chat wallpaper
    elements.changeChatWallpaperBtn.addEventListener('click', () => {
        const wallpaper = prompt('Enter wallpaper URL (or leave empty for default):');
        if (wallpaper !== null) {
            if (wallpaper.trim() === '') {
                document.documentElement.style.setProperty('--chat-wallpaper', 'none');
                localStorage.removeItem('oreo_chat_wallpaper');
            } else {
                document.documentElement.style.setProperty('--chat-wallpaper', `url(${wallpaper})`);
                localStorage.setItem('oreo_chat_wallpaper', wallpaper);
            }
        }
    });

    // Theme toggle
    elements.themeToggle.addEventListener('change', toggleTheme);
    
    // Clear chat history
    elements.clearChatHistoryBtn.addEventListener('click', () => {
        showConfirmModal(
            'Clear Chat History',
            'This will delete all your chat messages. This action cannot be undone.',
            () => {
                clearChatHistory();
                elements.confirmModal.classList.add('hidden');
            }
        );
    });
    
    // Export chats
    elements.exportChatsBtn.addEventListener('click', exportChats);
    
    // Logout
    elements.logoutBtn.addEventListener('click', () => {
        showConfirmModal(
            'Logout',
            'Are you sure you want to logout? All local data will be cleared.',
            logout
        );
    });
    
    // Search
    elements.searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('.contact-item').forEach(item => {
            const name = item.dataset.username.toLowerCase();
            item.style.display = name.includes(query) ? 'flex' : 'none';
        });
    });
    
    // Request notification permission on first interaction
    document.addEventListener('click', requestNotificationPermission, { once: true });
    
    // Handle browser close
    window.addEventListener('beforeunload', () => {
        if (state.ws) {
            sendMessage({ type: 'leave', user: state.username });
            state.ws.close();
        }
    });
}

// ==================== CONFIRMATION MODAL ====================
let confirmCallback = null;

function showConfirmModal(title, message, onConfirm) {
    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;
    confirmCallback = onConfirm;
    elements.confirmModal.classList.remove('hidden');
}

elements.confirmCancel.addEventListener('click', () => {
    elements.confirmModal.classList.add('hidden');
    confirmCallback = null;
});

elements.confirmOk.addEventListener('click', () => {
    if (confirmCallback) {
        confirmCallback();
    }
    elements.confirmModal.classList.add('hidden');
    confirmCallback = null;
});

elements.confirmModal.querySelector('.modal-overlay').addEventListener('click', () => {
    elements.confirmModal.classList.add('hidden');
    confirmCallback = null;
});

// ==================== START APP ====================
init();
