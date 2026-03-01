import { Router } from 'express';
import {
  sendConnectionRequest,
  acceptConnectionRequest,
  declineConnectionRequest,
  getPendingRequests,
  cancelConnectionRequest
} from '../controllers/connectionController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All connection routes require authentication
router.post('/request', authenticate, sendConnectionRequest);
router.put('/:requestId/accept', authenticate, acceptConnectionRequest);
router.put('/:requestId/decline', authenticate, declineConnectionRequest);
router.delete('/:requestId', authenticate, cancelConnectionRequest);
router.get('/pending', authenticate, getPendingRequests);

export default router;
