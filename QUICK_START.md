# SocialHive - Quick Start Guide

## One Command to Rule Them All! 🚀

Just run this single command from the root directory:

```bash
npm start
```

That's it! The script will:
1. ✅ Start the backend server (http://localhost:5000)
2. ✅ Start the frontend server (http://localhost:5173)
3. ✅ Automatically open your browser to the app
4. ✅ Display all the URLs you need

## What You'll See

```
============================================================
  🚀 Starting SocialHive Platform
============================================================

[BACKEND] Starting backend server...
[FRONTEND] Starting frontend server...

============================================================
✨ SocialHive Platform is Ready!
============================================================

🌐 Frontend: http://localhost:5173
🔧 Backend:  http://localhost:5000

📝 Opening browser...
```

## Before First Run

### 1. Install Dependencies (One Time Only)

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Install frontend dependencies
cd frontend
npm install
cd ..
```

### 2. Start MongoDB and Redis (REQUIRED)

⚠️ **IMPORTANT**: The backend requires MongoDB and Redis to be running before you start the app.

**Option A: Local Installation**

**MongoDB:**
```bash
# Windows - Start MongoDB service
net start MongoDB

# Or run manually
mongod --dbpath C:\data\db
```

**Redis:**
```bash
# Windows - Start Redis (if installed via MSI or WSL)
redis-server

# Or use WSL
wsl redis-server
```

**Option B: Cloud Services (Recommended for Quick Start)**

1. **MongoDB Atlas** (Free tier available):
   - Sign up at https://www.mongodb.com/cloud/atlas
   - Create a free cluster
   - Get your connection string
   - Update `MONGODB_URI` in `backend/.env`

2. **Redis Cloud** (Free tier available):
   - Sign up at https://redis.com/try-free/
   - Create a free database
   - Get your connection details
   - Update Redis config in `backend/.env`

### 3. Set Up Environment Variables

Environment files have been created for you with default values. You can modify them if needed:

**Backend** (`backend/.env`):
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/socialhive
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-here
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

## Stopping the Application

Press `Ctrl+C` in the terminal where you ran `npm start`

## Troubleshooting

### Backend Fails to Start

**Error: "Failed to start server" or "Connection refused"**

This means MongoDB or Redis are not running. You MUST have both running before starting the app.

**Quick Fix:**
1. Start MongoDB: `net start MongoDB` or use MongoDB Atlas
2. Start Redis: `redis-server` or use Redis Cloud
3. Run `npm start` again

### Port Already in Use

If you see "port already in use" errors:

```bash
# Kill process on port 5000 (backend)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# Kill process on port 5173 (frontend)
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

### Dependencies Not Installed

```bash
# Clean install everything
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### ts-node-dev Not Found

```bash
cd backend
npm install ts-node-dev --save-dev
cd ..
```

## What's Next?

Once the app opens in your browser:

1. **Register** - Create a new account
2. **Create Profile** - Fill in your profile information
3. **Enable Location** - Allow location access to use the radar feature
4. **Explore** - Discover nearby users, send connection requests, chat, and more!

## Features Available

- 👤 User profiles with photos
- 📍 Location-based user discovery (radar)
- 💬 Real-time chat with encryption
- 📹 Video calls (WebRTC)
- 🤝 Connection requests & friendships
- 💼 Gig marketplace
- 🔍 Advanced search & filtering
- 💳 Subscription system
- 🔔 Real-time notifications

## Need More Help?

Check out the detailed `SETUP_GUIDE.md` for:
- Complete installation instructions
- Environment configuration details
- Feature documentation
- API endpoints
- Testing guide
- Deployment instructions

---

**Enjoy SocialHive! 🎉**
