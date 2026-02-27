import { Router } from 'express';
import {
  updateLocation,
  getNearbyUsers,
  toggleVisibilityMode,
  getCurrentVisibilityMode
} from '../controllers/locationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All location routes require authentication
router.post('/update', authenticate, updateLocation);
router.get('/nearby', authenticate, getNearbyUsers);
router.get('/visibility/mode', authenticate, getCurrentVisibilityMode);
router.put('/visibility/mode', authenticate, toggleVisibilityMode);

export default router;
