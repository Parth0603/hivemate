import { Router } from 'express';
import {
  getFriendList,
  removeFriend,
  blockFriend
} from '../controllers/friendController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All friend routes require authentication
router.get('/', authenticate, getFriendList);
router.delete('/:friendshipId', authenticate, removeFriend);
router.post('/:friendshipId/block', authenticate, blockFriend);

export default router;
