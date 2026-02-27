import { Request, Response } from 'express';
import Profile from '../models/Profile';
import { PhotoService } from '../services/photoService';

export const uploadPhoto = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const requestingUserId = (req as any).userId;
    const { photo } = req.body;

    // Check authorization
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only upload photos to your own profile',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!photo) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Photo is required',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate photo format
    if (!PhotoService.validatePhoto(photo)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_PHOTO',
          message: 'Invalid photo format. Must be a valid URL or base64 image',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate photo size
    if (!PhotoService.validatePhotoSize(photo)) {
      return res.status(400).json({
        error: {
          code: 'PHOTO_TOO_LARGE',
          message: 'Photo size must not exceed 5MB',
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

    // Check photo limit (max 5)
    if (profile.photos.length >= 5) {
      return res.status(400).json({
        error: {
          code: 'PHOTO_LIMIT_EXCEEDED',
          message: 'Maximum 5 photos allowed. Please delete a photo before uploading a new one',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Upload photo (in production, this would upload to S3)
    const photoUrl = await PhotoService.uploadPhoto(photo, userId);

    // Add photo to profile
    profile.photos.push(photoUrl);
    await profile.save();

    res.status(201).json({
      message: 'Photo uploaded successfully',
      photo: photoUrl,
      totalPhotos: profile.photos.length
    });
  } catch (error: any) {
    console.error('Photo upload error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while uploading photo',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const deletePhoto = async (req: Request, res: Response) => {
  try {
    const { userId, photoId } = req.params;
    const requestingUserId = (req as any).userId;

    // Check authorization
    if (userId !== requestingUserId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'You can only delete photos from your own profile',
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

    // Find photo index
    const photoIndex = parseInt(photoId);
    if (isNaN(photoIndex) || photoIndex < 0 || photoIndex >= profile.photos.length) {
      return res.status(404).json({
        error: {
          code: 'PHOTO_NOT_FOUND',
          message: 'Photo not found',
          timestamp: new Date().toISOString()
        }
      });
    }

    const photoUrl = profile.photos[photoIndex];

    // Delete photo from storage (in production, delete from S3)
    await PhotoService.deletePhoto(photoUrl);

    // Remove photo from profile
    profile.photos.splice(photoIndex, 1);
    await profile.save();

    res.json({
      message: 'Photo deleted successfully',
      totalPhotos: profile.photos.length
    });
  } catch (error: any) {
    console.error('Photo deletion error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while deleting photo',
        timestamp: new Date().toISOString()
      }
    });
  }
};
