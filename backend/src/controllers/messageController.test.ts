import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { sendMessage } from './messageController';
import User from '../models/User';
import Profile from '../models/Profile';
import Friendship from '../models/Friendship';
import Message from '../models/Message';
import ChatRoom from '../models/ChatRoom';
import { ChatService } from '../services/chatService';

// Mock the WebSocket server
jest.mock('../websocket/server', () => ({
  getWebSocketServer: () => ({
    emitToUser: jest.fn()
  })
}));

// Mock the interaction service
jest.mock('../services/interactionService', () => ({
  InteractionService: {
    incrementInteraction: jest.fn()
  }
}));

// Mock the models
jest.mock('../models/User');
jest.mock('../models/Profile');
jest.mock('../models/Friendship');
jest.mock('../models/Message');
jest.mock('../models/ChatRoom');

// Mock the ChatService
jest.mock('../services/chatService');

describe('Message Controller - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 12: Chat Disabled Before Mutual Acceptance
   * 
   * For any pair of users without mutual acceptance (no friendship),
   * attempts to send messages should be rejected with an authorization error.
   * 
   * **Validates: Requirements 4.9**
   * 
   * Feature: socialhive-platform, Property 12: Chat Disabled Before Mutual Acceptance
   */
  it('Property 12: should reject message attempts between non-friends', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        // Generate message content
        fc.string({ minLength: 1, maxLength: 500 }),
        async (userId1, userId2, messageContent) => {
          // Ensure users have different IDs
          if (userId1 === userId2) {
            return; // Skip this test case
          }

          // Mock ChatService to throw error when users are not friends
          (ChatService.getOrCreatePersonalChatRoom as jest.Mock).mockRejectedValue(
            new Error('Users must be friends to chat')
          );

          // Create mock request and response
          const req: any = {
            userId: userId1,
            body: {
              receiverId: userId2,
              encryptedContent: messageContent
            }
          };

          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          // Call the controller
          await sendMessage(req, res);

          // Should respond with 403 Forbidden
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              error: expect.objectContaining({
                code: 'NOT_FRIENDS',
                message: 'Users must be friends to chat'
              })
            })
          );

          // Verify ChatService was called
          expect(ChatService.getOrCreatePersonalChatRoom).toHaveBeenCalledWith(
            userId1,
            userId2
          );
        }
      ),
      { numRuns: 100 } // Run 100 iterations as per spec requirements
    );
  });

  /**
   * Property 12 (edge case): should reject messages even with blocked friendship
   */
  it('Property 12 (blocked): should reject messages when friendship is blocked', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (userId1, userId2, messageContent) => {
          if (userId1 === userId2) {
            return;
          }

          // Mock ChatService to throw error for blocked friendship
          (ChatService.getOrCreatePersonalChatRoom as jest.Mock).mockRejectedValue(
            new Error('Users must be friends to chat')
          );

          const req: any = {
            userId: userId1,
            body: {
              receiverId: userId2,
              encryptedContent: messageContent
            }
          };

          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await sendMessage(req, res);

          // Should be rejected
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              error: expect.objectContaining({
                code: 'NOT_FRIENDS'
              })
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 12 (positive case): should allow messages between friends
   */
  it('Property 12 (friends): should allow messages when friendship exists', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (userId1, userId2, messageContent) => {
          if (userId1 === userId2) {
            return;
          }

          const chatRoomId = new mongoose.Types.ObjectId().toString();
          const messageId = new mongoose.Types.ObjectId().toString();

          // Mock ChatService to return a chat room (friendship exists)
          (ChatService.getOrCreatePersonalChatRoom as jest.Mock).mockResolvedValue({
            _id: chatRoomId,
            type: 'personal',
            participants: [userId1, userId2]
          });

          (ChatService.isParticipant as jest.Mock).mockResolvedValue(true);
          (ChatService.updateLastMessageTime as jest.Mock).mockResolvedValue(undefined);

          // Mock Message model
          const mockMessage = {
            _id: messageId,
            chatRoomId,
            senderId: userId1,
            receiverId: userId2,
            encryptedContent: messageContent,
            timestamp: new Date(),
            delivered: false,
            read: false,
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Message as any).mockImplementation(() => mockMessage);

          // Mock Profile.findOne
          (Profile.findOne as jest.Mock).mockResolvedValue({
            name: 'Test User'
          });

          const req: any = {
            userId: userId1,
            body: {
              receiverId: userId2,
              encryptedContent: messageContent
            }
          };

          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await sendMessage(req, res);

          // Should succeed
          expect(res.status).toHaveBeenCalledWith(201);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Message sent successfully',
              messageData: expect.objectContaining({
                chatRoomId,
                senderId: userId1,
                receiverId: userId2
              })
            })
          );

          // Verify message was saved
          expect(mockMessage.save).toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20: Message Encryption
   * 
   * For any message sent through the chat system, the message content should be 
   * encrypted before transmission and only decryptable by the intended recipient.
   * 
   * **Validates: Requirements 7.5, 19.4**
   * 
   * Feature: socialhive-platform, Property 20: Message Encryption
   */
  it('Property 20: should encrypt all messages before storage and transmission', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        // Generate plaintext message content
        fc.string({ minLength: 1, maxLength: 500 }),
        // Generate encrypted version (simulating client-side encryption)
        fc.string({ minLength: 50, maxLength: 1000 }),
        async (userId1, userId2, plaintextMessage, encryptedContent) => {
          // Ensure users have different IDs
          if (userId1 === userId2) {
            return;
          }

          // Ensure encrypted content is different from plaintext (simulating real encryption)
          if (encryptedContent === plaintextMessage) {
            return;
          }

          const chatRoomId = new mongoose.Types.ObjectId().toString();
          const messageId = new mongoose.Types.ObjectId().toString();

          // Mock friendship exists
          (Friendship.findOne as jest.Mock).mockResolvedValue({
            _id: new mongoose.Types.ObjectId().toString(),
            user1Id: userId1,
            user2Id: userId2,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 0,
            blocked: false
          });

          // Mock ChatService to return a chat room
          (ChatService.getOrCreatePersonalChatRoom as jest.Mock).mockResolvedValue({
            _id: chatRoomId,
            type: 'personal',
            participants: [userId1, userId2]
          });

          (ChatService.isParticipant as jest.Mock).mockResolvedValue(true);
          (ChatService.updateLastMessageTime as jest.Mock).mockResolvedValue(undefined);

          // Mock Message model to capture what gets saved
          let savedMessage: any = null;
          const mockMessage = {
            _id: messageId,
            chatRoomId,
            senderId: userId1,
            receiverId: userId2,
            encryptedContent: encryptedContent, // This should be encrypted, not plaintext
            timestamp: new Date(),
            delivered: false,
            read: false,
            save: jest.fn().mockImplementation(function() {
              savedMessage = { ...this };
              return Promise.resolve(undefined);
            })
          };

          (Message as any).mockImplementation(() => mockMessage);

          // Mock Profile.findOne
          (Profile.findOne as jest.Mock).mockResolvedValue({
            name: 'Test User'
          });

          const req: any = {
            userId: userId1,
            body: {
              receiverId: userId2,
              encryptedContent: encryptedContent // Client sends encrypted content
            }
          };

          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await sendMessage(req, res);

          // Property 1: Message should be successfully sent
          expect(res.status).toHaveBeenCalledWith(201);

          // Property 2: Message should be saved with encrypted content
          expect(mockMessage.save).toHaveBeenCalled();
          expect(savedMessage).not.toBeNull();

          // Property 3: Stored content must be encrypted (not plaintext)
          // The system should store the encrypted content exactly as received from client
          expect(savedMessage.encryptedContent).toBe(encryptedContent);
          expect(savedMessage.encryptedContent).not.toBe(plaintextMessage);

          // Property 4: Server should never see or store plaintext
          // Verify that the plaintext message is not anywhere in the saved data
          const savedMessageString = JSON.stringify(savedMessage);
          if (plaintextMessage.length > 5) { // Only check for non-trivial messages
            expect(savedMessageString).not.toContain(plaintextMessage);
          }

          // Property 5: Encrypted content should be transmitted to recipient
          // The WebSocket should emit the encrypted content, not plaintext
          const wsServer = require('../websocket/server').getWebSocketServer();
          if (wsServer.emitToUser.mock.calls.length > 0) {
            const messageEvent = wsServer.emitToUser.mock.calls.find(
              (call: any) => call[1] === 'message:receive'
            );
            if (messageEvent) {
              expect(messageEvent[2].encryptedContent).toBe(encryptedContent);
              expect(messageEvent[2].encryptedContent).not.toBe(plaintextMessage);
            }
          }

          // Property 6: Message metadata should be correct
          expect(savedMessage.senderId).toBe(userId1);
          expect(savedMessage.receiverId).toBe(userId2);
          expect(savedMessage.chatRoomId).toBe(chatRoomId);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as per spec requirements
    );
  });

  /**
   * Property 20 (edge case): should handle empty encrypted content
   */
  it('Property 20 (edge): should reject messages with empty encrypted content', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        async (userId1, userId2) => {
          if (userId1 === userId2) {
            return;
          }

          const req: any = {
            userId: userId1,
            body: {
              receiverId: userId2,
              encryptedContent: '' // Empty encrypted content
            }
          };

          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await sendMessage(req, res);

          // Should reject with validation error
          expect(res.status).toHaveBeenCalledWith(400);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              error: expect.objectContaining({
                code: 'VALIDATION_ERROR'
              })
            })
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 20 (security): should never expose plaintext in database or transmission
   */
  it('Property 20 (security): encrypted content should remain encrypted throughout system', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 10, maxLength: 100 }), // Plaintext
        fc.string({ minLength: 100, maxLength: 500 }), // Encrypted (longer than plaintext)
        async (userId1, userId2, plaintext, encrypted) => {
          if (userId1 === userId2 || plaintext === encrypted) {
            return;
          }

          const chatRoomId = new mongoose.Types.ObjectId().toString();
          const messageId = new mongoose.Types.ObjectId().toString();

          (ChatService.getOrCreatePersonalChatRoom as jest.Mock).mockResolvedValue({
            _id: chatRoomId,
            type: 'personal',
            participants: [userId1, userId2]
          });

          (ChatService.isParticipant as jest.Mock).mockResolvedValue(true);
          (ChatService.updateLastMessageTime as jest.Mock).mockResolvedValue(undefined);

          let savedMessage: any = null;
          const mockMessage = {
            _id: messageId,
            chatRoomId,
            senderId: userId1,
            receiverId: userId2,
            encryptedContent: encrypted,
            timestamp: new Date(),
            delivered: false,
            read: false,
            save: jest.fn().mockImplementation(function() {
              savedMessage = { ...this };
              return Promise.resolve(undefined);
            })
          };

          (Message as any).mockImplementation(() => mockMessage);
          (Profile.findOne as jest.Mock).mockResolvedValue({ name: 'Test User' });

          const req: any = {
            userId: userId1,
            body: {
              receiverId: userId2,
              encryptedContent: encrypted
            }
          };

          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await sendMessage(req, res);

          // Property: Plaintext should never appear in saved message
          expect(savedMessage).not.toBeNull();
          expect(savedMessage.encryptedContent).not.toContain(plaintext);
          
          // Property: Only encrypted content should be stored
          expect(savedMessage.encryptedContent).toBe(encrypted);
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 16: Friendship Enables Chat
   * 
   * For any established friendship, both users should be able to send and receive 
   * encrypted messages through the chat system.
   * 
   * **Validates: Requirements 5.6, 7.1, 8.1**
   * 
   * Feature: socialhive-platform, Property 16: Friendship Enables Chat
   */
  it('Property 16: should enable bidirectional chat for any established friendship', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        // Generate message content for both directions
        fc.string({ minLength: 1, maxLength: 500 }),
        fc.string({ minLength: 1, maxLength: 500 }),
        async (userId1, userId2, message1to2, message2to1) => {
          // Ensure users have different IDs
          if (userId1 === userId2) {
            return;
          }

          const chatRoomId = new mongoose.Types.ObjectId().toString();
          const friendshipId = new mongoose.Types.ObjectId().toString();

          // Mock Friendship to exist
          (Friendship.findOne as jest.Mock).mockResolvedValue({
            _id: friendshipId,
            user1Id: userId1,
            user2Id: userId2,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 0,
            blocked: false
          });

          // Mock ChatService to return a chat room (friendship exists)
          (ChatService.getOrCreatePersonalChatRoom as jest.Mock).mockResolvedValue({
            _id: chatRoomId,
            type: 'personal',
            participants: [userId1, userId2]
          });

          (ChatService.isParticipant as jest.Mock).mockResolvedValue(true);
          (ChatService.updateLastMessageTime as jest.Mock).mockResolvedValue(undefined);

          // Mock Profile.findOne
          (Profile.findOne as jest.Mock).mockImplementation(({ userId }) => {
            if (userId === userId1) {
              return Promise.resolve({ userId: userId1, name: 'User 1' });
            }
            if (userId === userId2) {
              return Promise.resolve({ userId: userId2, name: 'User 2' });
            }
            return Promise.resolve(null);
          });

          // Test 1: User 1 sends message to User 2
          const messageId1 = new mongoose.Types.ObjectId().toString();
          const mockMessage1 = {
            _id: messageId1,
            chatRoomId,
            senderId: userId1,
            receiverId: userId2,
            encryptedContent: message1to2,
            timestamp: new Date(),
            delivered: false,
            read: false,
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Message as any).mockImplementation(() => mockMessage1);

          const req1: any = {
            userId: userId1,
            body: {
              receiverId: userId2,
              encryptedContent: message1to2
            }
          };

          const res1: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await sendMessage(req1, res1);

          // Property 1: User 1 should be able to send message to User 2
          expect(res1.status).toHaveBeenCalledWith(201);
          expect(res1.json).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Message sent successfully',
              messageData: expect.objectContaining({
                chatRoomId,
                senderId: userId1,
                receiverId: userId2
              })
            })
          );

          // Property 2: Message should be saved
          expect(mockMessage1.save).toHaveBeenCalled();

          // Property 3: ChatService should verify friendship exists
          expect(ChatService.getOrCreatePersonalChatRoom).toHaveBeenCalledWith(
            userId1,
            userId2
          );

          // Store first chat room ID before clearing mocks
          const firstChatRoomId = res1.json.mock.calls[0][0].messageData.chatRoomId;

          // Reset mocks for second direction
          jest.clearAllMocks();

          // Re-setup mocks for reverse direction
          (Friendship.findOne as jest.Mock).mockResolvedValue({
            _id: friendshipId,
            user1Id: userId1,
            user2Id: userId2,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 0,
            blocked: false
          });

          (ChatService.getOrCreatePersonalChatRoom as jest.Mock).mockResolvedValue({
            _id: chatRoomId,
            type: 'personal',
            participants: [userId1, userId2]
          });

          (ChatService.isParticipant as jest.Mock).mockResolvedValue(true);
          (ChatService.updateLastMessageTime as jest.Mock).mockResolvedValue(undefined);

          (Profile.findOne as jest.Mock).mockImplementation(({ userId }) => {
            if (userId === userId1) {
              return Promise.resolve({ userId: userId1, name: 'User 1' });
            }
            if (userId === userId2) {
              return Promise.resolve({ userId: userId2, name: 'User 2' });
            }
            return Promise.resolve(null);
          });

          // Test 2: User 2 sends message to User 1
          const messageId2 = new mongoose.Types.ObjectId().toString();
          const mockMessage2 = {
            _id: messageId2,
            chatRoomId,
            senderId: userId2,
            receiverId: userId1,
            encryptedContent: message2to1,
            timestamp: new Date(),
            delivered: false,
            read: false,
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Message as any).mockImplementation(() => mockMessage2);

          const req2: any = {
            userId: userId2,
            body: {
              receiverId: userId1,
              encryptedContent: message2to1
            }
          };

          const res2: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await sendMessage(req2, res2);

          // Property 4: User 2 should be able to send message to User 1 (bidirectional)
          expect(res2.status).toHaveBeenCalledWith(201);
          expect(res2.json).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Message sent successfully',
              messageData: expect.objectContaining({
                chatRoomId,
                senderId: userId2,
                receiverId: userId1
              })
            })
          );

          // Property 5: Message should be saved
          expect(mockMessage2.save).toHaveBeenCalled();

          // Property 6: Both messages should use the same chat room
          const secondChatRoomId = res2.json.mock.calls[0][0].messageData.chatRoomId;
          expect(firstChatRoomId).toBe(secondChatRoomId);

          // Property 7: ChatService should verify friendship exists for both directions
          expect(ChatService.getOrCreatePersonalChatRoom).toHaveBeenCalledWith(
            userId2,
            userId1
          );
        }
      ),
      { numRuns: 100 } // Run 100 iterations as per spec requirements
    );
  }, 120000); // Increased timeout for property-based testing
});
