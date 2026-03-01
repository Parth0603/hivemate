import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import { getMatchStatus, sendLike, unlikeOrRequestBreak } from '../controllers/matchController';

const router = Router();

router.get('/status/:userId', authenticate, getMatchStatus);
router.post('/like/:userId', authenticate, sendLike);
router.post('/unlike/:userId', authenticate, unlikeOrRequestBreak);

export default router;
