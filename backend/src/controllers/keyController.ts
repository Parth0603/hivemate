import { Request, Response } from 'express';
import EncryptionKey from '../models/EncryptionKey';

export const exchangePublicKey = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { publicKey, privateKey } = req.body;

    if (!publicKey) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Public key is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Store or update public key
    await EncryptionKey.findOneAndUpdate(
      { userId },
      { userId, publicKey, privateKey: privateKey || '', createdAt: new Date() },
      { upsert: true, new: true }
    );

    res.json({
      message: 'Public key stored successfully',
      userId
    });
  } catch (error: any) {
    console.error('Exchange public key error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while storing public key',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const getMyKeyPair = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const encryptionKey = await EncryptionKey.findOne({ userId });

    if (!encryptionKey || !encryptionKey.publicKey || !encryptionKey.privateKey) {
      return res.status(404).json({
        error: {
          code: 'KEY_NOT_FOUND',
          message: 'Key pair not found for this user',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      userId: encryptionKey.userId,
      publicKey: encryptionKey.publicKey,
      privateKey: encryptionKey.privateKey,
      createdAt: encryptionKey.createdAt
    });
  } catch (error: any) {
    console.error('Get key pair error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching key pair',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const getPublicKey = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;

    const encryptionKey = await EncryptionKey.findOne({ userId });
    if (!encryptionKey) {
      return res.status(404).json({
        error: {
          code: 'KEY_NOT_FOUND',
          message: 'Public key not found for this user',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      userId: encryptionKey.userId,
      publicKey: encryptionKey.publicKey,
      createdAt: encryptionKey.createdAt
    });
  } catch (error: any) {
    console.error('Get public key error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching public key',
        timestamp: new Date().toISOString()
      }
    });
  }
};
