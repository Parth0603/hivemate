import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  searchProfiles,
  searchGigs
} from '../controllers/searchController';

const router = Router();

// All search routes require authentication
router.use(authenticate);

// Search profiles
router.post('/profiles', searchProfiles);

// Search gigs
router.post('/gigs', searchGigs);

export default router;
