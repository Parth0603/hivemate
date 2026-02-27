import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createGig,
  getGigs,
  getGigById,
  updateGig,
  deleteGig,
  getMyGigs,
  applyToGig,
  getGigApplications,
  respondToApplication,
  getMyApplications
} from '../controllers/gigController';

const router = Router();

// All gig routes require authentication
router.use(authenticate);

// Create gig
router.post('/', createGig);

// Get all gigs with filtering
router.get('/', getGigs);

// Get my gigs
router.get('/my', getMyGigs);

// Get my applications
router.get('/applications/my', getMyApplications);

// Get single gig
router.get('/:gigId', getGigById);

// Update gig
router.put('/:gigId', updateGig);

// Delete gig
router.delete('/:gigId', deleteGig);

// Apply to gig
router.post('/:gigId/apply', applyToGig);

// Get gig applications (for gig creator)
router.get('/:gigId/applications', getGigApplications);

// Respond to application (accept/reject)
router.post('/:gigId/applications/:applicationId/respond', respondToApplication);

export default router;
