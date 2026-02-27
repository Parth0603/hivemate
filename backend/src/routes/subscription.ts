import { Router } from 'express';
import { authenticate } from '../middleware/auth';
import {
  createSubscription,
  getCurrentSubscription,
  cancelSubscription,
  handleStripeWebhook
} from '../controllers/subscriptionController';

const router = Router();

// Webhook endpoint (no authentication required)
router.post('/webhook', handleStripeWebhook);

// All other subscription routes require authentication
router.use(authenticate);

// Create premium subscription
router.post('/create', createSubscription);

// Get current subscription
router.get('/current', getCurrentSubscription);

// Cancel subscription
router.post('/cancel', cancelSubscription);

export default router;
