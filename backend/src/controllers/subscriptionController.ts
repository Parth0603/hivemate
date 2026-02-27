import { Request, Response } from 'express';
import Subscription from '../models/Subscription';
import Friendship from '../models/Friendship';

// Mock Stripe integration for MVP
// In production, use actual Stripe SDK
const mockStripe = {
  createCustomer: async (_email: string) => {
    return { id: `cus_mock_${Date.now()}` };
  },
  createSubscription: async (_customerId: string) => {
    return { id: `sub_mock_${Date.now()}`, status: 'active' };
  },
  cancelSubscription: async (subscriptionId: string) => {
    return { id: subscriptionId, status: 'canceled' };
  }
};

export const createSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;
    const email = (req as any).email;

    // Check if subscription already exists
    let subscription = await Subscription.findOne({ userId });
    
    if (subscription && subscription.plan === 'premium' && subscription.status === 'active') {
      return res.status(409).json({
        error: {
          code: 'SUBSCRIPTION_EXISTS',
          message: 'Active premium subscription already exists',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Create Stripe customer (mock for MVP)
    const customer = await mockStripe.createCustomer(email);
    
    // Create Stripe subscription (mock for MVP)
    const stripeSubscription = await mockStripe.createSubscription(customer.id);

    // Create or update subscription
    if (subscription) {
      subscription.plan = 'premium';
      subscription.status = 'active';
      subscription.startDate = new Date();
      subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
      subscription.stripeSubscriptionId = stripeSubscription.id;
      subscription.stripeCustomerId = customer.id;
    } else {
      subscription = new Subscription({
        userId,
        plan: 'premium',
        status: 'active',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        stripeSubscriptionId: stripeSubscription.id,
        stripeCustomerId: customer.id
      });
    }

    await subscription.save();

    // Unlock video for all friendships
    const friendships = await Friendship.find({
      $or: [{ user1Id: userId }, { user2Id: userId }],
      blocked: false
    });

    for (const friendship of friendships) {
      if (friendship.communicationLevel !== 'video') {
        friendship.communicationLevel = 'video';
        await friendship.save();
      }
    }

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error: any) {
    console.error('Create subscription error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while creating subscription',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const getCurrentSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    let subscription = await Subscription.findOne({ userId });
    
    // Create free subscription if doesn't exist
    if (!subscription) {
      subscription = new Subscription({
        userId,
        plan: 'free',
        status: 'active',
        startDate: new Date()
      });
      await subscription.save();
    }

    res.json({
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status,
        startDate: subscription.startDate,
        endDate: subscription.endDate
      }
    });
  } catch (error: any) {
    console.error('Get subscription error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while fetching subscription',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).userId;

    const subscription = await Subscription.findOne({ userId });
    
    if (!subscription || subscription.plan === 'free') {
      return res.status(404).json({
        error: {
          code: 'NO_SUBSCRIPTION',
          message: 'No active premium subscription found',
          timestamp: new Date().toISOString()
        }
      });
    }

    // Cancel Stripe subscription (mock for MVP)
    if (subscription.stripeSubscriptionId) {
      await mockStripe.cancelSubscription(subscription.stripeSubscriptionId);
    }

    // Update subscription
    subscription.status = 'cancelled';
    subscription.plan = 'free';
    await subscription.save();

    // Downgrade communication level for friendships where the other user doesn't have subscription
    const friendships = await Friendship.find({
      $or: [{ user1Id: userId }, { user2Id: userId }],
      blocked: false,
      communicationLevel: 'video'
    });

    for (const friendship of friendships) {
      const otherUserId = friendship.user1Id.toString() === userId 
        ? friendship.user2Id.toString() 
        : friendship.user1Id.toString();
      
      // Check if other user has subscription
      const otherUserSub = await Subscription.findOne({ userId: otherUserId });
      const otherHasSubscription = otherUserSub?.plan === 'premium' && otherUserSub?.status === 'active';
      
      // If other user doesn't have subscription, downgrade to voice
      if (!otherHasSubscription) {
        friendship.communicationLevel = friendship.interactionCount >= 2 ? 'voice' : 'chat';
        await friendship.save();
      }
    }

    res.json({
      message: 'Subscription cancelled successfully',
      subscription: {
        id: subscription._id,
        plan: subscription.plan,
        status: subscription.status
      }
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An error occurred while cancelling subscription',
        timestamp: new Date().toISOString()
      }
    });
  }
};

export const checkSubscriptionStatus = async (userId: string): Promise<boolean> => {
  const subscription = await Subscription.findOne({ userId });
  return subscription?.plan === 'premium' && subscription?.status === 'active';
};

// Webhook handler for Stripe events
export const handleStripeWebhook = async (req: Request, res: Response) => {
  try {
    const event = req.body;

    // In production, verify webhook signature using Stripe SDK
    // const sig = req.headers['stripe-signature'];
    // const event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);

    switch (event.type) {
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handlePaymentSucceeded(event.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    res.status(400).json({
      error: {
        code: 'WEBHOOK_ERROR',
        message: 'Webhook processing failed',
        timestamp: new Date().toISOString()
      }
    });
  }
};

// Handle subscription updated event
async function handleSubscriptionUpdated(stripeSubscription: any) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: stripeSubscription.id
  });

  if (!subscription) {
    console.error('Subscription not found for Stripe ID:', stripeSubscription.id);
    return;
  }

  // Update subscription status
  subscription.status = stripeSubscription.status;
  
  if (stripeSubscription.status === 'active') {
    subscription.plan = 'premium';
    subscription.endDate = new Date(stripeSubscription.current_period_end * 1000);
  } else if (stripeSubscription.status === 'canceled' || stripeSubscription.status === 'unpaid') {
    subscription.plan = 'free';
  }

  await subscription.save();

  // Update friendships if subscription was cancelled
  if (subscription.plan === 'free') {
    await downgradeUserFriendships(subscription.userId.toString());
  }
}

// Handle subscription deleted event
async function handleSubscriptionDeleted(stripeSubscription: any) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: stripeSubscription.id
  });

  if (!subscription) {
    console.error('Subscription not found for Stripe ID:', stripeSubscription.id);
    return;
  }

  subscription.status = 'cancelled';
  subscription.plan = 'free';
  await subscription.save();

  await downgradeUserFriendships(subscription.userId.toString());
}

// Handle successful payment
async function handlePaymentSucceeded(invoice: any) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription
  });

  if (!subscription) {
    return;
  }

  // Renew subscription
  subscription.status = 'active';
  subscription.plan = 'premium';
  subscription.endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  await subscription.save();

  // Unlock video for all friendships
  const friendships = await Friendship.find({
    $or: [
      { user1Id: subscription.userId },
      { user2Id: subscription.userId }
    ],
    blocked: false
  });

  for (const friendship of friendships) {
    if (friendship.communicationLevel !== 'video') {
      friendship.communicationLevel = 'video';
      await friendship.save();
    }
  }
}

// Handle failed payment
async function handlePaymentFailed(invoice: any) {
  const subscription = await Subscription.findOne({
    stripeSubscriptionId: invoice.subscription
  });

  if (!subscription) {
    return;
  }

  // Mark subscription as past_due
  subscription.status = 'past_due';
  await subscription.save();

  // Optionally notify user about payment failure
  console.log(`Payment failed for user: ${subscription.userId}`);
}

// Helper function to downgrade friendships when subscription is cancelled
async function downgradeUserFriendships(userId: string) {
  const friendships = await Friendship.find({
    $or: [{ user1Id: userId }, { user2Id: userId }],
    blocked: false,
    communicationLevel: 'video'
  });

  for (const friendship of friendships) {
    const otherUserId = friendship.user1Id.toString() === userId 
      ? friendship.user2Id.toString() 
      : friendship.user1Id.toString();
    
    // Check if other user has subscription
    const otherUserSub = await Subscription.findOne({ userId: otherUserId });
    const otherHasSubscription = otherUserSub?.plan === 'premium' && otherUserSub?.status === 'active';
    
    // If other user doesn't have subscription, downgrade to voice
    if (!otherHasSubscription) {
      friendship.communicationLevel = friendship.interactionCount >= 2 ? 'voice' : 'chat';
      await friendship.save();
    }
  }
}
