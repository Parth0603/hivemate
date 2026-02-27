import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { SessionService } from '../services/sessionService';

export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Authentication token is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const token = authHeader.substring(7);

    // Verify token
    const payload = verifyToken(token);

    // Check if session exists in Redis
    const sessionToken = await SessionService.getSession(payload.userId);
    if (!sessionToken || sessionToken !== token) {
      return res.status(401).json({
        error: {
          code: 'INVALID_SESSION',
          message: 'Session has expired or is invalid',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Attach user info to request
    (req as any).userId = payload.userId;
    (req as any).email = payload.email;

    next();
  } catch (error: any) {
    return res.status(401).json({
      error: {
        code: 'INVALID_TOKEN',
        message: error.message || 'Invalid authentication token',
        timestamp: new Date().toISOString()
      }
    });
  }
};
