# Chat History Feature - Setup Guide

## 🎉 What's New

Your chatbot now has **persistent chat history** with a sidebar, just like ChatGPT!

### Features:
- ✅ **Auto-saves every message** to the database
- ✅ **Sidebar with recent chats** grouped by date (Today, Yesterday, Last 7 days, etc.)
- ✅ **Click to load** any previous conversation
- ✅ **New Chat button** to start fresh
- ✅ **Delete conversations** with a single click
- ✅ **Auto-generated titles** from the first message
- ✅ **Responsive design** (sidebar hidden on mobile, shows on desktop)

---

## 🚀 Setup (2 Steps)

### Step 1: Run the Database Migration

Add the chat history tables to your database:

```bash
# Using Supabase SQL Editor:
# 1. Go to SQL Editor in Supabase dashboard
# 2. Copy contents of scripts/add-chat-history.sql
# 3. Run it

# Or using psql:
psql YOUR_DATABASE_URL < scripts/add-chat-history.sql
```

**What this creates:**
- `chat_sessions` table - stores each conversation
- `chat_messages` table - stores individual messages
- Indexes for fast lookups
- RLS policies for tenant isolation

### Step 2: Restart Your Dev Server

```bash
# Stop your server (Ctrl+C) and restart
pnpm dev
```

That's it! Visit `/chatbot` and you'll see the sidebar on the right! 🎨

---

## 📋 Database Schema

### chat_sessions
```sql
id          uuid      -- Session ID
tenant_id   uuid      -- Tenant isolation
user_id     uuid      -- Who owns this chat
title       text      -- Auto-generated from first message
created_at  timestamp
updated_at  timestamp -- Updates when new messages added
```

### chat_messages
```sql
id          uuid      -- Message ID
session_id  uuid      -- Belongs to which session
role        text      -- 'user', 'assistant', or 'system'
content     text      -- The actual message
created_at  timestamp
```

---

## 🎯 How It Works

### Auto-Save Flow:

1. **User sends message** → Creates new session (if first message)
2. **Message saved to database** immediately
3. **AI responds** → Response also saved
4. **Session updated** with new timestamp (moves to top of sidebar)
5. **Title auto-generated** from first user message

### Loading Previous Chats:

1. **Click on chat in sidebar**
2. **Loads all messages** from that session
3. **Continue the conversation** - new messages append to same session

### New Chat:

1. **Click "New Chat" button**
2. **Clears current messages**
3. **Next message creates new session**

---

## 🎨 UI Features

### Sidebar Layout:
- **Top**: "New Chat" button
- **Scrollable list**: Recent conversations
- **Grouped by date**: Today, Yesterday, Last 7 days, Last 30 days, Older
- **Each chat shows**: Message icon, title (truncated)
- **Hover actions**: Delete button appears
- **Active highlight**: Current chat is highlighted

### Responsive:
- **Desktop (lg+)**: Sidebar always visible (320px width)
- **Mobile/Tablet**: Sidebar hidden (you can add a toggle button later)

---

## 🔧 API Endpoints

### GET `/api/assistant/sessions`
Get all chat sessions for current user
```json
{
  "sessions": [
    {
      "id": "uuid",
      "title": "How many emails this week?",
      "created_at": "2024-12-04T...",
      "updated_at": "2024-12-04T..."
    }
  ]
}
```

### POST `/api/assistant/sessions`
Create a new chat session
```json
{
  "title": "New Chat" // optional
}
```

### GET `/api/assistant/sessions/[id]`
Get a specific session with all messages
```json
{
  "session": { "id": "...", "title": "...", ... },
  "messages": [
    { "id": "...", "role": "user", "content": "...", "created_at": "..." },
    { "id": "...", "role": "assistant", "content": "...", "created_at": "..." }
  ]
}
```

### POST `/api/assistant/sessions/[id]`
Add a message to a session
```json
{
  "role": "user",
  "content": "What's the weather?"
}
```

### DELETE `/api/assistant/sessions/[id]`
Delete a chat session (cascades to all messages)

---

## 💡 Future Enhancements

### Easy Additions:
1. **Search chats** - Add a search bar in sidebar
2. **Edit titles** - Let users rename conversations
3. **Export chat** - Download as PDF or text
4. **Share chat** - Generate shareable link
5. **Mobile menu** - Add hamburger menu to show/hide sidebar on mobile
6. **Folders/Tags** - Organize chats into categories
7. **Pin important chats** - Keep certain conversations at the top
8. **Archive old chats** - Hide but don't delete

### Advanced:
1. **Search within chat** - Find specific messages
2. **Conversation branching** - Fork a conversation from any point
3. **Multi-modal history** - Save images, files, etc.
4. **Collaborative chats** - Share with team members
5. **Chat templates** - Start from pre-defined prompts

---

## 🎓 Code Overview

### Key Files:

1. **`scripts/add-chat-history.sql`**
   - Database migration
   - Creates tables and indexes

2. **`app/api/assistant/sessions/route.ts`**
   - GET: List all sessions
   - POST: Create new session

3. **`app/api/assistant/sessions/[id]/route.ts`**
   - GET: Load session with messages
   - POST: Add message to session
   - DELETE: Delete session

4. **`components/chatbot/chat-history-sidebar.tsx`**
   - Sidebar UI component
   - Groups chats by date
   - Handles click to load and delete

5. **`app/chatbot/page.tsx`**
   - Main chatbot with integrated sidebar
   - Auto-save functionality
   - Session management

---

## 🔒 Security

- ✅ **RLS policies** enforce tenant isolation
- ✅ **User verification** in all API routes
- ✅ **Cascade deletes** prevent orphaned messages
- ✅ **Rate limiting** applied to all endpoints

---

## 🐛 Troubleshooting

### Sidebar not showing?
- Make sure your browser window is wide enough (needs `lg` breakpoint)
- Check browser console for errors

### Chats not saving?
- Verify database migration ran successfully
- Check that `chat_sessions` and `chat_messages` tables exist
- Look for errors in server logs

### Can't load previous chats?
- Check browser Network tab for API errors
- Verify user is authenticated
- Check tenant_id is set correctly

### Messages appearing twice?
- This shouldn't happen, but if it does, check for duplicate API calls
- Make sure `saved` flag is working properly

---

## ✨ You're All Set!

Your chatbot now has:
- 💾 **Persistent history**
- 📂 **Organized sidebar**
- 🔄 **Auto-save**
- 🗑️ **Easy deletion**
- 📱 **Responsive design**

Just like ChatGPT! 🎉

Try it out:
1. Go to `/chatbot`
2. Ask a question
3. See it appear in the sidebar
4. Start a new chat
5. Click the old chat to reload it

Enjoy! 🚀



