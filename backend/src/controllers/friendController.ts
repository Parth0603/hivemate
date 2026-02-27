import { Request, Response } from 'express';
import Friendship from '../models/Friendship';
import Profile from '../models/Profile';

export const getFriendList = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    // Find all friendships where user is either user1 or user2
    const friendships = await Friendship.find({
      $or: [{ user1Id: userId }, { user2Id: userId }],
      blocked: false
    });

    // Get friend IDs
    const friendIds = friendships.map(f => 
      f.user1Id.toString() === userId ? f.user2Id : f.user1Id
    );

    // Get friend profiles
    const friendProfiles = await Profile.find({ userId: { $in: friendIds } });

    // Build friend list
    const friends = friendships.map(friendship => {
      const friendId = friendship.user1Id.toString() === userId 
        ? friendship.user2Id.toString() 
        : friendship.user1Id.toString();
      
      const profile = friendProfiles.find(p => p.userId.toString() === friendId);

      return {
        friendshipId: friendship._id,
        friendId,
        name: profile?.name || 'Unknown',
        profession: profile?.profession,
        place: profile?.place,
        bio: profile?.bio,
        photos: profile?.photos || [],
        communicationLevel: friendship.communicationLevel,
        establishedAt: friendship.establishedAt
      };
    });

    res.json({
      friends,
      total: friends.length
    });
  } catch (error: any) {
    console.error('Get friend list error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching friend list',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const removeFriend = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { friendshipId } = req.params;

    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) {
      return res.status(404).json({
        error: {
          code: 'FRIENDSHIP_NOT_FOUND',
          message: 'Friendship not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check authorization
    if (friendship.user1Id.toString() !== userId && friendship.user2Id.toString() !== userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only remove your own friendships',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Delete friendship
    await Friendship.findByIdAndDelete(friendshipId);

    res.json({
      message: 'Friend removed successfully'
    });
  } catch (error: any) {
    console.error('Remove friend error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while removing friend',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const blockFriend = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { friendshipId } = req.params;

    const friendship = await Friendship.findById(friendshipId);
    if (!friendship) {
      return res.status(404).json({
        error: {
          code: 'FRIENDSHIP_NOT_FOUND',
          message: 'Friendship not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Check authorization
    if (friendship.user1Id.toString() !== userId && friendship.user2Id.toString() !== userId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only block your own friendships',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Block friendship
    friendship.blocked = true;
    await friendship.save();

    res.json({
      message: 'Friend blocked successfully'
    });
  } catch (error: any) {
    console.error('Block friend error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while blocking friend',
        timestamp: new Date().toISOString()
      }
    });
  }
};
