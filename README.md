# SocialHive Platform

A geo-powered professional networking platform that merges local connection discovery with professional collaboration, privacy controls, and encrypted peer-to-peer communication.

## Features

- 🗺️ **Radar-based Discovery**: Find nearby professionals using real-time geolocation
- 🤝 **Mutual Connection System**: Build trust through mutual acceptance
- 🔒 **End-to-End Encryption**: Secure messaging with client-side encryption
- 💼 **Professional Gigs**: Create and discover collaboration opportunities
- 📞 **Progressive Communication**: Unlock voice and video calls through interactions
- 🎯 **AI-Powered Matching**: Optimized profile keywords for better discoverability
- 👻 **Privacy Controls**: Explore/Vanish mode for visibility management

## Tech Stack

### Backend
- **Runtime**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with geospatial indexing
- **Cache**: Redis
- **Real-time**: Socket.IO
- **Authentication**: JWT

### Frontend
- **Framework**: React with TypeScript
- **State Management**: Redux/Context API
- **Real-time**: Socket.IO Client
- **Encryption**: Web Crypto API
- **Maps**: Leaflet.js / Custom Canvas

## Getting Started

### Quick Start (One Command!)

**Prerequisites**: MongoDB and Redis must be running

```bash
npm start
```

That's it! The app will automatically:
- Start the backend server (http://localhost:5000)
- Start the frontend server (http://localhost:5173)
- Open your browser to the app

For detailed setup instructions, see [QUICK_START.md](QUICK_START.md)

### Prerequisites

- Node.js 18+ and npm
- MongoDB 6+ (local or [MongoDB Atlas](https://www.mongodb.com/cloud/atlas))
- Redis 7+ (local or [Redis Cloud](https://redis.com/try-free/))

### Detailed Installation

1. Clone the repository:
```bash
git clone https://github.com/YOUR_USERNAME/socialhive-platform.git
cd socialhive-platform
```

2. Install dependencies:
```bash
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
```

3. Start MongoDB and Redis:
```bash
# MongoDB (Windows)
net start MongoDB
# or
mongod --dbpath C:\data\db

# Redis (Windows)
redis-server
```

Or use cloud services (recommended for quick start):
- MongoDB Atlas: https://www.mongodb.com/cloud/atlas
- Redis Cloud: https://redis.com/try-free/

4. Configure environment (optional - defaults are provided):

**backend/.env:**
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/socialhive
REDIS_HOST=localhost
REDIS_PORT=6379
JWT_SECRET=your-secret-key-here
```

**frontend/.env:**
```env
VITE_API_URL=http://localhost:5000
VITE_WS_URL=ws://localhost:5000
```

5. Start the application:
```bash
npm start
```

The backend will run on `http://localhost:5000` and frontend on `http://localhost:5173`.

### Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run with coverage
npm test -- --coverage
```

### Linting

```bash
# Check for linting errors
npm run lint

# Fix linting errors
npm run lint:fix
```

## Project Structure

```
socialhive-platform/
├── backend/
│   ├── src/
│   │   ├── config/         # Database, Redis, environment config
│   │   ├── models/         # Mongoose models
│   │   ├── controllers/    # Route controllers
│   │   ├── services/       # Business logic
│   │   ├── middleware/     # Express middleware
│   │   ├── routes/         # API routes
│   │   ├── utils/          # Utility functions
│   │   └── index.ts        # Entry point
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom hooks
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   ├── utils/          # Utility functions
│   │   └── App.tsx         # Root component
│   └── package.json
├── shared/
│   └── types/              # Shared TypeScript types
├── .kiro/
│   └── specs/              # Feature specifications
├── package.json
└── README.md
```

## API Documentation

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/logout` - Logout user
- `POST /api/auth/refresh` - Refresh token

### Profiles
- `POST /api/profiles` - Create profile
- `GET /api/profiles/:userId` - Get profile
- `PUT /api/profiles/:userId` - Update profile
- `POST /api/profiles/:userId/photos` - Upload photo

### Radar & Location
- `POST /api/location/update` - Update location
- `GET /api/radar/nearby` - Get nearby users
- `PUT /api/visibility/mode` - Toggle explore/vanish mode

### Connections
- `POST /api/connections/request` - Send connection request
- `PUT /api/connections/:id/accept` - Accept request
- `GET /api/friends` - Get friend list

### Messaging
- `POST /api/messages` - Send message
- `GET /api/messages/chat/:chatRoomId` - Get chat history

### Gigs
- `POST /api/gigs` - Create gig
- `GET /api/gigs` - List gigs
- `POST /api/gigs/:id/apply` - Apply to gig

## WebSocket Events

### Client → Server
- `location:update` - Update user location
- `message:send` - Send message
- `call:initiate` - Initiate call

### Server → Client
- `radar:update` - Radar data update
- `message:receive` - New message
- `notification:new` - New notification
- `nearby:notification` - Nearby user alert

## Development

### Documentation

- [QUICK_START.md](QUICK_START.md) - Fast one-command setup guide
- [SETUP_GUIDE.md](SETUP_GUIDE.md) - Detailed installation and configuration
- [PROJECT_COMPLETION_SUMMARY.md](PROJECT_COMPLETION_SUMMARY.md) - Project overview and features
- [PROPERTY_TEST_COMPLETION_SUMMARY.md](PROPERTY_TEST_COMPLETION_SUMMARY.md) - Testing details

### Code Style

This project uses ESLint and TypeScript for code quality. Run `npm run lint` before committing.

### Testing Strategy

- **Unit Tests**: Test individual functions and components
- **Property-Based Tests**: Test universal properties with fast-check
- **Integration Tests**: Test complete user flows

### Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Run linting and tests
6. Submit a pull request

## License

MIT

## Support

For issues and questions, please open an issue on GitHub.
