import { Request, Response } from 'express';
import mongoose from 'mongoose';
import ConnectionRequest from '../models/ConnectionRequest';
import Friendship from '../models/Friendship';
import Profile from '../models/Profile';
import { getWebSocketServer } from '../websocket/server';
import { InteractionService } from '../services/interactionService';
import { NotificationService } from '../services/notificationService';
import { ChatService } from '../services/chatService';
import { CacheService } from '../services/cacheService';

export const sendConnectionRequest = async (req: Request, res: Response) => {
  try {
    const senderId = (req as any).userId;
    const { receiverId } = req.body;

    if (!receiverId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Receiver ID is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Can't send request to yourself
    if (senderId === receiverId) {
      return res.status(400).json({
        error: {
          code: 'INVALID_REQUEST',
          message: 'Cannot send connection request to yourself',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if receiver exists
    const receiverProfile = await Profile.findOne({ userId: receiverId });
    if (!receiverProfile) {
      return res.status(404).json({
        error: {
          code: 'USER_NOT_FOUND',
          message: 'Receiver not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if request already exists
    const existingRequest = await ConnectionRequest.findOne({
      senderId,
      receiverId
    });

    if (existingRequest) {
      // Allow re-sending if previous request was declined, or if it was accepted in the past
      // but friendship no longer exists (after unfriend).
      if (existingRequest.status === 'declined' || existingRequest.status === 'accepted') {
        const existingFriendship = await Friendship.findOne({
          $or: [
            { user1Id: senderId, user2Id: receiverId },
            { user1Id: receiverId, user2Id: senderId }
          ]
        });

        if (existingRequest.status === 'accepted' && existingFriendship) {
          return res.status(409).json({
            error: {
              code: 'ALREADY_FRIENDS',
              message: 'Already connected with this user',
              timestamp: new Date().toISOString()
            }
          });
        }

        existingRequest.status = 'pending';
        existingRequest.createdAt = new Date();
        existingRequest.respondedAt = undefined;
        await existingRequest.save();

        try {
          const wsServer = getWebSocketServer();
          const senderProfile = await Profile.findOne({ userId: senderId });

          wsServer.emitToUser(receiverId, 'notification:new', {
            type: 'friend_request',
            title: 'New Connection Request',
            message: `${senderProfile?.name || 'Someone'} sent you a connection request`,
            data: {
              requestId: existingRequest._id,
              senderId,
              senderName: senderProfile?.name
            },
            timestamp: new Date()
          });

          if (mongoose.connection.readyState === 1) {
            await NotificationService.notifyFriendRequest(
              receiverId,
              senderProfile?.name || 'Someone',
              senderId
            );
          }
        } catch (notificationError) {
          console.error('Friend request notification error:', notificationError);
        }

        return res.status(201).json({
          message: 'Connection request sent successfully',
          request: {
            id: existingRequest._id,
            senderId: existingRequest.senderId,
            receiverId: existingRequest.receiverId,
            status: existingRequest.status,
            createdAt: existingRequest.createdAt
          }
        });
      }

      return res.status(409).json({
        error: {
          code: 'REQUEST_EXISTS',
          message: 'Connection request already sent',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check if friendship already exists
    const existingFriendship = await Friendship.findOne({
      $or: [
        { user1Id: senderId, user2Id: receiverId },
        { user1Id: receiverId, user2Id: senderId }
      ]
    });

    if (existingFriendship) {
      return res.status(409).json({
        error: {
          code: 'ALREADY_FRIENDS',
          message: 'Already connected with this user',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create connection request
    const request = new ConnectionRequest({
      senderId,
      receiverId,
      status: 'pending'
    });

    await request.save();

    // Emit real-time notification to receiver
    try {
      const wsServer = getWebSocketServer();
      const senderProfile = await Profile.findOne({ userId: senderId });
      
      wsServer.emitToUser(receiverId, 'notification:new', {
        type: 'friend_request',
        title: 'New Connection Request',
        message: `${senderProfile?.name || 'Someone'} sent you a connection request`,
        data: {
          requestId: request._id,
          senderId,
          senderName: senderProfile?.name
        },
        timestamp: new Date()
      });

      // Persist notification if database is connected
      if (mongoose.connection.readyState === 1) {
        await NotificationService.notifyFriendRequest(
          receiverId,
          senderProfile?.name || 'Someone',
          senderId
        );
      }
    } catch (notificationError) {
      console.error('Friend request notification error:', notificationError);
    }

    res.status(201).json({
      message: 'Connection request sent successfully',
      request: {
        id: request._id,
        senderId: request.senderId,
        receiverId: request.receiverId,
        status: request.status,
        createdAt: request.createdAt
      }
    });
  } catch (error: any) {
    console.error('Send connection request error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while sending connection request',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const acceptConnectionRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { requestId } = req.params;

    const request = await ConnectionRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Connection request not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check authorization
    if (request.receiverId.toString() !== userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only accept requests sent to you',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Request has already been responded to',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update request status
    request.status = 'accepted';
    request.respondedAt = new Date();
    await request.save();

    // Create friendship on first valid acceptance (single accept flow).
    const existingFriendship = await Friendship.findOne({
      $or: [
        { user1Id: request.senderId, user2Id: request.receiverId },
        { user1Id: request.receiverId, user2Id: request.senderId }
      ]
    });

    if (!existingFriendship) {
      // Check if either user has active subscription to unlock video immediately
      const hasSubscription = await InteractionService.hasActiveSubscription(
        request.senderId.toString(),
        request.receiverId.toString()
      );

      const friendship = new Friendship({
        user1Id: request.senderId,
        user2Id: request.receiverId,
        establishedAt: new Date(),
        communicationLevel: hasSubscription ? 'video' : 'chat',
        interactionCount: 0
      });

      await friendship.save();
      await CacheService.invalidateFriendship(
        request.senderId.toString(),
        request.receiverId.toString()
      );

      try {
        await ChatService.getOrCreatePersonalChatRoom(
          request.senderId.toString(),
          request.receiverId.toString()
        );
      } catch (chatRoomError) {
        console.error('Chat room creation error:', chatRoomError);
      }

      // Notify both users of new friendship
      try {
        const wsServer = getWebSocketServer();
        const senderProfile = await Profile.findOne({ userId: request.senderId });
        const receiverProfile = await Profile.findOne({ userId: request.receiverId });

        wsServer.emitToUser(request.senderId.toString(), 'friendship:established', {
          friendId: request.receiverId,
          friendName: receiverProfile?.name,
          timestamp: new Date()
        });

        wsServer.emitToUser(request.receiverId.toString(), 'friendship:established', {
          friendId: request.senderId,
          friendName: senderProfile?.name,
          timestamp: new Date()
        });
      } catch (wsError) {
        console.error('WebSocket notification error:', wsError);
      }

      return res.json({
        message: 'Connection request accepted and friendship established',
        friendship: {
          id: friendship._id,
          user1Id: friendship.user1Id,
          user2Id: friendship.user2Id,
          establishedAt: friendship.establishedAt
        }
      });
    }

    res.json({
      message: 'Connection request accepted',
      request: {
        id: request._id,
        status: request.status,
        respondedAt: request.respondedAt
      },
      friendship: {
        id: existingFriendship._id,
        user1Id: existingFriendship.user1Id,
        user2Id: existingFriendship.user2Id,
        establishedAt: existingFriendship.establishedAt
      }
    });
  } catch (error: any) {
    console.error('Accept connection request error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while accepting connection request',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const declineConnectionRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { requestId } = req.params;

    const request = await ConnectionRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Connection request not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check authorization
    if (request.receiverId.toString() !== userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only decline requests sent to you',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Request has already been responded to',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update request status
    request.status = 'declined';
    request.respondedAt = new Date();
    await request.save();

    res.json({
      message: 'Connection request declined',
      request: {
        id: request._id,
        status: request.status,
        respondedAt: request.respondedAt
      }
    });
  } catch (error: any) {
    console.error('Decline connection request error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while declining connection request',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const getPendingRequests = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Get received requests
    const receivedRequests = await ConnectionRequest.find({
      receiverId: userId,
      status: 'pending'
    }).populate('senderId', 'email');

    // Get sent requests
    const sentRequests = await ConnectionRequest.find({
      senderId: userId,
      status: 'pending'
    }).populate('receiverId', 'email');

    // Get profiles for senders
    const senderIds = receivedRequests.map(req => req.senderId);
    const senderProfiles = await Profile.find({ userId: { $in: senderIds } });

    // Get profiles for receivers
    const receiverIds = sentRequests.map(req => req.receiverId);
    const receiverProfiles = await Profile.find({ userId: { $in: receiverIds } });

    const received = receivedRequests.map(req => {
      const profile = senderProfiles.find(p => p.userId.toString() === req.senderId.toString());
      return {
        id: req._id,
        senderId: req.senderId,
        senderName: profile?.name,
        senderProfession: profile?.profession,
        createdAt: req.createdAt
      };
    });

    const sent = sentRequests.map(req => {
      const profile = receiverProfiles.find(p => p.userId.toString() === req.receiverId.toString());
      return {
        id: req._id,
        receiverId: req.receiverId,
        receiverName: profile?.name,
        receiverProfession: profile?.profession,
        createdAt: req.createdAt
      };
    });

    res.json({
      received,
      sent,
      totalReceived: received.length,
      totalSent: sent.length
    });
  } catch (error: any) {
    console.error('Get pending requests error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching pending requests',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const cancelConnectionRequest = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { requestId } = req.params;

    const request = await ConnectionRequest.findById(requestId);
    if (!request) {
      return res.status(404).json({
        error: {
          code: 'REQUEST_NOT_FOUND',
          message: 'Connection request not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (request.senderId.toString() !== userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only cancel requests sent by you',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (request.status !== 'pending') {
      return res.status(400).json({
        error: {
          code: 'INVALID_STATUS',
          message: 'Only pending requests can be cancelled',
          timestamp: new Date().toISOString()
        }
      });
    }

    await ConnectionRequest.findByIdAndDelete(requestId);

    res.json({
      message: 'Connection request cancelled',
      request: {
        id: requestId,
        status: 'cancelled'
      }
    });
  } catch (error: any) {
    console.error('Cancel connection request error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while cancelling connection request',
        timestamp: new Date().toISOString()
      }
    });
  }
};
