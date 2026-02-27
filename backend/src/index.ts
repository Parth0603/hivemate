import express, { Application } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { connectDatabase } from './config/database';
import redis from './config/redis';
import { initializeWebSocket } from './websocket/server';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || 'http://localhost:5173';

// Create HTTP server
const httpServer = http.createServer(app);

// Middleware
app.use(cors({ origin: '*', credentials: false }));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Import routes
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import locationRoutes from './routes/location';
import connectionRoutes from './routes/connection';
import friendRoutes from './routes/friend';
import keyRoutes from './routes/key';
import messageRoutes from './routes/message';
import callRoutes from './routes/call';
import subscriptionRoutes from './routes/subscription';
import gigRoutes from './routes/gig';
import searchRoutes from './routes/search';
import notificationRoutes from './routes/notification';

// API routes
app.get('/api', (req, res) => {
  res.json({
    message: 'SocialHive API',
    version: '1.0.0'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/profiles', profileRoutes);
app.use('/api/location', locationRoutes);
app.use('/api/connections', connectionRoutes);
app.use('/api/friends', friendRoutes);
app.use('/api/keys', keyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/subscriptions', subscriptionRoutes);
app.use('/api/gigs', gigRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware
app.use((err: any, req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'An unexpected error occurred',
      details: err.details || null,
      timestamp: new Date().toISOString()
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Route not found',
      timestamp: new Date().toISOString()
    }
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to databases
    await connectDatabase();
    
    // Test Redis connection
    await redis.ping();
    
    // Initialize WebSocket server
    initializeWebSocket(httpServer);
    
    // Start listening
    httpServer.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`🌐 CORS enabled for: ${CORS_ORIGIN}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
