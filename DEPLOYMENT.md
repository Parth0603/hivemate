# Deployment Guide

This guide covers deploying SocialHive to production environments.

## Prerequisites

- Node.js 18+ runtime environment
- MongoDB database (Atlas recommended)
- Redis instance (Redis Cloud recommended)
- Domain name with SSL certificate

## Environment Variables

### Backend (.env)
```env
PORT=5000
NODE_ENV=production
MONGODB_URI=your_production_mongodb_uri
REDIS_HOST=your_redis_host
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
JWT_SECRET=your_secure_jwt_secret
CORS_ORIGIN=https://yourdomain.com
```

### Frontend (.env)
```env
VITE_API_URL=https://api.yourdomain.com
VITE_WS_URL=wss://api.yourdomain.com
```

## Deployment Options

### Option 1: Traditional VPS (DigitalOcean, AWS EC2, etc.)

1. Set up server with Node.js, MongoDB, and Redis
2. Clone repository
3. Install dependencies: `npm install && cd backend && npm install && cd ../frontend && npm install`
4. Build applications: `npm run build:backend && npm run build:frontend`
5. Set up process manager (PM2): `pm2 start backend/dist/index.js`
6. Configure nginx as reverse proxy
7. Set up SSL with Let's Encrypt

### Option 2: Platform as a Service

#### Heroku
- Deploy backend and frontend as separate apps
- Add MongoDB and Redis add-ons
- Configure environment variables
- Enable automatic deployments from GitHub

#### Railway
- Connect GitHub repository
- Configure build commands
- Add MongoDB and Redis services
- Set environment variables

#### Render
- Create web service for backend
- Create static site for frontend
- Add MongoDB and Redis
- Configure environment variables

### Option 3: Containerized (Docker)

```dockerfile
# Backend Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY backend/package*.json ./
RUN npm ci --production
COPY backend/dist ./dist
CMD ["node", "dist/index.js"]
```

Use Docker Compose for orchestration with MongoDB and Redis containers.

## Database Setup

### MongoDB Atlas
1. Create cluster
2. Configure network access
3. Create database user
4. Get connection string
5. Add to MONGODB_URI

### Redis Cloud
1. Create database
2. Get connection details
3. Add to environment variables

## Post-Deployment

1. Test all endpoints
2. Verify WebSocket connections
3. Check error logging
4. Monitor performance
5. Set up backups
6. Configure monitoring (e.g., Sentry, LogRocket)

## Scaling Considerations

- Use load balancer for multiple backend instances
- Implement Redis for session storage
- Use CDN for frontend assets
- Enable database read replicas
- Implement rate limiting
- Set up caching strategies

## Security Checklist

- [ ] HTTPS enabled
- [ ] Environment variables secured
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation active
- [ ] Database access restricted
- [ ] Secrets rotated regularly
- [ ] Monitoring and alerts configured

## Troubleshooting

### Common Issues
- WebSocket connection failures: Check CORS and proxy settings
- Database connection errors: Verify connection string and network access
- Build failures: Ensure all dependencies are installed

For more help, open an issue on GitHub.
