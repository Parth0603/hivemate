import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getPushPublicKey, subscribePush, unsubscribePush } from '../controllers/pushController';

const router = Router();

router.get('/public-key', getPushPublicKey);
router.post('/subscribe', authenticate, subscribePush);
router.post('/unsubscribe', authenticate, unsubscribePush);

export default router;
