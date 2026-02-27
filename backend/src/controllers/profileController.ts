import { Request, Response } from 'express';
import Profile from '../models/Profile';
import Friendship from '../models/Friendship';
import { validateProfile } from '../utils/validation';
import { AISeoService } from '../services/aiSeoService';
import { CacheService } from '../services/cacheService';

export const createProfile = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const profileData = req.body;

    console.log('Creating profile for user:', userId);
    console.log('Profile data received:', JSON.stringify(profileData, null, 2));

    // Check if profile already exists
    const existingProfile = await Profile.findOne({ userId });
    if (existingProfile) {
      console.log('Profile already exists for user:', userId);
      return res.status(409).json({
        error: {
          code: 'PROFILE_EXISTS',
          message: 'Profile already exists for this user',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate profile data
    const validation = validateProfile(profileData);
    if (!validation.valid) {
      console.log('Validation failed:', validation.errors);
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Profile validation failed',
          details: validation.errors,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log('Validation passed, creating profile...');

    // Create profile
    const profile = new Profile({
      userId,
      name: profileData.name,
      age: profileData.age,
      gender: profileData.gender,
      place: profileData.place,
      skills: profileData.skills,
      profession: profileData.profession,
      photos: profileData.photos || [profileData.photo],
      bio: profileData.bio,
      college: profileData.college,
      company: profileData.company,
      verified: false,
      websiteUrl: profileData.websiteUrl,
      achievements: profileData.achievements || [],
      optimizedKeywords: []
    });

    console.log('Saving profile to database...');
    await profile.save();
    console.log('Profile saved successfully');

    // Run AI optimization
    console.log('Running AI optimization...');
    const optimization = AISeoService.optimizeProfile({
      skills: profile.skills,
      profession: profile.profession,
      bio: profile.bio,
      achievements: profile.achievements
    });

    // Update profile with optimized keywords
    profile.optimizedKeywords = [...optimization.keywords, ...optimization.semanticTags];
    await profile.save();
    console.log('Profile optimization complete');

    res.status(201).json({
      message: 'Profile created successfully',
      profile: {
        id: profile._id,
        userId: profile.userId,
        name: profile.name,
        age: profile.age,
        place: profile.place,
        skills: profile.skills,
        profession: profile.profession,
        bio: profile.bio,
        createdAt: profile.createdAt
      }
    });
  } catch (error: any) {
    console.error('Profile creation error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while creating profile',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;

    console.log('getProfile called - userId param:', userId, 'Type:', typeof userId);
    console.log('Requesting user:', requestingUserId);

    // Try to get from cache first
    const cachedProfile = await CacheService.getProfile(userId);
    let profile: any = cachedProfile;

    if (!profile) {
      // Query database if not in cache
      console.log('Profile not in cache, querying database...');
      profile = await Profile.findOne({ userId }).lean();
      console.log('Database query result:', profile ? 'Found' : 'Not found');
      if (!profile) {
        return res.status(404).json({
          error: {
            code: 'PROFILE_NOT_FOUND',
            message: 'Profile not found',
            timestamp: new Date().toISOString()
          }
        });
      }
      // Cache the profile
      await CacheService.setProfile(userId, profile);
    }

    const isOwnProfile = userId === requestingUserId;

    // Check if users are friends
    let areFriends = false;
    if (!isOwnProfile) {
      // Try to get friendship from cache
      const cachedFriendship = await CacheService.getFriendship(requestingUserId, userId);
      if (cachedFriendship !== null) {
        areFriends = cachedFriendship as boolean;
      } else {
        const friendship = await Friendship.findOne({
          $or: [
            { user1Id: requestingUserId, user2Id: userId },
            { user1Id: userId, user2Id: requestingUserId }
          ],
          blocked: false
        }).lean();
        areFriends = !!friendship;
        // Cache the friendship status
        await CacheService.setFriendship(requestingUserId, userId, areFriends);
      }
    }

    // Return full profile for own profile or friends, limited for others
    if (isOwnProfile || areFriends) {
      res.json({
        profile: {
          id: profile._id,
          userId: profile.userId,
          name: profile.name,
          age: profile.age,
          place: profile.place,
          skills: profile.skills,
          profession: profile.profession,
          photos: profile.photos,
          bio: profile.bio,
          college: profile.college,
          company: profile.company,
          verified: profile.verified,
          websiteUrl: profile.websiteUrl,
          achievements: profile.achievements,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        },
        accessLevel: isOwnProfile ? 'own' : 'friend'
      });
    } else {
      // Limited profile preview (bio only)
      res.json({
        profile: {
          id: profile._id,
          userId: profile.userId,
          name: profile.name,
          profession: profile.profession,
          bio: profile.bio,
          verified: profile.verified
        },
        accessLevel: 'preview'
      });
    }
  } catch (error: any) {
    console.error('Get profile error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching profile',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const updateProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;
    const updates = req.body;

    // Check authorization
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only update your own profile',
          timestamp: new Date().toISOString()
        }
      });
    }

    const profile = await Profile.findOne({ userId });
    if (!profile) {
      return res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update allowed fields
    if (updates.name) profile.name = updates.name;
    if (updates.age) profile.age = updates.age;
    if (updates.place) profile.place = updates.place;
    if (updates.skills) profile.skills = updates.skills;
    if (updates.profession) profile.profession = updates.profession;
    if (updates.bio) profile.bio = updates.bio;
    if (updates.college !== undefined) profile.college = updates.college;
    if (updates.company !== undefined) profile.company = updates.company;
    if (updates.websiteUrl !== undefined) profile.websiteUrl = updates.websiteUrl;
    if (updates.achievements !== undefined) profile.achievements = updates.achievements;

    await profile.save();

    // Re-run AI optimization if relevant fields changed
    if (updates.skills || updates.profession || updates.bio || updates.achievements) {
      const optimization = AISeoService.optimizeProfile({
        skills: profile.skills,
        profession: profile.profession,
        bio: profile.bio,
        achievements: profile.achievements
      });

      profile.optimizedKeywords = [...optimization.keywords, ...optimization.semanticTags];
      await profile.save();
    }

    // Invalidate cache
    await CacheService.invalidateProfile(userId);

    res.json({
      message: 'Profile updated successfully',
      profile: {
        id: profile._id,
        userId: profile.userId,
        name: profile.name,
        age: profile.age,
        place: profile.place,
        skills: profile.skills,
        profession: profile.profession,
        bio: profile.bio,
        updatedAt: profile.updatedAt
      }
    });
  } catch (error: any) {
    console.error('Update profile error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while updating profile',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const deleteProfile = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;

    // Check authorization
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete your own profile',
          timestamp: new Date().toISOString()
        }
      });
    }

    const profile = await Profile.findOneAndDelete({ userId });
    if (!profile) {
      return res.status(404).json({
        error: {
          code: 'PROFILE_NOT_FOUND',
          message: 'Profile not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Invalidate cache
    await CacheService.invalidateProfile(userId);

    res.json({
      message: 'Profile deleted successfully'
    });
  } catch (error: any) {
    console.error('Delete profile error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while deleting profile',
        timestamp: new Date().toISOString()
      }
    });
  }
};
