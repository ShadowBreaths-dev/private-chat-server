# 🍪 Oreo Web - Private Real-Time Messaging

A WhatsApp-like web application for private real-time messaging.

---

## 🚀 Quick Start

### Option 1: Using Node.js Server (Recommended)

1. **Open terminal in the webapp folder:**
   ```bash
   cd C:\Users\shado\Desktop\Oreo\webapp
   ```

2. **Start the server:**
   ```bash
   node server.js
   ```

3. **Open your browser:**
   ```
   http://localhost:3000
   ```

### Option 2: Using Python

1. **Open terminal in the webapp folder:**
   ```bash
   cd C:\Users\shado\Desktop\Oreo\webapp
   ```

2. **Start Python HTTP server:**
   ```bash
   python -m http.server 3000
   ```

3. **Open your browser:**
   ```
   http://localhost:3000
   ```

### Option 3: Direct File (Limited)

Simply open `index.html` in your browser. Note: Some features may not work due to CORS restrictions.

---

## 📋 Features

### ✅ Login & Profile
- [x] Username-based authentication (no signup required)
- [x] Profile picture upload (stored in browser localStorage)
- [x] Custom "About" status
- [x] Edit profile anytime

### ✅ Messaging
- [x] Real-time messaging via WebSocket
- [x] Messages appear automatically (no refresh needed)
- [x] Full chat history loaded when opening a chat
- [x] Messages saved locally in browser localStorage
- [x] Typing indicators
- [x] Online/offline status

### ✅ Contacts
- [x] See online users
- [x] Search contacts
- [x] Recent chats sorted by last message
- [x] Message preview in contact list

### ✅ Settings
- [x] Dark/Light theme toggle
- [x] Change profile picture
- [x] Change username
- [x] Edit about status
- [x] Clear chat history
- [x] Export chats (JSON download)
- [x] Logout

### ✅ UI/UX
- [x] WhatsApp-like design
- [x] Responsive layout
- [x] Smooth animations
- [x] Browser notifications
- [x] Message timestamps
- [x] Scroll to bottom on new message

---

## 📁 Project Structure

```
webapp/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # WhatsApp-like styling
├── js/
│   └── app.js          # All application logic
├── server.js           # Simple HTTP server
└── README.md           # This file
```

---

## 💾 Data Storage

All data is stored **locally** in your browser's localStorage:

| Data | Key | Description |
|------|-----|-------------|
| User Data | `oreo_user_data` | Username, profile pic, about, theme |
| Messages | `oreo_messages` | All chat messages |
| Contacts | `oreo_contacts` | Contact list |

**Privacy:** Your data never leaves your device except for real-time message transmission.

---

## 🎨 Settings Explained

### Account Settings
- **Change Profile Picture**: Upload a new photo from your device
- **Change Username**: Update your display name (reconnects to server)
- **About**: Edit your status message

### Appearance Settings
- **Dark Theme**: Toggle between light and dark mode
- **Chat Wallpaper**: (Future feature)

### Privacy Settings
- **Clear Chat History**: Delete all messages locally
- **Export Chats**: Download your messages as JSON

---

## 🧪 Testing Instructions

### Test Real-Time Messaging

1. **Open two browser windows/tabs:**
   - Window 1: `http://localhost:3000`
   - Window 2: `http://localhost:3000`

2. **Login with different usernames:**
   - Window 1: `alice`
   - Window 2: `bob`

3. **Start chatting:**
   - In Window 1: Click menu → New Chat → Type "bob" → Start Chat
   - In Window 2: Click menu → New Chat → Type "alice" → Start Chat

4. **Send messages:**
   - Type in Window 1 → Message appears instantly in Window 2
   - Type in Window 2 → Message appears instantly in Window 1

5. **Verify storage:**
   - Refresh either window → Chat history still there!
   - Open Settings → Export Chats → See all messages

### Test Profile Features

1. **Upload profile picture:**
   - Click your profile → Edit Profile → Change Photo
   - Select an image → Save
   - Picture is saved and persists after refresh!

2. **Change theme:**
   - Click your profile → Toggle "Dark Theme"
   - Theme switches instantly and saves!

3. **Edit about:**
   - Click your profile → Edit Profile → Change "About"
   - Save → Status updates!

### Test Settings

1. **Export Chats:**
   - Settings → Export Chats
   - JSON file downloads with all messages

2. **Clear History:**
   - Settings → Clear Chat History → Confirm
   - All messages deleted locally

3. **Logout:**
   - Settings → Logout → Confirm
   - Returns to login screen, all data cleared

---

## 🔧 Troubleshooting

### "Cannot connect to server"
- Check your internet connection
- Server might be sleeping (Render free tier)
- Visit https://private-chat-server-v663.onrender.com to wake it

### "Messages not appearing"
- Make sure both users are logged in with different usernames
- Check browser console (F12) for errors
- Verify WebSocket connection in Network tab

### "Profile picture not saving"
- Browser localStorage might be full
- Try clearing browser data and retry
- Use a smaller image

### "Dark theme not working"
- Make sure JavaScript is enabled
- Try refreshing the page

---

## 🌐 Server Connection

The app connects to:
```
wss://private-chat-server-v663.onrender.com/
```

This server is already deployed and handles:
- User connections
- Message routing
- Online user lists

---

## 📝 Message Format

Messages are stored as:
```json
{
  "sender": "alice",
  "receiver": "bob",
  "message": "Hello!",
  "timestamp": "2026-03-26T21:45:30.123Z"
}
```

---

## 🎯 Key Features Working

| Feature | Status |
|---------|--------|
| Real-time messaging | ✅ |
| Auto message display | ✅ |
| Profile pictures | ✅ |
| Theme toggle | ✅ |
| Chat history | ✅ |
| Local storage | ✅ |
| Export chats | ✅ |
| Settings panel | ✅ |
| Typing indicator | ✅ |
| Online status | ✅ |
| Search contacts | ✅ |
| Responsive design | ✅ |

---

## 🛠️ Technologies Used

- **Frontend:** HTML5, CSS3, JavaScript (ES6+)
- **Styling:** Custom CSS (WhatsApp-inspired)
- **Icons:** Font Awesome 6
- **Fonts:** Google Fonts (Segoe UI)
- **Real-time:** WebSocket API
- **Storage:** localStorage API

---

Enjoy chatting with Oreo! 🍪
