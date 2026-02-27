import { Router } from 'express';
import {
  createProfile,
  getProfile,
  updateProfile,
  deleteProfile
} from '../controllers/profileController';
import { uploadPhoto, deletePhoto } from '../controllers/photoController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All profile routes require authentication
router.post('/', authenticate, createProfile);
router.get('/:userId', authenticate, getProfile);
router.put('/:userId', authenticate, updateProfile);
router.delete('/:userId', authenticate, deleteProfile);

// Photo routes
router.post('/:userId/photos', authenticate, uploadPhoto);
router.delete('/:userId/photos/:photoId', authenticate, deletePhoto);

export default router;
