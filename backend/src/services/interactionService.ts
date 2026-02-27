import Friendship from '../models/Friendship';
import Subscription from '../models/Subscription';

export class InteractionService {
  /**
   * Increment interaction count for a friendship
   */
  static async incrementInteraction(user1Id: string, user2Id: string): Promise<void> {
    const friendship = await Friendship.findOne({
      $or: [
        { user1Id, user2Id },
        { user1Id: user2Id, user2Id: user1Id }
      ],
      blocked: false
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    friendship.interactionCount += 1;

    // Update communication level based on interaction count
    if (friendship.interactionCount >= 2 && friendship.communicationLevel === 'chat') {
      friendship.communicationLevel = 'voice';
    }

    await friendship.save();
  }

  /**
   * Get friendship details
   */
  static async getFriendship(user1Id: string, user2Id: string) {
    return await Friendship.findOne({
      $or: [
        { user1Id, user2Id },
        { user1Id: user2Id, user2Id: user1Id }
      ],
      blocked: false
    });
  }

  /**
   * Check if voice calls are unlocked
   */
  static async isVoiceUnlocked(user1Id: string, user2Id: string): Promise<boolean> {
    const friendship = await this.getFriendship(user1Id, user2Id);
    return Boolean(friendship);
  }

  /**
   * Check if either user has active subscription
   */
  static async hasActiveSubscription(user1Id: string, user2Id: string): Promise<boolean> {
    const [sub1, sub2] = await Promise.all([
      Subscription.findOne({ userId: user1Id }),
      Subscription.findOne({ userId: user2Id })
    ]);

    const isUser1Premium = sub1?.plan === 'premium' && sub1?.status === 'active';
    const isUser2Premium = sub2?.plan === 'premium' && sub2?.status === 'active';

    return isUser1Premium || isUser2Premium;
  }

  /**
   * Check if video calls are unlocked (requires subscription from either user)
   */
  static async isVideoUnlocked(user1Id: string, user2Id: string): Promise<boolean> {
    const friendship = await this.getFriendship(user1Id, user2Id);
    return Boolean(friendship);
  }

  /**
   * Unlock video for friendship (when subscription is active)
   */
  static async unlockVideo(user1Id: string, user2Id: string): Promise<void> {
    const friendship = await Friendship.findOne({
      $or: [
        { user1Id, user2Id },
        { user1Id: user2Id, user2Id: user1Id }
      ],
      blocked: false
    });

    if (!friendship) {
      throw new Error('Friendship not found');
    }

    // Check if either user has subscription
    const hasSubscription = await this.hasActiveSubscription(user1Id, user2Id);
    
    if (!hasSubscription) {
      throw new Error('Active subscription required for video calls');
    }

    friendship.communicationLevel = 'video';
    await friendship.save();
  }
}
