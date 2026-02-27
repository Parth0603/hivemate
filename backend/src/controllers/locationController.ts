import { Request, Response } from 'express';
import { LocationService } from '../services/locationService';
import Profile from '../models/Profile';
import { getWebSocketServer } from '../websocket/server';

const extractUserId = (locationUserId: any): string => {
  if (!locationUserId) return '';
  if (typeof locationUserId === 'string') return locationUserId;
  if (locationUserId._id) return locationUserId._id.toString();
  return locationUserId.toString();
};

export const updateLocation = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { latitude, longitude, accuracy, mode } = req.body;

    console.log('updateLocation called by:', userId);
    console.log('Location data:', { latitude, longitude, mode });

    // Validation
    if (latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Latitude and longitude are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    if (!mode || !['explore', 'vanish'].includes(mode)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MODE',
          message: 'Mode must be either "explore" or "vanish"',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update location
    await LocationService.updateLocation(
      userId,
      latitude,
      longitude,
      accuracy || 0,
      mode
    );

    console.log('Location updated successfully for user:', userId, 'Mode:', mode);

    // Broadcast location update to nearby users via WebSocket
    try {
      const wsServer = getWebSocketServer();
      
      // Get nearby users to notify
      const nearbyLocations = await LocationService.getNearbyUsers(
        latitude,
        longitude,
        5000, // 5km radius for notifications
        userId
      );

      console.log('Notifying nearby users:', nearbyLocations.length);

      // Notify nearby users of location update
      const nearbyUserIds = nearbyLocations
        .map(loc => extractUserId(loc.userId))
        .filter(Boolean);
      wsServer.emitToUsers(nearbyUserIds, 'radar:update', {
        userId,
        latitude,
        longitude,
        mode,
        timestamp: new Date()
      });
    } catch (wsError) {
      console.error('WebSocket broadcast error:', wsError);
      // Don't fail the request if WebSocket fails
    }

    res.json({
      message: 'Location updated successfully',
      location: {
        latitude,
        longitude,
        mode,
        timestamp: new Date()
      }
    });
  } catch (error: any) {
    if (error.message.includes('too frequent')) {
      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: error.message,
          timestamp: new Date().toISOString()
        }
      });
    }

    console.error('Location update error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while updating location',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const getNearbyUsers = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { lat, lng, radius } = req.query;

    console.log('getNearbyUsers called by:', userId);
    console.log('Query params:', { lat, lng, radius });

    // Validation
    if (!lat || !lng) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Latitude (lat) and longitude (lng) are required',
          timestamp: new Date().toISOString()
        }
      });
    }

    const latitude = parseFloat(lat as string);
    const longitude = parseFloat(lng as string);
    const radiusInMeters = radius ? parseInt(radius as string) : 5000; // Default 5km

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_COORDINATES',
          message: 'Invalid latitude or longitude',
          timestamp: new Date().toISOString()
        }
      });
    }

    console.log('Searching for users near:', { latitude, longitude, radiusInMeters });

    // Get nearby users
    const nearbyLocations = await LocationService.getNearbyUsers(
      latitude,
      longitude,
      radiusInMeters,
      userId
    );

    console.log('Found nearby locations:', nearbyLocations.length);

    // Get profiles for nearby users
    const userIds = nearbyLocations
      .map(loc => extractUserId(loc.userId))
      .filter(Boolean);
    console.log('Looking for profiles with userIds:', userIds.map(id => id.toString()));
    const profiles = await Profile.find({ userId: { $in: userIds } });

    console.log('Found profiles:', profiles.length);
    if (profiles.length > 0) {
      console.log('Sample profile:', {
        userId: profiles[0].userId.toString(),
        name: profiles[0].name,
        gender: profiles[0].gender
      });
    }

    // Build radar dots
    const radarDots = nearbyLocations.map(location => {
      const locationUserId = extractUserId(location.userId);
      const profile = profiles.find(p => p.userId.toString() === locationUserId);
      if (!profile) {
        return null;
      }
      const [lng, lat] = location.coordinates.coordinates;
      
      console.log('Mapping location userId:', locationUserId, 'Found profile:', profile ? profile.name : 'NOT FOUND');
      
      const distance = LocationService.calculateDistance(
        latitude,
        longitude,
        lat,
        lng
      );

      return {
        userId: locationUserId, // Properly converted to string
        distance: Math.round(distance),
        gender: profile.gender || 'other',
        coordinates: {
          latitude: lat,
          longitude: lng
        },
        name: profile.name || 'Unknown User',
        photo: profile.photos?.[0] || ''
      };
    }).filter(Boolean);

    console.log('Returning radar dots:', radarDots.length);
    if (radarDots.length > 0) {
      console.log('Sample radar dot:', radarDots[0]);
    }

    res.json({
      nearbyUsers: radarDots,
      total: radarDots.length,
      radius: radiusInMeters
    });
  } catch (error: any) {
    console.error('Get nearby users error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching nearby users',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const toggleVisibilityMode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const { mode } = req.body;

    if (!mode || !['explore', 'vanish'].includes(mode)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_MODE',
          message: 'Mode must be either "explore" or "vanish"',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Get current location
    const location = await LocationService.getUserLocation(userId);
    
    if (!location) {
      return res.status(404).json({
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'Please update your location first',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Update mode immediately without location cooldown blocking this change
    const [lng, lat] = location.coordinates.coordinates;
    await LocationService.updateVisibilityMode(userId, mode);

    // If switching to explore mode, notify nearby users
    if (mode === 'explore') {
      try {
        const wsServer = getWebSocketServer();
        
        // Get nearby users
        const nearbyLocations = await LocationService.getNearbyUsers(
          lat,
          lng,
          5000, // 5km radius
          userId
        );

        // Get user profile for notification
        const profile = await Profile.findOne({ userId });
        
        // Notify nearby users
        const nearbyUserIds = nearbyLocations
          .map(loc => extractUserId(loc.userId))
          .filter(Boolean);
        wsServer.emitToUsers(nearbyUserIds, 'nearby:notification', {
          userId,
          name: profile?.name || 'Someone',
          distance: 'nearby',
          timestamp: new Date()
        });
      } catch (wsError) {
        console.error('WebSocket notification error:', wsError);
      }
    }

    res.json({
      message: 'Visibility mode updated successfully',
      mode,
      timestamp: new Date()
    });
  } catch (error: any) {
    console.error('Toggle visibility error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while updating visibility mode',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const getCurrentVisibilityMode = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const location = await LocationService.getUserLocation(userId);

    if (!location) {
      return res.status(404).json({
        error: {
          code: 'LOCATION_NOT_FOUND',
          message: 'Location not found for user',
          timestamp: new Date().toISOString()
        }
      });
    }

    res.json({
      mode: location.mode,
      updatedAt: location.timestamp
    });
  } catch (error: any) {
    console.error('Get current visibility mode error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching visibility mode',
        timestamp: new Date().toISOString()
      }
    });
  }
};
