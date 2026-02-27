import Notification from '../models/Notification';
import { getWebSocketServer } from '../websocket/server';

export class NotificationService {
  /**
   * Create a notification and emit it via WebSocket
   */
  static async createNotification(
    userId: string,
    type: 'nearby' | 'friend_request' | 'friend_accepted' | 'gig_application' | 'message' | 'call_request',
    title: string,
    message: string,
    data?: any
  ) {
    try {
      const notification = new Notification({
        userId,
        type,
        title,
        message,
        data
      });

      await notification.save();

      // Emit real-time notification via WebSocket
      try {
        const wsServer = getWebSocketServer();
        wsServer.emitToUser(userId, 'notification:new', {
          id: notification._id,
          type: notification.type,
          title: notification.title,
          message: notification.message,
          data: notification.data,
          read: notification.read,
          createdAt: notification.createdAt
        });
      } catch (wsError) {
        // WebSocket not initialized yet, skip real-time notification
        console.log('WebSocket not available, notification saved to database only');
      }

      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
      throw error;
    }
  }

  /**
   * Create nearby user notification
   */
  static async notifyNearbyUser(userId: string, nearbyUserName: string) {
    return this.createNotification(
      userId,
      'nearby',
      'Someone nearby',
      `${nearbyUserName} is nearby and in explore mode`,
      { type: 'nearby' }
    );
  }

  /**
   * Create friend request notification
   */
  static async notifyFriendRequest(userId: string, senderName: string, senderId: string) {
    return this.createNotification(
      userId,
      'friend_request',
      'New friend request',
      `${senderName} sent you a friend request`,
      { senderId, type: 'friend_request' }
    );
  }

  /**
   * Create friend accepted notification
   */
  static async notifyFriendAccepted(userId: string, accepterName: string, accepterId: string) {
    return this.createNotification(
      userId,
      'friend_accepted',
      'Friend request accepted',
      `${accepterName} accepted your friend request`,
      { accepterId, type: 'friend_accepted' }
    );
  }

  /**
   * Create gig application notification
   */
  static async notifyGigApplication(userId: string, applicantName: string, gigTitle: string, gigId: string) {
    return this.createNotification(
      userId,
      'gig_application',
      'New gig application',
      `${applicantName} applied to your gig: ${gigTitle}`,
      { gigId, type: 'gig_application' }
    );
  }

  /**
   * Create message notification
   */
  static async notifyMessage(userId: string, senderName: string, senderId: string) {
    return this.createNotification(
      userId,
      'message',
      'New message',
      `${senderName} sent you a message`,
      { senderId, type: 'message' }
    );
  }

  /**
   * Create call request notification
   */
  static async notifyCallRequest(userId: string, callerName: string, callerId: string, callType: 'voice' | 'video') {
    return this.createNotification(
      userId,
      'call_request',
      `Incoming ${callType} call`,
      `${callerName} is calling you`,
      { callerId, callType, type: 'call_request' }
    );
  }
}
