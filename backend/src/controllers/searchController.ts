import { Request, Response } from 'express';
import Profile from '../models/Profile';
import Gig from '../models/Gig';

export const searchProfiles = async (req: Request, res: Response) => {
  try {
    const {
      skills,
      profession,
      niche,
      distance,
      lat,
      lng,
      page = 1,
      limit = 20
    } = req.body;

    // Build filter
    const filter: any = {};

    if (skills && Array.isArray(skills) && skills.length > 0) {
      filter.skills = { $in: skills };
    }

    if (profession) {
      filter.profession = { $regex: profession, $options: 'i' };
    }

    if (niche) {
      // Search in optimized keywords
      filter.optimizedKeywords = { $in: [niche] };
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let profiles;
    let total;

    // If distance filter is provided, use geospatial query
    if (distance && lat && lng) {
      const Location = (await import('../models/Location')).default;
      
      // Find nearby users
      const nearbyLocations = await Location.find({
        coordinates: {
          $nearSphere: {
            $geometry: {
              type: 'Point',
              coordinates: [parseFloat(lng), parseFloat(lat)]
            },
            $maxDistance: parseFloat(distance) * 1000 // Convert km to meters
          }
        },
        mode: 'explore'
      }).select('userId').lean();

      const nearbyUserIds = nearbyLocations.map(loc => loc.userId);

      // Add user ID filter
      filter.userId = { $in: nearbyUserIds };

      [profiles, total] = await Promise.all([
        Profile.find(filter)
          .select('-__v')
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Profile.countDocuments(filter)
      ]);
    } else {
      // Regular search without distance filter
      [profiles, total] = await Promise.all([
        Profile.find(filter)
          .select('-__v')
          .skip(skip)
          .limit(limitNum)
          .lean(),
        Profile.countDocuments(filter)
      ]);
    }

    // Rank by AI-optimized keywords if niche is provided
    if (niche && profiles.length > 0) {
      profiles = profiles.sort((a: any, b: any) => {
        const aScore = a.optimizedKeywords?.filter((k: string) => 
          k.toLowerCase().includes(niche.toLowerCase())
        ).length || 0;
        const bScore = b.optimizedKeywords?.filter((k: string) => 
          k.toLowerCase().includes(niche.toLowerCase())
        ).length || 0;
        return bScore - aScore;
      });
    }

    res.json({
      profiles,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Search profiles error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while searching profiles',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const searchGigs = async (req: Request, res: Response) => {
  try {
    const {
      type,
      skills,
      paymentStatus,
      page = 1,
      limit = 20
    } = req.body;

    // Build filter
    const filter: any = { status: 'open' };

    if (type) {
      filter.type = type;
    }

    if (skills && Array.isArray(skills) && skills.length > 0) {
      filter.skillsRequired = { $in: skills };
    }

    if (paymentStatus) {
      filter.paymentStatus = paymentStatus;
    }

    // Pagination
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const [gigs, total] = await Promise.all([
      Gig.find(filter)
        .populate('creatorId', 'name profession')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Gig.countDocuments(filter)
    ]);

    res.json({
      gigs,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });
  } catch (error: any) {
    console.error('Search gigs error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while searching gigs',
        timestamp: new Date().toISOString()
      }
    });
  }
};
