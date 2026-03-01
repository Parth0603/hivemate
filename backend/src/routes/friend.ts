import { Router } from 'express';
import {
  getFriendList,
  getFriendListByUserId,
  removeFriend,
  removeFriendByUserId,
  blockFriend,
  blockFriendByUserId,
  unblockFriendByUserId,
  getFriendshipStatusByUserId
} from '../controllers/friendController';
import { authenticate } from '../middleware/auth';

const router = Router();

// All friend routes require authentication
router.get('/', authenticate, getFriendList);
router.get('/user/:userId', authenticate, getFriendListByUserId);
router.get('/status/:targetUserId', authenticate, getFriendshipStatusByUserId);
router.delete('/by-user/:friendUserId', authenticate, removeFriendByUserId);
router.post('/by-user/:friendUserId/block', authenticate, blockFriendByUserId);
router.post('/by-user/:friendUserId/unblock', authenticate, unblockFriendByUserId);
router.delete('/:friendshipId', authenticate, removeFriend);
router.post('/:friendshipId/block', authenticate, blockFriend);

export default router;
