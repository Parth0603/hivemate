import { InteractionService } from './interactionService';
import Friendship from '../models/Friendship';
import Subscription from '../models/Subscription';
import mongoose from 'mongoose';

// Mock the models
jest.mock('../models/Friendship');
jest.mock('../models/Subscription');

describe('InteractionService - Video Call Unlocking', () => {
  const user1Id = new mongoose.Types.ObjectId().toString();
  const user2Id = new mongoose.Types.ObjectId().toString();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('hasActiveSubscription', () => {
    it('should return true when user1 has active premium subscription', async () => {
      (Subscription.findOne as jest.Mock).mockImplementation(({ userId }) => {
        if (userId === user1Id) {
          return Promise.resolve({ plan: 'premium', status: 'active' });
        }
        return Promise.resolve(null);
      });

      const result = await InteractionService.hasActiveSubscription(user1Id, user2Id);
      expect(result).toBe(true);
    });

    it('should return true when user2 has active premium subscription', async () => {
      (Subscription.findOne as jest.Mock).mockImplementation(({ userId }) => {
        if (userId === user2Id) {
          return Promise.resolve({ plan: 'premium', status: 'active' });
        }
        return Promise.resolve(null);
      });

      const result = await InteractionService.hasActiveSubscription(user1Id, user2Id);
      expect(result).toBe(true);
    });

    it('should return true when both users have active premium subscriptions', async () => {
      (Subscription.findOne as jest.Mock).mockResolvedValue({
        plan: 'premium',
        status: 'active'
      });

      const result = await InteractionService.hasActiveSubscription(user1Id, user2Id);
      expect(result).toBe(true);
    });

    it('should return false when neither user has active subscription', async () => {
      (Subscription.findOne as jest.Mock).mockResolvedValue(null);

      const result = await InteractionService.hasActiveSubscription(user1Id, user2Id);
      expect(result).toBe(false);
    });

    it('should return false when subscriptions are cancelled', async () => {
      (Subscription.findOne as jest.Mock).mockResolvedValue({
        plan: 'premium',
        status: 'cancelled'
      });

      const result = await InteractionService.hasActiveSubscription(user1Id, user2Id);
      expect(result).toBe(false);
    });
  });

  describe('isVideoUnlocked', () => {
    it('should unlock video and return true when either user has subscription', async () => {
      const mockFriendship = {
        user1Id,
        user2Id,
        communicationLevel: 'chat',
        save: jest.fn().mockResolvedValue(true)
      };

      (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);
      (Subscription.findOne as jest.Mock).mockImplementation(({ userId }) => {
        if (userId === user1Id) {
          return Promise.resolve({ plan: 'premium', status: 'active' });
        }
        return Promise.resolve(null);
      });

      const result = await InteractionService.isVideoUnlocked(user1Id, user2Id);

      expect(result).toBe(true);
      expect(mockFriendship.communicationLevel).toBe('video');
      expect(mockFriendship.save).toHaveBeenCalled();
    });

    it('should return true without updating when already at video level', async () => {
      const mockFriendship = {
        user1Id,
        user2Id,
        communicationLevel: 'video',
        save: jest.fn()
      };

      (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);
      (Subscription.findOne as jest.Mock).mockResolvedValue({
        plan: 'premium',
        status: 'active'
      });

      const result = await InteractionService.isVideoUnlocked(user1Id, user2Id);

      expect(result).toBe(true);
      expect(mockFriendship.save).not.toHaveBeenCalled();
    });

    it('should return false when no subscription exists', async () => {
      const mockFriendship = {
        user1Id,
        user2Id,
        communicationLevel: 'chat',
        save: jest.fn()
      };

      (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);
      (Subscription.findOne as jest.Mock).mockResolvedValue(null);

      const result = await InteractionService.isVideoUnlocked(user1Id, user2Id);

      expect(result).toBe(false);
      expect(mockFriendship.save).not.toHaveBeenCalled();
    });

    it('should return false when friendship does not exist', async () => {
      (Friendship.findOne as jest.Mock).mockResolvedValue(null);

      const result = await InteractionService.isVideoUnlocked(user1Id, user2Id);

      expect(result).toBe(false);
    });
  });

  describe('unlockVideo', () => {
    it('should unlock video when either user has subscription', async () => {
      const mockFriendship = {
        user1Id,
        user2Id,
        communicationLevel: 'chat',
        save: jest.fn().mockResolvedValue(true)
      };

      (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);
      (Subscription.findOne as jest.Mock).mockImplementation(({ userId }) => {
        if (userId === user1Id) {
          return Promise.resolve({ plan: 'premium', status: 'active' });
        }
        return Promise.resolve(null);
      });

      await InteractionService.unlockVideo(user1Id, user2Id);

      expect(mockFriendship.communicationLevel).toBe('video');
      expect(mockFriendship.save).toHaveBeenCalled();
    });

    it('should throw error when no subscription exists', async () => {
      const mockFriendship = {
        user1Id,
        user2Id,
        communicationLevel: 'chat',
        save: jest.fn()
      };

      (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);
      (Subscription.findOne as jest.Mock).mockResolvedValue(null);

      await expect(InteractionService.unlockVideo(user1Id, user2Id)).rejects.toThrow(
        'Active subscription required for video calls'
      );
    });

    it('should throw error when friendship does not exist', async () => {
      (Friendship.findOne as jest.Mock).mockResolvedValue(null);

      await expect(InteractionService.unlockVideo(user1Id, user2Id)).rejects.toThrow(
        'Friendship not found'
      );
    });
  });
});


describe('InteractionService - Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  /**
   * Property 22: Subscription Enables Video for Both Users
   * 
   * For any friendship where at least one user has an active subscription,
   * video call capability should be unlocked for both users in that conversation.
   * 
   * **Validates: Requirements 8.3, 15.2, 15.3**
   * 
   * Feature: socialhive-platform, Property 22: Subscription Enables Video for Both Users
   */
  it('Property 22: should unlock video for both users when either has subscription', async () => {
    const fc = require('fast-check');
    
    await fc.assert(
      fc.asyncProperty(
        // Generate two different user IDs (valid MongoDB ObjectIds)
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        // Generate which user has subscription (0 = user1, 1 = user2, 2 = both)
        fc.integer({ min: 0, max: 2 }),
        async (userId1: string, userId2: string, subscriptionHolder: number) => {
          // Ensure users have different IDs
          if (userId1 === userId2) {
            return;
          }

          const friendshipId = new mongoose.Types.ObjectId().toString();

          // Mock friendship
          const mockFriendship = {
            _id: friendshipId,
            user1Id: userId1,
            user2Id: userId2,
            establishedAt: new Date(),
            communicationLevel: 'chat', // Initially at chat level
            interactionCount: 5,
            blocked: false,
            save: jest.fn().mockResolvedValue(undefined)
          };

          (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);

          // Mock subscriptions based on subscriptionHolder
          (Subscription.findOne as jest.Mock).mockImplementation(({ userId }) => {
            if (subscriptionHolder === 0 && userId === userId1) {
              // Only user1 has subscription
              return Promise.resolve({ plan: 'premium', status: 'active' });
            } else if (subscriptionHolder === 1 && userId === userId2) {
              // Only user2 has subscription
              return Promise.resolve({ plan: 'premium', status: 'active' });
            } else if (subscriptionHolder === 2) {
              // Both have subscription
              return Promise.resolve({ plan: 'premium', status: 'active' });
            }
            return Promise.resolve(null);
          });

          // Test isVideoUnlocked
          const result = await InteractionService.isVideoUnlocked(userId1, userId2);

          // Property 1: Video should be unlocked when either user has subscription
          expect(result).toBe(true);

          // Property 2: Friendship communication level should be upgraded to video
          expect(mockFriendship.communicationLevel).toBe('video');

          // Property 3: Friendship should be saved with new level
          expect(mockFriendship.save).toHaveBeenCalled();

          // Property 4: Both users should have access (test reverse direction)
          jest.clearAllMocks();
          
          // Reset friendship mock
          mockFriendship.communicationLevel = 'video'; // Already upgraded
          (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);
          
          // Re-mock subscriptions
          (Subscription.findOne as jest.Mock).mockImplementation(({ userId }) => {
            if (subscriptionHolder === 0 && userId === userId1) {
              return Promise.resolve({ plan: 'premium', status: 'active' });
            } else if (subscriptionHolder === 1 && userId === userId2) {
              return Promise.resolve({ plan: 'premium', status: 'active' });
            } else if (subscriptionHolder === 2) {
              return Promise.resolve({ plan: 'premium', status: 'active' });
            }
            return Promise.resolve(null);
          });

          // Test from user2's perspective
          const result2 = await InteractionService.isVideoUnlocked(userId2, userId1);

          // Property 5: Video should be unlocked for both users (bidirectional)
          expect(result2).toBe(true);
        }
      ),
      { numRuns: 100 } // Run 100 iterations as per spec requirements
    );
  });

  /**
   * Property 22 (negative case): should not unlock video without subscription
   */
  it('Property 22 (no subscription): should not unlock video when neither user has subscription', async () => {
    const fc = require('fast-check');
    
    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        async (userId1: string, userId2: string) => {
          if (userId1 === userId2) {
            return;
          }

          const friendshipId = new mongoose.Types.ObjectId().toString();

          const mockFriendship = {
            _id: friendshipId,
            user1Id: userId1,
            user2Id: userId2,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 5,
            blocked: false,
            save: jest.fn()
          };

          (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);

          // Mock no subscriptions
          (Subscription.findOne as jest.Mock).mockResolvedValue(null);

          const result = await InteractionService.isVideoUnlocked(userId1, userId2);

          // Property: Video should NOT be unlocked without subscription
          expect(result).toBe(false);

          // Property: Communication level should remain at chat
          expect(mockFriendship.communicationLevel).toBe('chat');

          // Property: Friendship should not be saved
          expect(mockFriendship.save).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property 22 (cancelled subscription): should not unlock video with cancelled subscription
   */
  it('Property 22 (cancelled): should not unlock video when subscription is cancelled', async () => {
    const fc = require('fast-check');
    
    await fc.assert(
      fc.asyncProperty(
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        fc.hexaString({ minLength: 24, maxLength: 24 }),
        async (userId1: string, userId2: string) => {
          if (userId1 === userId2) {
            return;
          }

          const friendshipId = new mongoose.Types.ObjectId().toString();

          const mockFriendship = {
            _id: friendshipId,
            user1Id: userId1,
            user2Id: userId2,
            establishedAt: new Date(),
            communicationLevel: 'chat',
            interactionCount: 5,
            blocked: false,
            save: jest.fn()
          };

          (Friendship.findOne as jest.Mock).mockResolvedValue(mockFriendship);

          // Mock cancelled subscription
          (Subscription.findOne as jest.Mock).mockResolvedValue({
            plan: 'premium',
            status: 'cancelled' // Not active
          });

          const result = await InteractionService.isVideoUnlocked(userId1, userId2);

          // Property: Video should NOT be unlocked with cancelled subscription
          expect(result).toBe(false);
          expect(mockFriendship.communicationLevel).toBe('chat');
          expect(mockFriendship.save).not.toHaveBeenCalled();
        }
      ),
      { numRuns: 100 }
    );
  });
});
