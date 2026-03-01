import { Request, Response } from 'express';
import PushNotificationService from '../services/pushNotificationService';

export const getPushPublicKey = async (_req: Request, res: Response) => {
  try {
    return res.json({
      enabled: PushNotificationService.isConfigured(),
      publicKey: PushNotificationService.getPublicKey() || null
    });
  } catch (error: any) {
    console.error('Get push public key error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to get push public key',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const subscribePush = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { endpoint, keys } = req.body || {};

    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid push subscription payload',
          timestamp: new Date().toISOString()
        }
      });
    }

    await PushNotificationService.saveSubscription(userId, { endpoint, keys });
    return res.json({ message: 'Push subscription saved' });
  } catch (error: any) {
    console.error('Subscribe push error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to save push subscription',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const unsubscribePush = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { endpoint } = req.body || {};

    if (!endpoint) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Endpoint is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    await PushNotificationService.removeSubscription(userId, endpoint);
    return res.json({ message: 'Push subscription removed' });
  } catch (error: any) {
    console.error('Unsubscribe push error:', error);
    return res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Failed to remove push subscription',
        timestamp: new Date().toISOString()
      }
    });
  }
};
