# 🧪 HOW TO TEST MESSAGING - STEP BY STEP

## IMPORTANT: Follow these steps EXACTLY!

---

## STEP 1: First Browser (Chrome)

1. Open **Google Chrome**
2. Go to: **https://private-chat-server-v663.onrender.com/**
3. Press **F12** to open Developer Tools
4. Click on the **Console** tab
5. Enter username: **alice**
6. Click "Start Chatting"
7. **Keep this window open with console visible**

---

## STEP 2: Second Browser (EDGE or FIREFOX - NOT another Chrome tab!)

1. Open **Microsoft Edge** or **Firefox** (different browser!)
2. Go to: **https://private-chat-server-v663.onrender.com/**
3. Press **F12** to open Developer Tools  
4. Click on the **Console** tab
5. Enter username: **bob** (MUST be different from first!)
6. Click "Start Chatting"
7. **Keep this window open with console visible**

---

## STEP 3: Check Online Users

In ** EITHER ** browser:
1. Click the **+ (New Chat)** button at top
2. You should see the OTHER username in the list
3. If you see "No other users online", check the console for errors

---

## STEP 4: Send Message (Browser 1 - Alice)

1. In Chrome (alice), click the **+** button
2. Click on **bob** in the online users list
3. The chat window opens
4. Type: **Hi Bob!**
5. Press **Enter** or click Send
6. **Your message should appear on the RIGHT side immediately**

Check the **Console** - you should see:
```
📤 === SENDING MESSAGE ===
   From: alice
   To: bob
   Message: Hi Bob!
   WebSocket connected: true
   ✅ Message sent via WebSocket
   ✅ Message displayed in UI (isMine: true)
```

---

## STEP 5: Check Message (Browser 2 - Bob)

In Edge/Firefox (bob):
1. Click the **+** button
2. Click on **alice** in the online users list
3. **You should see "Hi Bob!" message on the LEFT side**

Check the **Console** - you should see:
```
📨 === INCOMING MESSAGE ===
   From: alice
   To: bob
   My username: bob
   Current chat: alice
   Message: Hi Bob!
   I am sender: false
   I am receiver: true
   Chatting with sender: true
   Should display: true
   ✅ Adding message to chat UI
```

---

## STEP 6: Reply (Browser 2 - Bob)

In Edge/Firefox (bob):
1. Type: **Hello Alice!**
2. Press **Enter**
3. **Your message should appear on the RIGHT side**

---

## STEP 7: Check Reply (Browser 1 - Alice)

In Chrome (alice):
1. **You should see "Hello Alice!" appear on the LEFT side instantly**
2. No refresh needed!

---

## ❌ TROUBLESHOOTING

### "No other users online"
- Make sure you're using **DIFFERENT browsers** (not two Chrome tabs)
- Or use **Incognito/Private** mode for one of them
- Check console for WebSocket errors

### Messages not appearing
1. Check console for error messages
2. Make sure both users are logged in with DIFFERENT names
3. Click on the other user to OPEN the chat first
4. Check if WebSocket is connected (console should show "✅ WebSocket Connected")

### Messages appear but don't go to other person
1. Check console logs - look for "📤 SENDING MESSAGE"
2. Check if WebSocket is connected
3. Make sure receiver has the chat OPEN with the sender

---

## ✅ EXPECTED BEHAVIOR

```
Alice's Screen:                    Bob's Screen:
┌─────────────────────┐           ┌─────────────────────┐
│ Chat with: Bob      │           │ Chat with: Alice    │
├─────────────────────┤           ├─────────────────────┤
│                     │           │                     │
│  ┌──────────┐       │           │       ┌──────────┐  │
│  │ Hi Bob!  │  ←    │           │   →   │ Hi Bob!  │  │
│  └──────────┘       │           │       └──────────┘  │
│      (LEFT)         │           │         (RIGHT)     │
│                     │           │                     │
│       ┌──────────┐  │           │  ┌──────────┐       │
│  →   │Hello!    │  │           │  │Hello!    │ ←     │
│      └──────────┘  │           │  └──────────┘       │
│        (RIGHT)     │           │     (LEFT)          │
│                     │           │                     │
└─────────────────────┘           └─────────────────────┘
```

---

## 📋 CONSOLE LOGS TO LOOK FOR

### When connecting:
```
🔌 Attempting to connect to WebSocket: wss://...
✅ WebSocket Connected: wss://...
👤 Username: alice
📤 Sending join: {type: "join", username: "alice"}
📩 Received from server: {type: "user_list", users: ["alice", "bob"]}
📋 Received user list: ["alice", "bob"]
👥 Online users (excluding self): ["bob"]
```

### When sending:
```
📤 === SENDING MESSAGE ===
   From: alice
   To: bob
   Message: Hi!
   WebSocket connected: true
   ✅ Message sent via WebSocket
   ✅ Message displayed in UI
```

### When receiving:
```
📨 === INCOMING MESSAGE ===
   From: alice
   To: bob
   My username: bob
   Current chat: alice
   Should display: true
   ✅ Adding message to chat UI
```

---

**If you see errors in console, copy and paste them here!**
