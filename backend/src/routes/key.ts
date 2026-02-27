import { Router } from 'express';
import { exchangePublicKey, getPublicKey, getMyKeyPair } from '../controllers/keyController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/exchange', authenticate, exchangePublicKey);
router.get('/me', authenticate, getMyKeyPair);
router.get('/:userId/public', authenticate, getPublicKey);

export default router;
