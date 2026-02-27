import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { NotificationService } from './notificationService';
import Notification from '../models/Notification';

/**
 * Property-Based Tests for Notification Service
 * Feature: socialhive-platform
 * - Property 32: Gig Application Notifications (Validates: Requirements 13.3)
 * - Property 33: Message Notifications (Validates: Requirements 13.4)
 * - Property 34: Call Request Notifications (Validates: Requirements 13.5)
 */

// Mock the models
jest.mock('../models/Notification');

// Mock WebSocket server
jest.mock('../websocket/server', () => ({
  getWebSocketServer: jest.fn(() => ({
    emitToUser: jest.fn()
  }))
}));

describe('Notification Service - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 32: Gig Application Notifications
   * 
   * For any gig application submitted, the gig creator should receive a notification
   * containing the applicant's information.
   * 
   * This property tests that:
   * 1. When a gig application is submitted, a notification is created
   * 2. The notification is sent to the gig creator (not the applicant)
   * 3. The notification contains the applicant's name
   * 4. The notification contains the gig title
   * 5. The notification contains the gig ID in the data field
   * 6. The notification type is 'gig_application'
   * 7. The notification is saved to the database
   * 
   * **Validates: Requirements 13.3**
   * 
   * Feature: socialhive-platform, Property 32: Gig Application Notifications
   */
  it('Property 32: should create notification for gig creator when application is submitted', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random gig creator ID, applicant name, gig title, and gig ID
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 3, maxLength: 50 }),
        fc.string({ minLength: 5, maxLength: 100 }),
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        async (creatorId, applicantName, gigTitle, gigId) => {
          jest.clearAllMocks();

          const notificationId = new mongoose.Types.ObjectId();

          // Mock notification save
          const mockNotification = {
            _id: notificationId,
            userId: creatorId,
            type: 'gig_application',
            title: 'New gig application',
            message: `${applicantName} applied to your gig: ${gigTitle}`,
            data: { gigId, type: 'gig_application' },
            read: false,
            createdAt: new Date(),
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Notification as any).mockImplementation(() => mockNotification);

          // Call the notification service
          const result = await NotificationService.notifyGigApplication(
            creatorId,
            applicantName,
            gigTitle,
            gigId
          );

          // Property 1: Notification should be created
          expect(Notification).toHaveBeenCalled();

          // Property 2: Notification should be sent to gig creator
          expect(Notification).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: creatorId
            })
          );

          // Property 3: Notification type should be 'gig_application'
          expect(Notification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'gig_application'
            })
          );

          // Property 4: Notification message should contain applicant name
          const callArgs = (Notification as any).mock.calls[0][0];
          expect(callArgs.message).toContain(applicantName);

          // Property 5: Notification message should contain gig title
          expect(callArgs.message).toContain(gigTitle);

          // Property 6: Notification data should contain gig ID
          expect(callArgs.data).toEqual(
            expect.objectContaining({
              gigId: gigId
            })
          );

          // Property 7: Notification should be saved to database
          expect(mockNotification.save).toHaveBeenCalled();

          // Property 8: Result should be the created notification
          expect(result).toBe(mockNotification);
        }
      ),
      { numRuns: 20 } // Run 20 iterations for faster tests
    );
  }, 60000);

  /**
   * Property 33: Message Notifications
   * 
   * For any message sent through the chat system, the recipient should receive
   * a notification if they are not currently viewing the chat.
   * 
   * This property tests that:
   * 1. When a message is sent, a notification is created
   * 2. The notification is sent to the recipient (not the sender)
   * 3. The notification contains the sender's name
   * 4. The notification contains the sender's ID in the data field
   * 5. The notification type is 'message'
   * 6. The notification is saved to the database
   * 7. The notification title indicates it's a new message
   * 
   * **Validates: Requirements 13.4**
   * 
   * Feature: socialhive-platform, Property 33: Message Notifications
   */
  it('Property 33: should create notification for message recipient', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random recipient ID, sender name, and sender ID
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 3, maxLength: 50 }),
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        async (recipientId, senderName, senderId) => {
          // Ensure sender and recipient are different
          if (recipientId === senderId) {
            return;
          }

          jest.clearAllMocks();

          const notificationId = new mongoose.Types.ObjectId();

          // Mock notification save
          const mockNotification = {
            _id: notificationId,
            userId: recipientId,
            type: 'message',
            title: 'New message',
            message: `${senderName} sent you a message`,
            data: { senderId, type: 'message' },
            read: false,
            createdAt: new Date(),
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Notification as any).mockImplementation(() => mockNotification);

          // Call the notification service
          const result = await NotificationService.notifyMessage(
            recipientId,
            senderName,
            senderId
          );

          // Property 1: Notification should be created
          expect(Notification).toHaveBeenCalled();

          // Property 2: Notification should be sent to recipient (not sender)
          expect(Notification).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: recipientId
            })
          );

          // Property 3: Notification type should be 'message'
          expect(Notification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'message'
            })
          );

          // Property 4: Notification message should contain sender name
          const callArgs = (Notification as any).mock.calls[0][0];
          expect(callArgs.message).toContain(senderName);

          // Property 5: Notification data should contain sender ID
          expect(callArgs.data).toEqual(
            expect.objectContaining({
              senderId: senderId
            })
          );

          // Property 6: Notification title should indicate new message
          expect(callArgs.title).toBe('New message');

          // Property 7: Notification should be saved to database
          expect(mockNotification.save).toHaveBeenCalled();

          // Property 8: Result should be the created notification
          expect(result).toBe(mockNotification);
        }
      ),
      { numRuns: 20 } // Run 20 iterations for faster tests
    );
  }, 60000);

  /**
   * Property 34: Call Request Notifications
   * 
   * For any call initiated (voice or video), the recipient should receive
   * a notification with call type and caller information.
   * 
   * This property tests that:
   * 1. When a call is initiated, a notification is created
   * 2. The notification is sent to the call recipient (not the caller)
   * 3. The notification contains the caller's name
   * 4. The notification contains the caller's ID in the data field
   * 5. The notification contains the call type (voice or video) in the data field
   * 6. The notification type is 'call_request'
   * 7. The notification is saved to the database
   * 8. The notification title indicates the call type
   * 
   * **Validates: Requirements 13.5**
   * 
   * Feature: socialhive-platform, Property 34: Call Request Notifications
   */
  it('Property 34: should create notification for call recipient with call type', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate random recipient ID, caller name, caller ID, and call type
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 3, maxLength: 50 }),
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        fc.constantFrom('voice', 'video'),
        async (recipientId, callerName, callerId, callType) => {
          // Ensure caller and recipient are different
          if (recipientId === callerId) {
            return;
          }

          jest.clearAllMocks();

          const notificationId = new mongoose.Types.ObjectId();

          // Mock notification save
          const mockNotification = {
            _id: notificationId,
            userId: recipientId,
            type: 'call_request',
            title: `Incoming ${callType} call`,
            message: `${callerName} is calling you`,
            data: { callerId, callType, type: 'call_request' },
            read: false,
            createdAt: new Date(),
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Notification as any).mockImplementation(() => mockNotification);

          // Call the notification service
          const result = await NotificationService.notifyCallRequest(
            recipientId,
            callerName,
            callerId,
            callType as 'voice' | 'video'
          );

          // Property 1: Notification should be created
          expect(Notification).toHaveBeenCalled();

          // Property 2: Notification should be sent to recipient (not caller)
          expect(Notification).toHaveBeenCalledWith(
            expect.objectContaining({
              userId: recipientId
            })
          );

          // Property 3: Notification type should be 'call_request'
          expect(Notification).toHaveBeenCalledWith(
            expect.objectContaining({
              type: 'call_request'
            })
          );

          // Property 4: Notification message should contain caller name
          const callArgs = (Notification as any).mock.calls[0][0];
          expect(callArgs.message).toContain(callerName);

          // Property 5: Notification data should contain caller ID
          expect(callArgs.data).toEqual(
            expect.objectContaining({
              callerId: callerId
            })
          );

          // Property 6: Notification data should contain call type
          expect(callArgs.data).toEqual(
            expect.objectContaining({
              callType: callType
            })
          );

          // Property 7: Notification title should indicate call type
          expect(callArgs.title).toBe(`Incoming ${callType} call`);

          // Property 8: Notification should be saved to database
          expect(mockNotification.save).toHaveBeenCalled();

          // Property 9: Result should be the created notification
          expect(result).toBe(mockNotification);
        }
      ),
      { numRuns: 20 } // Run 20 iterations for faster tests
    );
  }, 60000);

  /**
   * Additional test: Verify notification types are distinct
   */
  it('should create notifications with correct types for different events', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 3, maxLength: 30 }),
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        async (userId, name, otherId) => {
          if (userId === otherId) {
            return;
          }

          jest.clearAllMocks();

          // Test gig application notification
          const mockGigNotif = {
            _id: new mongoose.Types.ObjectId(),
            userId,
            type: 'gig_application',
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Notification as any).mockImplementation(() => mockGigNotif);
          await NotificationService.notifyGigApplication(userId, name, 'Test Gig', otherId);
          expect((Notification as any).mock.calls[0][0].type).toBe('gig_application');

          jest.clearAllMocks();

          // Test message notification
          const mockMsgNotif = {
            _id: new mongoose.Types.ObjectId(),
            userId,
            type: 'message',
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Notification as any).mockImplementation(() => mockMsgNotif);
          await NotificationService.notifyMessage(userId, name, otherId);
          expect((Notification as any).mock.calls[0][0].type).toBe('message');

          jest.clearAllMocks();

          // Test call notification
          const mockCallNotif = {
            _id: new mongoose.Types.ObjectId(),
            userId,
            type: 'call_request',
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Notification as any).mockImplementation(() => mockCallNotif);
          await NotificationService.notifyCallRequest(userId, name, otherId, 'voice');
          expect((Notification as any).mock.calls[0][0].type).toBe('call_request');
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);

  /**
   * Additional test: Verify all notifications are saved to database
   */
  it('should save all notification types to database', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 3, maxLength: 30 }),
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        async (userId, name, otherId) => {
          if (userId === otherId) {
            return;
          }

          const saveMock = jest.fn().mockResolvedValue(undefined);

          // Test each notification type
          const notificationTypes = [
            () => {
              const mock = {
                _id: new mongoose.Types.ObjectId(),
                save: saveMock
              };
              (Notification as any).mockImplementation(() => mock);
              return NotificationService.notifyGigApplication(userId, name, 'Gig', otherId);
            },
            () => {
              const mock = {
                _id: new mongoose.Types.ObjectId(),
                save: saveMock
              };
              (Notification as any).mockImplementation(() => mock);
              return NotificationService.notifyMessage(userId, name, otherId);
            },
            () => {
              const mock = {
                _id: new mongoose.Types.ObjectId(),
                save: saveMock
              };
              (Notification as any).mockImplementation(() => mock);
              return NotificationService.notifyCallRequest(userId, name, otherId, 'voice');
            }
          ];

          for (const createNotif of notificationTypes) {
            jest.clearAllMocks();
            await createNotif();
            expect(saveMock).toHaveBeenCalled();
          }
        }
      ),
      { numRuns: 20 }
    );
  }, 60000);
});
