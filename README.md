# Real-Time Chat App

A full-stack real-time chat application with a Node.js/Express/Socket.io backend and a React (Vite) frontend.

## Features
- Real-time messaging with Socket.io
- Message history stored in SQLite database
- User Authentication with Argon2 hashing
- Online/Offline user status
- Typing indicators
- Professional Vercel-inspired UI
- Profile management with privacy controls
- Profile picture upload (max 100KB)
- Search users to start new conversations
- Forgot password functionality
- Delete account with chat cleanup

## Project Structure
- `backend/`: Node.js server with Express and Socket.io, plus SQLite db.
- `frontend/web/`: React frontend created with Vite.

## Setup Instructions

### 1. Backend
```bash
cd backend
npm install
npm run server
```
*Note: Make sure to start the backend before the frontend so it can listen on port 5000.*

### 2. Frontend
```bash
cd frontend/web
npm install
npm run dev
```

## Design Decisions
- **Frontend framework**: Selected React via Vite for immediate web testing capabilities.
- **Styling**: Custom CSS inspired by Vercel's design language with a clean, professional aesthetic.
- **Database**: SQLite was chosen for zero-configuration, localized data persistence.
- **Security**: Argon2 for password hashing, JWT for authentication, privacy toggles for user data.
- **Real-time**: Socket.io for instant messaging, typing indicators, and presence updates.

## Assumptions
- Running locally: The frontend is hardcoded to look for the backend at `http://localhost:5000`. If deploying, this should be moved to environment variables.
- Password reset is simulated (no actual email sending in demo mode).
- Profile pictures are stored as base64 data URLs in SQLite (max 100KB per image).

## User Features
- **Sign Up**: First name, last name, username, bio, DOB, email, mobile with country code, password
- **Login**: Username and password with forgot password option
- **Profile**: Edit all fields, toggle privacy (public/private) for bio, DOB, email, mobile, profile picture
- **Privacy**: Username is always public; other fields default to private
- **Anonymity**: Focus on user privacy with granular control over visible information
- **Chat**: Text-only messages with real-time delivery, typing indicators, and online status
- **Search**: Find users by username to start new conversations
- **Delete Account**: Permanently removes all chats from both sides
