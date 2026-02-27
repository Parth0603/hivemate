# SocialHive Platform - Complete Setup Guide

## Overview
SocialHive is a location-based social networking platform with real-time features including chat, video calls, gig marketplace, and proximity-based user discovery.

## Prerequisites

Before starting, ensure you have the following installed:

1. **Node.js** (v16 or higher)
   - Download from: https://nodejs.org/
   - Verify: `node --version`

2. **MongoDB** (v5.0 or higher)
   - Download from: https://www.mongodb.com/try/download/community
   - Or use MongoDB Atlas (cloud): https://www.mongodb.com/cloud/atlas
   - Verify: `mongod --version`

3. **Redis** (v6.0 or higher)
   - Windows: Download from https://github.com/microsoftarchive/redis/releases
   - Or use Redis Cloud: https://redis.com/try-free/
   - Verify: `redis-cli --version`

4. **Git** (for version control)
   - Download from: https://git-scm.com/
   - Verify: `git --version`

---

## Step 1: Clone and Install Dependencies

### 1.1 Navigate to Project Directory
```bash
cd C:\Users\parth nagar\OneDrive\Desktop\socialHive
```

### 1.2 Install Root Dependencies
```bash
npm install
```

### 1.3 Install Backend Dependencies
```bash
cd backend
npm install
cd ..
```

### 1.4 Install Frontend Dependencies
```bash
cd frontend
npm install
cd ..
```

---

## Step 2: Environment Configuration

### 2.1 Backend Environment Setup

Create a `.env` file in the `backend` directory:

```bash
# Copy the example file
copy backend\.env.example backend\.env
```

Edit `backend/.env` with your configuration:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Configuration
MONGODB_URI=mongodb://localhost:27017/socialhive
# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/socialhive

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
# Or for Redis Cloud:
# REDIS_HOST=your-redis-host.redis.cloud
# REDIS_PORT=12345
# REDIS_PASSWORD=your-redis-password

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRES_IN=7d

# AWS S3 Configuration (for photo uploads)
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret-key
AWS_REGION=us-east-1
AWS_S3_BUCKET=socialhive-photos

# OpenAI Configuration (for AI-powered SEO)
OPENAI_API_KEY=your-openai-api-key

# WebRTC Configuration (for video calls)
TURN_SERVER_URL=turn:your-turn-server.com:3478
TURN_USERNAME=your-turn-username
TURN_CREDENTIAL=your-turn-password

# Stripe Configuration (for subscriptions)
STRIPE_SECRET_KEY=sk_test_your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Frontend URL (for CORS)
FRONTEND_URL=http://localhost:5173
```

### 2.2 Frontend Environment Setup

Create a `.env` file in the `frontend` directory:

```bash
# Copy the example file
copy frontend\.env.example frontend\.env
```

Edit `frontend/.env` with your configuration:

```env
# Backend API URL
VITE_API_URL=http://localhost:5000

# WebSocket URL
VITE_WS_URL=ws://localhost:5000

# Stripe Publishable Key
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your-stripe-publishable-key

# Google Maps API Key (for location features)
VITE_GOOGLE_MAPS_API_KEY=your-google-maps-api-key
```

---

## Step 3: Database Setup

### 3.1 Start MongoDB

**Option A: Local MongoDB**
```bash
# Start MongoDB service
mongod --dbpath C:\data\db
```

**Option B: MongoDB Atlas**
- Create a free cluster at https://www.mongodb.com/cloud/atlas
- Get your connection string
- Update `MONGODB_URI` in `backend/.env`

### 3.2 Start Redis

**Option A: Local Redis**
```bash
# Start Redis server
redis-server
```

**Option B: Redis Cloud**
- Create a free database at https://redis.com/try-free/
- Get your connection details
- Update Redis configuration in `backend/.env`

### 3.3 Verify Database Connections

```bash
# Test MongoDB connection
mongo mongodb://localhost:27017/socialhive

# Test Redis connection
redis-cli ping
# Should return: PONG
```

---

## Step 4: Build and Start the Application

### 4.1 Build Backend (TypeScript Compilation)
```bash
cd backend
npm run build
```

### 4.2 Start Backend Server

**Development Mode (with hot reload):**
```bash
npm run dev
```

**Production Mode:**
```bash
npm start
```

The backend should now be running on `http://localhost:5000`

### 4.3 Start Frontend (in a new terminal)

```bash
cd frontend
npm run dev
```

The frontend should now be running on `http://localhost:5173`

---

## Step 5: Verify Installation

### 5.1 Check Backend Health
Open your browser and navigate to:
```
http://localhost:5000/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2024-..."
}
```

### 5.2 Check Frontend
Open your browser and navigate to:
```
http://localhost:5173
```

You should see the SocialHive landing page.

---

## Step 6: Run Tests

### 6.1 Run All Tests
```bash
npm test
```

### 6.2 Run Backend Tests Only
```bash
cd backend
npm test
```

### 6.3 Run Specific Test File
```bash
npm test -- backend/src/controllers/connectionController.test.ts
```

### 6.4 Run Tests with Coverage
```bash
npm test -- --coverage
```

---

## Step 7: Create Your First User

### 7.1 Register a New User

1. Open `http://localhost:5173` in your browser
2. Click "Get Started" or "Sign Up"
3. Fill in the registration form:
   - Email: your-email@example.com
   - Password: YourSecurePassword123!
   - Confirm Password: YourSecurePassword123!
4. Click "Register"

### 7.2 Create Your Profile

1. After registration, you'll be redirected to create your profile
2. Fill in your profile information:
   - Name
   - Profession
   - Place
   - Bio
   - Upload photos (optional)
3. Click "Create Profile"

### 7.3 Explore Features

Now you can:
- **Discover Users**: Use the radar to find nearby users (requires location permission)
- **Send Connection Requests**: Connect with other users
- **Chat**: Message your connections
- **Video Calls**: Start video calls with friends
- **Create Gigs**: Post freelance opportunities
- **Search**: Find users, gigs, and content

---

## Key Features Implemented

### 1. Authentication & Authorization
- JWT-based authentication
- Secure password hashing with bcrypt
- Token refresh mechanism

### 2. User Profiles
- Profile creation and editing
- Photo uploads (AWS S3)
- Profile visibility controls

### 3. Location-Based Discovery
- Real-time location tracking
- Proximity-based user discovery (radar)
- Explore/Vanish mode toggle
- Distance calculations using Haversine formula

### 4. Social Connections
- Connection request system
- Mutual acceptance for friendship
- Friend list management
- Block/unblock functionality

### 5. Real-Time Communication
- WebSocket-based chat
- End-to-end encrypted messages
- Typing indicators
- Read receipts
- Real-time notifications

### 6. Video Calls
- WebRTC-based video calls
- Screen sharing
- Call history
- Call notifications

### 7. Gig Marketplace
- Create and browse gigs
- Category-based filtering
- Budget range filtering
- AI-powered SEO optimization

### 8. Subscription System
- Stripe integration
- Premium features unlock
- Video call access for subscribers
- Subscription management

### 9. Search & Discovery
- Multi-criteria search
- Filter by profession, location, interests
- Gig search with filters
- AI-enhanced search results

### 10. Notifications
- Real-time push notifications
- In-app notification center
- Email notifications (configurable)
- Notification preferences

---

## Testing Features

### Property-Based Tests
The platform includes comprehensive property-based tests using fast-check:

- **143 total tests** covering all major features
- **20 iterations per property test** for thorough validation
- Tests validate universal correctness properties

Key test suites:
- Connection request notifications
- Mutual acceptance logic
- Location tracking and distance calculations
- Message encryption
- Profile access controls
- Gig filtering
- Search functionality

Run tests with:
```bash
npm test
```

---

## Troubleshooting

### MongoDB Connection Issues
```bash
# Check if MongoDB is running
tasklist | findstr mongod

# Restart MongoDB
net stop MongoDB
net start MongoDB
```

### Redis Connection Issues
```bash
# Check if Redis is running
tasklist | findstr redis

# Restart Redis
redis-cli shutdown
redis-server
```

### Port Already in Use
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

### Build Errors
```bash
# Clear node_modules and reinstall
rmdir /s /q node_modules
rmdir /s /q backend\node_modules
rmdir /s /q frontend\node_modules
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

### TypeScript Compilation Errors
```bash
# Clean build directory
cd backend
rmdir /s /q dist
npm run build
```

---

## Development Workflow

### 1. Making Code Changes

**Backend:**
- Edit files in `backend/src/`
- TypeScript will auto-compile in dev mode
- Server will auto-restart with nodemon

**Frontend:**
- Edit files in `frontend/src/`
- Vite will hot-reload changes automatically

### 2. Adding New Features

1. Update the spec in `.kiro/specs/socialhive-platform/`
2. Implement the feature
3. Write tests
4. Run tests: `npm test`
5. Commit changes

### 3. Database Management

**View MongoDB data:**
```bash
mongo mongodb://localhost:27017/socialhive
show collections
db.users.find().pretty()
```

**Clear Redis cache:**
```bash
redis-cli FLUSHALL
```

---

## Production Deployment

### 1. Build for Production

```bash
# Build backend
cd backend
npm run build

# Build frontend
cd ../frontend
npm run build
```

### 2. Environment Variables

Update `.env` files with production values:
- Use production MongoDB URI
- Use production Redis instance
- Set `NODE_ENV=production`
- Use strong JWT secrets
- Configure production CORS settings

### 3. Deploy

The application can be deployed to:
- **Backend**: Heroku, AWS EC2, DigitalOcean, Railway
- **Frontend**: Vercel, Netlify, AWS S3 + CloudFront
- **Database**: MongoDB Atlas, AWS DocumentDB
- **Cache**: Redis Cloud, AWS ElastiCache

---

## Additional Resources

- **API Documentation**: Check `backend/src/routes/` for all available endpoints
- **Component Documentation**: Check `frontend/src/components/` for UI components
- **Test Documentation**: Check `*.test.ts` files for test examples
- **Spec Documentation**: Check `.kiro/specs/socialhive-platform/` for requirements and design

---

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review test files for usage examples
3. Check the spec documents for feature details
4. Review the code comments for implementation details

---

## Summary of Recent Fixes

### Bug Fixes (Latest Session)
1. **Property 14 - Mutual Acceptance Logic**: Fixed friendship creation to only occur with mutual acceptance
2. **Property 37 - Distance Calculation**: Improved accuracy using proper inverse Haversine formula

### Test Status
- ✅ All 143 tests passing
- ✅ Property-based tests optimized (20 iterations)
- ✅ No failing tests
- ✅ Full test coverage for core features

---

**You're all set! Enjoy building with SocialHive! 🚀**
