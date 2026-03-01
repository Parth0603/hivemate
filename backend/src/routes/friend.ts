import { Router } from 'express';
import {
  getFriendList,
  getFriendListByUserId,
  removeFriend,
  removeFriendByUserId,
  blockFriend
} from '../controllers/friendController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All friend routes require authentication
router.get('/', authenticate, getFriendList);
router.get('/user/:userId', authenticate, getFriendListByUserId);
router.delete('/by-user/:friendUserId', authenticate, removeFriendByUserId);
router.delete('/:friendshipId', authenticate, removeFriend);
router.post('/:friendshipId/block', authenticate, blockFriend);

export default router;
