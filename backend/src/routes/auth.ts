import { Router } from 'express';
import {
  register,
  googleLogin,
  getGoogleConfig,
  login,
  logout,
  refreshToken,
  verifyEmailOtp,
  resendSignupOtp,
  requestForgotPasswordOtp,
  resetPasswordWithOtp,
  requestChangePasswordOtp,
  changePasswordWithOtp
} from '../controllers/authController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.post('/register', register);
router.get('/google/config', getGoogleConfig);
router.post('/google', googleLogin);
router.post('/verify-email', verifyEmailOtp);
router.post('/resend-signup-otp', resendSignupOtp);
router.post('/login', login);
router.post('/forgot-password/request-otp', requestForgotPasswordOtp);
router.post('/forgot-password/reset', resetPasswordWithOtp);
router.post('/change-password/request-otp', authenticate, requestChangePasswordOtp);
router.post('/change-password/confirm', authenticate, changePasswordWithOtp);
router.post('/logout', authenticate, logout);
router.post('/refresh', authenticate, refreshToken);

export default router;
