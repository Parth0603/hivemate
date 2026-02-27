import * as fc from 'fast-check';
import mongoose from 'mongoose';
import { initiateCall } from './callController';
import Friendship from '../models/Friendship';
import CallSession from '../models/CallSession';
import { InteractionService } from '../services/interactionService';

// Mock the WebSocket server
jest.mock('../websocket/server', () => ({
  getWebSocketServer: () => ({
    emitToUser: jest.fn()
  })
}));

// Mock the models
jest.mock('../models/Friendship');
jest.mock('../models/CallSession');

// Mock the interaction service
jest.mock('../services/interactionService');

describe('Call Controller - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 21: Voice Call Unlock After Interactions
   * 
   * For any friendship where the interaction count reaches 2 or more,
   * voice call capability should be unlocked for both users.
   * 
   * **Validates: Requirements 8.2**
   * 
   * Feature: socialhive-platform, Property 21: Voice Call Unlock After Interactions
   */
  it('Property 21: should unlock voice calls after 2 or more interactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        // Generate interaction count >= 2
        fc.integer({ min: 2, max: 100 }),
        async (userId1, userId2, interactionCount) => {
          // Ensure users have different IDs
          if (userId1 === userId2) {
            return;
          }

          const friendshipId = new mongoose.Types.ObjectId().toString();
          const callSessionId = new mongoose.Types.ObjectId().toString();

          // Mock friendship with sufficient interactions
          const mockFriendship = {
            _id: friendshipId,
            user1Id: userId1,
            user2Id: userId2,
            establishedAt: new Date(),
            communicationLevel: 'voice', // Should be unlocked
            interactionCount: interactionCount,
            blocked: false
          };

          (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);

          // Mock InteractionService to return true for voice unlock
          (InteractionService.isVoiceUnlocked as jest.Mock).mockResolvedValue(true);

          // Mock CallSession
          const mockCallSession = {
            _id: callSessionId,
            type: 'voice',
            initiatorId: userId1,
            participantIds: [userId1, userId2],
            status: 'ringing',
            save: jest.fn().mockResolvedValue(undefined)
          };

          (CallSession as any).mockImplementation(() => mockCallSession);

          const req: any = {
            userId: userId1,
            body: {
              participantId: userId2,
              type: 'voice'
            }
          };

          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await initiateCall(req, res);

          // Property 1: Voice call should be allowed with sufficient interactions
          expect(res.status).toHaveBeenCalledWith(201);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              message: 'Call initiated successfully',
              call: expect.objectContaining({
                type: 'voice'
              })
            })
          );

          // Property 2: Call session should be created
          expect(mockCallSession.save).toHaveBeenCalled();

          // Property 3: InteractionService should verify voice is unlocked
          expect(InteractionService.isVoiceUnlocked).toHaveBeenCalledWith(
            userId1,
            userId2
          );
        }
      ),
      { numRuns: 100 } // Run 100 iterations as per spec requirements
    );
  });

  /**
   * Property 21 (negative case): should reject voice calls with insufficient interactions
   */
  it('Property 21 (locked): should reject voice calls with less than 2 interactions', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        // Generate interaction count < 2
        fc.integer({ min: 0, max: 1 }),
        async (userId1, userId2, interactionCount) => {
          if (userId1 === userId2) {
            return;
          }

          const friendshipId = new mongoose.Types.ObjectId().toString();

          // Mock friendship with insufficient interactions
          const mockFriendship = {
            _id: friendshipId,
            user1Id: userId1,
            user2Id: userId2,
            establishedAt: new Date(),
            communicationLevel: 'chat', // Not yet unlocked
            interactionCount: interactionCount,
            blocked: false
          };

          (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);

          // Mock InteractionService to return false for voice unlock
          (InteractionService.isVoiceUnlocked as jest.Mock).mockResolvedValue(false);

          const req: any = {
            userId: userId1,
            body: {
              participantId: userId2,
              type: 'voice'
            }
          };

          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await initiateCall(req, res);

          // Property: Voice call should be rejected
          expect(res.status).toHaveBeenCalledWith(403);
          expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({
              error: expect.objectContaining({
                code: 'VOICE_LOCKED'
              })
            })
          );

          // Property: InteractionService should verify voice is locked
          expect(InteractionService.isVoiceUnlocked).toHaveBeenCalledWith(
            userId1,
            userId2
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 23: Locked Features Return Errors
   * 
   * For any communication feature (voice or video) that has not been unlocked
   * for a friendship, attempts to initiate that type of call should be rejected
   * with a feature-locked error.
   * 
   * **Validates: Requirements 8.4**
   * 
   * Feature: socialhive-platform, Property 23: Locked Features Return Errors
   */
  it('Property 23: should return feature-locked error for locked communication features', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 24, maxLength: 24 }),
        fc.string({ minLength: 24, maxLength: 24 }),
        // Generate call type
        fc.constantFrom('voice', 'video'),
        // Generate interaction count
        fc.integer({ min: 0, max: 10 }),
        async (userId1, userId2, callType, interactionCount) => {
          if (userId1 === userId2) {
            return;
          }

          const friendshipId = new mongoose.Types.ObjectId().toString();

          // Determine if feature should be locked based on type and interactions
          const isVoiceLocked = callType === 'voice' && interactionCount < 2;
          const isVideoLocked = callType === 'video'; // Assume no subscription

          const mockFriendship = {
            _id: friendshipId,
            user1Id: userId1,
            user2Id: userId2,
            establishedAt: new Date(),
            communicationLevel: interactionCount >= 2 ? 'voice' : 'chat',
            interactionCount: interactionCount,
            blocked: false
          };

          (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);

          // Mock InteractionService based on call type
          if (callType === 'voice') {
            (InteractionService.isVoiceUnlocked as jest.Mock).mockResolvedValue(!isVoiceLocked);
          } else {
            (InteractionService.isVideoUnlocked as jest.Mock).mockResolvedValue(!isVideoLocked);
          }

          const req: any = {
            userId: userId1,
            body: {
              participantId: userId2,
              type: callType
            }
          };

          const res: any = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn()
          };

          await initiateCall(req, res);

          // Property: If feature is locked, should return 403 with appropriate error code
          if (isVoiceLocked) {
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({
                error: expect.objectContaining({
                  code: 'VOICE_LOCKED',
                  message: expect.stringContaining('interactions')
                })
              })
            );
          } else if (isVideoLocked) {
            expect(res.status).toHaveBeenCalledWith(403);
            expect(res.json).toHaveBeenCalledWith(
              expect.objectContaining({
                error: expect.objectContaining({
                  code: 'VIDEO_LOCKED',
                  message: expect.stringContaining('subscription')
                })
              })
            );
          } else {
            // If unlocked, should succeed
            expect(res.status).toHaveBeenCalledWith(201);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
